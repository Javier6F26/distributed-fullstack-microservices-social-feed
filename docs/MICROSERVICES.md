# 📦 Documentación de Microservicios - Distributed Fullstack Microservices

## 📋 Índice

1. [API Gateway](#api-gateway)
2. [User Service](#user-service)
3. [Post Service](#post-service)
4. [Comment Service](#comment-service)
5. [Frontend](#frontend)
6. [Shared Types](#shared-types)

---

## 🚪 API Gateway

### Visión General

**Puerto:** `3000`  
**Propósito:** Punto de entrada único para todas las peticiones del cliente  
**Tecnologías:** NestJS 11+, @nestjs/throttler, @nestjs/cache-manager

### Responsabilidades

- ✅ Enrutamiento de peticiones a microservicios
- ✅ Autenticación y validación de JWT
- ✅ Rate limiting y protección DDoS
- ✅ Logging centralizado
- ✅ Manejo de errores global
- ✅ Documentación OpenAPI/Swagger

### Estructura del Proyecto

```
api-gateway/
├── src/
│   ├── app/
│   │   ├── auth/                  # Módulo de autenticación
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.module.ts
│   │   │   ├── strategies/
│   │   │   │   └── jwt.strategy.ts
│   │   │   └── dto/
│   │   │       ├── login.dto.ts
│   │   │       ├── register.dto.ts
│   │   │       └── refresh-token.dto.ts
│   │   ├── users/                 # Proxy a User Service
│   │   │   ├── users.controller.ts
│   │   │   ├── users.service.ts
│   │   │   └── users.module.ts
│   │   ├── posts/                 # Proxy a Post Service
│   │   │   ├── posts.controller.ts
│   │   │   ├── posts.service.ts
│   │   │   └── posts.module.ts
│   │   ├── comments/              # Proxy a Comment Service
│   │   │   ├── comments.controller.ts
│   │   │   ├── comments.service.ts
│   │   │   └── comments.module.ts
│   │   ├── filters/               # Filtros de excepciones
│   │   │   ├── http-exception.filter.ts
│   │   │   └── validation.filter.ts
│   │   ├── throttler/             # Configuración de rate limiting
│   │   │   └── throttler.module.ts
│   │   ├── rabbitmq/              # Configuración RabbitMQ
│   │   │   └── rabbitmq.module.ts
│   │   ├── logging/               # Logging centralizado
│   │   │   └── logging.interceptor.ts
│   │   ├── app.controller.ts
│   │   ├── app.service.ts
│   │   └── app.module.ts
│   ├── assets/
│   │   └── openapi.yaml
│   └── main.ts
├── .env
├── .env.example
├── Dockerfile
├── jest.config.cts
├── package.json
├── tsconfig.json
└── webpack.config.js
```

### Endpoints

#### Autenticación

| Método | Endpoint | Descripción | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/v1/auth/register` | Registrar nuevo usuario | ❌ |
| POST | `/api/v1/auth/login` | Login de usuario | ❌ |
| POST | `/api/v1/auth/refresh` | Refresh de token | ❌ |
| POST | `/api/v1/auth/logout` | Logout de usuario | ✅ |
| DELETE | `/api/v1/auth/account` | Eliminar cuenta | ✅ |

#### Posts

| Método | Endpoint | Descripción | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/posts` | Obtener todos los posts | ❌ |
| GET | `/api/v1/posts/search` | Buscar posts por texto | ❌ |
| GET | `/api/v1/posts/filter` | Filtrar posts por fecha | ❌ |
| GET | `/api/v1/posts/search-filter` | Buscar y filtrar posts | ❌ |
| POST | `/api/v1/posts` | Crear nuevo post | ✅ |

#### Comentarios

| Método | Endpoint | Descripción | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/comments/post/:id` | Obtener comentarios recientes de un post | ❌ |
| GET | `/api/v1/comments/post/:id/all` | Obtener todos los comentarios | ❌ |
| POST | `/api/v1/comments` | Crear nuevo comentario | ✅ |

### Ejemplos de Uso

#### Registrar Usuario

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@ejemplo.com",
    "password": "Password123!",
    "name": "Juan Pérez"
  }'
```

**Respuesta Exitosa:**
```json
{
  "success": true,
  "message": "Usuario registrado exitosamente",
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "email": "usuario@ejemplo.com",
    "name": "Juan Pérez",
    "createdAt": "2026-03-13T10:30:00Z"
  }
}
```

#### Login

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@ejemplo.com",
    "password": "Password123!"
  }'
```

**Respuesta Exitosa:**
```json
{
  "success": true,
  "message": "Login exitoso",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "d9f8e7c6b5a4...",
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "usuario@ejemplo.com",
      "name": "Juan Pérez"
    }
  }
}
```

#### Crear Post

```bash
curl -X POST http://localhost:3000/api/v1/posts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "title": "Mi primer post",
    "content": "Este es el contenido del post",
    "tags": ["intro", "bienvenida"]
  }'
```

### Rate Limiting

El API Gateway implementa rate limiting con las siguientes configuraciones:

| Ventana | Límite | Propósito |
|---------|--------|-----------|
| 1 segundo | 10 peticiones | Prevenir abuso inmediato |
| 1 minuto | 100 peticiones | Control de tráfico normal |
| 1 hora | 1000 peticiones | Límite diario suave |

**Respuesta cuando se excede el límite:**
```json
{
  "success": false,
  "message": "Too Many Requests",
  "status": 429
}
```

### Configuración

```bash
# .env
API_GATEWAY_PORT=3000
USER_SERVICE_URL=http://localhost:3001
POST_SERVICE_URL=http://localhost:3002
COMMENT_SERVICE_URL=http://localhost:3003

# JWT
JWT_SECRET=tu-secreto-super-seguro
JWT_EXPIRES_IN=15m

# RabbitMQ
RABBITMQ_URI=amqp://localhost:5672

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Rate Limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=100
```

---

## 👤 User Service

### Visión General

**Puerto:** `3001`  
**Propósito:** Gestión completa de usuarios y autenticación  
**Tecnologías:** NestJS 11+, Mongoose, JWT, bcrypt

### Responsabilidades

- ✅ Registro de usuarios
- ✅ Autenticación (login/logout)
- ✅ Gestión de tokens de refresco
- ✅ Perfil de usuario
- ✅ Eliminación de cuenta (GDPR compliant)
- ✅ Hashing de contraseñas

### Estructura del Proyecto

```
user-service/
├── src/
│   ├── app/
│   │   ├── auth/                  # Autenticación
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.module.ts
│   │   │   └── dto/
│   │   │       ├── login.dto.ts
│   │   │       └── register.dto.ts
│   │   ├── users/                 # Gestión de usuarios
│   │   │   ├── users.controller.ts
│   │   │   ├── users.service.ts
│   │   │   ├── users.module.ts
│   │   │   └── dto/
│   │   │       ├── create-user.dto.ts
│   │   │       ├── update-user.dto.ts
│   │   │       └── user-response.dto.ts
│   │   ├── refresh-token/         # Refresh tokens
│   │   │   ├── refresh-token.service.ts
│   │   │   ├── refresh-token.module.ts
│   │   │   └── schemas/
│   │   │       └── refresh-token.schema.ts
│   │   ├── schemas/               # Esquemas Mongoose
│   │   │   └── user.schema.ts
│   │   ├── app.controller.ts
│   │   ├── app.service.ts
│   │   └── app.module.ts
│   └── main.ts
├── scripts/
│   └── reset-and-seed.js          # Script de seed de BD
├── .env
├── Dockerfile
├── jest.config.cts
├── package.json
└── tsconfig.json
```

### Esquemas de Base de Datos

#### User Schema

```typescript
// schemas/user.schema.ts
@Schema({
  timestamps: true,
  collection: 'users',
})
export class User {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true, minlength: 8 })
  password: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  deletedAt: Date | null;

  @Prop()
  deletionRequestedAt: Date | null;
}
```

#### RefreshToken Schema

```typescript
// schemas/refresh-token.schema.ts
@Schema({
  timestamps: true,
  collection: 'refresh_tokens',
})
export class RefreshToken {
  @Prop({ required: true, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ required: true })
  token: string; // Hashed

