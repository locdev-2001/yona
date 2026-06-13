# Local Development

The recommended path is **Docker** — a fresh machine only needs **Docker Desktop** (or Docker Engine + Compose v2). No PHP/Postgres/Redis on the host. A host-based workflow is also kept for devs who already run PHP 8.4 locally.

Stack: PHP 8.4 (Laravel 13) · PostgreSQL 16 · Redis 7 · Nginx · Node 22 (Vite) · Reverb (realtime).

## Services

| Service | Port (host) | Purpose |
|---|---|---|
| `nginx` | 8080 | App entrypoint → http://localhost:8080 |
| `app` | — | PHP-FPM 8.4 (run composer/artisan here) |
| `postgres` | 5432 | DB `cho_rach` (user `crm` / pass `secret`) |
| `redis` | 6379 | cache / queue / session / broadcast |
| `node` | 5173 | Vite dev server (profile `frontend`) |
| `horizon` / `reverb` | 8081 | queue worker / WebSocket (profile `workers`) |

## First-time setup (fresh machine)

One command — it builds the image, installs deps, generates `APP_KEY`, migrates, and starts the app:

```bash
make setup
```

Then open **http://localhost:8080**. For frontend hot-reload:

```bash
make docker-front   # Vite dev server → http://localhost:5173
```

> No `make`? Run the equivalent directly:
> ```bash
> docker compose build
> docker compose run --rm app sh -lc 'test -f .env || cp .env.example .env'
> docker compose run --rm app composer install
> docker compose run --rm app php artisan key:generate --force
> docker compose run --rm app php artisan migrate --force
> docker compose up -d app nginx
> ```

### How env works

Infra hostnames/creds (DB, Redis, Reverb) are injected as **container env vars** in `docker-compose.yml` (the `x-app-env` anchor). Laravel's `env()` reads them and they **override** the `.env` file — so the **same `.env`** works on the host (SQLite/localhost defaults) and in Docker (Postgres/Redis), without editing it. `.env.docker.example` documents those values for reference (e.g. prod). `.env` is gitignored — never commit secrets.

## Day-to-day (Docker)

```bash
make docker-up                       # start core (app, nginx, postgres, redis)
make docker-sh                       # shell into the app container
make docker-artisan CMD="route:list" # run artisan
make docker-migrate                  # run migrations
make docker-test                     # Pest suite
make docker-pint                     # format
make docker-check                    # pint --test + phpstan + tests
make docker-front                    # Vite dev server
make docker-workers                  # Horizon + Reverb
make docker-logs S=app               # tail logs (omit S for all)
make docker-down                     # stop (ARGS=-v wipes the DB volume)
make docker-build                    # rebuild images without cache
```

## Host workflow (optional)

If you already have PHP 8.4 + Postgres + Redis locally, the plain (unprefixed) targets run on the host instead of Docker:

```bash
make install        # composer install + pnpm install
make db-roles       # one-time: create cho_rach_app role + grants (real RLS)
make migrate        # run migrations on the host (dev + test DBs, as owner)
make dev            # server + queue + logs + vite (composer run dev)
make test
make check
```

### Postgres roles & Row-Level Security (host)

Tenant isolation has a Postgres RLS backstop (BR-X18), and **superusers/table owners bypass RLS**. So the app uses **two roles**:

| Role | Connection | Used for |
|---|---|---|
| `cho_rach_app` (non-superuser) | `pgsql` (runtime/default) | All web + test queries — **subject to RLS**. Tenant set per request via `set_config('app.current_workspace', …)`. |
| `cho_rach_owner` (owner) | `pgsql_privileged` | Migrations (DDL), append-only audit writes, cross-workspace platform reads. |

- `make db-roles` runs `database/sql/setup-roles.sql` (idempotent) on `cho_rach` + `cho_rach_test`. Re-run it after adding tables so the app role keeps its grants (default privileges also auto-grant future tables).
- `make migrate` runs as the owner (`--database=pgsql_privileged`) on both DBs.
- `.env`: `DB_USERNAME=cho_rach_app`, `DB_PRIVILEGED_USERNAME=cho_rach_owner` (local trust auth, empty passwords).
- Requires local trust auth for `cho_rach_app` (default `pg_hba.conf` for local/127.0.0.1). If login fails, add a trust line for the role — do not weaken auth beyond local.

## Images

`docker/php/Dockerfile` is multi-stage:

- **base** — PHP 8.4-fpm-alpine + extensions (pdo_pgsql, redis, gd, intl, zip, bcmath, pcntl, opcache). Build headers are installed in a virtual package and removed after compiling, so only runtime libs remain.
- **dev** — adds an entrypoint that self-bootstraps (`.env`, `composer install`, `APP_KEY`) so a plain `docker compose up` works. Used by `app`/`horizon`/`reverb`.
- **prod** — bakes in `--no-dev` vendor + compiled Vite assets (built in a `node:22` stage), optimized autoloader, runs as non-root `www-data`.

Build a production image: `docker build -f docker/php/Dockerfile --target prod -t cho-rach:prod .`

## Notes

- DB host **inside** containers is `postgres`; from the host it's `localhost:5432`.
- `horizon` / `reverb` run artisan, so they need deps installed (done by `make setup`).
- This is a **dev** environment. Production targets Forge/VPS or the `prod` image (see `system-architecture.md`).
