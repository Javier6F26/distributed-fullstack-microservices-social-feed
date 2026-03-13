# 🏗️ Arquitectura del Sistema - Distributed Fullstack Microservices

## 📋 Visión General

Este documento describe la arquitectura completa del sistema **Distributed Fullstack Microservices**, una aplicación social de feeds construida con una arquitectura de microservicios distribuidos, diseñada para alto rendimiento, escalabilidad y mantenibilidad.

---

## 🎯 Objetivos de Arquitectura

### Requisitos Funcionales

1. **Gestión de Usuarios** - Registro, autenticación y gestión de perfiles
2. **Gestión de Posts** - Creación, lectura, búsqueda y filtrado de publicaciones
3. **Gestión de Comentarios** - Creación y consulta de comentarios en posts
4. **Autenticación Segura** - Sistema de autenticación con JWT y tokens de refresco

### Requisitos No Funcionales

| Requisito | Meta | Implementación |
|-----------|------|----------------|
| **Rendimiento** | 60fps scrolling, <1ms retrievals | Redis cache, virtualized scrolling |
| **Seguridad** | JWT seguro, rate limiting | HttpOnly cookies, throttler |
| **Disponibilidad** | 99.9% uptime | Microservicios independientes |
| **Escalabilidad** | Horizontal por servicio | Contenedores Docker, K8s ready |
| **Consistencia** | Eventual consistency | RabbitMQ event-driven |
| **Degradación Graceful** | Cache feed si servicios caen | Redis fallback |

---

## 🏛️ Arquitectura de Alto Nivel

### Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            CLIENTE / FRONTEND                            │
│                         Angular 21+ (Puerto 4200)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │   Auth      │  │   Posts     │  │  Comments   │  │   Core      │    │
│  │   Feature   │  │   Feature   │  │   Feature   │  │   Services  │    │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTP/REST
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                              API GATEWAY                                 │
│                        NestJS (Puerto 3000)                              │
│                    /api/v1/* - Enrutamiento principal                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │    Auth     │  │    Rate     │  │   Request   │  │   Response  │    │
│  │   Module    │  │  Limiting   │  │   Filters   │  │   Filters   │    │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
         │                    │                    │
         │                    │                    │
    ┌────▼────┐         ┌────▼────┐         ┌────▼────┐
    │  User   │         │  Post   │         │ Comment │
    │ Service │         │ Service │         │ Service │
    │ :3001   │         │ :3002   │         │ :3003   │
    └────┬────┘         └────┬────┘         └────┬────┘
         │                   │                   │
         ▼                   ▼                   ▼
    ┌─────────┐         ┌─────────┐         ┌─────────┐
    │ MongoDB │         │ MongoDB │         │ MongoDB │
    │  Users  │         │  Posts  │         │Comments │
    └─────────┘         └─────────┘         └─────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                         INFRAESTRUCTURA COMPARTIDA                       │
│  ┌─────────────────────┐           ┌─────────────────────┐             │
│  │     RabbitMQ        │           │       Redis         │             │
│  │   Message Broker    │           │  Distributed Cache  │             │
│  │   Event-Driven      │           │   <1ms Retrieval    │             │
│  └─────────────────────┘           └─────────────────────┘             │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 📦 Componentes Arquitectónicos

### 1. Frontend (Angular 21+)

**Propósito:** Interfaz de usuario reactiva y de alto rendimiento.

**Tecnologías:**
- Angular 21+ con Signals para state management
- TailwindCSS 4.2+ para estilos
- RxJS para programación reactiva
- Virtual scrolling para renders eficientes

**Responsabilidades:**
- Renderizado de UI
- Gestión de estado local
- Comunicación con API Gateway
- Autenticación en cliente
- Manejo de errores y loading states

**Patrones de Diseño:**
- Component-based architecture
- Smart/Dumb components
- Signals para estado reactivo
- Servicios inyectables para lógica de negocio

### 2. API Gateway (NestJS)

**Propósito:** Punto de entrada único para todas las peticiones del cliente.

**Tecnologías:**
- NestJS 11+
- @nestjs/throttler para rate limiting
- @nestjs/cache-manager para caching
- Swagger/OpenAPI para documentación

**Responsabilidades:**
- Enrutamiento de peticiones a microservicios
- Autenticación inicial y validación de JWT
- Rate limiting y protección DDoS
- Agregación de respuestas (si aplica)
- Manejo de errores global
- Logging centralizado

**Módulos Principales:**
```
api-gateway/src/app/
├── auth/           # Autenticación y autorización
├── users/          # Proxy a User Service
├── posts/          # Proxy a Post Service
├── comments/       # Proxy a Comment Service
├── filters/        # Filtros de excepciones
├── throttler/      # Configuración de rate limiting
├── rabbitmq/       # Conexión a RabbitMQ
└── logging/        # Logging centralizado
```

### 3. User Service (NestJS + MongoDB)

**Propósito:** Gestión completa de usuarios y autenticación.

**Tecnologías:**
- NestJS 11+
- Mongoose para MongoDB
- JWT + Passport para auth
- bcrypt para hashing de contraseñas

**Responsabilidades:**
- Registro de usuarios
- Autenticación (login/logout)
- Gestión de tokens de refresco
- Perfil de usuario
- Eliminación de cuenta (GDPR compliant)

**Esquemas de Base de Datos:**
```typescript
// User Schema
{
  _id: ObjectId
  email: string (unique, indexed)
  password: string (hashed)
  name: string
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

// RefreshToken Schema
{
  _id: ObjectId
  userId: ObjectId (indexed)
  token: string (hashed)
  expiresAt: Date
  createdAt: Date
}
```

### 4. Post Service (NestJS + MongoDB + RabbitMQ)

**Propósito:** Gestión de publicaciones y contenido.

**Tecnologías:**
- NestJS 11+
- Mongoose para MongoDB
- RabbitMQ para eventos asíncronos
- Redis para caching de feeds

**Responsabilidades:**
- CRUD de posts
- Búsqueda y filtrado
- Sincronización con Comment Service vía RabbitMQ
- Cacheo de feeds para rendimiento

**Esquemas de Base de Datos:**
```typescript
// Post Schema
{
  _id: ObjectId
  userId: string
  title: string
  content: string
  tags: string[]
  commentCount: number (denormalizado)
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}
```

**Eventos RabbitMQ:**
- `post.created` - Notifica creación de post
- `post.updated` - Notifica actualización
- `post.deleted` - Notifica eliminación

### 5. Comment Service (NestJS + MongoDB + RabbitMQ)

**Propósito:** Gestión de comentarios en posts.

**Tecnologías:**
- NestJS 11+
- Mongoose para MongoDB
- RabbitMQ para sincronización
- Redis para caching

**Responsabilidades:**
- CRUD de comentarios
- Sincronización con Post Service
- Conteo de comentarios por post
- Anonimización de comentarios

**Esquemas de Base de Datos:**
```typescript
// Comment Schema
{
  _id: ObjectId
  postId: string (indexed)
  userId: string
  content: string
  parentId: ObjectId | null
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}
```

**Eventos RabbitMQ:**
- `comment.created` - Notifica nuevo comentario
- `comment.deleted` - Notifica eliminación

---

## 🔗 Patrones de Comunicación

### Comunicación Síncrona (HTTP/REST)

```
Frontend → API Gateway → Microservicio
     HTTP      HTTP         HTTP
```

**Casos de Uso:**
- Peticiones CRUD directas
- Autenticación
- Consultas que requieren respuesta inmediata

**Patrón:**
```typescript
// API Gateway actúa como proxy
@Controller('api/v1/posts')
export class PostsController {
  constructor(private httpService: HttpService) {}
  
  @Get()
  async getPosts() {
    return this.httpService.axiosRef.get(
      `${process.env.POST_SERVICE_URL}/posts`
    );
  }
}
```

### Comunicación Asíncrona (RabbitMQ)

```
Post Service ──┐
               ├──> RabbitMQ ──> Comment Service
Comment Service┘
```

**Casos de Uso:**
- Sincronización de contadores (commentCount)
- Notificaciones entre servicios
- Procesamiento en background
- Mantener consistencia eventual

**Patrón de Eventos:**
```typescript
// Publicar evento
await this.amqpConnection.publish('posts', 'post.created', {
  postId: post.id,
  userId: post.userId,
  timestamp: new Date(),
});

// Suscribirse a eventos
@RabbitSubscribe({
  exchange: 'comments',
  routingKey: 'post.deleted',
  queue: 'comment_post_deleted_queue',
})
async handlePostDeleted(msg: PostDeletedEvent) {
  // Anonimizar comentarios del post eliminado
}
```

---

## 🗄️ Estrategia de Datos

### Base de Datos por Servicio

Cada microservicio tiene su propia base de datos MongoDB:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  User Service   │    │  Post Service   │    │ Comment Service │
│                 │    │                 │    │                 │
│  MongoDB:       │    │  MongoDB:       │    │  MongoDB:       │
│  user-service   │    │  post-service   │    │  comment-service│
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

**Ventajas:**
- Autonomía completa de cada servicio
- Sin acoplamiento de esquemas
- Escalabilidad independiente
- Fallos aislados

### Consistencia Eventual

```
┌──────────────┐     ┌──────────────┐
│  Post Create │────>│  RabbitMQ    │
└──────────────┘     └──────┬───────┘
                            │
                     ┌──────▼───────┐
                     │ Comment Sync │
                     │  (Update     │
                     │  commentCount│
                     └──────────────┘
```

**Implementación:**
1. Post Service publica evento `post.created`
2. Comment Service consume el evento
3. Comment Service actualiza sus referencias
4. Si falla, reintenta con dead-letter queue

### Caché Distribuido (Redis)

```
┌─────────────┐     ┌─────────────┐
│   Service   │────>│    Redis    │
│             │<────│  (Cache)    │
└─────────────┘     └─────────────┘
```

**Estrategia Cache-Aside:**
```typescript
async getPosts(): Promise<Post[]> {
  // Intentar obtener de cache
  const cached = await this.cacheManager.get('posts:all');
  if (cached) return cached;
  
  // Si no está en cache, obtener de BD
  const posts = await this.postModel.find().exec();
  
  // Guardar en cache
  await this.cacheManager.set('posts:all', posts, 60000); // 1 min
  
  return posts;
}
```

**Datos Cacheados:**
- Feeds de posts (TTL: 1 minuto)
- Comentarios recientes por post (TTL: 5 minutos)
- Perfiles de usuario (TTL: 10 minutos)

---

## 🔐 Seguridad y Autenticación

### Flujo de Autenticación JWT

```
┌──────────┐     ┌─────────────┐     ┌──────────────┐
│ Frontend │     │ API Gateway │     │ User Service │
└────┬─────┘     └──────┬──────┘     └──────┬───────┘
     │                  │                   │
     │  POST /login     │                   │
     │─────────────────>│                   │
     │                  │  Forward          │
     │                  │──────────────────>│
     │                  │                   │
     │                  │  Verify credentials
     │                  │  Generate JWT     │
     │                  │                   │
     │                  │  JWT + Refresh    │
     │                  │<──────────────────│
     │                  │                   │
     │  Set-Cookie:     │                   │
     │  refresh-token   │                   │
     │  Authorization:  │                   │
     │  Bearer <JWT>    │                   │
     │<─────────────────│                   │
     │                  │                   │
```

### Token Management

**Access Token (JWT):**
- Duración: 15 minutos
- Almacenamiento: Memory (frontend)
- Uso: Cada petición API
- Claims: `userId`, `email`, `iat`, `exp`

**Refresh Token:**
- Duración: 7 días
- Almacenamiento: HttpOnly cookie
- Uso: Obtener nuevo access token
- Almacenamiento backend: Hash en MongoDB

### Rate Limiting

```typescript
// API Gateway - Throttler configuration
@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000, // 1 segundo
        limit: 10, // 10 peticiones
      },
      {
        name: 'medium',
        ttl: 60000, // 1 minuto
        limit: 100, // 100 peticiones
      },
      {
        name: 'long',
        ttl: 3600000, // 1 hora
        limit: 1000, // 1000 peticiones
      },
    ]),
  ],
})
export class ThrottlerModule {}
```

---

## 📊 Escalabilidad

### Escalabilidad Horizontal

```
┌─────────────────────────────────────────────────────────┐
│                    Load Balancer                        │
└─────────────────────────────────────────────────────────┘
         │              │              │
    ┌────▼────┐   ┌────▼────┐   ┌────▼────┐
    │  API    │   │  API    │   │  API    │
    │ Gateway │   │ Gateway │   │ Gateway │
    │   :1    │   │   :2    │   │   :3    │
    └────┬────┘   └────┬────┘   └────┬────┘
         │             │             │
    ┌────▼─────────────▼─────────────▼────┐
    │         RabbitMQ Cluster            │
    └────┬─────────────┬─────────────┬────┘
         │             │             │
    ┌────▼────┐   ┌────▼────┐   ┌────▼────┐
    │  Post   │   │  Post   │   │  Post   │
    │ Service │   │ Service │   │ Service │
    │   :1    │   │   :2    │   │   :3    │
    └─────────┘   └─────────┘   └─────────┘
```

### Estrategias de Escalado

| Servicio | Estrategia | Métrica de Escalado |
|----------|------------|---------------------|
| API Gateway | Horizontal | CPU > 70%, Requests/sec |
| User Service | Horizontal | Auth requests/sec |
| Post Service | Horizontal + Cache | Read operations/sec |
| Comment Service | Horizontal | Write operations/sec |
| Frontend | CDN + Static | Traffic spikes |

---

## 🔄 Patrones de Resiliencia

### Graceful Degradation

```typescript
// Si Comment Service está caído, mostrar posts sin comentarios
async getFeedWithFallback(): Promise<Feed> {
  const posts = await this.getPostsFromCache();
  
  try {
    const comments = await this.getCommentsForPosts(posts);
    return { posts, comments };
  } catch (error) {
    // Degradación graceful: retornar solo posts
    this.logger.warn('Comment Service unavailable, returning posts only');
    return { posts, comments: [] };
  }
}
```

### Circuit Breaker

```typescript
// Implementación con @nestjs/axios + retry
@Injectable()
export class PostServiceClient {
  @CircuitBreaker({
    timeout: 3000,
    errorThreshold: 5,
    resetTimeout: 30000,
  })
  async getPosts(): Promise<Post[]> {
    return this.httpService.axiosRef.get('/posts');
  }
}
```

### Retry con Backoff Exponencial

```typescript
async publishEvent(event: DomainEvent): Promise<void> {
  const maxRetries = 3;
  let delay = 1000;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      await this.amqpConnection.publish('posts', event.type, event);
      return;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await this.sleep(delay);
      delay *= 2; // Backoff exponencial
    }
  }
}
```

---

## 📁 Estructura de Directorios

```
distributed-fullstack-microservices/
├── api-gateway/
│   ├── src/
│   │   ├── app/
│   │   │   ├── auth/              # Módulo de autenticación
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── auth.module.ts
│   │   │   │   ├── strategies/
│   │   │   │   │   └── jwt.strategy.ts
│   │   │   │   └── dto/
│   │   │   │       ├── login.dto.ts
│   │   │   │       └── register.dto.ts
│   │   │   ├── users/             # Proxy a User Service
│   │   │   ├── posts/             # Proxy a Post Service
│   │   │   ├── comments/          # Proxy a Comment Service
│   │   │   ├── filters/           # Filtros de excepciones
│   │   │   ├── throttler/         # Rate limiting
│   │   │   ├── rabbitmq/          # Configuración RabbitMQ
│   │   │   └── logging/           # Logging
│   │   └── main.ts
│   └── package.json
│
├── user-service/
│   ├── src/
│   │   ├── app/
│   │   │   ├── auth/              # Autenticación
│   │   │   ├── users/             # Gestión de usuarios
│   │   │   ├── refresh-token/     # Refresh tokens
│   │   │   └── schemas/           # Esquemas Mongoose
│   │   └── main.ts
│   └── package.json
│
├── post-service/
│   ├── src/
│   │   ├── app/
│   │   │   ├── posts/             # Gestión de posts
│   │   │   ├── rabbitmq/          # Event handlers
│   │   │   └── schemas/           # Esquemas Mongoose
│   │   └── main.ts
│   └── package.json
│
├── comment-service/
│   ├── src/
│   │   ├── app/
│   │   │   ├── comments/          # Gestión de comentarios
│   │   │   ├── comments-sync/     # Sincronización
│   │   │   ├── rabbitmq/          # Event handlers
│   │   │   └── schemas/           # Esquemas Mongoose
│   │   └── main.ts
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── features/
│   │   │   │   ├── auth/          # Feature de autenticación
│   │   │   │   ├── posts/         # Feature de posts
│   │   │   │   └── comments/      # Feature de comentarios
│   │   │   ├── core/              # Servicios core
│   │   │   ├── guards/            # Route guards
│   │   │   ├── services/          # Servicios HTTP
│   │   │   └── components/        # Componentes UI
│   │   └── main.ts
│   └── project.json
│
└── shared-types/
    └── src/
        └── lib/
            ├── user.dto.ts        # DTOs compartidos
            ├── post.dto.ts
            └── comment.dto.ts
```

---

## 🛠️ Stack Tecnológico Detallado

### Backend (NestJS)

| Dependencia | Versión | Propósito |
|-------------|---------|-----------|
| @nestjs/common | 11+ | Core framework |
| @nestjs/core | 11+ | Core runtime |
| @nestjs/mongoose | 11+ | Integración MongoDB |
| @nestjs/jwt | 11+ | JWT authentication |
| @nestjs/passport | 11+ | Passport strategies |
| @nestjs/throttler | 6.5+ | Rate limiting |
| @nestjs/cache-manager | 3+ | Caching |
| @nestjs/microservices | 11+ | RabbitMQ integration |
| mongoose | 9+ | ODM para MongoDB |
| class-validator | 0.15+ | Validación de DTOs |
| class-transformer | 0.5+ | Transformación de objetos |
| bcrypt | 6+ | Hashing de contraseñas |
| amqplib | 0.10+ | RabbitMQ client |

### Frontend (Angular)

| Dependencia | Versión | Propósito |
|-------------|---------|-----------|
| @angular/core | 21+ | Core framework |
| @angular/common | 21+ | Common directives |
| @angular/router | 21+ | Routing |
| @angular/forms | 21+ | Reactive forms |
| @angular/cdk | 21+ | Component Dev Kit |
| rxjs | 7.8+ | Reactive programming |
| tailwindcss | 4.2+ | Utility-first CSS |

### Infraestructura

| Componente | Versión | Propósito |
|------------|---------|-----------|
| MongoDB | 7+ | Base de datos NoSQL |
| RabbitMQ | Latest | Message broker |
| Redis | Latest | Caché distribuido |
| Docker | Latest | Contenerización |
| Nx | 22.5+ | Build system |

---

## 📈 Monitoreo y Observabilidad

### Logging

```typescript
// Logging estructurado con contexto
@Injectable()
export class PostsService {
  private readonly logger = new Logger(PostsService.name);
  
  async createPost(dto: CreatePostDto): Promise<Post> {
    this.logger.log(`Creating post for user ${dto.userId}`);
    
    try {
      const post = await this.postModel.create(dto);
      this.logger.debug(`Post created with ID: ${post._id}`);
      return post;
    } catch (error) {
      this.logger.error(`Failed to create post: ${error.message}`, error.stack);
      throw error;
    }
  }
}
```

### Health Checks

```typescript
// Health check endpoints por servicio
@Controller('health')
export class HealthController {
  @Get()
  @HealthCheck()
  async check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'post-service',
    };
  }
  
  @Get('db')
  @HealthCheck()
  async checkDatabase() {
    const isHealthy = await this.mongoService.isConnected();
    if (!isHealthy) {
      throw new HealthCheckError('Database check failed');
    }
    return { status: 'ok' };
  }
}
```

---

## 🚀 Despliegue

### Docker Compose (Desarrollo)

```yaml
version: '3.8'
services:
  mongo:
    image: mongo:7
    ports:
      - "27017:27017"
  
  rabbitmq:
    image: rabbitmq:3-management
    ports:
      - "5672:5672"
      - "15672:15672"
  
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
  
  api-gateway:
    build: ./api-gateway
    ports:
      - "3000:3000"
    depends_on:
      - rabbitmq
      - redis
  
  user-service:
    build: ./user-service
    ports:
      - "3001:3001"
    depends_on:
      - mongo
  
  post-service:
    build: ./post-service
    ports:
      - "3002:3002"
    depends_on:
      - mongo
      - rabbitmq
  
  comment-service:
    build: ./comment-service
    ports:
      - "3003:3003"
    depends_on:
      - mongo
      - rabbitmq
  
  frontend:
    build: ./frontend
    ports:
      - "4200:4200"
```

### Kubernetes (Producción)

```yaml
# Ejemplo: Deployment de Post Service
apiVersion: apps/v1
kind: Deployment
metadata:
  name: post-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: post-service
  template:
    metadata:
      labels:
        app: post-service
    spec:
      containers:
      - name: post-service
        image: myregistry/post-service:latest
        ports:
        - containerPort: 3002
        env:
        - name: MONGODB_URI
          valueFrom:
            secretKeyRef:
              name: mongodb-secret
              key: uri
        - name: RABBITMQ_URI
          valueFrom:
            secretKeyRef:
              name: rabbitmq-secret
              key: uri
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3002
          initialDelaySeconds: 30
          periodSeconds: 10
```

---

## 📋 Convenciones de Desarrollo

### Naming Conventions

| Elemento | Convención | Ejemplo |
|----------|------------|---------|
| Colecciones MongoDB | lowercase, plural | `users`, `posts`, `comments` |
| Campos MongoDB | camelCase | `userId`, `createdAt` |
| Endpoints REST | plural, lowercase | `/api/v1/posts` |
| Archivos NestJS | kebab-case | `user.controller.ts` |
| Componentes Angular | PascalCase class, kebab-case file | `PostCardComponent` en `post-card.component.ts` |
| Funciones/Métodos | camelCase | `getUserById`, `createPost` |
| Eventos RabbitMQ | `domain.action` | `post.created`, `user.deleted` |

### Estructura de Respuestas API

```typescript
// Respuesta exitosa
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "123",
    "title": "Mi Post"
  }
}

// Respuesta de error
{
  "success": false,
  "message": "Validation failed",
  "status": 400
}
```

### Formato de Fechas

- **APIs:** ISO 8601 (UTC) - `2026-03-13T10:30:00Z`
- **UI:** Formato local del usuario

---

## 🔮 Decisiones Arquitectónicas

### Decisiones Críticas

| Decisión | Opción Seleccionada | Rationale |
|----------|---------------------|-----------|
| **Arquitectura** | Microservicios | Escalabilidad independiente, autonomía de equipos |
| **Base de Datos** | MongoDB | Flexibilidad de esquema, rendimiento en lecturas |
| **Comunicación** | REST + RabbitMQ | Balance entre simplicidad y desacoplamiento |
| **Caché** | Redis | Alto rendimiento, estructuras de datos ricas |
| **Auth** | JWT + Refresh tokens | Stateless, escalable, seguro |
| **Frontend State** | Angular Signals | Reactividad fina, performance |

### Trade-offs Considerados

1. **Microservicios vs Monolito**
   - ✅ Microservicios: Escalabilidad, autonomía, resiliencia
   - ❌ Complejidad operacional, consistencia eventual

2. **MongoDB vs PostgreSQL**
   - ✅ MongoDB: Esquema flexible, rendimiento en lecturas
   - ❌ Sin transacciones complejas, consistencia eventual

3. **RabbitMQ vs Kafka**
   - ✅ RabbitMQ: Simple, routing flexible, maduro
   - ❌ Menor throughput que Kafka para eventos masivos

---

## 🧪 Tests Unitarios

El proyecto incluye una suite completa de tests unitarios para validar la lógica de negocio de cada servicio.

### Cobertura de Tests

| Servicio | Tests | Estado | Archivo |
|----------|-------|--------|---------|
| `UsersService` | 14 | ✅ Passing | `user-service/src/app/users/users.service.spec.ts` |
| `AuthService` | 11 (1 skipped) | ✅ Passing | `user-service/src/app/auth/auth.service.spec.ts` |
| `PostsService` | 15 | ✅ Passing | `post-service/src/app/posts/posts.service.spec.ts` |
| `CommentsService` | 14 | ✅ Passing | `comment-service/src/app/comments/comments.service.spec.ts` |
| `AuthService` (API Gateway) | 4 | ✅ Passing | `api-gateway/src/app/auth/auth.service.spec.ts` |
| `RabbitmqService` (API Gateway) | 8 | ✅ Passing | `api-gateway/src/app/rabbitmq/rabbitmq.service.spec.ts` |

**Total: 66 tests (65 passing, 1 skipped)**

### Ejecución de Tests

```bash
# Ejecutar todos los tests
npx nx run-many --target=test

# Ejecutar tests de un servicio específico
npx nx test user-service
npx nx test post-service
npx nx test comment-service
npx nx test api-gateway

# Ejecutar con coverage
npx nx test user-service --coverage
```

### Patrones de Testing

- **AAA Pattern**: Arrange-Act-Assert en todos los tests
- **Priority Tags**: [P0] Crítico, [P1] Alto, [P2] Medio
- **Mocking**: Todos los dependencies externos están mockeados
- **Aislamiento**: Sin llamadas reales a BD o servicios externos

Para más detalles, ver [TESTS_UNITARIOS.md](./TESTS_UNITARIOS.md).

---

## 📚 Recursos Adicionales

- [Documentación de NestJS](https://docs.nestjs.com)
- [Documentación de Angular](https://angular.dev)
- [Documentación de MongoDB](https://www.mongodb.com/docs)
- [Documentación de RabbitMQ](https://www.rabbitmq.com/documentation)
- [Documentación de Redis](https://redis.io/docs)
- [Documentación de Nx](https://nx.dev)
- [Documentación de Jest](https://jestjs.io/docs/getting-started)

---

**Última Actualización:** Marzo 2026
**Versión del Documento:** 1.1
**Autor:** Distributed Fullstack Core Team
