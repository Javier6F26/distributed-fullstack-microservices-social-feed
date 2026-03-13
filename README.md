# Distributed Fullstack Microservices

<a alt="Nx logo" href="https://nx.dev" target="_blank" rel="noreferrer"><img src="https://raw.githubusercontent.com/nrwl/nx/master/images/nx-logo.png" width="45"></a>

Aplicación fullstack moderna con arquitectura de microservicios distribuidos, construida con **Angular 21+**, **NestJS 11+**, **MongoDB 7+**, **RabbitMQ** y **Redis**.

## 📚 Documentación

Para documentación detallada en **español**, ve a la carpeta [`docs/`](./docs/):

| Documento | Descripción |
|-----------|-------------|
| [🚀 Guía de Inicio Rápido](./docs/GETTING_STARTED.md) | Introducción y configuración para comenzar el desarrollo |
| [🏗️ Arquitectura del Sistema](./docs/ARCHITECTURE.md) | Documentación completa de la arquitectura |
| [📦 Microservicios](./docs/MICROSERVICES.md) | Documentación detallada de cada microservicio |
| [📖 Índice de Documentación](./docs/README.md) | Índice completo de documentación |
| [🧪 Tests Backend](./docs/TESTS_BACKEND.md) | Guía completa de testing |

---

## 🚀 Inicio Rápido

### Prerrequisitos

- Node.js 20.x o superior
- Docker y Docker Compose
- Git

### 1. Instalar Dependencias

```bash
npm install
```

### 2. Levantar Infraestructura

```bash
# Levantar MongoDB, RabbitMQ y Redis
docker-compose -f docker-compose.infra.yml up -d

# Verificar servicios
docker-compose -f docker-compose.infra.yml ps

# Ver logs
docker-compose -f docker-compose.infra.yml logs -f
```

**Servicios:**
- MongoDB: `mongodb://localhost:27017`
- Redis: `redis://localhost:6379`
- RabbitMQ: `amqp://admin:admin@localhost:5672`
- RabbitMQ Management: http://localhost:15672

### 3. Configurar Variables de Entorno

```bash
cp .env.example .env
```

**Variables importantes:**
```bash
# JWT Secrets (generar únicos)
JWT_SECRET=tu-secreto-super-seguro-min-32-caracteres
JWT_REFRESH_SECRET=tu-secreto-de-refresco-super-seguro

# MongoDB
MONGODB_URI=mongodb://localhost:27017

# RabbitMQ
RABBITMQ_URI=amqp://admin:admin@localhost:5672

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
```

### 4. Iniciar Microservicios con Nx

Necesitas una terminal separada para cada servicio:

```bash
# Terminal 1: API Gateway (Puerto 3000)
npx nx serve api-gateway

# Terminal 2: User Service (Puerto 3001)
npx nx serve user-service

# Terminal 3: Post Service (Puerto 3002)
npx nx serve post-service

# Terminal 4: Comment Service (Puerto 3003)
npx nx serve comment-service

# Terminal 5: Frontend (Puerto 4200)
npx nx serve frontend
```

### 5. Acceder a la Aplicación

| Servicio | URL | Descripción |
|----------|-----|-------------|
| **Frontend** | http://localhost:4200 | Aplicación Angular |
| **API Gateway** | http://localhost:3000 | Punto de entrada principal |
| **Swagger Docs** | http://localhost:3000/docs | Documentación OpenAPI |
| **RabbitMQ UI** | http://localhost:15672 | Panel de RabbitMQ |

---

## 📦 Microservicios

| Servicio | Puerto | Descripción |
|----------|--------|-------------|
| API Gateway | 3000 | Punto de entrada (`/api/v1/*`) |
| User Service | 3001 | Gestión de usuarios y autenticación |
| Post Service | 3002 | Creación y gestión de posts |
| Comment Service | 3003 | Gestión de comentarios |
| Frontend | 4200 | Aplicación Angular |

---

## 📄 Generar Documentación API

```bash
# Generar specs OpenAPI desde los servicios corriendo
npm run generate:openapi

# Convertir specs OpenAPI a colecciones Postman
npm run generate:postman
```

**Archivos generados:**
- `docs/openapi/openapi-*.json` - Specs OpenAPI por servicio
- `docs/postman/Postman_*.json` - Colecciones Postman

---

## 🌱 Seed de Datos

Para cargar datos de prueba:

```bash
# Ejecutar seed (servicios deben estar corriendo)
npm run seed
```

**Datos generados:**
- 5 usuarios de prueba
- Posts y comentarios asociados

---

## 🔧 Comandos Útiles de Nx

