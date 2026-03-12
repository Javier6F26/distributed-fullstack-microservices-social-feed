/**
 * RabbitMQ queue constants for API Gateway.
 * Used for producing messages to RabbitMQ queues.
 */

// Queue names (domain.action pattern)
export const POST_CREATE_QUEUE = 'post.create';
export const COMMENT_CREATE_QUEUE = 'comment.create';

// Exchange names
export const POST_EXCHANGE = 'post.exchange';
export const COMMENT_EXCHANGE = 'comment.exchange';
export const DEAD_LETTER_EXCHANGE = 'dlx';

// Dead-letter queues
export const POST_DLQ = 'post.dlq';
export const COMMENT_DLQ = 'comment.dlq';

// Queue options
export const POST_CREATE_QUEUE_OPTIONS = {
  durable: true, // Survive broker restarts
  deadLetterExchange: DEAD_LETTER_EXCHANGE,
  messageTtl: 86400000, // 24 hours TTL
};

export const COMMENT_CREATE_QUEUE_OPTIONS = {
  durable: true, // Survive broker restarts
  deadLetterExchange: DEAD_LETTER_EXCHANGE,
  messageTtl: 86400000, // 24 hours TTL
};

// Environment variable keys
export const RABBITMQ_URI_KEY = 'RABBITMQ_URI';
export const RABBITMQ_DEFAULT_URI = 'amqp://guest:guest@localhost:5672';
