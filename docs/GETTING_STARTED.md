# 🚀 Guía de Inicio Rápido - Distributed Fullstack Microservices

## 📋 Introducción

Bienvenido al proyecto **Distributed Fullstack Microservices**. Esta es una aplicación fullstack moderna construida con una arquitectura de microservicios distribuidos, diseñada como una plataforma social de feeds donde los usuarios pueden leer, crear y comentar publicaciones.

### Características Principales

- ✅ **Arquitectura de Microservicios** - 5 servicios independientes y escalables
- ✅ **Autenticación Segura** - JWT con tokens de refresco y cookies HttpOnly
- ✅ **Alto Rendimiento** - Caché distribuido con Redis y colas de mensajes con RabbitMQ
- ✅ **Base de Datos NoSQL** - MongoDB para cada microservicio
- ✅ **Frontend Moderno** - Angular 21+ con TailwindCSS
- ✅ **Backend Robusto** - NestJS 11+ con validación de datos
- ✅ **Documentación Automática** - OpenAPI/Swagger y colecciones Postman

### Stack Tecnológico

| Capa          | Tecnología     | Versión |
|---------------|----------------|---------|
| Frontend      | Angular        | 21+     |
| Backend       | NestJS         | 11+     |
| Lenguaje      | TypeScript     | 5.9+    |
| Base de Datos | MongoDB        | 7+      |
| Message Queue | RabbitMQ       | Latest  |
| Caché         | Redis          | Latest  |
| Autenticación | JWT + Passport | Latest  |
| Build Tool    | Nx             | 22.5+   |
| Estilos       | TailwindCSS    | 4.2+    |

---

## 🛠️ Prerrequisitos

Antes de comenzar, asegúrate de tener instaladas las siguientes herramientas:

### Requerimientos Obligatorios

```bash
# Node.js (versión 20.x o superior)
node --version  # Debe mostrar v20.x o mayor

# npm (viene con Node.js)
npm --version  # Debe mostrar 10.x o mayor

# Git
git --version
```

### Requerimientos para Infraestructura

```bash
# Docker y Docker Compose (recomendado para MongoDB, RabbitMQ, Redis)
docker --version
docker-compose --version

```

### Herramientas Recomendadas

```bash
# Nx CLI (opcional, pero recomendado)
npm install -g nx

# Postman (para testing de APIs)
# Descargar desde: https://www.postman.com/downloads/
```

---

## 📥 Instalación del Proyecto

### Paso 1: Clonar el Repositorio

```bash
# Navega al directorio del proyecto
cd distributed-fullstack-microservices
```

### Paso 2: Instalar Dependencias

```bash
# Instalar todas las dependencias del workspace
npm install
```

### Paso 3: Configurar Variables de Entorno

```bash
# Copiar el archivo de ejemplo
cp .env.example .env

# Editar .env con tus configuraciones locales
# Las configuraciones por defecto funcionan con Docker
```

**Variables de Entorno Principales:**

```bash
# MongoDB
MONGODB_URI=mongodb://localhost:27017/user-service
MONGODB_URI_POST=mongodb://localhost:27017/post-service
MONGODB_URI_COMMENT=mongodb://localhost:27017/comment-service

# RabbitMQ
RABBITMQ_URI=amqp://localhost:5672

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=tu-secreto-super-seguro
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=tu-secreto-de-refresco-super-seguro
JWT_REFRESH_EXPIRES_IN=7d

# Puertos
API_GATEWAY_PORT=3000
USER_SERVICE_PORT=3001
POST_SERVICE_PORT=3002
COMMENT_SERVICE_PORT=3003
FRONTEND_PORT=4200
```

---

## 🏃 Inicio del Desarrollo

### Paso 1: Levantar Infraestructura con Docker

Primero, levanta únicamente la infraestructura necesaria (MongoDB, RabbitMQ, Redis):