  @Prop({ required: true, expires: 604800 }) // 7 days
  expiresAt: Date;

  @Prop({ default: false })
  isRevoked: boolean;
}
```

### Endpoints

#### Autenticación

| Método | Endpoint | Descripción | Body |
|--------|----------|-------------|------|
| POST | `/auth/register` | Registrar usuario | `{ email, password, name }` |
| POST | `/auth/login` | Login | `{ email, password }` |
| POST | `/auth/refresh` | Refresh token | `{ refreshToken }` |
| POST | `/auth/logout` | Logout | `{ refreshToken }` |

#### Usuarios

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/users/profile` | Obtener perfil actual | ✅ |
| PUT | `/users/profile` | Actualizar perfil | ✅ |
| DELETE | `/users/:id` | Eliminar usuario (admin) | ✅ Admin |

#### Eliminación de Cuenta (GDPR)

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | `/deletion/request` | Solicitar eliminación | ✅ |
| GET | `/deletion/status` | Estado de eliminación | ✅ |
| POST | `/deletion/cancel` | Cancelar eliminación | ✅ |

### Ejemplos de Uso

#### Registrar Usuario

```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "juan@ejemplo.com",
    "password": "SecurePass123!",
    "name": "Juan Pérez"
  }'
```

#### Login

```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "juan@ejemplo.com",
    "password": "SecurePass123!"
  }'
```

