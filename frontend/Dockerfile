# Stage 1: Builder - Build Angular application
FROM node:20-bullseye AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY nx.json ./
COPY tsconfig*.json ./

# Copy workspace packages
COPY packages ./packages
COPY shared-types ./shared-types

# Copy frontend source
COPY frontend ./frontend

# Copy other services (needed for Nx workspace resolution)
COPY api-gateway ./api-gateway
COPY user-service ./user-service
COPY post-service ./post-service
COPY comment-service ./comment-service

# Install dependencies
RUN npm install

# Sync Nx workspace
RUN npx nx sync

# Build the frontend application
RUN npx nx build frontend --configuration=production

# Stage 2: Runner - Serve with nginx
FROM nginx:alpine

# Install curl for health checks
RUN apk add --no-cache curl

# Copy nginx configuration for SPA routing
COPY <<EOF /etc/nginx/conf.d/default.conf
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files \$uri /index.html;
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF

# Copy built frontend files from builder stage
COPY --from=builder /app/dist/frontend/browser /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
