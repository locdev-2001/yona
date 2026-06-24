# Features Index

Navigate feature documentation by module. Each module is a build phase in the [system architecture](../system-architecture.md).

## Module 1 — Platform Foundation

Workspace isolation, identity + membership, teams with hierarchy, RBAC + visibility, audit log.

| Feature | Purpose | Code entry |
|---|---|---|
| [Tenant Isolation (3-Layer)](./platform/tenant-isolation.md) | Enforce workspace isolation via global scope, middleware, and PostgreSQL RLS. | `IdentifyWorkspace` + `BelongsToWorkspace` + `ResetTenantContext` |
| [Workspace Switching](./platform/workspace-switching.md) | Switch active workspace context for multi-workspace users. | `WorkspaceSwitchController` |
| [Workspace Settings](./platform/workspace-settings.md) | Admin view and update workspace name, currency, and config. | `WorkspaceController` |
| [Teams (Hierarchical)](./platform/teams.md) | Organize members into a tree; closure table enables O(1) visibility queries and manager rollup. | `TeamService` + `TeamController` + `TeamClosure` |
| [Members (Workspace Membership)](./platform/members.md) | Invite users, assign roles/teams, deactivate. Spatie permission sync. | `MembershipService` + `MemberController` + `WorkspaceMember` |
| [RBAC + Visibility](./platform/rbac-visibility.md) | Feature-gate (role → permissions) and record-gate (ownership + team visibility). | `Visibility` resolver + spatie |
| [Audit Log](./platform/audit-log.md) | Append-only history of changes; PII-minimized diffs; immutable at DB level. | `Audit` class + `AuditLog` model |

## Admin Plane (Platform)

Internal-staff side: a separate `admin` guard (isolated from the customer `web` guard), admin RBAC, a read-only oversight panel, and audited impersonation. See the [module overview](./admin/README.md).

| Feature | Purpose | Code entry |
|---|---|---|
| [Admin Auth (two-guard)](./admin/admin-auth.md) | Staff login/logout/reset on the `admin` guard; guard-aware redirects + permission scope. | `Admin\Auth\AuthenticatedSessionController` + `BindAdminPermissionScope` |
| [Workspaces Panel](./admin/workspaces-panel.md) | Read-only platform view over workspaces + members (privileged/RLS-bypassed read). | `Admin\WorkspaceController` |
| [Impersonation (Model A)](./admin/impersonation.md) | Admin acts as a tenant member; dual-actor audited; reversible. | `Admin\ImpersonationController` |

## Module 2 — Custom-Fields Engine

(Planned) User-defined fields with type validation and versioning.

## Module 3 — Cross-Cutting Platform

Attachments, notifications, event bus, Reverb realtime, product announcements.

| Feature | Purpose | Code entry |
|---|---|---|
| [Product Announcements / What's New](./platform/announcements.md) | Platform staff publish global changelog entries; tenant users see in-app feed + unread badge. Global tables (no RLS). | `WhatsNewController` + `AnnouncementReadService` + `AnnouncementReadController` |

## Module 4 — Sales Core

(Planned) Account, Contact, Deal, Pipeline/Stage, deal stage changes, won/lost, forecast.

## Module 5 — Lead + Conversion

(Planned) Lead funnel, lead scoring, lead-to-contact conversion, dedup guards.

## Module 6 — Engagement

(Planned) Activity (immutable history), Task (assignable), polymorphic relations.

## Module 7 — Support

(Planned) Ticket creation, SLA computation and breach detection, status flow, CSAT.

## Module 8 — Conversations / Inbox

(Planned) Realtime omnichannel live chat (web widget, Zalo, FB, email), escalate to Ticket.

## Module 9 — Marketplace + Entitlements

(Planned) Workspace purchases, item catalog, quota/feature gates, entitlements resolver.

## Module 10 — Later

(Planned) Marketing (campaigns, segments), Webhooks, inbound API, Import.

---

## How to Use This Index

1. **Find your module** in the list above.
2. **Click the feature link** to read the operational flow, data model, and code entry points.
3. **Follow the "Related" section** to jump to domain docs, business rules, or architecture sections.
4. **Use code entry points** to jump into the codebase.

For domain terminology, business rules, and authorization model, see:
- [crm-domain-definition.md](../crm-domain-definition.md) — entities and relationships.
- [crm-business-rules.md](../crm-business-rules.md) — rules (BR-*).
- [crm-authorization-model.md](../crm-authorization-model.md) — Platform vs. Workspace access control.
- [system-architecture.md](../system-architecture.md) — system design and data model.