```bash
# Levantar infraestructura
docker-compose -f docker-compose.infra.yml up -d

# Verificar que los contenedores estén corriendo
docker-compose -f docker-compose.infra.yml ps

# Ver logs de la infraestructura
docker-compose -f docker-compose.infra.yml logs -f
```

**Servicios levantados:**

| Servicio            | Puerto | URL                               |
|---------------------|--------|-----------------------------------|
| MongoDB             | 27017  | mongodb://localhost:27017         |
| Redis               | 6379   | redis://localhost:6379            |
| RabbitMQ            | 5672   | amqp://admin:admin@localhost:5672 |
| RabbitMQ Management | 15672  | http://localhost:15672            |

**Detener infraestructura:**
```bash
docker-compose -f docker-compose.infra.yml down
```

### Paso 2: Configurar Variables de Entorno

```bash
# Copiar el archivo de ejemplo (está en la raíz del proyecto)
cp .env.example .env
```

**El archivo `.env` es único para todos los servicios** y contiene:

```bash
# JWT Secrets (generar secretos únicos)
# Usa: openssl rand -base64 32
JWT_SECRET=tu-secreto-super-seguro-min-32-caracteres
JWT_REFRESH_SECRET=tu-secreto-de-refresco-super-seguro

# MongoDB (cada servicio usa database diferente)
MONGODB_URI_USER=mongodb://localhost:27017/user-service
MONGODB_URI_POST=mongodb://localhost:27017/post-service
MONGODB_URI_COMMENT=mongodb://localhost:27017/comment-service

# RabbitMQ
RABBITMQ_URI=amqp://admin:admin@localhost:5672

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Puertos
API_GATEWAY_PORT=3000
USER_SERVICE_PORT=3001
POST_SERVICE_PORT=3002
COMMENT_SERVICE_PORT=3003
```

---

## 🔌 Ejecutar los Microservicios con Nx

Una vez levantada la infraestructura y configurado el `.env`, ejecuta cada microservicio usando Nx.

**Importante:** Necesitas una terminal separada para cada servicio.

### Terminal 1: API Gateway

```bash
npx nx serve api-gateway
```

Accede a: http://localhost:3000/docs

### Terminal 2: User Service

```bash
npx nx serve user-service
```

Accede a: http://localhost:3001/docs

### Terminal 3: Post Service

```bash
npx nx serve post-service
```

Accede a: http://localhost:3002/docs

### Terminal 4: Comment Service

```bash
npx nx serve comment-service
```

Accede a: http://localhost:3003/docs

### Terminal 5: Frontend

```bash
npx nx serve frontend
```

Accede a: http://localhost:4200

---

## 🌐 Acceder a las Aplicaciones

Una vez que todos los servicios estén corriendo, podrás acceder a:

| Servicio                    | URL                        | Descripción                   |
|-----------------------------|----------------------------|-------------------------------|
| **Frontend**                | http://localhost:4200      | Aplicación Angular            |
| **API Gateway**             | http://localhost:3000      | Punto de entrada principal    |
| **API Gateway Swagger**     | http://localhost:3000/docs | Documentación OpenAPI         |
| **User Service**            | http://localhost:3001      | Servicio de usuarios          |
| **User Service Swagger**    | http://localhost:3001/docs | Documentación User Service    |
| **Post Service**            | http://localhost:3002      | Servicio de posts             |
| **Post Service Swagger**    | http://localhost:3002/docs | Documentación Post Service    |
| **Comment Service**         | http://localhost:3003      | Servicio de comentarios       |
| **Comment Service Swagger** | http://localhost:3003/docs | Documentación Comment Service |
| **RabbitMQ Management**     | http://localhost:15672     | Panel de RabbitMQ             |

---

## 📚 Documentación API

El proyecto incluye documentación Swagger/OpenAPI disponible cuando los servicios están corriendo:

### Swagger UI

