/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger, INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app/app.module';

/**
 * Setup Swagger/OpenAPI documentation
 */
function setupDocumentation(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Post Service - Distributed Fullstack Microservices')
    .setDescription(`
      Post management microservice for content creation and retrieval.

      ## Features
      - Create, read, update, delete posts
      - Full-text search
      - Date-based filtering
      - Cursor-based pagination
      - Post anonymization on user deletion

      ## Caching
      Posts are cached using Redis for improved performance.
    `)
    .setVersion('1.0.0')
    .addTag('post-service', 'Post Service endpoints')
    .addTag('posts', 'Post management endpoints')
    .addTag('search', 'Post search endpoints')
    .addTag('deletion', 'Post deletion endpoints')
    .addBearerAuth({
      description: 'JWT Authorization header using the Bearer scheme. Example: "Bearer {token}"',
      name: 'Authorization',
      in: 'header',
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    })
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Serve Swagger UI at /docs (no /api prefix)
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Post Service Docs',
  });

  // Save OpenAPI spec to file
  const fs = require('fs');
  const path = require('path');
  const openapiDir = path.join(process.cwd(), 'docs', 'openapi');
  if (!fs.existsSync(openapiDir)) {
    fs.mkdirSync(openapiDir, { recursive: true });
  }
  fs.writeFileSync(
    path.join(openapiDir, 'openapi-post-service.json'),
    JSON.stringify(document, null, 2)
  );
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Increase body size limit for bulk operations (default is 100kb)
  app.useBodyParser('json', { limit: '50mb' });
  app.useBodyParser('urlencoded', { limit: '50mb', extended: true });

  // HTTP server for REST API
  const port = process.env.POST_SERVICE_PORT || process.env.PORT || 3002;
  await app.listen(port);
  Logger.log(`🚀 Application is running on: http://localhost:${port}`);
  Logger.log(`📄 OpenAPI Documentation: http://localhost:${port}/docs`);

  // RabbitMQ microservice for consuming post creation messages
  const rabbitmqUri = process.env.RABBITMQ_URI || 'amqp://admin:admin@localhost:5672';
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [rabbitmqUri],
      queue: 'post.create',
      queueOptions: {
        durable: true,
      },
    },
  });

  // RabbitMQ microservice for consuming comment events from single queue
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [rabbitmqUri],
      queue: 'comment.events',
      queueOptions: {
        durable: true,
      },
    },
  });

  await app.startAllMicroservices();
  Logger.log(`📬 RabbitMQ microservice started - listening on queues: post.create, comment.events`);

  setupDocumentation(app);
}

bootstrap();
