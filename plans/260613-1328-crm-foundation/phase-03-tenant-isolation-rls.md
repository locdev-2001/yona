# Phase 03 — Tenant isolation + RLS + CI check ⭐

Priority: P0 (security backbone) · Status: pending · Type: BE
BR: X01, X11, X12, X14, X15, X18 · Arch §4

## Goal
Three-layer isolation: (1) `BelongsToWorkspace` global scope + auto-stamp, (2) `IdentifyWorkspace` middleware (server-derived active workspace + membership validation + `SET app.current_workspace`), (3) Postgres RLS default-deny + FORCE on every tenant table. CI/test asserts coverage.

## Components

### `app/Support/CurrentWorkspace.php` + helper
Resolver holding active Workspace + active WorkspaceMember. Bound in container `app()->instance('currentWorkspace', $ws)`. Global helper `currentWorkspace(): ?Workspace`, `currentMembership(): ?WorkspaceMember` in `app/helpers.php` (autoload via composer `files`). **STOP check**: editing composer.json autoload is config, not a new dep — allowed.

### `app/Models/Concerns/BelongsToWorkspace.php`
- `addGlobalScope('workspace')` → `where(table.workspace_id, currentWorkspace()->id)` when bound.
- `creating` hook → stamp `workspace_id` from currentWorkspace if empty.
- Guard: `workspace_id`, `owner_id`, `team_id` NOT in `$fillable` (server-set only, BR-X12) — enforced per-model.
- `workspace()` belongsTo.
- Applied to: Team, TeamClosure(via workspace_id), WorkspaceMember, AuditLog (scope only — writes via privileged), WorkspaceSequence. (Workspace itself excluded.)

### `app/Http/Middleware/IdentifyWorkspace.php`
1. `$user = $request->user()` (after auth).
2. Resolve active workspace id from **session** `current_workspace_id` (server-side, never request input — BR-X14). If absent → pick user's first active membership; persist to session.
3. Load Workspace + membership: `WorkspaceMember::where(workspace_id,user_id)->where(status,'active')`. If internal user w/o membership → impersonation hook (stub: 403 for v1 unless impersonating flag — minimal). Else no active membership → 403.
4. Bind `currentWorkspace`/`currentMembership`; `spatie setPermissionsTeamId($ws->id)` (phase 04 uses it).
5. `DB::statement("SELECT set_config('app.current_workspace', ?, false)", [$ws->id])` on default (cho_rach_app) connection.
6. Register in web group AFTER auth — only on authed routes. Use route middleware alias `workspace` applied to the `auth` group in routes (web.php + settings.php), NOT global (auth pages have no workspace).

### RLS migration `..._enable_rls_on_tenant_tables.php` (runs on pgsql_privileged)
For each tenant table (teams, team_closure, workspace_member, audit_logs, workspace_sequences):
```sql
ALTER TABLE <t> ENABLE ROW LEVEL SECURITY;
ALTER TABLE <t> FORCE ROW LEVEL SECURITY;
CREATE POLICY ws_isolation ON <t> USING (workspace_id = current_setting('app.current_workspace', true)::uuid)
  WITH CHECK (workspace_id = current_setting('app.current_workspace', true)::uuid);
```
- `audit_logs`: USING same; but inserts come via privileged connection (set_config not set there) → privileged (beru superuser) BYPASSes RLS, so platform writes/reads work. Workspace-plane SELECT sees only its rows. (FORCE doesn't affect superuser.)
- default-deny: unset setting → NULL → no rows.
- down(): DROP POLICY + DISABLE (forward-only in prod, but down kept non-destructive — only drops policy objects, no data).

### CI / coverage guard (BR-X18)
`tests/Feature/Platform/RlsPolicyCoverageTest.php` — query `pg_class.relrowsecurity` + `pg_policies`; assert every table carrying a `workspace_id` column (except `workspaces`) has RLS enabled AND a policy. Fails when a future tenant table forgets its policy.

## Tests (`tests/Feature/Platform/`)
- `TenantIsolationTest`: seed 2 workspaces with teams; `actingInWorkspace($a)` (helper) → `Team::count()` returns only A's; switching to B never shows A. App-layer (global scope) + assert via cho_rach_app RLS.
- `RlsBypassTest`: with NO `app.current_workspace` set → raw `DB::table('teams')->get()` returns **0** rows (default-deny). With wrong workspace set → 0 rows of other workspace. Proves RLS independent of Eloquent scope.
- `MassAssignmentGuardTest`: attempt to set `workspace_id`/`owner_id`/`team_id` via mass-assign on a model → not persisted/blocked (BR-X12).
- `RlsPolicyCoverageTest` (above).

## Test helpers (`tests/Pest.php` or `tests/TestCase.php`)
- `actingInWorkspace(Workspace $w, ?User $u)`: bind currentWorkspace, `set_config('app.current_workspace', id, false)`, actingAs($u). 
- `beforeEach` (Feature/Platform): reset `set_config('app.current_workspace','',false)` so RLS default-denies between tests (avoid leak across tests on reused connection).

## Success criteria
- Isolation + bypass + coverage + mass-assign tests pass under cho_rach_app.
- Existing auth tests still green (workspace middleware only on workspace routes, not auth).
- larastan + pint clean.

## Risks
- `set_config(...,false)` persists on connection → reset per test (beforeEach) to keep default-deny honest.
- Privileged connection must be used for migrations (DDL) — confirm RLS migration runs as beru.