#### Solicitar Eliminación de Cuenta

```bash
curl -X POST http://localhost:3001/deletion/request \
  -H "Authorization: Bearer <token>"
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Solicitud de eliminación procesada. Tu cuenta será eliminada en 30 días.",
  "data": {
    "deletionRequestedAt": "2026-03-13T10:30:00Z",
    "scheduledDeletionDate": "2026-04-12T10:30:00Z"
  }
}
```

### Flujo de Autenticación

```
1. Usuario envía credenciales
2. Servicio valida email/password
3. Si es válido:
   - Genera JWT access token (15 min)
   - Genera refresh token (7 días)
   - Almacena refresh token hash en BD
4. Retorna tokens al cliente
5. Cliente usa access token en cada request
6. Cuando expira, usa refresh token para obtener nuevo access token
```

### Seguridad

**Password Hashing:**
```typescript
// Antes de guardar
const salt = await bcrypt.genSalt(10);
const hashedPassword = await bcrypt.hash(password, salt);

// Para validar
const isValid = await bcrypt.compare(password, hashedPassword);
```

**JWT Payload:**
```typescript
const payload = {
  sub: user._id,
  email: user.email,
  name: user.name,
};

const accessToken = this.jwtService.sign(payload, {
  expiresIn: '15m',
  secret: process.env.JWT_SECRET,
});
```

### Scripts Disponibles

```bash
# Resetear y seedear la base de datos de usuarios (solo User Service)
cd user-service && npm run db:reset
```

---

## 📝 Post Service

### Visión General

**Puerto:** `3002`  
**Propósito:** Gestión de publicaciones y contenido  
**Tecnologías:** NestJS 11+, Mongoose, RabbitMQ, Redis

### Responsabilidades

- ✅ CRUD de posts
- ✅ Búsqueda y filtrado
- ✅ Sincronización con Comment Service vía RabbitMQ
- ✅ Cacheo de feeds con Redis
- ✅ Conteo de comentarios (denormalizado)

### Estructura del Proyecto

```
post-service/
├── src/
│   ├── app/
│   │   ├── posts/                 # Gestión de posts
│   │   │   ├── posts.controller.ts
│   │   │   ├── posts.service.ts
│   │   │   ├── posts.module.ts
│   │   │   └── dto/
│   │   │       ├── create-post.dto.ts
│   │   │       ├── update-post.dto.ts
│   │   │       └── post-response.dto.ts
│   │   ├── rabbitmq/              # Event handlers
│   │   │   ├── rabbitmq.module.ts
│   │   │   └── comment-count.handler.ts
│   │   ├── schemas/               # Esquemas Mongoose
│   │   │   └── post.schema.ts
│   │   ├── app.controller.ts
│   │   ├── app.service.ts
│   │   └── app.module.ts
│   └── main.ts
├── .env
├── Dockerfile
├── jest.config.cts
├── package.json
└── tsconfig.json
```

