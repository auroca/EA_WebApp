# Multi-stage Dockerfile for building and serving the Vite React app

# Build stage
FROM node:18-alpine AS build
WORKDIR /app

# Install dependencies (use package-lock if present)
COPY package.json package-lock.json* ./
RUN npm ci --silent

# Copy source and build
COPY . .
RUN npm run build

# Production stage: serve with nginx
FROM nginx:stable-alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html

# Replace default nginx config with SPA-friendly config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy entrypoint script that writes runtime env into env.js
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 5173
ENTRYPOINT ["/docker-entrypoint.sh"]
