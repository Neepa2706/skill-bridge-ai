# ============================================================================
# SkillBridge AI — Multi-Stage Production Dockerfile
# Assess → Analyse → Learn → Practice → Test → Opportunity → Interview → Placement
# ============================================================================

# Stage 1: Build Frontend Client
FROM node:24-alpine AS client-builder
WORKDIR /app/client

COPY client/package*.json ./
RUN npm ci

COPY client/ ./
RUN npm run build

# Stage 2: Server Dependencies & Runtime
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Install dependencies needed for SQLite / native modules if needed
RUN apk add --no-cache python3 make g++

WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev

COPY server/ ./

# Copy built frontend assets to server public directory
COPY --from=client-builder /app/client/dist /app/client/dist

# Expose backend & frontend unified port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1

# Start Server
CMD ["node", "--loader", "tsx", "src/index.ts"]
