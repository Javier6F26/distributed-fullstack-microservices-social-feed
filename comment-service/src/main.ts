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
    .setTitle('Comment Service - Distributed Fullstack Microservices')
    .setDescription(`
      Comment management microservice for post discussions.
      
      ## Features
      - Create and retrieve comments
      - Comments per post organization
      - Comment anonymization on user deletion
      - Recent comments preview
      
      ## Caching
      Comments are cached using Redis for improved performance.
    `)
    .setVersion('1.0.0')
    .addTag('comment-service', 'Comment Service endpoints')
    .addTag('comments', 'Comment management endpoints')
    .addTag('deletion', 'Comment deletion endpoints')
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
    customSiteTitle: 'Comment Service Docs',
  });

  // Save OpenAPI spec to file
  const fs = require('fs');
  const path = require('path');
  const openapiDir = path.join(process.cwd(), 'openapi');
  if (!fs.existsSync(openapiDir)) {
    fs.mkdirSync(openapiDir, { recursive: true });
  }
  fs.writeFileSync(
    path.join(openapiDir, 'openapi-comment-service.json'),
    JSON.stringify(document, null, 2)
  );

  const port = process.env.PORT || 3003;
  await app.listen(port);
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}`,
  );
  Logger.log(
    `📄 OpenAPI Documentation: http://localhost:${port}/api/docs`,
  );
}

bootstrap();