### Esquemas de Base de Datos

#### Post Schema

```typescript
// schemas/post.schema.ts
@Schema({
  timestamps: true,
  collection: 'posts',
})
export class Post {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true })
  content: string;

  @Prop([String])
  tags: string[];

  @Prop({ default: 0 })
  commentCount: number; // Denormalizado desde Comment Service

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop()
  deletedAt: Date | null;
}

// Índices
PostSchema.index({ userId: 1, createdAt: -1 });
PostSchema.index({ title: 'text', content: 'text' });
PostSchema.index({ tags: 1 });
```

### Endpoints

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/posts` | Obtener todos los posts | ❌ |
| GET | `/posts/search` | Buscar posts por texto | ❌ |
| GET | `/posts/filter` | Filtrar por fecha | ❌ |
| GET | `/posts/search-filter` | Buscar y filtrar | ❌ |
| POST | `/posts` | Crear post | ✅ |
| PUT | `/posts/:id` | Actualizar post | ✅ Owner |
| DELETE | `/posts/:id` | Eliminar post | ✅ Owner |
| GET | `/posts/user/:userId` | Posts por usuario | ❌ |

### Ejemplos de Uso

#### Crear Post

```bash
curl -X POST http://localhost:3002/posts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "title": "Mi primer post",
    "content": "Este es el contenido del post",
    "tags": ["intro", "bienvenida"]
  }'
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Post creado exitosamente",
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "userId": "507f191e810c19729de860ea",
    "title": "Mi primer post",
    "content": "Este es el contenido del post",
    "tags": ["intro", "bienvenida"],
    "commentCount": 0,
    "createdAt": "2026-03-13T10:30:00Z",
    "updatedAt": "2026-03-13T10:30:00Z"
  }
}
```

#### Buscar Posts

```bash
# Búsqueda por texto
curl -X GET "http://localhost:3002/posts/search?q=intro"

# Filtrar por fecha
curl -X GET "http://localhost:3002/posts/filter?startDate=2026-01-01&endDate=2026-12-31"

# Búsqueda + filtrado
curl -X GET "http://localhost:3002/posts/search-filter?q=intro&startDate=2026-01-01"
```

### Integración con RabbitMQ

#### Publicar Evento

```typescript
// posts.service.ts
async create(createPostDto: CreatePostDto): Promise<Post> {
  const post = await this.postModel.create(createPostDto);
  
  // Publicar evento
  await this.amqpConnection.publish('posts', 'post.created', {
    postId: post._id.toString(),
    userId: post.userId,
    timestamp: new Date(),
  });
  
  // Invalidar cache
  await this.cacheManager.del('posts:all');
  
  return post;
}
```

#### Suscribirse a Eventos

```typescript
// comment-count.handler.ts
@RabbitSubscribe({
  exchange: 'comments',
  routingKey: 'comment.created',
  queue: 'post_comment_created_queue',
})
async handleCommentCreated(event: CommentCreatedEvent) {
  await this.postModel.findByIdAndUpdate(event.postId, {
    $inc: { commentCount: 1 },
  });
}

