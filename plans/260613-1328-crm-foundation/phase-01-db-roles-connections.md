# Phase 01 — DB roles + dual connections (infra)

Priority: P0 (blocks RLS) · Status: pending · Type: infra (no UI)

## Goal
Make RLS enforceable: runtime connects as a non-superuser role; migrations/privileged paths use the owner. Auth must stay green.

## Why
`beru` is SUPERUSER+BYPASSRLS → RLS never bites. Need a dedicated `cho_rach_app` non-super role for runtime queries (subject to RLS), keep `beru` for DDL + audit-immutable + cross-workspace.

## Steps
1. **Role setup script** `database/sql/setup-roles.sql` (idempotent, run via psql as `beru` on BOTH `cho_rach` and `cho_rach_test`):
   - `CREATE ROLE cho_rach_app LOGIN;` (no password — local trust) guarded by `DO $$ ... IF NOT EXISTS`.
   - `GRANT CONNECT ON DATABASE <db> TO cho_rach_app;`
   - `GRANT USAGE ON SCHEMA public TO cho_rach_app;`
   - `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO cho_rach_app;`
   - `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO cho_rach_app;`
   - `ALTER DEFAULT PRIVILEGES FOR ROLE beru IN SCHEMA public GRANT SELECT,INSERT,UPDATE,DELETE ON TABLES TO cho_rach_app;`
   - `ALTER DEFAULT PRIVILEGES FOR ROLE beru IN SCHEMA public GRANT USAGE,SELECT ON SEQUENCES TO cho_rach_app;`
   - NOTE: audit_logs grant is **narrowed** in phase 05 (REVOKE UPDATE,DELETE on audit_logs).
2. **Makefile** target `db-roles` to run the script on both DBs (prepend PATH php@8.4). Document in `docs/local-development.md` (additive note).
3. **config/database.php**: add two connections:
   - `pgsql` (runtime) → username `env('DB_USERNAME','cho_rach_app')`. Add `'options' => extension... ` not needed. Keep search_path public.
   - `pgsql_privileged` → username `env('DB_PRIVILEGED_USERNAME','beru')`, same db/host. Used by migrations + audit writer + platform reads.
4. **.env / .env.example**: `DB_USERNAME=cho_rach_app`, `DB_PRIVILEGED_USERNAME=beru`, `DB_PRIVILEGED_PASSWORD=`. Keep `DB_CONNECTION=pgsql`.
5. **Migrations run on privileged**: set `'migrations' => ['table'=>'migrations','update_default_connection'=>false]`? Simpler: a small `config` — run `php artisan migrate --database=pgsql_privileged`. Update Makefile `migrate` target to `--database=pgsql_privileged` for both DBs. (Tests bootstrap migrate once via same.)
6. Grant existing tables now so cho_rach_app can run current auth queries.

## Files
- create: `database/sql/setup-roles.sql`
- edit: `config/database.php`, `.env`, `.env.example`, `Makefile`, `docs/local-development.md`

## Success criteria
- `psql -U cho_rach_app -d cho_rach -c "select count(*) from users"` works (2 rows).
- `php artisan migrate --database=pgsql_privileged` runs (no pending = OK).
- `php artisan test --filter=Auth` → existing 26 tests green under cho_rach_app runtime.
- `cho_rach_app` is NOT superuser, NOT table owner (RLS will apply in phase 03).

## Risks
- Trust auth must allow cho_rach_app local login (pg_hba `local all all trust` / host 127.0.0.1). If login fails → document adding pg_hba line (do NOT edit without confirming). 
- Tests connect to `cho_rach_test` as cho_rach_app → ensure grants applied there too.