| Servicio        | URL                        | Descripción                                 |
|-----------------|----------------------------|---------------------------------------------|
| API Gateway     | http://localhost:3000/docs | Documentación OpenAPI (rutas con `/api/v1`) |
| User Service    | http://localhost:3001/docs | Documentación OpenAPI                       |
| Post Service    | http://localhost:3002/docs | Documentación OpenAPI                       |
| Comment Service | http://localhost:3003/docs | Documentación OpenAPI                       |

**Nota:** Solo API Gateway usa el prefijo `/api/v1` para sus rutas. Los demás servicios sirven la documentación directamente en `/docs`.

### Generar Documentación OpenAPI y Postman

```bash
# Generar specs OpenAPI desde los servicios corriendo
npm run generate:openapi

# Convertir specs OpenAPI a colecciones Postman
npm run generate:postman
```

**Requisitos para `generate:openapi`:**
- Los servicios deben estar corriendo

**Archivos generados:**

En `docs/openapi/`:
- `openapi-api-gateway.json` - Spec de API Gateway
- `openapi-user-service.json` - Spec de User Service
- `openapi-post-service.json` - Spec de Post Service
- `openapi-comment-service.json` - Spec de Comment Service
- `openapi-merged.json` - Spec combinado de todos los servicios

En `docs/postman/`:
- `Postman_api-gateway.json` - Colección de API Gateway
- `Postman_user-service.json` - Colección de User Service
- `Postman_post-service.json` - Colección de Post Service
- `Postman_comment-service.json` - Colección de Comment Service
- `Postman_Collection.json` - Colección combinada
- `Postman_Environment.json` - Variables de entorno

### Importar Colección a Postman

1. Abre Postman
2. Click en **Import**
3. Selecciona los archivos:
   - `docs/postman/Postman_Collection.json`
   - `docs/postman/Postman_Environment.json`
4. Selecciona el ambiente "Distributed Fullstack API - Local"

---

## 🌱 Seed de Datos (Opcional)

Para cargar datos de prueba en la base de datos:

```bash
# Ejecutar seed de datos (usuarios, posts y comentarios de prueba)
npm run seed
```

**Requisitos:**
- Los servicios deben estar corriendo
- La infraestructura (MongoDB) debe estar levantada

**Datos generados:**
- 5 usuarios de prueba
- Posts y comentarios asociados a cada usuario

---

## 🔧 Comandos Útiles de Nx

```bash
# Ver gráfico de dependencias del proyecto
npx nx graph

# Listar todos los proyectos
npx nx show projects

# Ver tareas disponibles para un proyecto
npx nx show project api-gateway

# Build de producción
npx nx build api-gateway
npx nx build frontend

# Build de todos los proyectos
npx nx run-many --target=build --all

# Linting
npx nx lint api-gateway

# Formatear código
npx nx format:write

# Verificar cambios en el repositorio
npx nx affected --target=build
```

---

## 🐛 Solución de Problemas Comunes

### Error: "Cannot find module '@nx/...'"

```bash
# Reinstalar dependencias
rm -rf node_modules package-lock.json
npm install
```

### Error: "MongoDB connection failed"

```bash
# Verificar que MongoDB esté corriendo
docker-compose ps

# O reiniciar MongoDB
docker-compose restart mongo

# Verificar URI de conexión en .env
```

### Error: "Port already in use"

```bash
# Ver qué proceso está usando el puerto
lsof -i :3000

# Matar el proceso
kill -9 <PID>

# O cambiar el puerto en .env
```

### Error: "RabbitMQ connection refused"

```bash
# Reiniciar RabbitMQ
docker-compose restart rabbitmq

# Ver logs de RabbitMQ
docker-compose logs rabbitmq
```

### Error: "Nx cache issues"

```bash
# Limpiar cache de Nx
npx nx reset

# Reintentar operación
npx nx serve api-gateway
```

---

## 📁 Estructura del Proyecto