@RabbitSubscribe({
  exchange: 'comments',
  routingKey: 'comment.deleted',
  queue: 'post_comment_deleted_queue',
})
async handleCommentDeleted(event: CommentDeletedEvent) {
  await this.postModel.findByIdAndUpdate(event.postId, {
    $inc: { commentCount: -1 },
  });
}
```

### Caché con Redis

```typescript
// posts.service.ts
async findAll(): Promise<Post[]> {
  // Intentar obtener de cache
  const cached = await this.cacheManager.get<Post[]>('posts:all');
  if (cached) {
    return cached;
  }
  
  // Obtener de BD
  const posts = await this.postModel.find().sort({ createdAt: -1 }).exec();
  
  // Guardar en cache (1 minuto)
  await this.cacheManager.set('posts:all', posts, 60000);
  
  return posts;
}
```

---

## 💬 Comment Service

### Visión General

**Puerto:** `3003`  
**Propósito:** Gestión de comentarios en posts  
**Tecnologías:** NestJS 11+, Mongoose, RabbitMQ, Redis

### Responsabilidades

- ✅ CRUD de comentarios
- ✅ Sincronización con Post Service
- ✅ Conteo de comentarios por post
- ✅ Anonimización de comentarios
- ✅ Soporte para respuestas (nested comments)

### Estructura del Proyecto

```
comment-service/
├── src/
│   ├── app/
│   │   ├── comments/              # Gestión de comentarios
│   │   │   ├── comments.controller.ts
│   │   │   ├── comments.service.ts
│   │   │   ├── comments.module.ts
│   │   │   └── dto/
│   │   │       ├── create-comment.dto.ts
│   │   │       ├── update-comment.dto.ts
│   │   │       └── comment-response.dto.ts
│   │   ├── comments-sync/         # Sincronización
│   │   │   └── post-sync.handler.ts
│   │   ├── rabbitmq/              # Event handlers
│   │   │   ├── rabbitmq.module.ts
│   │   │   └── events/
│   │   ├── schemas/               # Esquemas Mongoose
│   │   │   └── comment.schema.ts
│   │   ├── app.controller.ts
│   │   ├── app.service.ts
│   │   └── app.module.ts
│   └── main.ts
├── .env
├── Dockerfile
├── jest.config.cts
├── package.json
└── tsconfig.json
```

### Esquemas de Base de Datos

#### Comment Schema

```typescript
// schemas/comment.schema.ts
@Schema({
  timestamps: true,
  collection: 'comments',
})
export class Comment {
  @Prop({ required: true })
  postId: string;

  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  content: string;

  @Prop({ ref: 'Comment', default: null })
  parentId: Types.ObjectId | null; // Para respuestas

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop({ default: false })
  isAnonymized: boolean;

  @Prop()
  deletedAt: Date | null;
}

// Índices
CommentSchema.index({ postId: 1, createdAt: -1 });
CommentSchema.index({ userId: 1 });
CommentSchema.index({ parentId: 1 });
```

### Endpoints

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/comments/post/:id` | Comentarios recientes (paginados) | ❌ |
| GET | `/comments/post/:id/all` | Todos los comentarios | ❌ |
| POST | `/comments` | Crear comentario | ✅ |
| PUT | `/comments/:id` | Actualizar comentario | ✅ Owner |
| DELETE | `/comments/:id` | Eliminar comentario | ✅ Owner |
| GET | `/comments/:id/replies` | Respuestas a comentario | ❌ |

### Ejemplos de Uso

#### Crear Comentario

```bash
curl -X POST http://localhost:3003/comments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "postId": "507f1f77bcf86cd799439011",
    "content": "Excelente post! Muy útil."
  }'
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Comentario creado exitosamente",
  "data": {
    "id": "507f1f77bcf86cd799439012",
    "postId": "507f1f77bcf86cd799439011",
    "userId": "507f191e810c19729de860ea",
    "content": "Excelente post! Muy útil.",
    "parentId": null,
    "isDeleted": false,
    "createdAt": "2026-03-13T10:30:00Z",
    "updatedAt": "2026-03-13T10:30:00Z"
  }
}
```

#### Crear Respuesta

```bash
curl -X POST http://localhost:3003/comments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "postId": "507f1f77bcf86cd799439011",
    "content": "Gracias por tu comentario!",
    "parentId": "507f1f77bcf86cd799439012"
  }'
```

#### Obtener Comentarios de un Post

```bash
# Comentarios recientes (últimos 10)
curl -X GET http://localhost:3003/comments/post/507f1f77bcf86cd799439011

# Todos los comentarios
curl -X GET http://localhost:3003/comments/post/507f1f77bcf86cd799439011/all
```

### Integración con RabbitMQ

#### Publicar Evento

