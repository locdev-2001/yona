# Local Development (Docker)

Everything runs in Docker — no PHP/Postgres/Redis needed on the host. Only **Docker Desktop** (or Docker Engine + Compose v2) is required.

Stack: PHP 8.3 (Laravel 13) · PostgreSQL 16 · Redis 7 · Nginx · Node 22 (Vite) · Reverb (realtime).

## Services

| Service | Port (host) | Purpose |
|---|---|---|
| `nginx` | 8080 | App entrypoint → http://localhost:8080 |
| `app` | — | PHP-FPM 8.3 (run composer/artisan here) |
| `postgres` | 5432 | DB `cho_rach` (user `crm` / pass `secret`) |
| `redis` | 6379 | cache / queue / session / broadcast |
| `node` | 5173 | Vite dev server (profile `frontend`) |
| `horizon` / `reverb` | 8081 | queue worker / WebSocket (profile `workers`) |

## First-time setup (scaffold Laravel into this repo)

The repo already holds docs/.github/.claude, so scaffold via a temp dir and merge (no overwrite):

```bash
# 1. Start core services
docker compose up -d

# 2. Create the Laravel 13 app inside the container (one-time)
docker compose exec app sh -lc '\
  composer create-project laravel/laravel /tmp/app "13.*" && \
  cp -rn /tmp/app/. ./ && rm -rf /tmp/app'

# 3. Configure env (merge values from .env.docker.example into the new .env)
docker compose exec app sh -lc 'php artisan key:generate'
#   then set DB_HOST=postgres, REDIS_HOST=redis, etc. per .env.docker.example

# 4. Migrate
docker compose exec app php artisan migrate

# 5. Frontend (Inertia + React + Vite)
docker compose --profile frontend up node    # → http://localhost:5173
```

Open **http://localhost:8080**.

## Day-to-day

```bash
docker compose up -d                          # start core (app, nginx, db, redis)
docker compose exec app php artisan <cmd>      # artisan
docker compose exec app composer <cmd>         # composer
docker compose exec app ./vendor/bin/pest      # tests
docker compose exec app ./vendor/bin/pint      # lint
docker compose --profile frontend up node      # vite dev server
docker compose --profile workers up -d horizon reverb  # queue + websocket
docker compose exec postgres psql -U crm -d cho_rach   # db shell
docker compose down                            # stop (add -v to wipe DB volume)
```

## Notes

- DB host **inside** containers is `postgres` (not `localhost`); from the host it's `localhost:5432`.
- `horizon` / `reverb` services only work **after** the Laravel app exists (they run artisan).
- This is a **dev** environment. Production targets Forge/VPS or Docker per the stack (see `system-architecture.md`).
- `.env` is gitignored; never commit secrets.