```
distributed-fullstack-microservices/
├── README.md                    # README principal
├── package.json                 # Dependencias y scripts del workspace
├── nx.json                      # Configuración de Nx
├── tsconfig.base.json           # Configuración base de TypeScript
├── docker-compose.yml           # Configuración de Docker Compose
├── .env.example                 # Ejemplo de variables de entorno
├── .gitignore                   # Archivos ignorados por Git
├── docs/                        # 📚 Documentación del proyecto
│   ├── GETTING_STARTED.md       # Esta guía
│   ├── ARCHITECTURE.md          # Documentación de arquitectura
│   ├── MICROSERVICES.md         # Documentación detallada de microservicios
│   ├── README.md                # Índice de documentación
├── api-gateway/                 # 🚪 API Gateway (Puerto 3000)
│   ├── src/
│   │   ├── app/
│   │   │   ├── auth/            # Módulo de autenticación
│   │   │   ├── users/           # Módulo de usuarios
│   │   │   ├── posts/           # Módulo de posts
│   │   │   ├── comments/        # Módulo de comentarios
│   │   │   ├── filters/         # Filtros globales
│   │   │   ├── throttler/       # Rate limiting
│   │   │   └── rabbitmq/        # Configuración RabbitMQ
│   │   └── main.ts
│   └── package.json
├── user-service/                # 👤 Servicio de Usuarios (Puerto 3001)
│   ├── src/
│   │   ├── app/
│   │   │   ├── auth/            # Autenticación y registro
│   │   │   ├── users/           # Gestión de usuarios
│   │   │   ├── refresh-token/   # Tokens de refresco
│   │   │   └── schemas/         # Esquemas Mongoose
│   │   └── main.ts
│   └── package.json
├── post-service/                # 📝 Servicio de Posts (Puerto 3002)
│   ├── src/
│   │   ├── app/
│   │   │   ├── posts/           # Gestión de posts
│   │   │   ├── rabbitmq/        # Consumidor de eventos
│   │   │   └── schemas/         # Esquemas Mongoose
│   │   └── main.ts
│   └── package.json
├── comment-service/             # 💬 Servicio de Comentarios (Puerto 3003)
│   ├── src/
│   │   ├── app/
│   │   │   ├── comments/        # Gestión de comentarios
│   │   │   ├── comments-sync/   # Sincronización con RabbitMQ
│   │   │   ├── rabbitmq/        # Consumidor de eventos
│   │   │   └── schemas/         # Esquemas Mongoose
│   │   └── main.ts
│   └── package.json
├── frontend/                    # 🎨 Aplicación Angular (Puerto 4200)
│   ├── src/
│   │   ├── app/
│   │   │   ├── features/        # Features por dominio
│   │   │   │   ├── auth/        # Autenticación
│   │   │   │   ├── posts/       # Feed de posts
│   │   │   │   └── comments/    # Comentarios
│   │   │   ├── core/            # Servicios core
│   │   │   ├── guards/          # Guards de rutas
│   │   │   ├── services/        # Servicios HTTP
│   │   │   └── components/      # Componentes compartidos
│   │   ├── environments/
│   │   └── main.ts
│   └── project.json
├── shared-types/                # 📦 Tipos compartidos (DTOs)
│   └── src/
│       └── lib/
│           ├── user.dto.ts
│           ├── post.dto.ts
│           └── comment.dto.ts
├── scripts/                     # 📜 Scripts del proyecto
│   ├── generate-openapi.js      # Generar specs OpenAPI
│   └── generate-postman.js      # Generar colecciones Postman
│   └── seed-fix.ts              # Script de seed de datos 
└── docs/                        # 📚 Documentación
    ├── openapi/                 # Specs OpenAPI generados
    └── postman/                 # Colecciones Postman generadas
```

---

## 🎯 Flujo de Desarrollo Típico

### 1. Iniciar el Entorno de Desarrollo