```typescript
// comments.service.ts
async create(createCommentDto: CreateCommentDto): Promise<Comment> {
  const comment = await this.commentModel.create(createCommentDto);
  
  // Publicar evento
  await this.amqpConnection.publish('comments', 'comment.created', {
    commentId: comment._id.toString(),
    postId: comment.postId,
    userId: comment.userId,
    timestamp: new Date(),
  });
  
  return comment;
}
```

#### Suscribirse a Eventos de Posts

```typescript
// post-sync.handler.ts
@RabbitSubscribe({
  exchange: 'posts',
  routingKey: 'post.deleted',
  queue: 'comment_post_deleted_queue',
})
async handlePostDeleted(event: PostDeletedEvent) {
  // Anonimizar comentarios del post eliminado
  await this.commentModel.updateMany(
    { postId: event.postId },
    {
      isAnonymized: true,
      content: '[Comentario de post eliminado]',
    }
  );
}
```

### Anonimización de Comentarios

```typescript
// comments.service.ts
async anonymizeUserComments(userId: string): Promise<void> {
  await this.commentModel.updateMany(
    { userId },
    {
      isAnonymized: true,
      content: '[Comentario anonimizado]',
      userId: 'anonymous',
    }
  );
}
```

---

## 🎨 Frontend

### Visión General

**Puerto:** `4200`  
**Propósito:** Interfaz de usuario de la aplicación  
**Tecnologías:** Angular 21+, TailwindCSS 4.2+, Signals

### Responsabilidades

- ✅ Renderizado de UI
- ✅ Gestión de estado con Signals
- ✅ Comunicación con API Gateway
- ✅ Autenticación en cliente
- ✅ Manejo de errores y loading states
- ✅ Virtual scrolling para rendimiento

### Estructura del Proyecto

```
frontend/
├── src/
│   ├── app/
│   │   ├── features/
│   │   │   ├── auth/                # Feature de autenticación
│   │   │   │   ├── pages/
│   │   │   │   │   ├── login-page/
│   │   │   │   │   └── register-page/
│   │   │   │   ├── components/
│   │   │   │   │   ├── login-form/
│   │   │   │   │   └── register-form/
│   │   │   │   └── auth.routes.ts
│   │   │   ├── posts/               # Feature de posts
│   │   │   │   ├── pages/
│   │   │   │   │   ├── feed-page/
│   │   │   │   │   └── create-post-page/
│   │   │   │   ├── components/
│   │   │   │   │   ├── post-list/
│   │   │   │   │   ├── post-card/
│   │   │   │   │   └── create-post-form/
│   │   │   │   └── posts.routes.ts
│   │   │   └── comments/            # Feature de comentarios
│   │   │       ├── components/
│   │   │       │   ├── comment-list/
│   │   │       │   ├── comment-card/
│   │   │       │   └── comment-form/
│   │   │       └── comments.routes.ts
│   │   ├── core/                    # Servicios core
│   │   │   ├── interceptors/
│   │   │   │   ├── auth.interceptor.ts
│   │   │   │   └── error.interceptor.ts
│   │   │   └── services/
│   │   │       ├── auth.service.ts
│   │   │       ├── posts.service.ts
│   │   │       └── comments.service.ts
│   │   ├── guards/                  # Route guards
│   │   │   └── auth.guard.ts
│   │   ├── services/                # Servicios compartidos
│   │   │   └── notification.service.ts
│   │   ├── components/              # Componentes UI compartidos
│   │   │   ├── header/
│   │   │   ├── footer/
│   │   │   └── loading-spinner/
│   │   ├── app.config.ts
│   │   ├── app.routes.ts
│   │   ├── app.ts
│   │   └── app.scss
│   ├── environments/
│   │   ├── environment.ts
│   │   └── environment.prod.ts
│   ├── public/
│   │   └── favicon.ico
│   ├── index.html
│   └── main.ts
├── project.json
├── tailwind.config.js
├── tsconfig.json
└── Dockerfile
```

### Componentes Principales

#### PostCardComponent

