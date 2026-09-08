# Local Development

Host-based workflow: local **PHP 8.4 + PostgreSQL + Redis + Node 22 (pnpm)**.

Stack: PHP 8.4 (Laravel 13) · PostgreSQL · Redis 7 · Node 22 (Vite) · Reverb (realtime).

## Canonical database naming (single source of truth)

| Thing | Name |
|---|---|
| Dev database | `yona` |
| Test database | `yona_test` |
| Runtime role (RLS-enforced) | `yona_app` |
| Privileged role (schema owner, BYPASSRLS, NOSUPERUSER) | `yona_owner` |
| Laravel runtime connection | `pgsql` |
| Laravel privileged connection | `pgsql_privileged` |

The real superuser (`postgres`) is for cluster maintenance and `make db-roles`
only — the application must never connect as a superuser (production refuses to
boot if it does; see `database-safety.md`).

## First-time setup (fresh machine)

Create the two databases once (as the superuser), then one command:

```bash
createdb -h 127.0.0.1 -U postgres yona
createdb -h 127.0.0.1 -U postgres yona_test
make setup    # deps + .env + APP_KEY + roles + migrate + assets
```

Then:

```bash
make dev      # server + queue + logs + Vite (composer run dev)
```

## Day-to-day

```bash
make dev            # run the app (http://localhost:8610)
make migrate        # pending migrations on dev + test DBs (as yona_owner)
make db-roles       # re-apply role grants (idempotent; run after adding tables)
make test           # Pest suite (runs on yona_test, RLS enforced)
make check          # pint --test + phpstan + tests
make bridge         # Zalo personal bridge (foreground)
make workers        # Horizon + Reverb
```

## Postgres roles & Row-Level Security

Tenant isolation has a Postgres RLS backstop (BR-X18), and **superusers/table
owners bypass RLS**. So the app uses **two roles**:

| Role | Connection | Used for |
|---|---|---|
| `yona_app` (non-superuser, non-owner) | `pgsql` (runtime/default) | All web + test queries — **subject to RLS**. Tenant set per request via `set_config('app.current_workspace', …)`. |
| `yona_owner` (schema owner, BYPASSRLS, NOSUPERUSER) | `pgsql_privileged` | Migrations (DDL), append-only audit writes, webhook workspace resolve, cross-workspace platform reads. |

- `make db-roles` runs `database/sql/setup-roles.sql` (idempotent, as the real
  superuser `postgres`) on `yona` + `yona_test`: creates both roles, grants DML to
  `yona_app`, transfers DB/schema ownership to `yona_owner`, and re-applies the
  `audit_logs` immutability revoke.
- `make migrate` runs as the owner (`--database=pgsql_privileged`) on both DBs.
- `.env`: `DB_DATABASE=yona`, `DB_USERNAME=yona_app`,
  `DB_PRIVILEGED_USERNAME=yona_owner` (local trust auth, empty passwords).
- Requires local trust auth for the roles (default `pg_hba.conf` for
  local/127.0.0.1). If login fails, add a trust line for the role — do not
  weaken auth beyond local.
- CI mirrors this exactly (`.github/workflows/ci.yml`): a throwaway `yona_test`
  is bootstrapped with the same `setup-roles.sql`, so tests run RLS-enforced
  there too.

## Notes

- Never point `.env` at a superuser: RLS silently stops applying and dev stops
  catching isolation bugs that will then only show in production.
- After changing `.env` DB credentials, restart long-running processes
  (`make dev`, Horizon, Reverb) — they hold old connections.
- Production targets Forge/VPS (see `system-architecture.md`).
