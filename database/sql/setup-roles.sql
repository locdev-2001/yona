-- Chó Rách Management — Postgres role setup for real RLS enforcement.
--
-- Run as the DB owner/superuser (beru) on BOTH databases:
--   psql -U beru -d cho_rach      -f database/sql/setup-roles.sql
--   psql -U beru -d cho_rach_test -f database/sql/setup-roles.sql
-- (or: make db-roles)
--
-- Why: the app must connect as a NON-superuser, NON-owner role so Postgres
-- Row-Level Security policies actually apply (superusers + table owners bypass
-- RLS). Migrations + audit-immutable writes + cross-workspace platform reads
-- use the privileged owner connection (beru). Idempotent — safe to re-run.

-- 1. Runtime application role (RLS-enforced). No password: local trust auth.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cho_rach_app') THEN
    CREATE ROLE cho_rach_app LOGIN;
  END IF;
END
$$;

-- 2. Connect + schema usage. (\gexec runs the generated GRANT for the current DB.)
SELECT format('GRANT CONNECT ON DATABASE %I TO cho_rach_app', current_database())
\gexec

GRANT USAGE ON SCHEMA public TO cho_rach_app;

-- 3. DML on all current tables + sequences.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO cho_rach_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO cho_rach_app;

-- 4. Future tables/sequences created by beru auto-granted to the app role.
ALTER DEFAULT PRIVILEGES FOR ROLE beru IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO cho_rach_app;
ALTER DEFAULT PRIVILEGES FOR ROLE beru IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO cho_rach_app;

-- 5. Audit immutability (BR-X05): the app role may read + append audit rows but
--    never mutate/delete them. Applied only once audit_logs exists (phase 05).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'audit_logs') THEN
    REVOKE UPDATE, DELETE ON public.audit_logs FROM cho_rach_app;
  END IF;
END
$$;
