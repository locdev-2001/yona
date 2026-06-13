# Phase 05 — Audit + concurrency + sequences + i18n/UTC

Priority: P0 · Status: pending · Type: BE
BR: X05, X07, X08 · Arch §7, §9c

## Goal
Append-only audit log, optimistic concurrency, per-workspace record numbers, UTC time + bilingual i18n base.

## Audit (`app/Support/Audit/`)
- `Auditable` trait + `AuditObserver`: on `created/updated/deleted/restored` write an `audit_logs` row via the **`pgsql_privileged`** connection (so app role can't tamper). 
- Diff: changed keys + values, **PII-minimized** — fields in a model's `$piiAttributes` (name/email/phone) stored as `{ref:'<id>'}` not raw value (BR-X05/X07). Non-PII stored directly.
- `action`: create|update|delete|restore (+ explicit `reassign`/`role_change`/`team_change` emitted by services).
- actor = `auth()->id()`; actor_type user|system; impersonated_by from session if impersonating.
- `AuditLog` model: read-only — `save/update/delete` throw `RuntimeException`. Reads via global workspace scope (cho_rach_app sees own workspace; platform via privileged).
- **Grant narrowing migration** (pgsql_privileged): `REVOKE UPDATE, DELETE ON audit_logs FROM cho_rach_app;` (keep SELECT, INSERT — though inserts go via privileged anyway, keep INSERT for flexibility). Add to `setup-roles.sql` too (idempotent) so re-grants don't widen.
- Apply `Auditable` to Workspace, Team, WorkspaceMember.

## Optimistic concurrency (`app/Models/Concerns/HasOptimisticLock.php`)
- On `updating`: add `where lock_version = original`; increment `lock_version`. If save affects 0 rows → throw `App\Exceptions\StaleModelException` (409 in HTTP).
- Apply to `Team`, `WorkspaceMember` (columns added in phase 02). Foundation for Lead/Deal/etc later.
- Render: map `StaleModelException` → 409 + Inertia error in `bootstrap/app.php` exceptions.

## Record numbers (`WorkspaceSequence::next(string $entity): int`)
- Atomic: `INSERT ... ON CONFLICT (workspace_id,entity) DO UPDATE SET next_value = workspace_sequences.next_value + 1 RETURNING next_value` (single statement, race-safe). Workspace from currentWorkspace.
- Not wired to an entity yet (Deal #/Ticket # come with Sales/Support) — provide + unit test now.

## Time & locale (UTC base)
- `config/app.php` already UTC (Laravel default) — verify `'timezone' => 'UTC'`. Datetimes stored UTC; display converts to member/workspace tz (FE helper, phase 06).
- `.env`: `APP_LOCALE=vi`, `APP_FALLBACK_LOCALE=en` (design-system §10). `.env.example` too.
- `app/Http/Middleware/SetLocale.php`: resolve locale per-user (`users.locale`) → session → `Accept-Language` → default vi; `app()->setLocale()`. Register in web group.
- `lang/vi.json`, `lang/en.json` (flat UI strings) + `lang/{vi,en}/platform.php` (grouped: workspace/team/member labels). Seed the keys used by phases 06–09.
- `PUT /locale` route + tiny controller → persist `users.locale`, set session, back. (Used by user-menu switcher in phase 06.)

## Tests (`tests/Feature/Platform/`)
- `AuditAppendOnlyTest`: update a Team → audit row written; `$audit->update(...)`/`delete()` throw; PII field stored as ref not raw.
- `OptimisticLockTest`: two stale updates → second throws StaleModelException; lock_version increments.
- `WorkspaceSequenceTest`: `next('deal')` returns 1,2,3 sequentially; isolated per workspace; concurrent-safe (simulate two calls in tx).
- `LocaleResolutionTest`: user locale wins; fallback to vi; `__('platform.x')` resolves vi/en.

## Success criteria
- Audit immutable + PII-minimized; concurrency rejects stale; sequence atomic + per-workspace; locale resolves + bilingual strings load.
- audit_logs grants narrowed (no UPDATE/DELETE for cho_rach_app) — verified by a test attempting raw update → permission denied.
- pint + larastan green.

## Risks
- Audit observer must use privileged connection explicitly (`->on('pgsql_privileged')`) else cho_rach_app can't insert if INSERT later revoked — keep INSERT granted as belt-and-suspenders.
- StaleModelException mapping must not break Inertia validation flow.