```bash
# Terminal 1: Iniciar infraestructura
docker-compose up -d

# Terminal 2: Iniciar API Gateway
npx nx serve api-gateway

# Terminal 3: Iniciar User Service
npx nx serve user-service

# Terminal 4: Iniciar Post Service
npx nx serve post-service

# Terminal 5: Iniciar Comment Service
npx nx serve comment-service

# Terminal 6: Iniciar Frontend
npx nx serve frontend
```

### 2. Realizar Cambios

```bash
# Editar archivos en el directorio correspondiente
# Los cambios se reflejan automáticamente gracias al hot reload

# Ejemplo: Agregar un nuevo endpoint en User Service
# Editar: user-service/src/app/users/users.controller.ts
```

### 3. Ejecutar Tests

```bash
# Ejecutar tests del servicio modificado
npx nx test user-service

# Verificar que no haya errores de linting
npx nx lint user-service
```

### 4. Generar Documentación Actualizada

```bash
# Regenerar documentación OpenAPI y Postman
npm run generate:postman
```

### 5. Build de Producción

```bash
# Build de todos los servicios
npx nx run-many --target=build --all

# O build individual
npx nx build api-gateway
npx nx build frontend
```

---

## 📊 Endpoints Principales

### API Gateway (`http://localhost:3000/api/v1`)

#### Autenticación
```bash
POST /api/v1/auth/register      # Registrar usuario
POST /api/v1/auth/login         # Login
POST /api/v1/auth/refresh       # Refresh token
POST /api/v1/auth/logout        # Logout
DELETE /api/v1/auth/account     # Eliminar cuenta
```

#### Posts
```bash
GET  /api/v1/posts              # Obtener todos los posts
GET  /api/v1/posts/search       # Buscar posts
GET  /api/v1/posts/filter       # Filtrar por fecha
POST /api/v1/posts              # Crear post (autenticado)
```

#### Comentarios
```bash
GET  /api/v1/comments/post/:id          # Comentarios recientes
GET  /api/v1/comments/post/:id/all      # Todos los comentarios
POST /api/v1/comments                   # Crear comentario (autenticado)
```

---

## 🔐 Configuración de Autenticación

### Obtener Token de Acceso

```bash
# Registrar usuario
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "name": "Test User"
  }'

# Login para obtener tokens
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'
```

### Usar Token en Requests

```bash
# Request autenticado
curl -X GET http://localhost:3000/api/v1/posts \
  -H "Authorization: Bearer <tu-token-jwt>"
```

---

## 🚀 Próximos Pasos

1. **Explorar la Documentación**
   - Lee [`ARCHITECTURE.md`](./ARCHITECTURE.md) para entender la arquitectura
   - Revisa [`MICROSERVICES.md`](./MICROSERVICES.md) para detalles de cada servicio

2. **Familiarizarse con el Código**
   - Explora la estructura de directorios
   - Revisa los tests existentes para entender el comportamiento esperado

3. **Comenzar a Desarrollar**
   - Sigue las convenciones de código establecidas
   - Escribe tests para tus cambios
   - Actualiza la documentación si es necesario

4. **Recursos Adicionales**
   - [Documentación de Nx](https://nx.dev)
   - [Documentación de NestJS](https://docs.nestjs.com)
   - [Documentación de Angular](https://angular.dev)
   - [Documentación de MongoDB](https://www.mongodb.com/docs)

---

## 📞 Soporte y Contribución

### Reportar Problemas

Si encuentras un bug o problema:

1. Revisa los issues existentes en el repositorio
2. Crea un nuevo issue con:
   - Descripción clara del problema
   - Pasos para reproducir
   - Comportamiento esperado vs. real
   - Logs o capturas de pantalla si aplica

### Contribuir

1. Fork el repositorio
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'feat: agrega nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

---

**Última Actualización:** Marzo 2026  
**Versión del Proyecto:** 1.0  
**Equipo:** Distributed Fullstack Core Team
