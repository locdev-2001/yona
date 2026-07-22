-- Yona — Postgres role setup for real RLS enforcement.
--
-- Run as a superuser (postgres) on BOTH databases:
--   psql -h 127.0.0.1 -U postgres -d yona      -f database/sql/setup-roles.sql
--   psql -h 127.0.0.1 -U postgres -d yona_test -f database/sql/setup-roles.sql
-- (or: make db-roles)
--
-- Why: the app must connect as a NON-superuser, NON-owner role so Postgres
-- Row-Level Security policies actually apply (superusers + table owners bypass
-- RLS). Migrations + audit-immutable writes + cross-workspace platform reads
-- use the privileged owner connection (yona_owner). Idempotent — safe to re-run.

-- 1. Runtime application role (RLS-enforced). No password: local trust auth.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'yona_app') THEN
    CREATE ROLE yona_app LOGIN;
  END IF;
END
$$;

-- 1b. Privileged owner role: owns the schema, runs migrations (DDL), and
--     bypasses RLS for the 3 unavoidable seams (webhook workspace resolve,
--     cross-workspace system commands, audit-immutable writes).
--     NOSUPERUSER is deliberate — production boot-guard refuses superuser
--     runtimes (docs/database-safety.md).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'yona_owner') THEN
    CREATE ROLE yona_owner LOGIN NOSUPERUSER BYPASSRLS;
  ELSE
    ALTER ROLE yona_owner NOSUPERUSER BYPASSRLS;
  END IF;
END
$$;

-- 2. Connect + schema usage. (\gexec runs the generated GRANT for the current DB.)
SELECT format('GRANT CONNECT ON DATABASE %I TO yona_app', current_database())
\gexec
SELECT format('GRANT CONNECT ON DATABASE %I TO yona_owner', current_database())
\gexec

GRANT USAGE ON SCHEMA public TO yona_app;

-- 3. DML on all current tables + sequences.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO yona_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO yona_app;

-- 4. Future tables/sequences created by yona_owner auto-granted to the app role.
ALTER DEFAULT PRIVILEGES FOR ROLE yona_owner IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO yona_app;
ALTER DEFAULT PRIVILEGES FOR ROLE yona_owner IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO yona_app;

-- 5. Ownership: yona_owner owns the database + public schema so migrations
--    (DDL over pgsql_privileged) can create objects — PG15+ removed public
--    CREATE for non-owners. Idempotent; requires running as a superuser.
SELECT format('ALTER DATABASE %I OWNER TO yona_owner', current_database())
\gexec
ALTER SCHEMA public OWNER TO yona_owner;

-- 6. Audit immutability (BR-X05): the app role may read + append audit rows but
--    never mutate/delete them. Applied only once audit_logs exists (phase 05).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'audit_logs') THEN
    REVOKE UPDATE, DELETE ON public.audit_logs FROM yona_app;
  END IF;
END
$$;
