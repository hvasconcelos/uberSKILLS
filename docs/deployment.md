# Deployment

## Local Development

See [Getting Started](getting-started.md) for local setup.

## Docker

### Build and Run

```bash
docker compose up -d
```

### Docker Commands

```bash
docker compose logs -f uberskills    # View logs
docker compose down                  # Stop
docker compose up -d --build         # Rebuild after code changes
```

### Configuration

The `docker-compose.yml` service uses a named volume for data persistence. The app runs as a non-root user on port 3000.

Environment variables can be set in `docker-compose.yml`:

```yaml
environment:
  - NODE_ENV=production
  - DATABASE_URL=file:/app/data/uberskills.db
```

## Vercel + Turso

For cloud deployment, SQLite is replaced with [Turso](https://turso.tech) (libSQL, SQLite-compatible).

### Setup

1. Create a Turso database:

   ```bash
   turso db create uberskills
   turso db tokens create uberskills
   ```

2. Set environment variables in Vercel:

   ```
   DATABASE_URL=libsql://<db-name>-<org>.turso.io
   DATABASE_AUTH_TOKEN=<turso-token>
   ENCRYPTION_SECRET=<random-32-byte-hex>
   ```

3. Deploy:

   ```bash
   vercel --prod
   ```

### Vercel Configuration

```json
{
  "buildCommand": "bun run build",
  "installCommand": "bun install",
  "framework": "nextjs",
  "outputDirectory": "apps/web/.next"
}
```

The database layer detects the `DATABASE_URL` scheme (`file:` vs `libsql://`) and selects the appropriate driver automatically. Schema and queries remain identical.

## Self-Hosting with Nginx

```nginx
server {
    listen 80;
    server_name uberskills.example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # SSE support for AI streaming
        proxy_buffering off;
        proxy_cache off;
    }
}
```

## Self-Hosting with systemd

```ini
# /etc/systemd/system/uberskills.service
[Unit]
Description=UberSkills
After=network.target

[Service]
Type=simple
User=uberskills
WorkingDirectory=/opt/uberskills
ExecStart=/usr/local/bin/node apps/web/server.js
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=DATABASE_URL=file:/opt/uberskills/data/uberskills.db

[Install]
WantedBy=multi-user.target
```

## CI/CD with GitHub Actions

### Main Pipeline

The CI pipeline runs on push to `main` and on pull requests:

1. **Lint** -- Biome linting
2. **Typecheck** -- TypeScript type checking
3. **Test** -- Vitest unit tests
4. **Build** -- Production build (depends on lint, typecheck, test)
5. **E2E** -- Playwright E2E tests (depends on build)

### Release Pipeline

On tag push (`v*`), a Docker image is built and pushed to GitHub Container Registry (`ghcr.io`).