```bash
# Ver gráfico de dependencias
npx nx graph

# Listar proyectos
npx nx show projects

# Build de producción
npx nx build api-gateway
npx nx build frontend

# Build de todos los proyectos
npx nx run-many --target=build --all

# Linting
npx nx lint api-gateway

# Formatear código
npx nx format:write
```

---

## 🏗️ Arquitectura

```
┌─────────────────┐
│   Frontend      │  Puerto: 4200
│   Angular       │
└────────┬────────┘
         │
┌────────▼────────┐
│  API Gateway    │  Puerto: 3000
│  /api/v1/*      │
└────────┬────────┘
         │
    ┌────┴────┬────────────┬────────────┐
    │         │            │            │
┌───▼───┐ ┌──▼────┐ ┌─────▼────┐ ┌────▼─────┐
│ User  │ │ Post  │ │ Comment  │ │  MongoDB │
│ :3001 │ │ :3002 │ │  :3003   │ │  :27017  │
└───────┘ └───────┘ └──────────┘ └──────────┘
         │            │
    ┌────▼────────────▼────┐
    │   RabbitMQ           │
    │   :5672 / :15672     │
    └──────────────────────┘
         │
    ┌────▼────┐
    │  Redis  │
    │  :6379  │
    └─────────┘
```

### Tecnologías

| Capa | Tecnología |
|------|------------|
| Frontend | Angular 21+, TailwindCSS 4.2+ |
| Backend | NestJS 11+, TypeScript 5.9+ |
| Base de Datos | MongoDB 7+ |
| Message Queue | RabbitMQ |
| Caché | Redis |
| Autenticación | JWT + Passport |
| Build Tool | Nx 22.5+ |

---

## 📋 Postman Collection

Importar la colección desde `docs/postman/`:

1. Abre Postman
2. Click en **Import**
3. Selecciona los archivos:
   - `docs/postman/Postman_Collection.json`
   - `docs/postman/Postman_Environment.json`
4. Selecciona el ambiente "Distributed Fullstack API - Local"
5. Ejecuta los endpoints

---

## 🛠️ Solución de Problemas

### Error: "Cannot find module '@nx/...'"

```bash
rm -rf node_modules package-lock.json
npm install
```

### Error: "MongoDB connection failed"

```bash
# Verificar que MongoDB esté corriendo
docker-compose -f docker-compose.infra.yml ps

# Reiniciar MongoDB
docker-compose -f docker-compose.infra.yml restart mongodb
```

### Error: "Port already in use"

```bash
# Ver qué proceso está usando el puerto
lsof -i :3000

# Matar el proceso
kill -9 <PID>
```

### Limpiar cache de Nx

```bash
npx nx reset
```

---

## 📁 Estructura del Proyecto

```
distributed-fullstack-microservices/
├── api-gateway/              # 🚪 API Gateway (Puerto 3000)
├── user-service/             # 👤 Servicio de Usuarios (Puerto 3001)
├── post-service/             # 📝 Servicio de Posts (Puerto 3002)
├── comment-service/          # 💬 Servicio de Comentarios (Puerto 3003)
├── frontend/                 # 🎨 Aplicación Angular (Puerto 4200)
├── shared-types/             # 📦 Tipos compartidos (DTOs)
├── scripts/                  # 📜 Scripts del proyecto
│   ├── generate-openapi.js   # Generar specs OpenAPI
│   └── generate-postman.js   # Generar colecciones Postman
├── tools/                    # 🛠️ Herramientas y scripts
│   └── seed-fix.ts           # Script de seed de datos
├── docs/                     # 📚 Documentación
│   ├── openapi/              # Specs OpenAPI generados
│   └── postman/              # Colecciones Postman generadas
├── docker-compose.infra.yml  # Infraestructura (MongoDB, RabbitMQ, Redis)
└── docker-compose.yml        # Producción (todos los servicios)
```

---

## 🔗 Enlaces Útiles

### Documentación
- [Nx Documentation](https://nx.dev)
- [NestJS Documentation](https://docs.nestjs.com)
- [Angular Documentation](https://angular.dev)
- [MongoDB Documentation](https://www.mongodb.com/docs)
- [RabbitMQ Documentation](https://www.rabbitmq.com/documentation)
- [Redis Documentation](https://redis.io/docs)

### Comunidad
- [Nx Discord](https://go.nx.dev/community)
- [NestJS GitHub](https://github.com/nestjs/nest)
- [Angular Discord](https://discord.gg/angular)

---

**Última Actualización:** Marzo 2026  
**Versión del Proyecto:** 1.0  
**Licencia:** MIT
