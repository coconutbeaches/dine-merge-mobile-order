# Stage 1: Dependencies
FROM node:18-alpine AS deps
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
RUN \
  if [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then yarn global add pnpm && pnpm install --frozen-lockfile; \
  else npm install; \
  fi

# Stage 2: Builder
FROM node:18-alpine AS builder
WORKDIR /app

# Set Thailand timezone
ENV TZ=Asia/Bangkok

# Set production environment
ENV NODE_ENV=production

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build Next.js application
RUN \
  if [ -f yarn.lock ]; then yarn build; \
  elif [ -f package-lock.json ]; then npm run build; \
  elif [ -f pnpm-lock.yaml ]; then yarn global add pnpm && pnpm run build; \
  else npm run build; \
  fi

# Stage 3: Runner
FROM node:18-alpine AS runner
WORKDIR /app

# Set Thailand timezone
ENV TZ=Asia/Bangkok

# Set production environment
ENV NODE_ENV=production

# Create a non-root user to run the app
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy prisma schema and migrations (for potential migrations at startup)
COPY --from=builder /app/prisma ./prisma

# Install only production dependencies for Prisma
RUN npm install --production=true prisma @prisma/client

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Switch to non-root user
USER nextjs

# Expose the port the app will run on
EXPOSE 3000

# Set the command to run the application
CMD ["node", "server.js"]
