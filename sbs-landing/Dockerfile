# Multi-stage Dockerfile for GIVC Health Frontend + SBS Backend

# Stage 1: Build React frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source files
COPY src ./src
COPY index.html ./
COPY vite.config.js ./
COPY tailwind.config.js ./
COPY postcss.config.js ./

# Build the React app
RUN npm run build

# Stage 2: Production backend with built frontend
FROM node:20-alpine

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy backend server
COPY server.js ./
COPY test-submit-claim.js ./
COPY n8n-workflow-sbs-complete.json ./

# Copy built frontend from previous stage
COPY --from=frontend-builder /app/dist ./public

# Create uploads directory
RUN mkdir -p /tmp/sbs-uploads && chmod 777 /tmp/sbs-uploads

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {let b = ''; r.on('data', (c) => b+=c); r.on('end', () => {if (JSON.parse(b).status === 'healthy') process.exit(0); process.exit(1);})})" || exit 1

# Start server
CMD ["node", "server.js"]