```typescript
// features/posts/components/post-card/post-card.component.ts
@Component({
  selector: 'app-post-card',
  templateUrl: './post-card.component.html',
  styleUrls: ['./post-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PostCardComponent {
  // Inputs con Signals
  post = input.required<Post>();
  showComments = input<boolean>(false);
  
  // Outputs para eventos
  deletePost = output<string>();
  
  // Estado interno con Signals
  private commentsService = inject(CommentsService);
  comments = this.commentsService.comments;
}
```

#### FeedComponent con Virtual Scrolling

```typescript
// features/posts/pages/feed-page/feed-page.component.ts
@Component({
  selector: 'app-feed-page',
  template: `
    <cdk-virtual-scroll-viewport
      [itemSize]="200"
      class="feed-viewport"
    >
      <app-post-card
        *cdkVirtualFor="let post of posts()"
        [post]="post"
      />
    </cdk-virtual-scroll-viewport>
  `,
})
export class FeedPageComponent {
  private postsService = inject(PostsService);
  posts = this.postsService.posts; // Signal
}
```

### Servicios

#### Auth Service

```typescript
// core/services/auth.service.ts
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  
  // Estado de autenticación con Signal
  private currentUserSig = signal<User | null>(null);
  public currentUser = this.currentUserSig.asReadonly();
  
  login(credentials: LoginCredentials): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/api/v1/auth/login', credentials).pipe(
      tap(response => {
        // Guardar tokens
        localStorage.setItem('accessToken', response.data.accessToken);
        this.currentUserSig.set(response.data.user);
      })
    );
  }
  
  logout(): Observable<void> {
    return this.http.post<void>('/api/v1/auth/logout', {}).pipe(
      tap(() => {
        localStorage.removeItem('accessToken');
        this.currentUserSig.set(null);
        this.router.navigate(['/auth/login']);
      })
    );
  }
}
```

#### Posts Service

```typescript
// core/services/posts.service.ts
@Injectable({ providedIn: 'root' })
export class PostsService {
  private http = inject(HttpClient);
  
  // Signal para estado de posts
  private postsSig = signal<Post[]>([]);
  public posts = this.postsSig.asReadonly();
  
  // Loading state
  private loadingSig = signal(false);
  public loading = this.loadingSig.asReadonly();
  
  loadPosts(): Observable<Post[]> {
    this.loadingSig.set(true);
    return this.http.get<Post[]>('/api/v1/posts').pipe(
      tap(posts => {
        this.postsSig.set(posts);
        this.loadingSig.set(false);
      })
    );
  }
  
  createPost(dto: CreatePostDto): Observable<Post> {
    return this.http.post<Post>('/api/v1/posts', dto).pipe(
      tap(newPost => {
        const current = this.postsSig();
        this.postsSig.set([newPost, ...current]);
      })
    );
  }
}
```

### Guards

#### Auth Guard

```typescript
// guards/auth.guard.ts
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  const user = authService.currentUser();
  
  if (user) {
    return true;
  }
  
  // Redirigir a login
  router.navigate(['/auth/login'], {
    queryParams: { returnUrl: state.url }
  });
  return false;
};
```

### Interceptors

#### Auth Interceptor

```typescript
// core/interceptors/auth.interceptor.ts
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('accessToken');
  
  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }
  
  return next(req);
};
```

#### Error Interceptor

```typescript
// core/interceptors/error.interceptor.ts
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notificationService = inject(NotificationService);
  
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let message = 'Ocurrió un error inesperado';
      
      if (error.error?.message) {
        message = error.error.message;
      }
      
      notificationService.showError(message);
      return throwError(() => error);
    })
  );
};
```

### Estilos con TailwindCSS

```scss
// app.scss
@import "tailwindcss";

// Custom styles
.feed-viewport {
  height: calc(100vh - 120px);
  overflow-y: auto;
}

.post-card {
  @apply bg-white rounded-lg shadow-md p-4 mb-4;
  
  &:hover {
    @apply shadow-lg;
  }
}
```

### Environment Configuration

```typescript
// environments/environment.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api/v1',
};

// environments/environment.prod.ts
export const environment = {
  production: true,
  apiUrl: '/api/v1', // Proxy en producción
};
```

---

## 📦 Shared Types

### Visión General

