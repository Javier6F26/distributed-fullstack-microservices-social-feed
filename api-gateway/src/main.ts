/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger, INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app/app.module';
import { HttpErrorFilter } from './app/filters/http-error.filter';

/**
 * Setup Swagger/OpenAPI documentation
 * Separated from bootstrap to keep it clean
 */
function setupDocumentation(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('API Gateway - Distributed Fullstack Microservices')
    .setDescription(`
      Main API Gateway for the distributed fullstack microservices architecture.
      
      This gateway proxies requests to:
      - User Service (Authentication & User Management)
      - Post Service (Posts & Content)
      - Comment Service (Comments & Discussions)
      
      ## Authentication
      All authenticated endpoints require a valid JWT token in the Authorization header.
      Use the /auth/login endpoint to obtain an access token.
      
      ## Rate Limiting
      Endpoints are protected by rate limiting to prevent abuse.
    `)
    .setVersion('1.0.0')
    .addTag('api-gateway', 'API Gateway endpoints')
    .addTag('authentication', 'User authentication endpoints')
    .addTag('posts', 'Post management endpoints')
    .addTag('comments', 'Comment management endpoints')
    .addBearerAuth({
      description: 'JWT Authorization header using the Bearer scheme. Example: "Bearer {token}"',
      name: 'Authorization',
      in: 'header',
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    })
    .addCookieAuth('refreshToken', {
      description: 'Refresh token cookie for token rotation',
      name: 'refreshToken',
      in: 'cookie',
      type: 'apiKey',
    })
    .build();

  const document = SwaggerModule.createDocument(app, config);
  
  // Serve Swagger UI at /docs (not /api/docs)
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'API Gateway Docs',
  });

  // Save OpenAPI spec to file
  const fs = require('fs');
  const path = require('path');
  const openapiDir = path.join(process.cwd(), 'docs', 'openapi');
  if (!fs.existsSync(openapiDir)) {
    fs.mkdirSync(openapiDir, { recursive: true });
  }
  fs.writeFileSync(
    path.join(openapiDir, 'openapi-api-gateway.json'),
    JSON.stringify(document, null, 2)
  );
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const globalPrefix = 'api/v1';
  app.setGlobalPrefix(globalPrefix);

  // Enable CORS with credentials for cookie-based auth
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:4200',
    credentials: true, // Allow cookies
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Enable cookie parsing - use require to avoid ESM/CJS interop issues
  const cookieParser = require('cookie-parser');
  app.use(cookieParser());

  // Register global HTTP error filter for downstream service errors
  app.useGlobalFilters(new HttpErrorFilter());

  // Setup documentation (separate function for clean bootstrap)
  setupDocumentation(app);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`,
  );
  Logger.log(
    `📄 OpenAPI Documentation: http://localhost:${port}/docs`,
  );
}

bootstrap();
