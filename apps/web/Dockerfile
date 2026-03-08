FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

# --- deps: install production dependencies using lockfile ---
FROM base AS deps
RUN apk add --no-cache python3 make g++
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/ui/package.json ./packages/ui/
COPY packages/db/package.json ./packages/db/
COPY packages/skill-engine/package.json ./packages/skill-engine/
COPY packages/types/package.json ./packages/types/
RUN pnpm install --frozen-lockfile

# --- builder: build the Next.js standalone output ---
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/packages/db/node_modules ./packages/db/node_modules
COPY --from=deps /app/packages/ui/node_modules ./packages/ui/node_modules
COPY --from=deps /app/packages/skill-engine/node_modules ./packages/skill-engine/node_modules
COPY --from=deps /app/packages/types/node_modules ./packages/types/node_modules
COPY . .
RUN pnpm turbo run build --filter=@uberskills/web

# --- runner: minimal production image ---
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV DATABASE_URL=file:/app/data/uberskills.db

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 --ingroup nodejs nextjs

# Copy the standalone server and static assets produced by `next build`
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

# Ensure the data and cache directories exist and are writable by the non-root user
RUN mkdir -p /app/data /app/apps/web/.next/cache && chown -R nextjs:nodejs /app/data /app/apps/web/.next/cache

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/web/server.js"]
