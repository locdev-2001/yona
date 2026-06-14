# CRM — Authorization Model (two planes)

> Source of truth for **who can access what**. Platform plane (your staff, `admin` guard) + Workspace plane (customers, `web` guard). **Two separate identity tables + two auth guards.**
> Companion to [system-architecture.md](system-architecture.md) §4–5 and [crm-business-rules.md](crm-business-rules.md) §6 (BR-X*).

Date: 2026-06-13 · Updated: 2026-06-14 (guard split) · Status: living

## Terminology

- **Workspace** = one customer organization. The **hard data-isolation boundary** (`workspace_id`).
- **Plane** = a level of access: **Platform** (your company) sits above all workspaces; **Workspace** is one customer's world.

## The two planes (two guards, two identities)

```
PLATFORM PLANE — guard `admin` → admins table → App\Models\Admin
  platform RBAC: spatie on guard `admin`, assignments scoped to Admin::PLATFORM_SCOPE (nil-uuid)
  roles: super_admin · support_engineer · billing_ops   (assignable permissions)
  permissions: platform.workspaces.{view,manage} · platform.billing.manage ·
               platform.admins.manage · platform.impersonate · platform.audit.view ·
               platform.monitoring.view
  powers: administer workspaces/admins/billing; god-mode via AUDITED impersonation
        │  cross-workspace (impersonation)
        ▼
WORKSPACE PLANE — guard `web` → users table → App\Models\User  (customers)
  Membership (workspace_member): role + team + status, per workspace
  workspace roles: admin · sales_manager · sales_rep · support_manager ·
                   support_agent · marketer · viewer
  tenant permissions: tenant.workspace.update · tenant.team.manage ·
                      tenant.member.manage · tenant.audit.view
  record visibility: own | team-subtree | all (by role)
```

**Two separate identities.** An **Admin** (platform staff, `admins` table, `admin` guard) and a **User** (customer, `users` table, `web` guard) are distinct accounts on distinct guards — they never share a row. (The earlier design used one `users` table + an `is_internal` flag + `platform_role_user`; **superseded on 2026-06-14** by the guard split.)

---

## Plane 1 — Platform (Admins, guard `admin`)

### Tables
| Table | Columns | Notes |
|---|---|---|
| `admins` | `email (unique), name, password, status, locale, timezone` | Platform-staff identity. Holds **no** workspace membership. |
| `admin_password_reset_tokens` | `email, token` | Separate password broker (`admins`). |

Admin RBAC reuses **spatie** on guard `admin` (same tables as the tenant plane, distinguished by `guard_name`). Role *assignments* live under the reserved scope `Admin::PLATFORM_SCOPE` (`00000000-0000-0000-0000-000000000000`), sharing the workspace-scoped pivot + RLS without a real workspace. `BindAdminPermissionScope` middleware binds that scope on every `/admin` request so `$admin->can('platform.*')` resolves. The permission/role catalog lives in code: `App\Enums\PlatformPermission` / `PlatformRole`.

### Platform roles & capabilities (spatie, guard `admin`)
| Role | Granted permissions |
|---|---|
| `super_admin` | all `platform.*` |
| `support_engineer` | `platform.workspaces.view`, `platform.impersonate`, `platform.audit.view` |
| `billing_ops` | `platform.workspaces.view`, `platform.billing.manage` |

### God-mode — audited impersonation (Model A)
Admins reach tenant CRM data only by *impersonating* an active workspace member:

- `POST /admin/workspaces/{ws}/members/{user}/impersonate` (needs `platform.impersonate`): regenerates the session, then `Auth::guard('web')->login($targetUser)` and stamps `impersonator_admin_id` in session. The admin now browses the tenant app **as that member** — all tenant routes, RLS and `IdentifyWorkspace` work unchanged.
- Every write while impersonating carries `impersonated_by_admin_id` in `audit_logs` (actor = the impersonated user). Impersonation start/stop are logged as the **admin** actor on the privileged audit path.
- Destructive self-account actions are blocked during impersonation (`no.impersonation` middleware).
- Stop: `POST /admin/impersonate/stop` → logs out the web guard; the admin guard stays authenticated.

