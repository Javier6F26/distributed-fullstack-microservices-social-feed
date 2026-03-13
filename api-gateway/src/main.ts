import { INestApplication, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app/app.module';
import { HttpErrorFilter } from './app/filters/http-error.filter';
import * as fs from 'fs';
import * as path from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const globalPrefix = 'api/v1';
  app.setGlobalPrefix(globalPrefix);

  // Support multiple CORS origins (comma-separated)
  const corsOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((origin: string) => origin.trim())
    : ['http://localhost:4200'];
  console.log('Allowed CORS: ',corsOrigins);
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  const cookieParser = require('cookie-parser');
  app.use(cookieParser());

  app.useGlobalFilters(new HttpErrorFilter());

  setupDocumentation(app);

  const port = process.env.API_GATEWAY_PORT || process.env.PORT || 3000;
  await app.listen(port);
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`,
  );
  Logger.log(`📄 OpenAPI Documentation: http://localhost:${port}/docs`);

  // RabbitMQ microservice for consuming events from Post and Comment services
  const rabbitmqUri = process.env.RABBITMQ_URI || 'amqp://localhost:5672';
  
  // Listen for post events
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [rabbitmqUri],
      queue: 'post.events',
      queueOptions: {
        durable: true,
      },
    },
  });

  // Listen for comment events
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
  Logger.log(`📬 RabbitMQ event consumers started - listening on: post.events, comment.events`);
}

bootstrap();

/**
 * Setup Swagger/OpenAPI documentation
 * Separated from bootstrap to keep it clean
 */
function setupDocumentation(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('API Gateway - Distributed Fullstack Microservices')
    .setDescription(
      `
      Main API Gateway for the distributed fullstack microservices architecture.

      ## Authentication Flow
      1. **Register** - Create a new account via \`POST /auth/register\`
      2. **Login** - Obtain access token via \`POST /auth/login\`
      3. **Use Token** - Include \`Authorization: Bearer {token}\` in requests
      4. **Refresh** - Use \`POST /auth/refresh\` when token expires
      5. **Logout** - Revoke tokens via \`POST /auth/logout\`

      ## Rate Limiting
      Endpoints are protected by rate limiting to prevent abuse.
    `,
    )
    .setVersion('1.0.0')
    .addTag('api-gateway', 'API Gateway endpoints')
    .addTag('authentication', 'User authentication endpoints')
    .addTag('posts', 'Post management endpoints')
    .addTag('comments', 'Comment management endpoints')
    .addBearerAuth({
      description:
        'JWT Authorization header using the Bearer scheme. Example: "Bearer {token}"',
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

  // Serve Swagger UI at /docs
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'API Gateway Docs',
  });

  // Save OpenAPI spec to file
  const openapiDir = path.join(process.cwd(), 'docs', 'openapi');
  if (!fs.existsSync(openapiDir)) {
    fs.mkdirSync(openapiDir, { recursive: true });
  }
  fs.writeFileSync(
    path.join(openapiDir, 'openapi-api-gateway.json'),
    JSON.stringify(document, null, 2),
  );
  Logger.log(`📄 OpenAPI spec saved to: docs/openapi/openapi-api-gateway.json`);

  // Generate Postman collection
  generatePostmanCollection();
  Logger.log('📮 Postman collection generated: docs/postman/');
}

/**
 * Generate Postman collection with automated test flows
 */
