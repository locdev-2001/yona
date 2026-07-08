# Admin Plane (Platform)

The **admin plane** is the internal-staff side of the product. Staff authenticate on a dedicated `admin` guard (own `admins` table) that is fully isolated from the customer `web` guard — staff and customers never share an identity. Admins manage the platform (workspaces, billing, other admins) and hold no workspace membership.

See [crm-authorization-model.md](../../crm-authorization-model.md) for the two-plane / two-guard model and [system-architecture.md](../../system-architecture.md) for the data model.

## Why a separate guard (not a flag)

The earlier design marked staff with an `is_internal` flag on `users`. That coupled two threat models into one identity and one RBAC namespace. The current design:

- `admins` table + `admin` provider + `admin` session guard (`config/auth.php`).
- Admin RBAC = spatie roles/permissions under a fixed scope `Admin::PLATFORM_SCOPE` (`00000000-…-0000`), so the workspace-scoped pivot + RLS stay untouched.
- Guard-aware middleware: `admin.scope`, `admin.can:<ability>`, `no.impersonation` (`bootstrap/app.php`).

## Features

| Feature | Purpose | Code entry |
|---|---|---|
| [Admin Auth (two-guard)](./admin-auth.md) | Staff login/logout/password-reset on the `admin` guard; guard-aware redirects. | `Admin\Auth\AuthenticatedSessionController` + `routes/admin.php` |
| [Workspaces Panel](./workspaces-panel.md) | Read-only platform view over customer workspaces + members (privileged/RLS-bypassed read). | `Admin\WorkspaceController` |
| [Impersonation (Model A)](./impersonation.md) | Admin acts inside a tenant as a member; dual-actor audited; reversible. | `Admin\ImpersonationController` |

## Related

- [crm-authorization-model.md](../../crm-authorization-model.md) — two-plane model, admin RBAC, impersonation policy.
- [audit-log.md](../platform/audit-log.md) — dual-actor audit (`actor_admin_id`, `impersonated_by_admin_id`).
- [tenant-isolation.md](../platform/tenant-isolation.md) — RLS + privileged connection the panel reads through.
