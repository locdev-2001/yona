# Phase 02 — Platform schema + models

Priority: P0 · Status: pending · Type: BE

## Goal
Additive UUID migrations for the platform tables + Eloquent models, factories. No isolation/RLS yet (phase 03), no audit grants narrowing yet (phase 05).

## Schema (UUID PK new tables; bigint FKs → users). One migration file per concern, additive.

### `workspaces` (root boundary — NOT workspace-scoped)
`id uuid pk` · `name string` · `slug string unique` · `base_currency char(3) default 'VND'` · `timezone string default 'Asia/Ho_Chi_Minh'` · `locale string default 'vi'` · `default_pipeline_id uuid null` (no FK yet) · `audit_retention string default '1y'` · `status string default 'active'` (active|suspended) · `created_by bigint null FK users` · `timestamps` · `softDeletes`.

### `users` (extend — additive, do NOT edit shipped migration)
add `status string default 'active'` (active|locked) · `is_internal boolean default false` · `locale string null` · `timezone string null`.

### `platform_role_user`
`id uuid pk` · `user_id bigint FK users cascade` · `platform_role string` (super_admin|support_engineer|billing_ops) · `timestamps` · `unique(user_id, platform_role)`.

### `workspace_member` (membership — the workspace-scoped join)
`id uuid pk` · `workspace_id uuid FK workspaces cascade` · `user_id bigint FK users cascade` · `role string` (admin|sales_manager|sales_rep|support_manager|support_agent|marketer|viewer) · `team_id uuid null FK teams nullOnDelete` · `status string default 'invited'` (active|invited|deactivated) · `invited_at timestamptz null` · `joined_at timestamptz null` · `lock_version int default 0` · `timestamps` · `unique(workspace_id, user_id)` · index `(workspace_id, status)`. **No softDeletes** (deactivate = status, BR-X03).

### `teams` (workspace-scoped tree)
`id uuid pk` · `workspace_id uuid FK` · `name string` · `parent_id uuid null FK teams nullOnDelete` · `lock_version int default 0` · `created_by/updated_by bigint null` · `timestamps` · `softDeletes` · `unique(workspace_id, name)` · index `(workspace_id, parent_id)`.

### `team_closure` (O(1) subtree)
`workspace_id uuid` · `ancestor_id uuid FK teams cascade` · `descendant_id uuid FK teams cascade` · `depth int` · primary key `(ancestor_id, descendant_id)` · index `(workspace_id, ancestor_id)`, `(workspace_id, descendant_id)`. Self-row depth 0 per team.

### `audit_logs` (append-only; workspace_id nullable for platform events)
`id uuid pk` · `workspace_id uuid null` · `entity_type string` · `entity_id string` · `action string` · `actor_id bigint null FK users` · `actor_type string null` (user|system|platform) · `impersonated_by bigint null FK users` · `changes jsonb null` · `context jsonb null` · `occurred_at timestamptz` · index `(workspace_id, entity_type, entity_id, occurred_at)`, `(workspace_id, occurred_at)`. **No updated_at/deleted_at.**

### `workspace_sequences`
`id uuid pk` · `workspace_id uuid FK` · `entity string` · `next_value bigint default 1` · `timestamps` · `unique(workspace_id, entity)`.

## Models (`app/Models/`)
- `Workspace` (HasUuid, SoftDeletes, casts) — hasMany members, teams; (BelongsToWorkspace NOT applied — it's the root).
- `WorkspaceMember` (HasUuid) — belongsTo workspace, user, team. fillable excludes server-controlled where needed (set via service).
- `Team` (HasUuid, SoftDeletes) — belongsTo workspace, parent; hasMany children.
- `TeamClosure` (no incrementing single pk → composite; `protected $primaryKey=null; public $incrementing=false; $timestamps=false`).
- `PlatformRole` (HasUuid) — belongsTo user. (table platform_role_user)
- `AuditLog` (HasUuid; read-only — override `save`/`update`/`delete` to throw; uses `pgsql_privileged` connection for writes via Audit writer in phase 05).
- `WorkspaceSequence` (HasUuid).
- `User` extend: casts is_internal bool; relations `memberships()`, `platformRoles()`, helper `memberIn(Workspace)`, `isInternal()`. **Do NOT add HasRoles yet** — added in phase 04 with spatie.
- `app/Models/Concerns/HasUuid.php`: `$keyType='string'; $incrementing=false;` + creating hook `Str::uuid7()` (ordered) fallback uuid4.

## Factories
- `WorkspaceFactory`, `TeamFactory`, `WorkspaceMemberFactory` (state for role/status). UserFactory already exists.

## Steps
1. Write migrations (additive timestamps `2026_06_13_1[0-9]*`). Order: workspaces → users-extend → teams → team_closure → platform_role_user → workspace_member → audit_logs → workspace_sequences (FK order; workspace_member.team_id FK after teams).
2. `php artisan migrate --database=pgsql_privileged` on cho_rach + cho_rach_test.
3. Re-run role grants (new tables) — `make db-roles`.
4. Models + HasUuid + factories. `vendor/bin/pint` + `larastan`.

## Success criteria
- All tables exist; `php artisan migrate:status` clean; no pending.
- `Workspace::factory()->create()` returns a uuid id; relations resolve.
- larastan green; pint clean.

## Notes
- `default_pipeline_id` stays a bare uuid column (FK added when pipelines ship).
- audit_logs INSERT/SELECT-only grant happens in phase 05 (after table exists + writer built).
