/**
 * RabbitMQ queue constants for Post Service.
 * Used for consuming messages from RabbitMQ queues.
 */

// Queue names (domain.action pattern)
export const POST_CREATE_QUEUE = 'post.create';

// Event names (domain.action pattern)
export const COMMENT_CREATED_EVENT = 'comment.created';
export const COMMENT_UPDATED_EVENT = 'comment.updated';
export const COMMENT_DELETED_EVENT = 'comment.deleted';
export const POST_UPDATED_EVENT = 'post.updated';
export const POST_DELETED_EVENT = 'post.deleted';

// Exchange names
export const DEAD_LETTER_EXCHANGE = 'dlx';

// Dead-letter queue
export const POST_DLQ = 'post.dlq';

// Queue options for consumer
export const POST_CREATE_QUEUE_OPTIONS = {
  durable: true, // Survive broker restarts
  deadLetterExchange: DEAD_LETTER_EXCHANGE,
  messageTtl: 86400000, // 24 hours TTL
  prefetch: 1, // Process one message at a time
};

// Environment variable keys
export const RABBITMQ_URI_KEY = 'RABBITMQ_URI';
export const RABBITMQ_DEFAULT_URI = 'amqp://admin:admin@localhost:5672';

// Retry configuration
export const MAX_RETRY_ATTEMPTS = 3;
export const RETRY_DELAY_MS = 1000; // 1 second
