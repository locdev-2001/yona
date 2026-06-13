# Module 1 — Platform Foundation (Build Plan)

> Turns the locked architecture (`docs/system-architecture.md` §12.1, `crm-authorization-model.md`, `crm-business-rules.md` §6/6b) into executable phases. **Phase 0–1.5 done** (discovery + red-team in `reports/`). This is **Phase 2 → 3 → 4** for Module 1 only.

Date: 2026-06-13 · Status: in-progress · Scope: Platform foundation END-TO-END (BE + UI + tests)

## Locked decisions (this build)

1. **ID strategy = hybrid.** `users.id` stays **bigint** (shipped Breeze table, has data; supreme DB-safety rule forbids destructive change). **All new platform/workspace/domain tables use UUID PKs.** FKs → users (`owner_id`, `created_by`, `updated_by`, `assignee_id`, `member.user_id`, `actor_id`) are **bigint**; `workspace_id` and all domain FKs are **uuid**. (Deviation from "UUID everywhere" — documented in system-architecture.md.)
2. **RLS for real.** Runtime connects as non-superuser **`cho_rach_app`** (RLS enforces). Migrations + audit-immutable writes + cross-workspace platform reads use the **`pgsql_privileged`** connection (owner `beru`). `FORCE ROW LEVEL SECURITY` on every tenant table. Default-deny via `current_setting('app.current_workspace', true)`.
3. **spatie team-aware**: `teams=true`, `column_names.team_foreign_key='workspace_id'` (uuid). Role **definitions global** (workspace_id null); **assignments per-workspace** via `setPermissionsTeamId($workspace->id)`. `workspace_member.role` is the **canonical** server-controlled role (BR-X12); spatie assignment is synced from it.
4. **DB safety**: additive forward-only migrations; tests use `DatabaseTransactions` (already wired); `php artisan migrate` (never fresh) on `cho_rach` + `cho_rach_test`.

## Phases (BE foundation 01–05, vertical UI slices 06–09)

| # | Phase | Type | Gate |
|---|---|---|---|
| 01 | [DB roles + dual connections](phase-01-db-roles-connections.md) | infra | auth tests stay green via cho_rach_app |
| 02 | [Platform schema + models](phase-02-platform-schema.md) | BE | migrate additive; models compile; factories |
| 03 | [Tenant isolation + RLS + CI check](phase-03-tenant-isolation-rls.md) | BE ⭐ | Pest: ZERO cross-workspace leak; RLS-bypass blocked; every tenant table has policy (BR-X01/X11/X14/X18) |
| 04 | [RBAC + Visibility + Policies](phase-04-rbac-visibility-policies.md) | BE | Pest: visibility matrix own/team-subtree/all; no priv-escalation (BR-X02/X12/X13) |
| 05 | [Audit + concurrency + sequences + i18n/UTC](phase-05-audit-concurrency-sequences-i18n.md) | BE | Pest: audit append-only/immutable; stale-write rejected; atomic sequence (BR-X05/X08) |
| 06 | [UI: app shell + workspace switch + user menu + i18n](phase-06-ui-shell-workspace-switch.md) | slice | tsc + build green; switch persists server-side (BR-X14) |
| 07 | [UI: Settings → Workspace](phase-07-ui-settings-workspace.md) | slice | Pest + Playwright; admin-gated |
| 08 | [UI: Settings → Teams (CRUD tree)](phase-08-ui-settings-teams.md) | slice | Pest (cycle-guard, closure) + Playwright (create team) |
| 09 | [UI: Settings → Members (invite/role/team)](phase-09-ui-settings-members.md) | slice | Pest (role server-controlled) + Playwright (invite + assign role) |

## File-ownership map (no overlap within a phase)

- **Migrations** `database/migrations/2026_06_13_1*` — phase 02/03/05 own distinct timestamps.
- **Models** `app/Models/{Workspace,WorkspaceMember,Team,TeamClosure,PlatformRole,AuditLog,WorkspaceSequence}.php` + `User.php` (extend) — phase 02.
- **Concerns/Support** `app/Models/Concerns/*`, `app/Support/{CurrentWorkspace,Visibility,TeamHierarchy,Audit}*` — phase 03/04/05.
- **Middleware** `app/Http/Middleware/{IdentifyWorkspace,SetLocale}.php` + `bootstrap/app.php` — phase 03/05/06.
- **Controllers/Requests** `app/Http/Controllers/{Workspace,Settings/Team,Settings/Member}*` — phase 06–09 (distinct files each).
- **Frontend** `resources/js/{components/workspace-switcher,pages/settings/*}.tsx`, `resources/js/lib/i18n.ts`, `resources/js/types/index.ts` — phase 06–09.
- **lang/** `lang/{vi,en}.json`, `lang/{vi,en}/*.php` — phase 05/06.
- **Tests** `tests/Feature/Platform/*`, `e2e/*.spec.ts` — each phase owns its own test files.

## Per-slice loop

implement BE → `php artisan migrate` (additive, both DBs) → Pest feature → UI → `pnpm tsc` + `pnpm build` → Playwright (if slice) → `make format` → conventional commit (NO push). Run `vendor/bin/pint` + `larastan` before each commit.

## STOP gates (per session brief)

delete files · add new composer/pnpm dep · any data-loss-risk op · decision diverging from docs · test red after 3 fix attempts. Otherwise run continuously.

## Out of scope (later modules)

custom-fields engine · attachments/notifications · Reverb realtime · Sales/Support/Marketing entities · marketplace/entitlements · impersonation full UI (middleware hook stubbed only) · inbound API/webhooks.
