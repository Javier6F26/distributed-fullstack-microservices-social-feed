import { Injectable, Logger } from '@nestjs/common';

/**
 * RabbitMQ service for Comment Service.
 * Primarily used for event publishing (comment.created events).
 */
@Injectable()
export class RabbitmqService {
  private readonly logger = new Logger(RabbitmqService.name);

  /**
   * Emit comment.created event.
   * Handled by RabbitmqController via channel.sendToQueue()
   */
  constructor() {}
}
