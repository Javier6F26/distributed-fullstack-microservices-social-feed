/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Setup Swagger/OpenAPI documentation
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
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Post Service Docs',
  });

  // Save OpenAPI spec to file
  const fs = require('fs');
  const path = require('path');
  const openapiDir = path.join(process.cwd(), 'openapi');
  if (!fs.existsSync(openapiDir)) {
    fs.mkdirSync(openapiDir, { recursive: true });
  }
  fs.writeFileSync(
    path.join(openapiDir, 'openapi-post-service.json'),
    JSON.stringify(document, null, 2)
  );

  const port = process.env.PORT || 3002;
  await app.listen(port);
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}`,
  );
  Logger.log(
    `📄 OpenAPI Documentation: http://localhost:${port}/api/docs`,
  );
}

bootstrap();
