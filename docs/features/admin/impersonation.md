# Impersonation (Model A)

Module: [Admin Plane](./README.md) · Status: live · Updated: 2026-06-15

## Purpose

Let an admin act **inside a tenant as one of its members** for support/debugging, without weakening tenant isolation and with a full audit trail. "Model A": the `admin` guard stays authenticated while the `web` guard is logged in as the target user — so every tenant route, RLS policy, and `IdentifyWorkspace` step works unchanged, exactly as the real user would experience them.

This touches security and access control, so the doc-sync gate is non-negotiable.

## Actors & permissions

- **Admin** with `platform.impersonate` (checked by `admin.can:platform.impersonate`).
- **Target**: a member with an **active** membership in the chosen workspace (`User::membershipFor($workspace)?->isActive()`); otherwise 422.
- While impersonating, the acting admin identity is preserved in `session('impersonator_admin_id')`.

## Trigger / entry points

- Start: `POST /admin/workspaces/{workspace}/members/{user}/impersonate` → `Admin\ImpersonationController@store` (middleware `admin.can:platform.impersonate`). Launched from the [workspaces panel](./workspaces-panel.md) member list.
- Stop: `POST /admin/impersonate/stop` → `@destroy`.
- In-tenant: an **impersonation banner** (`resources/js/components/impersonation-banner.tsx`) surfaces the active session; destructive self-account actions are blocked by `no.impersonation` (`BlockDuringImpersonation`).

## Operational flow (step-by-step)

### Start
1. Admin triggers impersonate on a member row → `@store`. Capability already enforced by route middleware.
2. **Guard**: `abort_unless($user->membershipFor($workspace)?->isActive(), 422)` — no impersonating non-members/inactive members.
3. **Session fixation defense**: `session()->regenerate()`.
4. **Audit first, as the admin**: `Audit::log($workspace, 'impersonate_start')` runs *before* the web login, so the entry is attributed to the admin actor and written on the privileged path (stamps `actor_admin_id`).
5. **Enter the tenant**: `Auth::guard('web')->login($user)`; set `session(['impersonator_admin_id' => auth('admin')->id(), 'current_workspace_id' => $workspace->id])`.
6. Redirect to the tenant `dashboard`. From here, all tenant requests resolve `IdentifyWorkspace` + RLS for `$workspace`; `Audit` stamps `impersonated_by_admin_id` from the session flag (BR-X05) on any change the admin makes through the user.

### Stop
1. `@destroy` requires `session('impersonator_admin_id')` (else 403).
2. Resolve the workspace from `current_workspace_id`.
3. **Leave first**: `Auth::guard('web')->logout()` + forget `impersonator_admin_id` / `current_workspace_id`, so the stop entry is attributed to the admin, not the user.
4. `Audit::log($workspace, 'impersonate_stop')`; `session()->regenerate()`; redirect to `admin.dashboard`.

```mermaid
sequenceDiagram
    actor Admin
    participant Ctl as ImpersonationController
    participant Audit
    participant Web as Auth guard:web
    participant Sess as Session
    participant Tenant as Tenant routes (RLS + IdentifyWorkspace)

    Admin->>Ctl: POST .../{user}/impersonate (admin.can:platform.impersonate)
    Ctl->>Ctl: abort_unless active membership (else 422)
    Ctl->>Sess: regenerate()
    Ctl->>Audit: log(workspace, impersonate_start) [actor_admin_id]
    Ctl->>Web: login(targetUser)
    Ctl->>Sess: impersonator_admin_id + current_workspace_id
    Ctl-->>Admin: redirect dashboard
    Note over Admin,Tenant: Admin now browses as the user;\nchanges stamp impersonated_by_admin_id
    Admin->>Ctl: POST /admin/impersonate/stop
    Ctl->>Ctl: abort_unless session has impersonator_admin_id (else 403)
    Ctl->>Web: logout()
    Ctl->>Sess: forget impersonator flags
    Ctl->>Audit: log(workspace, impersonate_stop)
    Ctl-->>Admin: redirect admin.dashboard
```

## Data touched

- Session — `impersonator_admin_id`, `current_workspace_id` (set on start, cleared on stop); guard payloads for `admin` + `web`.
- `audit_logs` — `impersonate_start` / `impersonate_stop` rows (admin actor: `actor_admin_id`); any in-tenant change carries `impersonated_by_admin_id`.
- `workspace_member` / `users` — read to validate the target membership.

## State transitions

| Aspect | Before start | During | After stop |
|---|---|---|---|
| `web` guard | not logged (admin only) | logged in as target user | logged out |
| `admin` guard | authenticated | still authenticated | authenticated |
| Session flags | none | `impersonator_admin_id`, `current_workspace_id` | cleared |

## Business rules applied

- **BR-X05** — every action attributed: impersonation start/stop logged as the admin; in-tenant mutations stamp `impersonated_by_admin_id`.
- Active-membership precondition (422 otherwise) — admins can only enter as a real, active member.
- Order matters: audit/flag operations bracket the guard login/logout so each audit entry is attributed to the correct actor.
- `no.impersonation` blocks destructive self-account actions (account delete, password change) while impersonating.

## Edge cases & error handling

| Scenario | Behavior |
|---|---|
| Admin lacks `platform.impersonate` | 403 at route middleware. |
| Target has no / inactive membership | 422 ("no active membership"). |
| Stop called with no active session | 403 ("No active impersonation session"). |
| Workspace deleted mid-session | Stop still clears web session + flags; audit skipped if workspace not found. |
| User tries to change own password / delete account while impersonated | 403 via `no.impersonation`. |
| Persistent connection leaks RLS context | Mitigated upstream by `ResetTenantContext` (prepended) — see tenant-isolation. |

## Related

- [audit-log.md](../platform/audit-log.md) — dual-actor columns (`actor_admin_id`, `impersonated_by_admin_id`).
- [tenant-isolation.md](../platform/tenant-isolation.md) — RLS + `IdentifyWorkspace` that impersonation reuses.
- [workspaces-panel.md](./workspaces-panel.md) — where impersonation is launched.
- [crm-authorization-model.md](../../crm-authorization-model.md) — impersonation policy.
- [`ImpersonationController`](../../../app/Http/Controllers/Admin/ImpersonationController.php) · [`BlockDuringImpersonation`](../../../app/Http/Middleware/BlockDuringImpersonation.php) · [`impersonation-banner.tsx`](../../../resources/js/components/impersonation-banner.tsx)
