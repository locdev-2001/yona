# Project Changelog

All notable changes to this project. Format: [Keep a Changelog](https://keepachangelog.com); dates ISO (YYYY-MM-DD). Semantic versions begin once the first code ships; pre-code foundation work lives under **[Unreleased]**.

> Maintained per `.claude/rules/documentation-management.md` — update on every significant change/feature/fix.
> **Automated by [release-please](https://github.com/googleapis/release-please)** from conventional commits: merging the bot's release PR bumps the version, tags it, and writes the release section here. SemVer `0.x` during build → `1.0.0` at production launch. (GitHub Releases = internal/dev notes; customer-facing "What's New" lives in the in-app Announcements feature — see crm-conversations-inbox/marketplace docs.)

## 1.0.0 (2026-06-13)


### Features

* add Laravel Pulse (self-hosted observability) ([cd816b5](https://github.com/locflamedia/cho-rach-management/commit/cd816b55664b813e7efa6e3e8931ae0515fec0c1))
* add laravel skill; lock Laravel stack and fold in red-team findings ([209df87](https://github.com/locflamedia/cho-rach-management/commit/209df873832acb969321e2cafe5e80a55820ee74))
* bootstrap Laravel 13 app skeleton ([9448483](https://github.com/locflamedia/cho-rach-management/commit/94484832547116c6330d5303a23c480462be7fbd))
* complete frontend/test/observability stack ([ebceb5e](https://github.com/locflamedia/cho-rach-management/commit/ebceb5edf27018fc029a64229f699269b3e9154c))

## [Unreleased]

### Added — Generic zca Adapter L1: Dispatcher + Relay Forwarder (P10-P12, 2026-07-04)

Own 100% zca-js surface (146 REST / 16 event) generically — nâng zca-js → capability mới tự lộ, không hand-wire. Branch `feat/zca-generic-adapter`.

- **P10 Relay-event store**: bảng `relay_events` (RLS ENABLE+FORCE, unique partial `(workspace_id, event_type, source_id)`, **không metering** — F1/F14); webhook hết drop im lặng (H1) — event lạ/`relay_event` → `insertOrIgnore`; permission mới `TenantPermission::ZaloDestructive` tách khỏi `ZaloManage` (H4).
- **P11 Bridge generic dispatcher**: `POST /zca/:method` JSON-only — allowlist reflection own-property, snapshot 146 method + test M1 fail-build khi drift; guard 6 OUTBOUND→409 / 39 DESTRUCTIVE→403 (elevated secret riêng `BRIDGE_ELEVATED_SECRET`) / DENY→403 / MEDIA→415 / inject→404 / traversal→400 / oversize→413; `timingSafeEqual` + rate-limit per-connection; **B1**: audit call-site dưới RLS (report) + token-từ-session `HMAC(connection_id + workspace)` bind lúc promote, persist qua slot meta, LAB 2-slot chứng minh 403 cross-workspace.
- **P12 Relay forwarder**: 10 event trước bị vứt (undo/seen/delivered/reaction/typing/connected/disconnected/old_messages/old_reactions/upload_attachment) forward về Laravel; `old_messages` normalize per-item `source_id=msgId` dedup chung live (1-1 backfill khả thi — spike 1b); lane chatty fire-and-forget không qua outbox (H3); `cipher_key` không bao giờ rời bridge (B6).
- Docs: flow doc mới `docs/features/messaging/zalo-generic-dispatcher.md`; capability map cập nhật trạng thái wire.

### Release — GĐ1 Modular Monolith + Inbox Zalo + CDP Dedup Contract + Billing/Metering (2026-06-28)

**Milestone**: Phase-07 (code-complete) — refactored to standard Laravel + 1 Integration module + Phase-01 inbox + entitlements system audited (18 findings fixed).

**GĐ1 Feature Delivery:**
- **Traditional Laravel Refactor** (2026-06-28): Removed custom modular framework; restructured to standard Laravel with `app/Models`, `app/Http/Controllers/{Domain}`, `app/Services` containing `MeteringService` (concrete), `EntitlementService`, `ContactService`. **Only module:** `app/Modules/Integration/` with `ChannelManager` + `PaymentManager` (driver pattern via `Illuminate\Support\Manager`). See [system-architecture.md](../system-architecture.md).
- **Inbox Phase 1 (Zalo Personal)**: webhook inbound (`WebhookController`), idempotent message ingestion (`InboundMessageService` F2/F14), Reverb realtime broadcast (F22), RLS scope-binding from connection_id (F11), conversation number sequencing (F16).
- **Outbound Send Chain**: `ZaloSendService` with circuit-breaker (F3), metering gate (F1/F5), SendRateLimiter (F8: 7h–22h + 3/phone/day), bridge retry (F4), atomic meterReply (F1 compare-set + ON CONFLICT).
- **Conversation to Lead**: `ConversationLeadController` + `IdentityResolver` contract (Phase-07: no-op; Phase-08: phone dedup); idempotent lead creation (F15 unique conversation_lead_link); bidirectional link.
- **Metering & Entitlements**: `ConversationMeter` (race-safe F1), `EntitlementResolver` (cache 5min, F21 FREE_DEFAULTS), `GrantPlanService` (soft-delete old plan F24), `PaymentProvider` contract (Phase-08 VNPay/MoMo drivers).
- **Audit Findings Fixed** (18 critical/major):
  - F1 meterReply race: atomic compare-set + upsert in single transaction (PostgreSQL 15+).
  - F3 circuit-breaker: `AccountHealthMonitor` tracks bridge failures per connection.
  - F4 bridge timeout: 15s + 2×200ms retry; fail-soft (no message on timeout).
  - F5 existing-conv quota: `assertCanSend()` pass if `last_metered_period == currentPeriod()`.
  - F6 HMAC auth: webhook signature verification (`X-Zalo-Personal-Bridge-Secret`).
  - F8 rate limiter: Redis atomic INCR (if enabled) or in-memory cache.
  - F9 metering atomicity: DB transaction rollback if upsert fails after compare-set.
  - F10 no-op binding: billing module disabled → AllowAllMeteringGate (no feature block).
  - F11 RLS scope-leak: webhook TenantScope::bind() from privileged ZaloConnection query before all writes.
  - F13/F20 inbound always accepted: meterReply() fail-safe try/catch; webhook never rejects by quota.
  - F14 idempotency: updateOrCreate on (conversation_id, source_id) prevents duplicate messages.
  - F15 conv-lead idempotency: unique conversation_lead_link (no 2 leads per conversation).
  - F16 unread atomic: DB increment() for unread_count race-safety.
  - F17 source tracking: Lead.source = 'zalo_personal' for channel origin audit.
  - F18 bidirectional link: Conversation.contact_id + Lead.conversation_id.
  - F21 free defaults: 50 conversations/month + 3 seats on non-purchased workspace.
  - F23 draft contact: Conversation.contact_id = null if peer_phone not available.
  - F24 plan soft-delete: ended_at timestamp (audit trail, not hard-deleted).
  - F25 entitlements merge: multiple purchases → aggregate flags (union) + max quotas.
- **Data Model Changes**:
  - `contacts.client_id` FK: change cascadeOnDelete → nullOnDelete (deleting Client keeps Contact as draft, preserves CDP history).
  - `conversations.last_metered_period` (NEW): tracks 'YYYY-MM' period for F1 metering.
  - `channel_usage` (NEW): workspace_id, channel, period, answered_count (metering ledger).
  - `zalo_connections` (NEW): workspace_id, connection_id, account_status, circuit_open, circuit_error_count (bridge session tracking).
  - `workspace_purchases` (NEW): plan entitlements, soft-delete via ended_at (F24).
  - `marketplace_items` (NEW, global): plan catalog with entitlements JSONB.
- **Contract Additions**:
  - `MeteringGate` (inbox): canStartNew / canReplyOnExisting / meterReply / assertCanSend.
  - `IdentityResolver` (cdp): resolveByPhone / resolveOrCreateFromPeer / mergeIdentities.
  - `PaymentProvider` (billing): charge / verify / cancel (Phase-08+ drivers).
  - `ChannelDriver` (inbox): send / webhook handler (extensible for Messenger, TikTok, email).
- **Feature Docs (HARD GATE)**: [docs/features/messaging/README.md](../features/messaging/README.md), `zalo-personal-inbox.md`, `outbound-send.md`, `conversation-to-lead.md`, `conversation-metering.md`, `plan-entitlements-grant.md` — all with Mermaid diagrams + business-rule cross-references.
- **Status**: Phase-07 code-complete + audited. Chained blockers for launch: (a) quota PLACEHOLDER (founder decision 3-gói), (b) Zalo test account (realtime/bridge manual verify), (c) Phase-08 import + VNPay/MoMo.

### Fixed — RBAC: tenant mất menu sidebar khi mở admin + tenant cùng session (2026-06-25)

Bug: 2 guard `web` (tenant) và `admin` (platform) dùng chung 1 session cookie (chủ ý — impersonation cần admin guard sống + web guard = user bị impersonate trong cùng session). Khi đăng nhập cả admin lẫn tenant trong cùng trình duyệt, mọi request tenant đều có cả 2 guard authenticated. `HandleInertiaRequests::share()` build `adminPayload` **eager** (đặt spatie team-id + RLS = `PLATFORM_SCOPE`) trong khi prop `membership` (điều khiển menu), notifications, announcements resolve **lazy** sau đó → `getAllPermissions()` chạy nhầm dưới `PLATFORM_SCOPE` → permissions rỗng → **mất toàn bộ menu sidebar** ở tenant.

- **`app/Support/TenantScope.php`** (mới): single source of truth để bind RLS context (`app.current_workspace` / `app.current_user_id`) + spatie `setPermissionsTeamId` — `bind()` / `bindUser()` / `forget()`.
- **`HandleInertiaRequests`**: `adminPayload()` restore lại tenant scope sau khi đọc quyền admin (hết poison các lazy prop của tenant); `membershipPayload()` re-bind tenant scope ngay trước `getAllPermissions()` (defense-in-depth cho path bảo mật).
- **Refactor DRY**: `IdentifyWorkspace`, `BindAdminPermissionScope`, `ResetTenantContext` dùng chung `TenantScope` — gỡ logic bind scope trùng lặp rải rác (sửa 1 chỗ).
- **Test**: `tests/Feature/Tenant/SidebarPermissionPropTest.php` thêm case dual-login (admin + tenant cùng session) — assert menu tenant vẫn đủ quyền. Full suite 545 test pass.
- **Lưu ý**: KHÔNG tách session cookie cho admin guard — sẽ phá impersonation. Impersonation hiện chưa có test riêng (follow-up).

### Release — CRM Core M0+M1 hoàn tất (2026-06-25)

**Milestone**: Nền tảng CRM production-ready — M0 cross-cutting + M1 nghiệp vụ chính.

- **M0 Cross-cutting** (P01–P05): Lookup tables & RBAC seeding, Custom Fields (9 type, workspace-scoped), Attachments/Comments/Notes/Tags (polymorphic, soft-delete), Activities/Reminders/Notifications (Horizon queue), Email Templates (Markdown + biến động).
- **M1 Clients & Contacts** (P06): CRUD khách hàng/liên hệ, primary contact swap atomic, ClientGroup, ClientVaultEntry, visibility resolver 2-layer, 9 test files 60+ assertions.
- **M1 Leads + Pipeline + Convert** (P07): Kanban pipeline drag-drop, assignment + notification, lost/junk/restore, G12 visibility (404 non-enumeration), G7 conversion (transaction + idempotency), 7 test files 61+ assertions.
- **M1 Projects** (P08): Project entity liên kết client, milestone kanban drag-drop, project members (manager/member/viewer), discussions thread 2 cấp (client-visibility flag), progress % SVG, 9 test files.
- **M1 Tasks + Timers** (P09): Task polymorphic (lead/client/project/contact), multi-assignee, follower, checklist, bộ đếm giờ/timesheet, kanban by status & priority, 7 test files.
- **M1-Verify** (P10): Cross-module integration test (4 entity × 5 shared feature), tenant isolation 2-workspace, authz matrix 4 module, convert E2E, 3 browser Playwright specs, feature docs hard gate (MANDATORY).
- **Commits chính**: `0e46ae7` (P01) → `562f9b8` (P02) → `ccf9b69` (P03) → `37232cc` (P04) → `e7002a0` (P05) → `13b5ded` (P06) → `59e260e` (P07) → `6843434` (P08) → `7ea8415` (P09) → `90cd642` (P10 Verify).
- **Announcement**: slug `crm-core-m0-m1-complete` (id `019efbbf-4c86-73bb-96c7-76ef82fbe841`) published — tổng kết toàn bộ CRM Core cho tenant.

### Added — P10 Verify: Cross-module Integration + Docs Gate (2026-06-25)

Phase verify toàn bộ M0+M1: integration tests cross-module, tenant isolation 2-workspace, authz matrix, convert E2E, browser Playwright specs, feature docs hard gate.

- **CrossModuleSharedFeaturesTest**: matrix 4 entity (Client/Lead/Project/Task) × 5 shared feature (custom-field, tag, attachment, note, activity) + morph alias assert G3.
- **LeadConversionTest** (integration): happy path + rollback + idempotency + isolation 404 + attach-existing scope (G7 toàn bộ).
- **CrmTenantIsolationTest**: 2-workspace isolation cho Client/Lead/Project/Task — scope + RLS layer.
- **Authz matrix**: `ClientAuthorizationTest`, `LeadAuthorizationTest`, `ProjectAuthorizationTest`, `TaskAuthorizationTest` — 401/403/404/ok × guest/viewer/rep/admin; G12 is_public lead.
- **Browser E2E Playwright**: `lead-kanban.spec.ts`, `lead-conversion.spec.ts`, `task-timer.spec.ts` — 3 flow tới hạn.
- **Feature docs (HARD GATE)**: `docs/features/sales/clients-contacts.md`, `docs/features/sales/leads-pipeline-convert.md`, `docs/features/projects/projects-milestones.md`, `docs/features/projects/tasks-timers.md` — đầy đủ template + Mermaid.
- **Docs sync**: `features/README.md` (thay Module 4/5/6 Account/Deal → Client/Lead/Pipeline/Projects/Tasks), `system-architecture.md` §2/§3.2/§3.3 (thay accounts/deals/stages), `crm-domain-definition.md` (client/contact/lead thay account/deal — quyết định #2), `development-roadmap.md` (build 4-6 ✅), `project-changelog.md` (mục này).

### Added — Module 1 P09: Tasks — Quản lý Công việc & Timesheet (2026-06-25)

Module quản lý công việc đa hình (gắn với lead/khách/dự án/liên hệ): nhiều người thực hiện, người theo dõi, checklist, bộ đếm giờ/timesheet, bình luận, đính kèm, nhắc hẹn, tags, kanban theo trạng thái & độ ưu tiên. Commit: `7ea8415`.

- **Task entity**: UUID PK, polymorphic `taskable` (lead/client/project/contact), `status` enum (todo/in_progress/review/done/cancelled), `priority` enum (low/medium/high/urgent), `due_date`, `estimated_hours`. Trait stack: `HasCustomFields`, `HasTags`, `HasAttachments`, `HasNotes`, `HasActivities`, `HasReminders`. Morph alias `'task'`.
- **Nhiều người thực hiện** (`TaskAssignee`): bảng `task_assignees` (task_id, member_id). `TaskAssigneeController` POST/DELETE. `TaskService::syncAssignees()` idempotent.
- **Người theo dõi** (`TaskFollower`): bảng `task_followers` (task_id, member_id). Tương tự assignees, độc lập với thực hiện.
- **Checklist** (`TaskChecklistItem`): bảng `task_checklist_items` (task_id, label, is_done, sort_order). `TaskChecklistController` CRUD + toggle done. `checklist-panel.tsx` render danh sách có drag-sort.
- **Bộ đếm giờ / Timesheet** (`TaskTimer`): bảng `task_timers` (task_id, member_id, started_at, ended_at, duration_seconds, note). `TaskTimerService::start/stop/log()`. Timer đang chạy = bản ghi có `started_at` nhưng `ended_at IS NULL`. `timer-widget.tsx` hiển thị đồng hồ real-time.
- **Kanban**: `TaskKanbanController` PATCH reorder (bulk sort_order trong transaction). `task-kanban-column.tsx` drag-drop HTML5. Board view theo status và priority.
- **RLS**: migration `enable_rls_on_task_tables` + grant — 5 bảng (`tasks`, `task_assignees`, `task_followers`, `task_checklist_items`, `task_timers`). `RlsPolicyCoverageTest` tự scan.
- **FormRequests**: `TaskStoreRequest`, `TaskUpdateRequest`, `TaskAssignRequest`, `TaskStatusUpdateRequest`, `TaskKanbanReorderRequest`, `ChecklistItemStoreRequest`, `TimerLogRequest`.
- **TaskPolicy**: `tasks.view / create / edit / delete / assign / timer` qua `TenantPermission` enum.
- **UI React/Inertia**: `tasks/index.tsx` (bảng lọc/search/status badge), `tasks/kanban.tsx`, `tasks/show.tsx` (tabs: checklist, assignees, timers, attachments, comments, activity), `task-form.tsx`, `task-card.tsx`, `priority-badge.tsx`, `task-status-badge.tsx`, `timer-widget.tsx`.
- **i18n**: `lang/vi/tasks.php` + `lang/en/tasks.php` (133 keys mỗi file).
- **Tests** (7 test files): `TaskCrudTest`, `TaskAuthorizationTest`, `TaskTenantIsolationTest`, `TaskAssigneeTest`, `TaskChecklistTest`, `TaskKanbanTest`, `TaskTimerTest`.
- **Feature doc**: `docs/features/tasks/tasks-and-timers.md` với sequence diagram timer lifecycle.
- **Announcement**: slug `m1-tasks-release` published — hiển thị trong What's New cho toàn bộ tenant.

### Added — Module 1 P08: Projects — Quản lý Dự án (2026-06-25)

Module quản lý dự án gắn với khách hàng: thành viên, cột mốc kanban, tệp đính kèm, thảo luận/bình luận, trạng thái + tiến độ %, timeline hoạt động có kiểm soát hiển thị cho khách hàng. Commit: `6843434`.

- **Project entity**: UUID PK, `project_number` sequence (WorkspaceSequence), liên kết `client_id` (nullable), `status` enum (not_started / in_progress / on_hold / completed / cancelled), `progress` int 0–100. Trait stack đầy đủ: `HasCustomFields`, `HasTags`, `HasAttachments`, `HasActivities`, morph alias `'project'`.
- **Thành viên dự án** (`ProjectMember`): bảng `project_members` (project_id, member_id, role: `manager|member|viewer`). `ProjectMemberController` PATCH role, DELETE member; `ProjectService::syncMembers()` idempotent.
- **Cột mốc Kanban** (`ProjectMilestone`): `milestone_kanban.tsx` drag-drop reorder (PATCH `/milestones/reorder`). Fields: `name`, `due_date`, `status`, `sort_order`. `ProjectMilestoneService::reorder()` bulk-update sort_order trong transaction.
- **Thảo luận + Bình luận** (`ProjectDiscussion`): thread 2 cấp (discussion + replies). `ProjectDiscussionService::create/reply/delete()`. Visibility flag `is_visible_to_client` — bình luận nội bộ không lọt ra ngoài.
- **Tệp đính kèm**: `ProjectFileController` dùng chung polymorphic `Attachment` model từ M0; upload lên local disk (swap-in S3 sau).
- **Trạng thái + Tiến độ**: `ChangeProjectStatusRequest` + `ProjectService::changeStatus()` log activity. `progress-circle.tsx` hiển thị % vòng tròn SVG.
- **Timeline hoạt động**: `activity-feed.tsx` render log hành động có `is_visible_to_client` filter — admin xem tất cả, client portal chỉ xem hoạt động public.
- **RLS**: migration `enable_rls_on_project_tables` — 5 bảng (`projects`, `project_members`, `project_milestones`, `project_discussions`, `project_files`). `RlsPolicyCoverageTest` tự scan.
- **FormRequests**: `StoreProjectRequest`, `UpdateProjectRequest`, `AddProjectMemberRequest`, `StoreProjectMilestoneRequest`, `ReorderMilestonesRequest`, `StoreProjectDiscussionRequest`, `StoreDiscussionReplyRequest`, `ChangeProjectStatusRequest`, `UploadProjectFileRequest`.
- **UI React/Inertia**: trang index (bảng lọc/tìm kiếm/status badge), show page (tabs: milestones kanban, members, files, discussions, activity), create/edit forms, `progress-circle.tsx`, `status-badge.tsx`.
- **i18n**: `lang/vi/projects.php` + `lang/en/projects.php` đầy đủ (148 keys mỗi file).
- **Tests** (9 test files): `ProjectCrudTest`, `ProjectAuthorizationTest`, `ProjectIsolationTest`, `ProjectMemberTest`, `ProjectMemberRlsTest`, `ProjectMilestoneTest`, `ProjectDiscussionTest`, `ProjectActivityTest`, `ProjectProgressStatusTest`.
- **Announcement**: slug `m1-projects-release` published — hiển thị trong What's New cho toàn bộ tenant.

### Added — Module 5 P07: Leads + Pipeline + Convert (2026-06-25)

Module quản lý Leads với kanban pipeline, assignment, lost/junk tracking và conversion sang Client.

- **Lead entity**: UUID PK, `lead_number` sequence (WorkspaceSequence race-safe), hybrid IDs (owner_id bigint, rest uuid). Trait stack đủ 6: `HasCustomFields`, `HasTags`, `HasAttachments`, `HasNotes`, `HasActivities`, `HasReminders`. morph alias `'lead'` (đã đăng ký P03).
- **Pipeline Kanban**: drag-drop stage (PATCH `/leads/{lead}/stage`). G8 invariant: `stage_id MUST belong to pipeline_id` — validated FormRequest + Service. `LeadService::moveStage()` reorder leads trong stage, log activity, fire `LeadStageChanged`.
- **Assignment**: `LeadService::assign()` fire `LeadAssigned` → `SendLeadAssignedNotification` listener → `LeadAssignedNotification` (DB + email via `TemplatedMailer`).
- **Lost / Junk**: `markLost/markJunk` cache `last_stage_id`, set flag. `restore()` khôi phục stage và xóa flag.
- **G12 Visibility**: `tenant.lead.view` → all; else `assigned_to=me OR owner_id=me OR created_by=me OR team_id∈teams OR is_public`. Fail → `abort(404)` non-enumeration. Scope query qua WorkspaceMember (không dùng Spatie teams).
- **G7 Convert**: `LeadConversionService::convert()` — isolation assert (WS mismatch → 404), idempotency (double-convert → 422), DB::transaction: tạo Client + primary Contact, map custom fields by slug, re-point notes, stage → won, backlink `client.leadid`, log activities, fire `LeadConverted`.
- **RLS**: migration `enable_rls_on_leads` với GRANT to `cho_rach_app`. `RlsPolicyCoverageTest` tự scan bảng mới.
- **FormRequests**: `StoreLeadRequest`, `UpdateLeadRequest`, `MoveLeadStageRequest` (G8), `AssignLeadRequest`, `ConvertLeadRequest`.
- **UI React/Inertia**: list index, kanban board (HTML5 drag-drop), create/edit forms (pipeline+stage linked selects), show page (tabs: activity/notes/attachments), convert dialog, assign popover.
- **i18n**: lang/vi/leads.php + lang/en/leads.php đầy đủ (title, fields, actions, flash, activity, notification, errors, kanban, status).
- **Tests** (7 test files, 61+ assertions): LeadCrudTest, LeadVisibilityTest, LeadKanbanTest, LeadAssignmentTest, LeadLostJunkTest, LeadConvertTest, LeadIsolationTest.
- **Feature doc**: `docs/features/leads/leads-pipeline.md` với sequence diagram G7 convert.
- **Announcement**: slug `m1-leads-pipeline-release` published (id `019efb66-9fea-706a-a0c7-427826bd7390`) — hiển thị trong What's New cho toàn bộ tenant.

### Added — Module 1: Clients & Contacts — CRM Core (2026-06-25)

Module quản lý Khách hàng và Người liên hệ — phần cốt lõi của CRM. Commit: `13b5ded`.

- **Client (Khách hàng)**: CRUD đầy đủ cho công ty/tổ chức khách hàng. Hỗ trợ assign owner + team members; visibility resolver phân quyền own/team/all theo role. `ClientPolicy` + spatie RBAC (`clients.view`, `clients.create`, `clients.edit`, `clients.delete`, `clients.assign`).
- **Contact (Người liên hệ)**: Nhiều contact / khách hàng; đánh dấu **Primary Contact** (duy nhất/khách hàng, swap atomic). Ràng buộc email unique theo workspace. `ContactPolicy` tương tự Client.
- **ClientGroup**: Phân nhóm khách hàng tuỳ chỉnh; nhiều-nhiều với Client (`client_group_pivot`). RBAC `client_groups.manage`.
- **Client Admins (Customer Admin)**: Gán nhiều admin nội bộ phụ trách một khách hàng qua `SyncCustomerAdminsRequest`.
- **ClientVaultEntry**: Lưu trữ thông tin nhạy cảm (credentials / notes bảo mật) theo khách hàng; RBAC `clients.vault`.
- **Custom Fields**: tích hợp morph `App\Models\Client` + `App\Models\Contact` với hệ thống M0 custom fields. Test `ClientCustomFieldMorphismTest` xác minh morph map.
- **Tags / Notes / Attachments / Activities**: Client và Contact dùng chung toàn bộ shared concerns từ M0 (polymorphic).
- **RLS**: 8 policy mới trên `clients`, `contacts`, `client_groups`, `client_group_pivot`, `client_user_pivot`, `client_vault_entries`. `RlsPolicyCoverageTest` đảm bảo 100% tables có policy.
- **UI**: trang index (bảng lọc/tìm kiếm), show (timeline + vault + contacts), create/edit forms, groups manager — React/Inertia/shadcn.
- **Tests** (9 test files, 60+ assertions pgsql): CRUD, isolation (cross-workspace), visibility RBAC, contact primary, email unique, vault, custom field morph, group, customer admin.

### Added — Module 0: Nền tảng Cross-Cutting (2026-06-24)

Bộ tính năng nền tảng dùng chung cho toàn bộ module CRM: custom fields, đính kèm/tag/bình luận/ghi chú, hoạt động/thông báo/nhắc nhở, email templates, lookups và RBAC seeding.

- **Lookup tables** (`M0 P01`): bảng `lookups` + `lookup_values` lưu danh mục hệ thống (priority, status, category…). Tenant-scoped với global defaults; `LookupSeeder` seed dữ liệu nền tảng. RBAC permission `lookups.manage` thêm vào spatie + seed vào các role phù hợp.
- **Custom Fields** (`M0 P02`): định nghĩa trường tuỳ biến (`custom_field_definitions`) + giá trị theo record (`custom_field_values`). Hỗ trợ type: `text`, `number`, `date`, `boolean`, `select`, `multi_select`, `url`, `email`, `phone`. Scoped theo workspace + entity\_type; validation engine phía server; RBAC `custom_fields.manage`.
- **Attachments / Comments / Notes / Tags** (`M0 P03`): bảng đa hình `attachments`, `comments`, `notes`, `tags`, `taggables`. File upload lên local disk (swap-in S3 sau); tag tối đa 20/record; soft-delete trên tất cả; RBAC `attachments.manage`, `comments.manage`, `notes.manage`, `tags.manage`.
- **Activities / Reminders / Notifications** (`M0 P04`): `activities` (log hành động CRM), `reminders` (cron-triggered, gửi qua `SendReminderJob`), `notifications` (in-app + email channel, đọc/chưa đọc). RBAC `activities.view`, `reminders.manage`; Horizon queue workers cho reminder dispatch.
- **Email Templates** (`M0 P05`): `email_templates` (subject + body Markdown, category, active flag). Hỗ trợ biến `{{placeholder}}`; preview render server-side; RBAC `email_templates.manage`. Tích hợp sẵn với future Mailer pipeline.

### Added — Admin plane (two-guard) + UI refresh (2026-06-14 → 2026-06-15)
- **Two-guard split**: internal staff authenticate on a separate `admin` guard (own `admins` table + provider) — fully isolated from the customer `web` guard. Replaces the earlier `is_internal` flag on `users`.
  - `is_internal` column + `platform_role_user` table **dropped**; `PlatformRole` model removed. Admin RBAC now lives in admin-scoped spatie tables under a fixed `Admin::PLATFORM_SCOPE` team id (`00000000-…-0000`), keeping the workspace-scoped pivot + RLS untouched.
- **Admin auth**: `/admin/login`, logout, password reset on the `admin` guard. Guard-aware guest/auth redirects (admin routes → admin endpoints).
- **Admin panel** (lean, read-only over tenants): workspaces index + show (member list); reads workspace-scoped rows via the **privileged connection** (RLS-bypassed) since an admin is bound to no single workspace.
- **Impersonation (Model A)** — admin guard stays live while `web` guard logs in as the target member, so tenant routes/RLS/`IdentifyWorkspace` work unchanged. `impersonate_start`/`impersonate_stop` audited as the admin actor; impersonation banner in the tenant app; destructive self-account actions blocked while impersonating (`no.impersonation`).
- **Dual-actor audit**: `audit_logs` gains `actor_admin_id` (admin-performed actions) + `impersonated_by_admin_id` (admin acting through a user) — BR-X05.
- **Guard-aware middleware**: `admin.scope` (binds platform permission scope + resets cached spatie relations), `admin.can:<ability>` (checks the admin guard, not web), `no.impersonation`.
- **Conditional Inertia payload**: `HandleInertiaRequests` shapes the auth payload per guard (admin / user / impersonating) — fixes admin-route TypeError.
- **Tenant signup**: public `register` route creates user + workspace + owner membership (self-serve onboarding).
- **Horizon/Telescope/Pulse gates** moved to the `admin` guard + `platform.monitoring.view`.
- **UI refresh**: floated app-shell (SidebarInset shadow + `--radius-shell`), shared `StatCard`/`PageHeader`/`EmptyState` primitives, real KPI counts on both dashboards, light/dark/system switcher in the topbar, status labels + admin panel strings routed through i18n (`lang/{vi,en}/platform.php`). AdminLayout/AdminSidebar reuse the tenant app-shell for visual parity.

### Added — Product Announcements / What's New v1 (2026-06-15)

- **Admin CRUD** (`/admin/announcements`): super_admin can create, edit, delete, and publish/unpublish announcements. Gated by `platform.announcements.manage` permission on the `admin` guard.
- **Markdown pipeline** (`AnnouncementMarkdown::toHtml`): CommonMark + HTML purifier; strips `<script>` and event-handler attributes (XSS guard). `body_html` is server-computed and excluded from `$fillable`.
- **Global tables** (`announcements`, `announcement_reads`): intentionally no `workspace_id`, no RLS, no `BelongsToWorkspace`. Read state is per-user and cross-workspace (once read anywhere, badge clears everywhere).
- **Tenant feed** (`/announcements`): paginated What's New page via `WhatsNewController` + `AnnouncementReadService::visibleQuery()`. Unread badge injected into every Inertia response via shared props.
- **Mark-read** (`POST /announcements/{a}/read`): idempotent (`forceCreate` with existence check). `user_id` always from `auth()->id()` — request body ignored (BR-X12 IDOR guard). Drafts return 404 not 403 (BR-X15 non-enumeration).
- **Audience v1 lock**: `audience.type` must be `all`; `by_plan` / `by_entitlement` / `workspace_filter` rejected at validation (future extension, no schema change needed).
- **SSRF guard**: `cover_image` must be `https` and resolve to a public IP (private ranges rejected at validation).
- **Permission seeding**: `platform.announcements.manage` added as migration (not seeder) so the test DB (`cho_rach_test`) receives it automatically.
- **i18n**: full `announcements` namespace in `lang/en/platform.php` and `lang/vi/platform.php`.
- **Tests** (30 Pest assertions on pgsql):
  - `Admin\AnnouncementManagementTest` (14): authz, CRUD, publish/unpublish atomic, audit log, XSS, SSRF, audience validation.
  - `Tenant\WhatsNewTest` (9): feed visibility, draft→404, future-dated excluded, badge decrement, idempotent read, IDOR guard, cross-workspace coherence, unauthenticated redirect.
  - `Platform\AnnouncementGlobalTableTest` (7): negative RLS (0 policies on both tables), no `workspace_id` columns, global tables excluded from RLS coverage query, cross-workspace coherence via service, default-connection access.
- **Feature doc**: `docs/features/platform/announcements.md` — full operational flow + Mermaid sequence diagram.

### Added — Module 1 Platform Foundation (2026-06-13)
- **Tenant isolation** (3-layer): global scope (BelongsToWorkspace trait) + middleware (IdentifyWorkspace, ResetTenantContext) + PostgreSQL RLS (defense-in-depth). No cross-workspace read/write possible.
- **Workspace switching**: multi-workspace users can switch active context; session-driven, server-validated.
- **Workspace settings**: admin view/update workspace name and base currency.
- **Teams (hierarchical)**: tree structure with cycle-guard; closure table (team_closure) enables O(1) subtree queries for manager visibility rollup.
- **Members + RBAC**: invite users by email, assign roles (admin, sales_manager, sales_rep, support_manager, support_agent, marketer, viewer) and teams; spatie role sync scoped per workspace.
- **Visibility resolver** (2-layer gate): feature-gate (role → permissions, spatie) + record-gate (own/team/all visibility, closure table for manager rollup).
- **Audit log** (append-only): all CRUD + security events logged; PII-minimized (name/email/phone stored as refs, erasable at source).
- **Localization** (i18n): `lang/{vi,en}/platform.php` with role names, team labels, audit action strings.
- **Sequence counter**: `workspace_sequences` for human-readable record numbers (e.g., Deal #1234).
- **Fixed assumptions** from red-team (Phase 1.5):
  - RLS context **reset at request start** (ResetTenantContext runs first, before auth middleware) — prevents stale context on persistent connections (Octane, PgBouncer).
  - Middleware priority: ResetTenantContext → auth → IdentifyWorkspace → route handlers (critical for security).
  - RLS-aware audit writer: workspace-scoped entries on app connection (RLS-scoped), Platform-plane entries on privileged connection (RLS bypassed).

### Added — App scaffold / bootstrap (2026-06-13)
- **Laravel app initialized** from `laravel/react-starter-kit` (Inertia 2 + React + shadcn/Tailwind), merged into repo (docs/plans/.claude/README preserved).
- **Laravel 13.15 on PHP 8.4** (L13 requires 8.4): switched local default PHP 8.3→8.4 (`.zshrc`), installed `phpredis` ext for 8.4.
- **Packages**: spatie/laravel-permission 8, Horizon, Reverb, Telescope (dev), Pest 4 + pest-plugin-laravel 4, Larastan, Pint.
- **Env**: Postgres (`beru_crm` / `beru_crm_test`), Redis (cache/queue/session), Reverb broadcasting. `phpunit.xml` → Postgres test DB (RLS/JSONB need pgsql, not sqlite).
- **Verified**: `artisan about` green, migrations run, **26 tests pass** on pgsql.
- Note: spatie-permission migration NOT run yet — deferred to Module 1 (RBAC keeps role in `workspace_member`, team-scoped).

### Added — Phase 0 & 1 foundation (2026-06-13)
- **Discovery** (`plans/.../reports/discovery.md`): scope (all-in-one SaaS CRM), row-level multi-tenant, mid-market scale, build order Sales-first.
- **Tech stack locked**: Laravel 13 · PostgreSQL 16 · Eloquent · Inertia 2 + React + shadcn/TanStack · Redis (Queue/Horizon) · spatie/laravel-permission.
- **Domain docs**: domain-definition, business-rules (BR-* incl. red-team BR-X11–X18), field-dictionary, actors-and-use-cases.
- **System architecture** (`docs/system-architecture.md`): 6 bounded contexts, data model, 3-layer tenant isolation + RLS, RBAC (own/team/all), transaction boundaries, custom-fields engine, audit, async, scale, frontend.
- **Authorization model** (`docs/crm-authorization-model.md`): two planes — Platform (internal staff, god-mode via audited impersonation) + Workspace (customers); global identity + membership.
- **Marketplace billing** (`docs/crm-marketplace.md`): free base + à-la-carte add-ons (feature/quota/integration/service), one-time or subscription; entitlements-as-data.
- **Cross-cutting foundations**: attachments, notifications, time/locale (UTC), human-readable record numbers, API + webhooks (shared event bus), **product announcements/changelog** (customer-facing "What's New").
- **Business config** (`docs/crm-business-config.md`): default pipeline/stages, enums, SLA targets, lead scoring, base free entitlements, marketplace seeds. Currency VND.
- **Tooling**: `.claude` toolkit normalized; `laravel` skill added.
- **Dev environment**: this machine = local (PHP 8.4 host + local Postgres/Redis). Docker Compose (PHP 8.4-fpm + Nginx + PostgreSQL 16 + Redis 7 + Node/Vite + Horizon/Reverb profiles) provided for other devs' machines; `docs/local-development.md`.
- **GitHub**: `.github/` (PR/issue templates, Laravel CI, dependabot, CODEOWNERS); labels, milestones (M1–M4), 10 build-phase issues; squash-only + auto-delete-branch.

- **Conversations / Inbox** (`docs/crm-conversations-inbox.md`): V1 realtime omnichannel live chat (web widget + Zalo + FB + email), Conversation/Message model, escalate→Ticket. Mandates Laravel Reverb (now v1 infra).

### Changed
- Platform identity: `is_internal` flag on `users` → **separate `admin` guard + `admins` table** (two-guard isolation; staff and customers never share an identity).
- Identity model: per-tenant → **global identity + membership** (long-term multi-org support).
- Billing: fixed plans → **marketplace** (add-ons, one-time/subscription).
- Terminology: tenant → **workspace** (entity/column); "multi-tenant" kept as pattern name.
- Realtime (Reverb): deferred → **v1 infra** (required by live chat).
- Email two-way: moved from "integration later" → a **Conversations channel** (v1 core).

### Pending decisions
- Marketplace item prices (TBD — model is price-agnostic; Platform seeds later).

---

_Next: Phase 2 (Plan) → Phase 3 (Build, Sales-first). First versioned release tagged when the first build phase ships._
