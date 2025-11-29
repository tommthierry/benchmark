# SABE - Multi-stage Docker build
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
COPY app/shared/package*.json ./app/shared/
COPY app/server/package*.json ./app/server/
COPY app/client/package*.json ./app/client/

# Install all dependencies
RUN npm install

# Copy source files
COPY tsconfig.json ./
COPY app/ ./app/

# Build in order: shared -> client -> server
RUN npm run build:shared
RUN npm run build:client
RUN npm run build:server

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY app/shared/package*.json ./app/shared/
COPY app/server/package*.json ./app/server/

# Install production dependencies only
RUN npm install --omit=dev --workspace=app/shared --workspace=app/server

# Copy built files
COPY --from=builder /app/app/shared/dist ./app/shared/dist
COPY --from=builder /app/app/server/dist ./app/server/dist
COPY --from=builder /app/app/client/dist ./app/client/dist

# Create data directory for SQLite
RUN mkdir -p /app/data

# Environment
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "app/server/dist/index.js"]
