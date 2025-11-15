# Build stage
FROM node:20-alpine AS builder

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
# Note: If pnpm-lock.yaml doesn't exist, remove --frozen-lockfile flag
# Also ensure loveops-world-model is available (published to npm or via workspace)
RUN if [ -f pnpm-lock.yaml ]; then \
      pnpm install --frozen-lockfile; \
    else \
      pnpm install; \
    fi

# Copy source files
COPY tsconfig.json ./
COPY src ./src
COPY workflows ./workflows

# Build TypeScript
RUN pnpm build

# Production stage
FROM node:20-alpine

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install production dependencies only
RUN if [ -f pnpm-lock.yaml ]; then \
      pnpm install --frozen-lockfile --prod; \
    else \
      pnpm install --prod; \
    fi

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Set NODE_ENV
ENV NODE_ENV=production

# Default command (can be overridden)
CMD ["node", "dist/index.js"]

