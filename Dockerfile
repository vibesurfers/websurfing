# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN npm install -g pnpm@10.7.1
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Stage 2: Builder
FROM node:20-alpine AS builder
RUN npm install -g pnpm@10.7.1
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment variables for build
ENV NEXT_TELEMETRY_DISABLED=1
ENV SKIP_ENV_VALIDATION=1

# Build args for environment variables needed during build
ARG DATABASE_URL=postgresql://build:build@localhost:5432/build
ARG GOOGLE_CLOUD_PROJECT
ARG GOOGLE_CLOUD_LOCATION=us-central1
ARG GOOGLE_VERTEX_PROJECT
ARG GOOGLE_VERTEX_LOCATION=us-central1
ARG GOOGLE_CREDENTIALS_JSON
ARG GOOGLE_APPLICATION_CREDENTIALS_JSON
ARG AUTH_SECRET
ARG AUTH_URL
ARG AUTH_GOOGLE_ID
ARG AUTH_GOOGLE_SECRET

# Set as environment variables for build
ENV DATABASE_URL=${DATABASE_URL}
ENV GOOGLE_CLOUD_PROJECT=${GOOGLE_CLOUD_PROJECT}
ENV GOOGLE_CLOUD_LOCATION=${GOOGLE_CLOUD_LOCATION}
ENV GOOGLE_VERTEX_PROJECT=${GOOGLE_VERTEX_PROJECT}
ENV GOOGLE_VERTEX_LOCATION=${GOOGLE_VERTEX_LOCATION}
ENV GOOGLE_CREDENTIALS_JSON=${GOOGLE_CREDENTIALS_JSON}
ENV GOOGLE_APPLICATION_CREDENTIALS_JSON=${GOOGLE_APPLICATION_CREDENTIALS_JSON}
ENV AUTH_SECRET=${AUTH_SECRET}
ENV AUTH_URL=${AUTH_URL}
ENV AUTH_GOOGLE_ID=${AUTH_GOOGLE_ID}
ENV AUTH_GOOGLE_SECRET=${AUTH_GOOGLE_SECRET}

# Build the application
RUN pnpm run build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Set correct permissions
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
