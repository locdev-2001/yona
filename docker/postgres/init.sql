-- Docker Postgres first-boot bootstrap (runs once on an empty data dir, as the
-- superuser `cho_rach_owner`). Mirrors the host role design so RLS is actually enforced in
-- dev: the app connects as a non-superuser role, migrations run as the owner.
-- See docs/local-development.md and database/sql/setup-roles.sql.

-- Runtime application role. Docker uses TCP/password auth (not local trust), so
-- unlike the host it needs a password. setup-roles.sql's CREATE is guarded by
-- IF NOT EXISTS, so this password is preserved when grants run below.
CREATE ROLE cho_rach_app LOGIN PASSWORD 'secret';

-- Separate test database, owned by the privileged role (as on the host).
CREATE DATABASE cho_rach_test OWNER cho_rach_owner;

-- Apply the app-role grants on both databases (idempotent script from the repo).
\connect cho_rach
\i /opt/db/setup-roles.sql

\connect cho_rach_test
\i /opt/db/setup-roles.sql
