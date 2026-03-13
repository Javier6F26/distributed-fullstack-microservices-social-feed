# Stage 1: Builder - Build NestJS Post Service
FROM node:20-bullseye AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY nx.json ./
COPY tsconfig*.json ./

# Copy shared-types (needed for Nx workspace resolution)
COPY shared-types ./shared-types

# Copy all services (needed for Nx workspace resolution)
COPY api-gateway ./api-gateway
COPY user-service ./user-service
COPY post-service ./post-service
COPY comment-service ./comment-service
COPY frontend ./frontend

# Install dependencies
RUN npm install

# Sync Nx workspace
RUN npx nx sync

# Build the Post Service
RUN npx nx build post-service --configuration=production

# Prune dependencies for production (removes unused deps from node_modules)
RUN npx nx prune post-service

# Stage 2: Runner - Run with Node slim
FROM node:20-slim

WORKDIR /app

# Install curl for health checks
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# Copy built artifacts and node_modules from builder stage
COPY --from=builder /app/post-service/dist ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/shared-types ./node_modules/@prueba-tecnica-fullstack-angular-nest-js-mongo-db/shared-types

# Create non-root user for security
RUN useradd -m -r -u 1001 appuser && chown -R appuser:appuser /app
USER appuser

# Expose port 3002
EXPOSE 3002

# Health check - checks Post Service health endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3002 || exit 1

# Handle graceful shutdown with SIGTERM
CMD ["node", "main.js"]
