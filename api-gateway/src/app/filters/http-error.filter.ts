import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
  BadGatewayException,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Response } from 'express';
import { AxiosError } from 'axios';

/**
 * Global HTTP Exception Filter for handling Axios errors from downstream services.
 * This filter catches all exceptions and properly formats error responses
 * when calling microservices via HTTP.
 */
@Catch()
export class HttpErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpErrorFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Skip if response was already sent
    if (response.writableEnded) {
      return;
    }

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof AxiosError) {
      const axiosError = exception as AxiosError;
      const downstreamStatus = axiosError.response?.status;
      const downstreamData = axiosError.response?.data as any;

      // Log the error with request details
      this.logger.warn(
        `Downstream service error: ${axiosError.message} | URL: ${request.url} | Method: ${request.method}`,
      );

      // Determine status code based on downstream response
      if (downstreamStatus) {
        // Forward authentication/authorization errors
        if (downstreamStatus === HttpStatus.UNAUTHORIZED) {
          status = HttpStatus.UNAUTHORIZED;
          message = downstreamData?.message || 'Unauthorized';
        } else if (downstreamStatus === HttpStatus.FORBIDDEN) {
          status = HttpStatus.FORBIDDEN;
          message = downstreamData?.message || 'Forbidden';
        }
        // Forward other client errors (4xx)
        else if (downstreamStatus >= 400 && downstreamStatus < 500) {
          status = downstreamStatus;
          message = downstreamData?.message || axiosError.message || 'Bad request';
        }
        // Map server errors (5xx) to Bad Gateway
        else if (downstreamStatus >= 500) {
          status = HttpStatus.BAD_GATEWAY;
          message = downstreamData?.message || 'Downstream service unavailable';
        }
        // Handle other status codes
        else {
          status = downstreamStatus;
          message = downstreamData?.message || axiosError.message || 'Request failed';
        }
      } else {
        // No response from downstream (network error, timeout, etc.)
        status = HttpStatus.BAD_GATEWAY;
        message = 'Downstream service unreachable';
      }
    } else if (exception instanceof UnauthorizedException) {
      status = HttpStatus.UNAUTHORIZED;
      const exceptionResponse = exception.getResponse() as any;
      message = exceptionResponse?.message || exception.message || 'Unauthorized';
    } else if (exception instanceof ForbiddenException) {
      status = HttpStatus.FORBIDDEN;
      const exceptionResponse = exception.getResponse() as any;
      message = exceptionResponse?.message || exception.message || 'Forbidden';
    } else if (exception instanceof BadRequestException) {
      status = HttpStatus.BAD_REQUEST;
      const exceptionResponse = exception.getResponse() as any;
      message = exceptionResponse?.message || exception.message;
    } else if (exception instanceof BadGatewayException) {
      status = HttpStatus.BAD_GATEWAY;
      const exceptionResponse = exception.getResponse() as any;
      message = exceptionResponse?.message || exception.message;
    } else if (exception instanceof Error) {
      // Check if it's a JWT-related error
      if (exception.name === 'TokenExpiredError') {
        status = HttpStatus.UNAUTHORIZED;
        message = 'Token expired';
      } else if (exception.name === 'JsonWebTokenError') {
        status = HttpStatus.UNAUTHORIZED;
        message = 'Invalid token';
      } else {
        // Log unexpected errors
        this.logger.error(
          `Unexpected error: ${exception.message} | Stack: ${exception.stack}`,
        );
        status = HttpStatus.INTERNAL_SERVER_ERROR;
        message = 'Internal server error';
      }
    }

    // Format error response
    const errorResponse = {
      statusCode: status,
      message,
      error: this.getHttpStatusText(status),
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    response.status(status).json(errorResponse);
  }

  /**
   * Get HTTP status text for the given status code
   */
  private getHttpStatusText(status: number): string {
    const statusTexts: Record<number, string> = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      409: 'Conflict',
      422: 'Unprocessable Entity',
      429: 'Too Many Requests',
      500: 'Internal Server Error',
      502: 'Bad Gateway',
      503: 'Service Unavailable',
    };

    return statusTexts[status] || 'Unknown Error';
  }
}