### Enforcement
- Admin routes: `auth:admin` + `admin.scope`; capability via `auth('admin')->user()->can('platform.*')` in the controller (the Laravel `can:` route middleware resolves the **default web guard**, so it is NOT used on admin routes).
- A customer (`web`) user can never reach `/admin` (separate guard). Guard-aware redirects send `admin*` paths to `admin.login`.
- Admin `status` is server-controlled (BR-X12). Admins are created by other admins (`platform.admins.manage`) or seeded — no public admin registration.

---

## Plane 2 — Workspace (customers, guard `web`)

### Tables
| Table | Columns | Notes |
|---|---|---|
| `users` | `email (unique global), name, password, status, locale, timezone` | Customer identity. NOT workspace-scoped; no role/team here. |
| `workspaces` | `name, base_currency, default_pipeline_id, audit_retention, status` | The isolation boundary. NOT workspace-scoped itself. |
| `workspace_member` | `workspace_id, user_id, role, team_id, status, invited_at` | Membership. `unique(workspace_id, user_id)`. |
| `teams` / `team_closure` | tree + O(1) subtree | cycle-guarded (BR-X13). |

### Two-layer access (BR-X02)
- **Feature gate** = spatie roles scoped per workspace (`team_foreign_key = workspace_id`) → same user holds different roles in different workspaces. Tenant permissions are `tenant.*`-prefixed.
- **Record gate** = Policies + `Visibility` resolver: `own` (rep/agent) | `team` (manager subtree via `team_closure`) | `all` (workspace admin). Per-entity, 404-not-403 (BR-X15).

### Self-serve provisioning
`/register` creates the User + their first Workspace + an `admin`-role membership **atomically** (`WorkspaceProvisioningService`); `workspaces.created_by` → `users`.

---

## Resolution order (every request)

```
WEB (tenant):
1. Authenticate on the `web` guard (User)
2. Resolve ACTIVE workspace from session (server-side — BR-X14)
3. Require an active workspace_member row (or an impersonating admin's web session); else 403
4. SET app.current_workspace → RLS scopes to that workspace; setPermissionsTeamId(workspace)
5. Feature gate (tenant.* permission) → 403
6. Record gate (Policy + Visibility) → 404 if out of scope

ADMIN (platform):
1. Authenticate on the `admin` guard (Admin)
2. admin.scope binds app.current_workspace + setPermissionsTeamId = Admin::PLATFORM_SCOPE
3. Capability gate via $admin->can('platform.*') → 403
```

## Enforcement layers (defense-in-depth)

1. **App**: `BelongsToWorkspace` global scope + `IdentifyWorkspace` (web) / `BindAdminPermissionScope` (admin). `ResetTenantContext` clears the RLS context **and** the spatie team-id at request start.
2. **RLS default-deny** on every workspace-scoped table; `workspace_id = current_setting('app.current_workspace')`. Admin-plane writes and cross-workspace/audit reads use the **privileged** role (audited).
3. **CI check**: every workspace-scoped table has an RLS policy (BR-X18).

## Security invariants (BR refs)

- `workspace_id`, `owner_id`, `team_id`, `role`, admin/user `status` are **server-controlled** (BR-X12). No mass-assignment.
- The two guards never cross: a `web` user cannot reach `/admin`; an `admin` holds no workspace membership.
- Active workspace is server-derived (BR-X14); client-supplied workspace id ignored.
- Internal data access is **always audited**, attributable to a real admin (extends BR-X05). Customer PII still erasable (BR-X07).

## Open questions

1. `support_engineer` write scope while impersonating — read-only v1? (recommend yes; escalate to `super_admin` for writes).
2. Customer-visible "who from support accessed my data" log? Defer — the audit trail already captures it.
