/**
 * RabbitMQ queue constants for Comment Service.
 * Used for consuming messages from RabbitMQ queues.
 */

// Queue names (domain.action pattern)
export const COMMENT_CREATE_QUEUE = 'comment.create';

// Exchange names
export const DEAD_LETTER_EXCHANGE = 'dlx';

// Dead-letter queue
export const COMMENT_DLQ = 'comment.dlq';

// Environment variable keys
export const RABBITMQ_URI_KEY = 'RABBITMQ_URI';
export const RABBITMQ_DEFAULT_URI = 'amqp://guest:guest@localhost:5672';
