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

## Module 2 — Custom-Fields Engine ✅

Engine tùy chỉnh trường dữ liệu: `custom_field_definitions` (registry metadata) + lưu value trong `custom_fields` JSONB trên entity. 5 entity types: `client, contact, lead, project, task`.

| Feature | Purpose | Code entry |
|---|---|---|
| Custom Fields | Define workspace-scoped fields per entity type; validate + persist in JSONB. | `CustomFieldService` + `HasCustomFields` trait + `CustomFieldDefinition` model |

## Module 3 — Cross-Cutting Platform ✅

Attachments, tags, comments, notes, activity timeline, notifications, reminders, email templates, product announcements.

| Feature | Purpose | Code entry |
|---|---|---|
| [Product Announcements / What's New](./platform/announcements.md) | Platform staff publish global changelog entries; tenant users see in-app feed + unread badge. Global tables (no RLS). | `WhatsNewController` + `AnnouncementReadService` + `AnnouncementReadController` |
| Attachments | Polymorphic file attachment on any workspace entity; storage namespaced per workspace. | `AttachmentService` + `HasAttachments` + `Attachment` model |
| Tags | Workspace-scoped tag dedupe by slug; polymorphic many-to-many with RLS pivot. | `TagService` + `HasTags` + `Tag`/`taggables` |
| Notes | Polymorphic internal notes (not visible to customers). | `NoteService` + `HasNotes` + `Note` model |
| Activity Timeline | Immutable append-only log of business events; polymorphic subject; render via `ActivityFormatter`. | `ActivityLogger` + `HasActivities` + `Activity` model |
| Notifications | In-app notification feed (Laravel notifications); DB channel; `NotificationService`. | `NotificationService` + `notifications` table |
| Reminders | Workspace-scoped scheduled reminders; scheduler per-workspace context (G12). | `Reminder` model + `HasReminders` + reminder scheduler |
| Email Templates | Workspace-scoped templated email; merge fields; whitelist context keys (G9). | `TemplatedMailer` + `EmailTemplate` model |

## Module 4 — CRM Core (Client/Contact/Lead/Pipeline/Convert) ✅

Quản lý khách hàng (Client), người liên hệ (Contact), và tiềm năng bán hàng (Lead) qua pipeline kanban, convert Lead → Client+Contact trong transaction.

> **Note**: Tên cũ "Sales Core (Account/Deal)" đã được thay bằng kiến trúc thực tế: `clients/contacts/leads/pipelines/pipeline_stages` — quyết định khóa #2 (không dùng Account/Deal kiểu HubSpot). Xem [crm-domain-definition.md](../crm-domain-definition.md).

| Feature | Purpose | Code entry |
|---|---|---|
| [Clients & Contacts](./sales/clients-contacts.md) | CRUD client (công ty) + contact (người), primary contact, nhóm khách hàng, vault, custom fields/tags/attachments/notes/activity. | `ClientController`, `ClientService`, `ContactController`, `Client`/`Contact` models |
| [Leads + Pipeline + Convert](./sales/leads-pipeline-convert.md) | CRUD leads, kanban drag-drop, assignment notification, lost/junk, convert Lead→Client+Contact (G7: isolation+idempotency+rollback). | `LeadController`, `LeadConversionController`, `LeadService`, `LeadConversionService` |

## Module 5 — Projects & Tasks ✅

Quản lý dự án (Project) với milestone kanban, thành viên, file, thảo luận. Quản lý công việc (Task) đa hình với nhiều người thực hiện, checklist, và bộ đếm giờ/timesheet.

| Feature | Purpose | Code entry |
|---|---|---|
| [Projects & Milestones](./projects/projects-milestones.md) | Project CRUD, members, milestone kanban reorder, files, discussions/comments, progress/status, activity visible_to_customer. | `ProjectController`, `ProjectService`, `ProjectMilestoneController`, `Project`/`ProjectMilestone` |
| [Tasks & Timers](./projects/tasks-timers.md) | Task CRUD, polymorphic related-to (lead/client/project/contact), multi-assignee, checklist, timer start/stop state machine, comments/reminders. | `TaskController`, `TaskTimerController`, `TaskService`, `TaskTimerService`, `Task`/`TaskTimer` |

> Legacy entries (tasks): `./tasks/tasks-and-timers.md` — superseded by `./projects/tasks-timers.md` (same content, canonical path updated).

## Module 7 — Support

(Planned) Ticket creation, SLA computation and breach detection, status flow, CSAT.

## Module 8 — Conversations / Inbox (GĐ1 ✅)

Realtime omnichannel live chat — Phase 1: Zalo personal webhook inbound, idempotent message ingestion, CDP dedup contract, metering statistics, rate limiting. Related: [messaging](./messaging/README.md).

| Feature | Purpose | Code entry |
|---|---|---|
| [Zalo Personal Inbox](./messaging/zalo-personal-inbox.md) | Receive inbound Zalo messages via webhook, store Conversation + Message, broadcast realtime. | `WebhookController` + `InboundMessageService` + Reverb |
| [Outbound Send](./messaging/outbound-send.md) | Reply to conversation: circuit-breaker → quota → rate limit → bridge HTTP → persist + meter. | `ZaloSendService` + `SendRateLimiter` + bridge |
| [Conversation to Lead](./messaging/conversation-to-lead.md) | Convert inbound conversation to Lead via CDP identity resolution (Phase-08: dedup by phone). | `ConversationLeadController` + `IdentityResolver` contract |
| [Conversation Metering](./messaging/conversation-metering.md) | Race-safe count outbound per channel per month for billing analytics; no quota gate applied. | `MeteringService` |
| [Plan Entitlements & Grant](./messaging/plan-entitlements-grant.md) | Workspace subscriptions; admin grants plans manually (Phase-07); resolves quota + remaining. | `GrantPlanService` + `EntitlementResolver` |
| [Zalo Generic Dispatcher + Relay Forwarder](./messaging/zalo-generic-dispatcher.md) | Own 100% zca-js surface: `POST /zca/:method` allowlist reflection (146 method, tier gate) + forward 10 unwired events → `relay_events` (no silent drop, no metering). | `zca-dispatch.mjs` + `relay-forwarder.mjs` + `handleRelayEvent` |
| [zca Capability Map](./messaging/zca-capability-map.md) | Living reference: 146 REST method / 16 event tier classification (READ/DESTRUCTIVE/MEDIA/DENY) — snapshot gate M1. | `src/zca-methods.snapshot.json` + `zca-adapter.mjs` |

## Module 9 — Billing + Entitlements (GĐ1 Core, Phase-08 Payment)

Marketplace catalog, workspace purchases, feature flags, entitlements resolver. Phase-07: manual grant (payment-manual driver); Phase-08: VNPay/MoMo drivers.

**Features:** Covered in [Module 8 (Conversation Metering + Plan Entitlements)](./messaging/).

| Contracts | Purpose | Code entry |
|---|---|---|
| MeteringGate (inbox contract) | Gate conversation send (quota check); implemented by ConversationMeter (billing). | `app/Services/MeteringService.php` |
| PaymentDriver (integration contract) | Abstract payment processing; implemented by drivers (manual, VNPay, MoMo). | `app/Modules/Integration/Contracts/PaymentDriver.php` |

## Module 9.5 — Integration & Drivers (GĐ1)

Driver pattern via `Illuminate\Support\Manager`. Only production module: `app/Modules/Integration/`. See [integration](./integration/README.md) for full architecture.

| Feature | Purpose | Code entry |
|---|---|---|
| [Zalo Personal Connect (QR)](./integration/zalo-personal-connect.md) | Scan QR → bridge session → inbound webhooks ready. | `IntegrationController` + `ZaloChannelDriver` + QR flow |
| [Integration Catalog](./integration/README.md) | Hardcoded integration cards; extensible driver registration. | `IntegrationCatalog` + `ChannelManager` + `PaymentManager` |

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
