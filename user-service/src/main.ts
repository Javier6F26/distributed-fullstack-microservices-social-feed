/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger, INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app/app.module';

/**
 * Setup Swagger/OpenAPI documentation
 * Separated from bootstrap to keep it clean
 * Note: No /api prefix - this service serves docs at /docs directly
 */
function setupDocumentation(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('User Service - Distributed Fullstack Microservices')
    .setDescription(`
      User management and authentication microservice.
      
      ## Features
      - User registration and login
      - JWT token management
      - Refresh token rotation
      - Account deletion workflow
      - User profile management
      
      ## Security
      Passwords are hashed using bcrypt.
      JWT tokens are used for authentication.
    `)
    .setVersion('1.0.0')
    .addTag('user-service', 'User Service endpoints')
    .addTag('authentication', 'User authentication endpoints')
    .addTag('users', 'User management endpoints')
    .addTag('deletion', 'Account deletion endpoints')
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
  
  // Serve Swagger UI at /docs (no /api prefix)
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'User Service Docs',
  });

  // Save OpenAPI spec to file
  const fs = require('fs');
  const path = require('path');
  const openapiDir = path.join(process.cwd(), 'docs', 'openapi');
  if (!fs.existsSync(openapiDir)) {
    fs.mkdirSync(openapiDir, { recursive: true });
  }
  fs.writeFileSync(
    path.join(openapiDir, 'openapi-user-service.json'),
    JSON.stringify(document, null, 2)
  );
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Setup cookie-parser for reading refresh tokens from cookies
  const cookieParser = require('cookie-parser');
  app.use(cookieParser());

  // Setup documentation (separate function for clean bootstrap)
  setupDocumentation(app);

  const port = process.env.PORT || 3001;
  await app.listen(port);
  Logger.log(`🚀 Application is running on: http://localhost:${port}`);
  Logger.log(`📄 OpenAPI Documentation: http://localhost:${port}/docs`);
}

bootstrap();
