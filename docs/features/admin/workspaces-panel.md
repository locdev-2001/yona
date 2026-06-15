# Workspaces Panel

Module: [Admin Plane](./README.md) · Status: live · Updated: 2026-06-15

## Purpose

A lean, read-only platform view over **all** customer workspaces and their members. It is the admin's entry point for support and oversight, and the launch point for [impersonation](./impersonation.md). An admin is bound to no single workspace, so the panel deliberately reads workspace-scoped data through the **privileged connection** (RLS-bypassed).

## Actors & permissions

- **Admin** with `platform.workspaces.view` — view the index + show pages.
- **Admin** with `platform.impersonate` — additionally see/trigger the impersonate action from a member row.
- Capabilities are enforced by `admin.can:<ability>` route middleware (checks the `admin` guard, not `web`).

## Trigger / entry points

- `GET /admin/workspaces` → `Admin\WorkspaceController@index` → `resources/js/pages/admin/workspaces/index.tsx` (middleware `admin.can:platform.workspaces.view`)
- `GET /admin/workspaces/{workspace}` → `@show` → `resources/js/pages/admin/workspaces/show.tsx`
- All under `auth:admin` + `admin.scope` (`routes/admin.php`).

## Operational flow (step-by-step)

1. **Admin opens `/admin/workspaces`** — passes `auth:admin`, `admin.scope`, `admin.can:platform.workspaces.view`.
2. **`index()`** queries `Workspace` ordered by name (`workspaces` is not workspace-scoped — all rows visible to staff) and maps a safe projection (`id, name, slug, status, base_currency, created_at`) into the Inertia `admin/workspaces/index` page.
3. **Admin clicks a workspace** → `GET /admin/workspaces/{workspace}` (route-model binding resolves the workspace).
4. **`show()`** reads members via the **privileged connection**: `WorkspaceMember::on('pgsql_privileged')->withoutGlobalScope('workspace')->where('workspace_id', …)` with `user:id,name,email`, mapped to `id, user_id, name, email, role, status`. This is the only safe way to read RLS-scoped rows from outside any workspace context.
5. **Page renders** workspace summary + member list; rows with `platform.impersonate` expose an impersonate action (see [impersonation.md](./impersonation.md)).

```mermaid
flowchart TD
    A[Admin: GET /admin/workspaces] --> B{admin.can:platform.workspaces.view}
    B -- denied --> X[403]
    B -- allowed --> C[WorkspaceController@index]
    C --> D[Workspace::query order by name -> safe projection]
    D --> E[render admin/workspaces/index]
    E --> F[Admin clicks a workspace]
    F --> G[GET /admin/workspaces/&#123;workspace&#125;]
    G --> H[WorkspaceController@show]
    H --> I[WorkspaceMember on pgsql_privileged<br/>withoutGlobalScope workspace<br/>where workspace_id = id]
    I --> J[render admin/workspaces/show<br/>summary + members]
    J --> K{row has platform.impersonate?}
    K -- yes --> L[show Impersonate action]
    K -- no --> M[read-only]
```

## Data touched

- `workspaces` (default connection) — read: `id, name, slug, status, base_currency, timezone, created_at`.
- `workspace_member` (**`pgsql_privileged`**, global scope removed) — read: `id, user_id, role, status`.
- `users` — read: `id, name, email` (eager-loaded for the member list).
- No writes. No audit entry for viewing (read-only).

## State transitions

None — read-only panel. State changes happen only via [impersonation](./impersonation.md), documented there.

## Business rules applied

- **BR-X01 / tenant isolation** — workspace-scoped rows (`workspace_member`) are read only through the privileged connection with the global scope removed; the app (RLS) connection would default-deny them outside a workspace context.
- **Capability gate** — both routes require `platform.*` abilities on the `admin` guard via `admin.can`.

## Edge cases & error handling

| Scenario | Behavior |
|---|---|
| Admin lacks `platform.workspaces.view` | 403 at the route middleware. |
| Workspace id not found | 404 via route-model binding. |
| Member's user record missing | Mapped name/email are null (defensive `?->`); row still renders. |
| Reading members on the app connection by mistake | Would return empty (RLS default-deny) — hence the explicit `pgsql_privileged` + `withoutGlobalScope`. |

## Related

- [impersonation.md](./impersonation.md) — launched from a member row.
- [tenant-isolation.md](../platform/tenant-isolation.md) — RLS + the privileged connection.
- [members.md](../platform/members.md) — tenant-side membership management.
- [`WorkspaceController`](../../../app/Http/Controllers/Admin/WorkspaceController.php) · [`routes/admin.php`](../../../routes/admin.php)