**Propósito:** Tipos y DTOs compartidos entre frontend y backend  
**Ubicación:** `shared-types/`

### Estructura

```
shared-types/
└── src/
    └── lib/
        ├── user.dto.ts
        ├── post.dto.ts
        ├── comment.dto.ts
        ├── auth.dto.ts
        └── shared-types.ts
```

### DTOs Compartidos

#### User DTOs

```typescript
// user.dto.ts
export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserDto {
  email: string;
  password: string;
  name: string;
}

export interface UpdateUserDto {
  email?: string;
  name?: string;
}
```

#### Post DTOs

```typescript
// post.dto.ts
export interface Post {
  id: string;
  userId: string;
  title: string;
  content: string;
  tags: string[];
  commentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePostDto {
  title: string;
  content: string;
  tags?: string[];
}

export interface UpdatePostDto {
  title?: string;
  content?: string;
  tags?: string[];
}
```

#### Comment DTOs

```typescript
// comment.dto.ts
export interface Comment {
  id: string;
  postId: string;
  userId: string;
  content: string;
  parentId: string | null;
  isAnonymized: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCommentDto {
  postId: string;
  content: string;
  parentId?: string | null;
}
```

#### Response Wrapper

```typescript
// shared-types.ts
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
}

export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
```

---

## 🔧 Comandos Útiles por Servicio

### API Gateway

```bash
# Desarrollo
npx nx serve api-gateway

# Build
npx nx build api-gateway

# Linting
npx nx lint api-gateway

# Docker
docker build -f api-gateway/Dockerfile -t api-gateway:latest .
```

### User Service

```bash
# Desarrollo
npx nx serve user-service

# Build
npx nx build user-service

# Seed de BD
cd user-service && npm run db:reset

# Docker
docker build -f user-service/Dockerfile -t user-service:latest .
```

### Post Service

```bash
# Desarrollo
npx nx serve post-service

# Build
npx nx build post-service

# Docker
docker build -f post-service/Dockerfile -t post-service:latest .
```

### Comment Service

```bash
# Desarrollo
npx nx serve comment-service

# Build
npx nx build comment-service

# Docker
docker build -f comment-service/Dockerfile -t comment-service:latest .
```

### Frontend

```bash
# Desarrollo
npx nx serve frontend

# Build (producción)
npx nx build frontend

# Docker
docker build -f frontend/Dockerfile -t frontend:latest .
```

---

## 🧪 Tests por Servicio

Cada microservicio incluye tests unitarios para validar su lógica de negocio.

### User Service

```bash
npx nx test user-service
```

**Archivos de test:**
- `src/app/users/users.service.spec.ts` - 14 tests
- `src/app/auth/auth.service.spec.ts` - 11 tests

### Post Service

```bash
npx nx test post-service
```

**Archivos de test:**
- `src/app/posts/posts.service.spec.ts` - 15 tests

### Comment Service

```bash
npx nx test comment-service
```

**Archivos de test:**
- `src/app/comments/comments.service.spec.ts` - 14 tests

### API Gateway

```bash
npx nx test api-gateway
```

**Archivos de test:**
- `src/app/auth/auth.service.spec.ts` - 4 tests
- `src/app/rabbitmq/rabbitmq.service.spec.ts` - 8 tests

**Total: 66 tests (65 passing, 1 skipped)**

Para más detalles sobre los tests, ver [TESTS_UNITARIOS.md](./TESTS_UNITARIOS.md).

---

## 📊 Resumen de Puertos

| Servicio | Puerto | URL | Swagger |
|----------|--------|-----|---------|
| Frontend | 4200 | http://localhost:4200 | - |
| API Gateway | 3000 | http://localhost:3000/api/v1 | http://localhost:3000/docs |
| User Service | 3001 | http://localhost:3001 | http://localhost:3001/docs |
| Post Service | 3002 | http://localhost:3002 | http://localhost:3002/docs |
| Comment Service | 3003 | http://localhost:3003 | http://localhost:3003/docs |

---

**Última Actualización:** Marzo 2026
**Versión del Documento:** 1.1
**Autor:** Distributed Fullstack Core Team
