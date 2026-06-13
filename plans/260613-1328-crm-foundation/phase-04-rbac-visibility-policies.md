# Phase 04 — RBAC + Visibility + Policies

Priority: P0 · Status: pending · Type: BE
BR: X02, X03, X12, X13, X15 · Arch §5 · auth-model Plane 2

## Goal
Feature gate (spatie roles per workspace) + record gate (Visibility own/team-subtree/all + Policies). Team hierarchy maintained with cycle-guard + closure.

## spatie setup
1. `config/permission.php`: `teams => true`; `column_names.team_foreign_key => 'workspace_id'`. (model team stays null; we use DefaultTeamResolver + setPermissionsTeamId.)
2. Publish spatie migration → **customize before migrate**: `workspace_id` columns must be **uuid nullable** (default is unsignedBigInteger). Roles/permissions tables get `workspace_id`. Run on `pgsql_privileged`. Re-grant (`make db-roles`).
3. `User` model `use HasRoles;`. `$guard_name='web'`.
4. **Seeder** `PlatformPermissionSeeder` (idempotent, global roles workspace_id null): create the 7 workspace roles + foundation permissions (`workspace.manage`, `team.manage`, `member.manage`, `audit.view`, ... extend per module later). Map perms→roles (admin = all; sales_manager = team scope; viewer = read). Run via `php artisan db:seed --class=PlatformPermissionSeeder` (idempotent `firstOrCreate`).
5. Sync rule: `workspace_member.role` is canonical. `MembershipService` (phase 09) calls `setPermissionsTeamId($ws->id); $user->syncRoles([$member->role])`. For phase-04 tests, a helper does the same.

## Visibility (`app/Support/Visibility.php`)
```php
static scopeFor(Builder $q, WorkspaceMember $m): Builder
  => match(level($m)) {
       'all'  => $q,                                  // admin
       'team' => $q->whereIn(table.'.team_id', visibleTeamIds($m)), // manager subtree
       default=> $q->where(table.'.owner_id', $m->user_id),         // rep/agent/viewer own
     };
static level(WorkspaceMember): 'all'|'team'|'own'  // admin→all; *_manager→team; else→own
```
- `visibleTeamIds(WorkspaceMember)`: own `team_id` + descendants via `team_closure` (`where ancestor_id = m.team_id → descendant_id`). Cached per-request. Empty team → just own records.
- Runs INSIDE the already-workspace-scoped query (compose after global scope).

## Team hierarchy (`app/Support/TeamHierarchy.php` or `TeamService`)
- `create(name, parentId)`: insert team; **closure insert**: self-row depth 0 + copy ancestor rows of parent (`INSERT ... SELECT ancestor_id, newId, depth+1 FROM team_closure WHERE descendant_id=parent`). In one TX.
- `reparent(team, newParentId)`: **cycle guard** — reject if `newParentId` ∈ descendants(team) (closure lookup) or == team. Rebuild closure for moved subtree (delete subtree-vs-outside links, re-insert under new ancestors). Depth-bounded. Admin-only (BR-X13). TX + audit.
- `descendants(team)` / `ancestors(team)` helpers via closure.

## Policies (`app/Policies/`)
- `WorkspacePolicy`: `update`/`manage` → role admin (member.role==='admin' or can('workspace.manage')).
- `TeamPolicy`: `viewAny`/`create`/`update`/`delete`/`reparent` → admin only (BR-X12/X13).
- `WorkspaceMemberPolicy`: `viewAny`/`invite`/`updateRole`/`deactivate` → admin only; a user can never change own role/widen own visibility (BR-X12).
- Register in `AppServiceProvider` or auto-discovery. Controllers call `$this->authorize(...)`.
- 404-not-403 for out-of-visibility single records (BR-X15) — implement in controllers via `findForCurrentUserOrFail` pattern (scope then firstOrFail → 404).

## Tests (`tests/Feature/Platform/`)
- `VisibilityMatrixTest`: build team tree (root→childA→grandchild, childB). Seed teams/members. Assert: rep sees own; manager of childA sees childA+grandchild (subtree) not childB; admin sees all. Use a foundation model carrying owner_id/team_id — **use `teams` is not owner-scoped**; create a tiny test by scoping `WorkspaceMember` visibility OR add visibility assertions on a representative query. (Visibility fully exercised on Sales entities later; here prove `visibleTeamIds` + `scopeFor` SQL correctness with a query against team_closure-backed dataset.)
- `TeamCycleGuardTest`: reparent into own descendant → rejected; valid reparent → closure correct (subtree depths recomputed).
- `RbacFeatureGateTest`: viewer cannot `team.manage`; admin can; role scoped per workspace (same user admin in W1, viewer in W2 → permissions differ after setPermissionsTeamId).
- `PrivilegeEscalationTest`: non-admin cannot change own membership role/team (service/policy blocks).

## Success criteria
- spatie migration applied (uuid workspace_id); seeder idempotent.
- Visibility SQL correct for own/team/all; closure subtree correct after reparent.
- Cycle guard rejects; policies block non-admins.
- pint + larastan green.

## Risks
- spatie published migration column types — must hand-edit to uuid before migrate (forward-only after).
- `setPermissionsTeamId` must be called before any permission check (middleware in phase 03 already does it).