function generatePostmanCollection(): void {
  const baseUrl = 'http://localhost:3000/api/v1';
  const timestamp = Date.now();

  const postmanDir = path.join(process.cwd(), 'docs', 'postman', 'flows');
  if (!fs.existsSync(postmanDir)) {
    fs.mkdirSync(postmanDir, { recursive: true });
  }

  const postmanCollection = {
    info: {
      name: 'Distributed Fullstack API',
      description: 'Auto-generated Postman collection with test flows.',
      schema:
        'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    variable: [
      { key: 'baseUrl', value: baseUrl, type: 'string' },
      { key: 'accessToken', value: '', type: 'string' },
      { key: 'refreshToken', value: '', type: 'string' },
      { key: 'userId', value: '', type: 'string' },
      { key: 'postId', value: '', type: 'string' },
      { key: 'commentId', value: '', type: 'string' },
      {
        key: 'testUsername',
        value: `test_${timestamp}`,
        type: 'default',
        enabled: true,
      },
      {
        key: 'testEmail',
        value: `test_${timestamp}@example.com`,
        type: 'string',
      },
      { key: 'testPassword', value: 'Test1234!', type: 'string' },
    ],
    auth: {
      type: 'bearer',
      bearer: [{ key: 'token', value: '{{accessToken}}', type: 'string' }],
    },
    item: [
      {
        name: '🔰 Full Test Flow',
        description: 'Run these requests in order',
        item: [
          {
            name: '01 - Register User',
            request: {
              method: 'POST',
              header: [{ key: 'Content-Type', value: 'application/json' }],
              body: {
                mode: 'raw',
                raw: JSON.stringify(
                  {
                    username: '{{testUsername}}',
                    email: '{{testEmail}}',
                    password: '{{testPassword}}',
                  },
                  null,
                  2,
                ),
              },
              url: {
                raw: '{{baseUrl}}/auth/register',
                host: ['{{baseUrl}}'],
                path: ['auth', 'register'],
              },
            },
            event: [
              {
                listen: 'test',
                script: {
                  type: 'text/javascript',
                  exec: [
                    'if (pm.response.code === 201) {',
                    '    const response = pm.response.json();',
                    '    if (response.user && response.user._id) { pm.collectionVariables.set("userId", response.user._id); }',
                    '    if (response.refreshToken) { pm.collectionVariables.set("refreshToken", response.refreshToken); }',
                    '}',
                  ],
                },
              },
            ],
          },
          {
            name: '02 - Login',
            request: {
              method: 'POST',
              header: [{ key: 'Content-Type', value: 'application/json' }],
              body: {
                mode: 'raw',
                raw: JSON.stringify(
                  { identifier: '{{testEmail}}', password: '{{testPassword}}' },
                  null,
                  2,
                ),
              },
              url: {
                raw: '{{baseUrl}}/auth/login',
                host: ['{{baseUrl}}'],
                path: ['auth', 'login'],
              },
            },
            event: [
              {
                listen: 'test',
                script: {
                  type: 'text/javascript',
                  exec: [
                    'if (pm.response.code === 200) {',
                    '    const response = pm.response.json();',
                    '    if (response.accessToken) { pm.collectionVariables.set("accessToken", response.accessToken); }',
                    '    if (response.refreshToken) { pm.collectionVariables.set("refreshToken", response.refreshToken); }',
                    '    // Also try to capture refreshToken from Set-Cookie header',
                    '    const setCookieHeader = pm.response.headers.get("Set-Cookie");',
                    '    if (setCookieHeader) {',
                    '        const match = setCookieHeader.match(/refreshToken=([^;]+)/);',
                    '        if (match && match[1]) { pm.collectionVariables.set("refreshToken", match[1]); }',
                    '    }',
                    '}',
                  ],
                },
              },
            ],
          },
          {
            name: '03 - Create Post',
            request: {
              auth: {
                type: 'bearer',
                bearer: [{ key: 'token', value: '{{accessToken}}' }],
              },
              method: 'POST',
              header: [{ key: 'Content-Type', value: 'application/json' }],
              body: {
                mode: 'raw',
                raw: JSON.stringify(
                  {
                    title: 'Test Post',
                    body: 'Test content for post creation',
                  },
                  null,
                  2,
                ),
              },
              url: {
                raw: '{{baseUrl}}/posts',
                host: ['{{baseUrl}}'],
                path: ['posts'],
              },
            },
            event: [
              {
                listen: 'test',
                script: {
                  type: 'text/javascript',
                  exec: [
                    'if (pm.response.code === 201) {',
                    '    const response = pm.response.json();',
                    '    pm.test("Post created successfully", function() {',
                    '        pm.expect(response.success).to.be.true;',
                    '        pm.expect(response.data).to.have.property("title", "Test Post");',
                    '        pm.expect(response.data).to.have.property("body", "Test content for post creation");',
                    '        pm.expect(response.data).to.have.property("authorId");',
                    '        pm.expect(response.data).to.have.property("author");',
                    '    });',
                    '    if (response.data && response.data._id) { pm.collectionVariables.set("postId", response.data._id); }',
                    '}',
                  ],
                },
              },
            ],
          },
          {
            name: '04 - Get All Posts',
            request: {
              method: 'GET',
              url: {
                raw: '{{baseUrl}}/posts?limit=10',
                host: ['{{baseUrl}}'],
                path: ['posts'],
                query: [{ key: 'limit', value: '10' }],
              },
            },
            event: [
              {
                listen: 'test',
                script: {
                  type: 'text/javascript',
                  exec: [
                    'if (pm.response.code === 200) {',
                    '    const response = pm.response.json();',
                    '    pm.test("Posts retrieved successfully", function() {',
                    '        pm.expect(response.success).to.be.true;',
                    '        pm.expect(response.data).to.be.an("array");',
                    '    });',
                    '    if (response.data && response.data.length > 0) {',
                    '        const post = response.data[0];',
                    '        pm.collectionVariables.set("postId", post._id);',
                    '        pm.test("Post has correct structure", function() {',
                    '            pm.expect(post).to.have.property("authorId");',
                    '            pm.expect(post).to.have.property("author");',
                    '            pm.expect(post).to.have.property("title");',
                    '            pm.expect(post).to.have.property("body");',
                    '            pm.expect(post).to.have.property("createdAt");',
                    '            pm.expect(post).to.have.property("recentComments").that.is.an("array");',
                    '        });',
                    '    }',
                    '}',
                  ],
                },
              },
            ],
          },
          {
            name: '05 - Create Comment',
            request: {
              auth: {
                type: 'bearer',
                bearer: [{ key: 'token', value: '{{accessToken}}' }],
              },
              method: 'POST',
              header: [{ key: 'Content-Type', value: 'application/json' }],
              body: {
                mode: 'raw',
                raw: JSON.stringify(
                  {
                    postId: '{{postId}}',
                    body: 'Test comment for comment creation',
                  },
                  null,
                  2,
                ),
              },
              url: {
                raw: '{{baseUrl}}/comments',
                host: ['{{baseUrl}}'],
                path: ['comments'],
              },
            },
            event: [
              {
                listen: 'test',
                script: {
                  type: 'text/javascript',
                  exec: [
                    'if (pm.response.code === 201) {',
                    '    const response = pm.response.json();',
                    '    pm.test("Comment created successfully", function() {',
                    '        pm.expect(response.success).to.be.true;',
                    '        pm.expect(response.data).to.have.property("postId", pm.collectionVariables.get("postId"));',
                    '        pm.expect(response.data).to.have.property("authorId");',
                    '        pm.expect(response.data).to.have.property("name");',
                    '        pm.expect(response.data).to.have.property("email");',
                    '        pm.expect(response.data).to.have.property("body", "Test comment for comment creation");',
                    '        pm.expect(response.data).to.have.property("createdAt");',
                    '    });',
                    '    if (response.data && response.data._id) { pm.collectionVariables.set("commentId", response.data._id); }',
                    '}',
                  ],
                },
              },
            ],
          },
          {
            name: '06 - Get Post Comments',
            request: {
              method: 'GET',
              url: {
                raw: '{{baseUrl}}/comments/post/{{postId}}?limit=10',
                host: ['{{baseUrl}}'],
                path: ['comments', 'post', '{{postId}}'],
                query: [{ key: 'limit', value: '10' }],
              },
            },
            event: [
              {
                listen: 'test',
                script: {
                  type: 'text/javascript',
                  exec: [
                    'if (pm.response.code === 200) {',
                    '    const response = pm.response.json();',
                    '    pm.test("Comments retrieved successfully", function() {',
                    '        pm.expect(response.success).to.be.true;',
                    '        pm.expect(response.data).to.be.an("array");',
                    '    });',
                    '    if (response.data && response.data.length > 0) {',
                    '        const comment = response.data[0];',
                    '        pm.test("Comment has correct structure", function() {',
                    '            pm.expect(comment).to.have.property("postId");',
                    '            pm.expect(comment).to.have.property("authorId");',
                    '            pm.expect(comment).to.have.property("name");',
                    '            pm.expect(comment).to.have.property("email");',
                    '            pm.expect(comment).to.have.property("body");',
                    '            pm.expect(comment).to.have.property("createdAt");',
                    '        });',
                    '        // Save first comment ID for update/delete tests',
                    '        pm.collectionVariables.set("commentId", comment._id);',
                    '        console.log("✅ Saved commentId:", comment._id);',
                    '    } else {',
                    '        console.log("⚠️ No comments found to get commentId");',
                    '    }',
                    '}',
                  ],
                },
              },
            ],
          },
          {
            name: '07 - Refresh Token',
            request: {
              method: 'POST',
              header: [
                { key: 'Content-Type', value: 'application/json' },
              ],
              body: {
                mode: 'raw',
                raw: JSON.stringify({ refreshToken: '{{refreshToken}}' }, null, 2),
              },
              url: {
                raw: '{{baseUrl}}/auth/refresh',
                host: ['{{baseUrl}}'],
                path: ['auth', 'refresh'],
              },
            },
            event: [
              {
                listen: 'test',
                script: {
                  type: 'text/javascript',
                  exec: [
                    'if (pm.response.code === 200) {',
                    '    const response = pm.response.json();',
                    '    if (response.accessToken) { pm.collectionVariables.set("accessToken", response.accessToken); }',
                    '    // Capture new refreshToken from Set-Cookie header (token rotation)',
                    '    const setCookieHeader = pm.response.headers.get("Set-Cookie");',
                    '    if (setCookieHeader) {',
                    '        const match = setCookieHeader.match(/refreshToken=([^;]+)/);',
                    '        if (match && match[1]) {',
                    '            pm.collectionVariables.set("refreshToken", match[1]);',
                    '            console.log("✅ Refresh token rotated successfully");',
                    '        }',
                    '    }',
                    '}',
                  ],
                },
              },
            ],
          },
          {
            name: '08 - Verify Token',
            request: {
              auth: {
                type: 'bearer',
                bearer: [{ key: 'token', value: '{{accessToken}}' }],
              },
              method: 'GET',
              url: {
                raw: '{{baseUrl}}/users/me',
                host: ['{{baseUrl}}'],
                path: ['users', 'me'],
              },
            },
            event: [
              {
                listen: 'test',
                script: {
                  type: 'text/javascript',
                  exec: [
                    'if (pm.response.code === 200) {',
                    '    const response = pm.response.json();',
                    '    pm.test("Access token is valid", function() {',
                    '        pm.expect(response.success).to.be.true;',
                    '        pm.expect(response.user).to.have.property("_id");',
                    '        pm.expect(response.user).to.have.property("username");',
                    '        pm.expect(response.user).to.have.property("email");',
                    '    });',
                    '}',
                  ],
                },
              },
            ],
          },
          {
            name: '09 - Update Post',
            request: {
              auth: {
                type: 'bearer',
                bearer: [{ key: 'token', value: '{{accessToken}}' }],
              },
              method: 'PUT',
              header: [{ key: 'Content-Type', value: 'application/json' }],
              body: {
                mode: 'raw',
                raw: JSON.stringify(
                  {
                    title: 'Updated Test Post',
                    body: 'Updated test content for post editing',
                  },
                  null,
                  2,
                ),
              },
              url: {
                raw: '{{baseUrl}}/posts/{{postId}}',
                host: ['{{baseUrl}}'],
                path: ['posts', '{{postId}}'],
              },
            },
            event: [
              {
                listen: 'test',
                script: {
                  type: 'text/javascript',
                  exec: [
                    'if (pm.response.code === 200) {',
                    '    const response = pm.response.json();',
                    '    pm.test("Post updated successfully", function() {',
                    '        pm.expect(response.success).to.be.true;',
                    '        pm.expect(response.data).to.have.property("title", "Updated Test Post");',
                    '        pm.expect(response.data).to.have.property("body", "Updated test content for post editing");',
                    '        pm.expect(response.data).to.have.property("updatedAt");',
                    '    });',
                    '}',
                  ],
                },
              },
            ],
          },
          {
            name: '10 - Update Comment',
            request: {
              auth: {
                type: 'bearer',
                bearer: [{ key: 'token', value: '{{accessToken}}' }],
              },
              method: 'PUT',
              header: [{ key: 'Content-Type', value: 'application/json' }],
              body: {
                mode: 'raw',
                raw: JSON.stringify(
                  {
                    body: 'Updated test comment for comment editing',
                  },
                  null,
                  2,
                ),
              },
              url: {
                raw: '{{baseUrl}}/comments/{{commentId}}',
                host: ['{{baseUrl}}'],
                path: ['comments', '{{commentId}}'],
              },
            },
            event: [
              {
                listen: 'test',
                script: {
                  type: 'text/javascript',
                  exec: [
                    'if (pm.response.code === 200) {',
                    '    const response = pm.response.json();',
                    '    pm.test("Comment updated successfully", function() {',
                    '        pm.expect(response.success).to.be.true;',
                    '        pm.expect(response.data).to.have.property("body", "Updated test comment for comment editing");',
                    '        pm.expect(response.data).to.have.property("updatedAt");',
                    '    });',
                    '}',
                  ],
                },
              },
            ],
          },
          {
            name: '11 - Delete Comment',
            request: {
              auth: {
                type: 'bearer',
                bearer: [{ key: 'token', value: '{{accessToken}}' }],
              },
              method: 'DELETE',
              url: {
                raw: '{{baseUrl}}/comments/{{commentId}}',
                host: ['{{baseUrl}}'],
                path: ['comments', '{{commentId}}'],
              },
            },
            event: [
              {
                listen: 'test',
                script: {
                  type: 'text/javascript',
                  exec: [
                    'if (pm.response.code === 200) {',
                    '    const response = pm.response.json();',
                    '    pm.test("Comment deleted successfully", function() {',
                    '        pm.expect(response.success).to.be.true;',
                    '        pm.expect(response.data).to.have.property("_id", pm.collectionVariables.get("commentId"));',
                    '    });',
                    '    pm.collectionVariables.unset("commentId");',
                    '}',
                  ],
                },
              },
            ],
          },
          {
            name: '12 - Delete Post',
            request: {
              auth: {
                type: 'bearer',
                bearer: [{ key: 'token', value: '{{accessToken}}' }],
              },
              method: 'DELETE',
              url: {
                raw: '{{baseUrl}}/posts/{{postId}}',
                host: ['{{baseUrl}}'],
                path: ['posts', '{{postId}}'],
              },
            },
            event: [
              {
                listen: 'test',
                script: {
                  type: 'text/javascript',
                  exec: [
                    'if (pm.response.code === 200) {',
                    '    const response = pm.response.json();',
                    '    pm.test("Post deleted successfully", function() {',
                    '        pm.expect(response.success).to.be.true;',
                    '        pm.expect(response.data).to.have.property("_id", pm.collectionVariables.get("postId"));',
                    '        pm.expect(response.data).to.have.property("deleted", true);',
                    '        pm.expect(response.data).to.have.property("deletedAt");',
                    '    });',
                    '    pm.collectionVariables.unset("postId");',
                    '}',
                  ],
                },
              },
            ],
          },
          {
            name: '13 - Logout',
            request: {
              auth: {
                type: 'bearer',
                bearer: [{ key: 'token', value: '{{accessToken}}' }],
              },
              method: 'POST',
              url: {
                raw: '{{baseUrl}}/auth/logout',
                host: ['{{baseUrl}}'],
                path: ['auth', 'logout'],
              },
            },
            event: [
              {
                listen: 'test',
                script: {
                  type: 'text/javascript',
                  exec: [
                    'if (pm.response.code === 200) {',
                    '    const response = pm.response.json();',
                    '    pm.test("Logout successful", function() {',
                    '        pm.expect(response.success).to.be.true;',
                    '    });',
                    '    pm.collectionVariables.unset("accessToken");',
                    '    pm.collectionVariables.unset("refreshToken");',
                    '}',
                  ],
                },
              },
            ],
          },
        ],
      },
      {
        name: '🔐 Authentication',
        item: [
          {
            name: 'Register',
            request: {
              method: 'POST',
              url: {
                raw: '{{baseUrl}}/auth/register',
                host: ['{{baseUrl}}'],
                path: ['auth', 'register'],
              },
            },
          },
          {
            name: 'Login',
            request: {
              method: 'POST',
              url: {
                raw: '{{baseUrl}}/auth/login',
                host: ['{{baseUrl}}'],
                path: ['auth', 'login'],
              },
            },
          },
          {
            name: 'Refresh Token',
            request: {
              method: 'POST',
              header: [
                { key: 'Content-Type', value: 'application/json' },
                { key: 'Cookie', value: 'refreshToken={{refreshToken}}' },
              ],
              url: {
                raw: '{{baseUrl}}/auth/refresh',
                host: ['{{baseUrl}}'],
                path: ['auth', 'refresh'],
              },
            },
          },
          {
            name: 'Logout',
            request: {
              auth: {
                type: 'bearer',
                bearer: [{ key: 'token', value: '{{accessToken}}' }],
              },
              method: 'POST',
              url: {
                raw: '{{baseUrl}}/auth/logout',
                host: ['{{baseUrl}}'],
                path: ['auth', 'logout'],
              },
            },
          },
        ],
      },
      {
        name: '📝 Posts',
        item: [
          {
            name: 'Get All Posts',
            request: {
              method: 'GET',
              url: {
                raw: '{{baseUrl}}/posts?limit=20',
                host: ['{{baseUrl}}'],
                path: ['posts'],
              },
            },
          },
          {
            name: 'Create Post',
            request: {
              auth: {
                type: 'bearer',
                bearer: [{ key: 'token', value: '{{accessToken}}' }],
              },
              method: 'POST',
              url: {
                raw: '{{baseUrl}}/posts',
                host: ['{{baseUrl}}'],
                path: ['posts'],
              },
            },
          },
        ],
      },
      {
        name: '💬 Comments',
        item: [
          {
            name: 'Get Comments',
            request: {
              method: 'GET',
              url: {
                raw: '{{baseUrl}}/comments/post/{{postId}}?limit=5',
                host: ['{{baseUrl}}'],
                path: ['comments', 'post', '{{postId}}'],
              },
            },
          },
          {
            name: 'Create Comment',
            request: {
              auth: {
                type: 'bearer',
                bearer: [{ key: 'token', value: '{{accessToken}}' }],
              },
              method: 'POST',
              url: {
                raw: '{{baseUrl}}/comments',
                host: ['{{baseUrl}}'],
                path: ['comments'],
              },
            },
          },
        ],
      },
    ],
  };


  const collectionPath = path.join(
    postmanDir,
    'Distributed Fullstack API.postman_collection.json',
  );
  fs.writeFileSync(collectionPath, JSON.stringify(postmanCollection, null, 2));
}
