FROM oven/bun:1 AS base
WORKDIR /app

# --- deps: install production dependencies using lockfile ---
FROM base AS deps
RUN apt-get update && apt-get install -y python3 make g++ --no-install-recommends && rm -rf /var/lib/apt/lists/*
COPY package.json bun.lock turbo.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/ui/package.json ./packages/ui/
COPY packages/db/package.json ./packages/db/
COPY packages/skill-engine/package.json ./packages/skill-engine/
COPY packages/types/package.json ./packages/types/
RUN bun install --frozen-lockfile

# --- builder: build the Next.js standalone output ---
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

# --- runner: minimal production image ---
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV DATABASE_URL=file:/app/data/uberskills.db

RUN groupadd --system --gid 1001 nodejs
RUN useradd --system --uid 1001 --gid nodejs nextjs

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
