# Yona — Mô tả dự án & Bản kiểm kê tính năng hiện tại

> Tài liệu mô tả **dự án hiện đang là gì trên thực tế** (đối chiếu code, không phải tầm nhìn). Mục đích: làm nền để phân tích **định hướng phát triển tiếp theo**.
>
> Bản này là *ảnh chụp hiện trạng* (state-of-the-code). README ([../README.md](../README.md)) là *bản pitch tầm nhìn dài hạn*; nơi hai bên lệch nhau, **tài liệu này là nguồn đúng theo code**.

Cập nhật: 2026-07-22 · Mốc đã đạt: **GĐ1 code-complete** (2026-07-11: lõi CRM + Inbox Zalo full messaging + billing metering/entitlements + automation engine v1) · Còn chặn launch: chốt số quota gói, tài khoản Zalo test, import CSV + payment drivers

---

## 1. Tóm tắt điều hành

Yona là một **Conversational CRM & Automation đa người thuê (multi-tenant)**, xây trên Laravel 13 + PostgreSQL 16 + Inertia/React 19. Mỗi khách hàng doanh nghiệp là một **workspace** — ranh giới dữ liệu cứng được bảo vệ 3 lớp (Eloquent global scope + middleware + PostgreSQL Row-Level Security default-deny).

**Đã build và chạy được hôm nay** (GĐ1 code-complete):

- **Nền tảng platform** đầy đủ: đa người thuê, định danh toàn cục + membership, team phân cấp (closure table), RBAC 2 mặt phẳng, audit log bất biến, custom fields engine, các tính năng cross-cutting (attachments/tags/notes/comments/activity/reminders/email templates/notifications).
- **Admin plane** tách biệt: guard `admin` riêng, panel workspaces read-only, impersonation có kiểm toán kép, quản lý + phát hành Product Announcements.
- **CRM Sales core**: Client (công ty) ↔ Contact (người), nhóm khách hàng, vault mã hoá, Lead + pipeline kanban kéo-thả, gán + thông báo, lost/junk + restore, convert Lead → Client + Contact (transaction an toàn).
- **Projects & Tasks**: dự án gắn khách hàng + milestone kanban + members + file + thảo luận; task đa hình + đa người thực hiện + checklist + bộ đếm giờ/timesheet.
- **Frontend** hoàn chỉnh cho lõi: app shell, settings đầy đủ, dark mode, đa ngôn ngữ (vi/en), notification feed, What's New feed.
- **Inbox Zalo cá nhân (full messaging)**: bridge zca-js (services/zalo-bridge, QR login, generic dispatcher 146 method), webhook idempotent, realtime Reverb (Echo private channel), media/sticker/bank-card/danh thiếp, mark-read, hội thoại → Liên hệ nháp → Lead, participants nhóm. Khung kênh chung: `ChannelDriver` contract + `ChannelManager` (thêm kênh = thêm driver).
- **Billing/Metering**: đếm hội thoại per-channel (chỉ khi tenant trả lời; luôn nhận inbound kể cả không có quota limit), entitlements/plan grant. Metering là thống kê thuần; không còn quota gate chặn gửi (gỡ 25/07/2026). Số quota gói còn PLACEHOLDER; gửi không giới hạn.
- **Automation engine v1**: WorkflowEngine graph trigger→condition→action, node handlers (send_message/create_task/tag/condition), workflow canvas FE (@xyflow/react), RLS + tests.

**Quy mô codebase**: ~55 model · 76 controller · 113 migration · 20 policy · ~819 test (Pest) + Playwright E2E.

**Chưa build (kế hoạch)**: Support/Ticket + SLA · Inbox Messenger/TikTok (GĐ2) · Payment drivers VNPay/MoMo · Import dữ liệu (CSV) · Marketing (campaign/segment/scoring) · Client Portal (M2) · Webhooks + inbound API · Reporting/BI · IdentityResolver dedup SĐT (CDP Layer 1 contract đã có, resolver chưa).

---

## 2. Định vị sản phẩm

**Định vị chính thức (chốt 22/07/2026): Conversational CRM & Automation** — CRM lấy hội thoại làm cửa vào (inbox đa kênh → Liên hệ nháp → Lead → Pipeline) + tự động hóa chăm sóc. Dự án bao trùm cả ba mặt của một CRM:

| Mặt | Vai trò | Trạng thái |
|---|---|---|
| **Operational** | Tự động hoá quy trình sales/support/marketing | Sales ✅ · Automation engine v1 ✅ · Support/Marketing ⬜ |
| **Analytical** | Biến dữ liệu thành insight, forecast, báo cáo | Hạ tầng (activity/audit) ✅ · Reporting/BI ⬜ |
| **Collaborative** | Chia sẻ ngữ cảnh khách hàng xuyên phòng ban | Timeline + notes + activity ✅ · Inbox Zalo ✅ (Messenger/TikTok ⬜) |

Định hướng kiến trúc: không chỉ *lưu trữ* dữ liệu mà còn *hành động* trên dữ liệu (đã đặt nền bằng activity/event stream làm xương sống cho tự động hoá/AI sau này). Mô hình kinh doanh: **base miễn phí + add-on tính phí qua marketplace** — entitlements + metering đã build (metering = thống kê, không chặn); payment drivers (VNPay/MoMo) chưa.

---

## 3. Kiến trúc tổng thể & công nghệ

### 3.1 Công nghệ (thực tế trong `composer.json` / `package.json`)

| Tầng | Lựa chọn |
|---|---|
| Backend | Laravel 13, PHP 8.4 |
| Database | PostgreSQL 16+ (JSONB + GIN index, Row-Level Security, 2 role/2 connection) |
| Frontend | Inertia 3 + React 19 + TypeScript 5.7 |
| UI | Tailwind CSS v4 + Radix UI (shadcn-style) + lucide-react; **drag-drop dùng HTML5 widget** |
| Data/state | TanStack Query + TanStack Table v8 · date-fns |
| Phân quyền | spatie/laravel-permission v8 (team-aware: `team_foreign_key = workspace_id`) + Policies |
| Realtime | Laravel Reverb — realtime inbox (Echo private channel per-workspace) |
| Queue/Jobs | Laravel Horizon (Redis) |
| Quan sát | Laravel Pulse + Telescope + Sentry |
| Routing FE | Ziggy (route names sang JS) |
| Markdown | league/commonmark (render announcement an toàn XSS) |
| Test | Pest (unit/feature, ~819 test) + Playwright (E2E) |
| Format/Lint | Pint (PHP) + Prettier + ESLint — chạy qua `make format` |
| Workflow canvas | @xyflow/react (automation graph editor) |

### 3.2 Hai mặt phẳng quyền (2 guard, 2 bảng định danh)

```
PLATFORM PLANE — guard `admin` → bảng admins → App\Models\Admin
  RBAC spatie scope = Admin::PLATFORM_SCOPE (nil-uuid)
  roles: super_admin · support_engineer · billing_ops
  → quản trị workspace/admin/billing; god-mode qua impersonation CÓ KIỂM TOÁN
        │ (impersonation: admin login vào web guard như 1 member)
        ▼
WORKSPACE PLANE — guard `web` → bảng users → App\Models\User (khách hàng)
  Membership (workspace_member): role + team + status, theo từng workspace
  roles: admin · sales_manager · sales_rep · support_manager · support_agent · marketer · viewer
  visibility bản ghi: own | team-subtree | all (theo role)
```

Chi tiết: [crm-authorization-model.md](crm-authorization-model.md).

### 3.3 Cô lập đa người thuê 3 lớp (defense-in-depth)

1. **App — `BelongsToWorkspace` trait**: global scope tự lọc theo `currentWorkspace`, hook `creating` tự đóng dấu `workspace_id`.
2. **Middleware `IdentifyWorkspace`**: suy ra workspace active **từ session phía server** (không tin client), kiểm tra user có `workspace_member` active (else 403), bind `app.current_workspace` cho RLS.
3. **PostgreSQL RLS default-deny**: mọi bảng workspace-scoped có policy `workspace_id = current_setting('app.current_workspace')`. App chạy bằng role non-owner `yona_app`; DDL/audit/cross-workspace dùng role `pgsql_privileged`. CI test (`RlsPolicyCoverageTest`) tự quét đảm bảo mọi bảng có policy.

`ResetTenantContext` xoá context đầu mỗi request (an toàn với connection pooling/Octane). `App\Support\TenantScope` là **single source of truth** để bind/forget RLS + spatie team-id — đã hợp nhất sau bug scope-bleed (xem [[shared-session-scope-bleed]] và changelog 2026-06-25).

### 3.4 Mô hình dữ liệu lõi (THỰC TẾ — Client/Contact/Lead, KHÔNG phải Account/Deal)

> **Quyết định khóa #2**: mô hình **Client/Contact/Lead/Pipeline** thay cho Account/Deal kiểu HubSpot. Bảng `accounts`/`deals` **không tồn tại** trong code.

```
┌─────────┐   convert (transaction G7)   ┌──────────┐
│  LEAD   │ ───────────────────────────▶ │ CONTACT  │ người liên hệ (thuộc Client)
│ tiềm    │                              └────┬─────┘
│ năng    │                                   │ N thuộc 1
└─────────┘                            ┌───────▼────┐
 Lead.pipeline_id → PIPELINE           │   CLIENT   │ công ty/tổ chức
                  → PIPELINE_STAGES     └────────────┘
                    (open/won/lost)
 PROJECT ── gắn ─▶ CLIENT ; có MILESTONE + TASK
 TASK / ACTIVITY / NOTE / ATTACHMENT / TAG / REMINDER ── đa hình ─▶ Lead|Client|Contact|Project|Task
```

### 3.5 Tính nhất quán giao dịch

- **Mạnh (strong)**: convert lead (lockForUpdate + idempotency), đổi stage, ownership/visibility, timer state.
- **Cuối cùng (eventual)**: activity feed, lead scoring (chưa build), report rollup (chưa build).
- Sự kiện domain bắn **sau commit** (`DB::afterCommit`); không gọi HTTP/queue trong transaction.

---

## 4. Bản kiểm kê tính năng hiện tại (chi tiết theo module)

> Trạng thái: ✅ implemented · 🟡 partial · ⬜ planned. Mọi tính năng dưới đây **đã có trong code** trừ khi ghi rõ.

### A. Nền tảng đa người thuê & Workspace ✅

**Mục đích**: cô lập tuyệt đối dữ liệu giữa các khách hàng; mỗi user vào nhiều workspace nhưng tại một thời điểm chỉ 1 workspace active.

**Năng lực**:
- Cô lập 3 lớp (mục 3.3) + reset context mỗi request.
- **Provisioning workspace mới** atomically: tạo workspace + admin member + seed pipeline/stage mặc định trong 1 transaction (`WorkspaceProvisioningService`). Đăng ký `/register` tạo User + workspace đầu tiên + membership role `admin`.
- **Chuyển workspace**: server validate user có membership active ở workspace đích (else 403), lưu session (`WorkspaceSwitchController`).
- **Cấu hình workspace** (admin): tên, base_currency, timezone, locale, audit_retention — có audit log thay đổi.
- **Đánh số bản ghi theo workspace** (`WorkspaceSequence`): bộ đếm human-readable (`lead_number`, `project_number`, `task_number`...) race-safe.
- **Setting JSONB** qua `SettingsService` (get/set/forget) — ví dụ `default_pipeline_id`, `default_lead_source_id`.

**Entity chính**: Workspace · WorkspaceMember · WorkspaceSetting · WorkspaceSequence · User (global).
**UI**: workspace-switcher (sidebar) · [settings/workspace.tsx](../resources/js/pages/settings/workspace.tsx).
**Khoảng trống**: chưa có UI tạo workspace cho end-user (mới có service); chưa có suspend/delete workspace; chưa enforce quota (seat/storage/API); chưa có cross-workspace reporting cho platform admin.

### B. Định danh, Membership, Team phân cấp, RBAC, Audit ✅

**Mục đích**: quản lý người dùng, vai trò, phạm vi nhìn thấy dữ liệu, và truy vết bất biến.

**Năng lực**:
- **Định danh toàn cục**: 1 email (`users`) tham gia N workspace; role/team/status nằm ở `workspace_member` (server-controlled, BR-X12). Admin (`admins`) là định danh tách biệt, không bao giờ là member.
- **Membership**: mời (firstOrCreate user theo email, idempotent), đổi role, đổi team, deactivate (status + gỡ role); chặn tự sửa membership của chính mình.
- **Team phân cấp**: cây per-workspace + **closure table** cho truy vấn subtree O(1); tạo/đổi tên/reparent (cycle-guard) /xoá (chỉ leaf, soft-delete, detach members).
- **RBAC 2 lớp**:
  - *Feature gate* = spatie roles (7 role workspace) → quyền dạng `tenant.*`. Bộ quyền: `tenant.{client,contact,lead,project,task}.{view,view_own,create,update,delete}` + `tenant.workspace.update`, `tenant.team.manage`, `tenant.member.manage`, `tenant.audit.view`, email_template/custom_fields... (~26 quyền trong `TenantPermission`).
  - *Record gate* = `Visibility` resolver + Policies: `own` (rep) → `owner_id = me`; `team` (manager) → team mình + toàn bộ subtree (closure); `all` (admin). **Per-entity, không lan qua liên kết**; out-of-scope trả **404 (không 403)** chống dò bản ghi (BR-X15).
- **Audit log** (`AuditLog`): append-only (chặn update/delete ở model boot), **PII-minimized** (tham chiếu id thay vì copy giá trị nhạy cảm), dual-actor (`actor_id`/`actor_admin_id`/`impersonated_by_admin_id`); workspace event ghi qua app connection (RLS), platform event qua privileged connection.

**Entity chính**: User · Admin · WorkspaceMember · Team · TeamClosure · AuditLog · spatie (roles/permissions).
**UI**: [settings/members.tsx](../resources/js/pages/settings/members.tsx) · [settings/teams.tsx](../resources/js/pages/settings/teams.tsx).
**Khoảng trống**: chưa có UI xem audit log; custom role do khách tự định nghĩa (mới fix 7 role); bulk member (CSV import); retention purge job cho audit chưa lên scheduler; reassignment bắt buộc khi deactivate member chưa enforce.

### C. Admin Plane (nhân sự nền tảng) ✅

**Mục đích**: mặt phẳng nội bộ vận hành, tách hoàn toàn khỏi tenant.

**Năng lực**:
- **Đăng nhập 2-guard** (`auth:admin`): rate-limit 5 lần/IP, regenerate session, redirect guard-aware; user `web` không bao giờ vào được `/admin`.
- **Bind scope mỗi request** (`BindAdminPermissionScope`): set `PLATFORM_SCOPE`, gỡ cache role/permission → chống scope-bleed; quyền kiểm qua `auth('admin')->user()->can('platform.*')` (middleware `AdminCan`).
- **Panel workspaces (read-only)**: list toàn bộ workspace + member qua privileged connection (bypass RLS có kiểm soát); không write.
- **Impersonation (Model A)**: admin login vào web guard như 1 member active (else 422), session giữ `impersonator_admin_id`; mọi write trong lúc impersonate đóng dấu `impersonated_by_admin_id`; chặn hành động phá huỷ tài khoản (`no.impersonation`); stop = logout web guard, admin guard vẫn sống.
- **Product Announcements**: CRUD + publish/unpublish (server kiểm soát status/published_at/created_by), body Markdown render an toàn (strip HTML, chặn link `javascript:`/`data:`), audience v1 = `{type:all}` (schema sẵn cho by_plan/by_entitlement sau).
- **Dashboard**: thống kê (số workspace/user/admin, signup 24h).
- 3 platform role: `super_admin` (đủ quyền) · `support_engineer` (workspaces.view + impersonate + audit.view) · `billing_ops` (workspaces.view + billing.manage); 8 platform permission.

**UI**: [admin/dashboard.tsx](../resources/js/pages/admin/dashboard.tsx) · admin/workspaces · admin/announcements.
**Khoảng trống**: UI quản lý admin (`platform.admins.manage`), audit viewer, billing/workspace ops, monitoring dashboard — quyền đã định nghĩa, **chưa có UI**; lịch phát hành announcement (scheduled publish); analytics lượt đọc.

### D. Custom Fields engine + Cross-cutting 🟡 (engine ✅, vài phần phụ trợ còn dở)

**Mục đích**: gắn metadata/file/tương tác vào *bất kỳ* entity mà không làm phình model lõi.

**Năng lực**:
- **Custom Fields**: registry `custom_field_definitions` (workspace-scoped, versioned) + lưu giá trị trong cột `custom_fields` JSONB (GIN index). 5 entity type: client/contact/lead/project/task. Nhiều kiểu trường (input, number, textarea, select, multiselect, checkbox, date, datetime, color, link), validate theo registry; slug/entity_type/field_type bất biến sau khi tạo; chặn xoá option đang được dùng; default value áp khi tạo entity.
- **Attachments**: file đa hình + lưu theo namespace `attachments/{workspace_id}/{uuid}`; tải qua `attachment_key` không-đoán-được; cờ `visible_to_customer` (cho portal M2); hỗ trợ link ngoài.
- **Tags**: dedupe theo slug per workspace; pivot `taggables` mang `workspace_id` (RLS); giữ thứ tự.
- **Notes**: ghi chú nội bộ (staff-only) đa hình; có `date_contacted` (lead.last_contact đọc từ đây).
- **Comments**: bình luận đa hình, thread 1 cấp (`parent_id`); cờ `visible_to_customer` cho từng comment.
- **Activity timeline**: log append-only bất biến, đa hình; snapshot actor (id + tên) để an toàn audit; cờ visible_to_customer.
- **Reminders**: nhắc hẹn đa hình + scheduler quét gửi (`is_notified`/`notified_at`), cô lập RLS per-workspace.
- **Email Templates** + **Merge Fields**: template workspace-scoped đa ngôn ngữ (vi/en), token `{snake_case}` + `{cf_<slug>}`; whitelist 5 context key (G9) chống lộ dữ liệu; `TemplatedMailer` gửi; template `lead_assigned` đã seed.
- **Notifications**: feed in-app (Laravel notifications, DB channel) qua `NotificationService` (notify/markRead/markAllRead/unreadCount); self-notify guard; loại member inactive khỏi recipient.

**Khoảng trống quan trọng**: resolver merge-field cho Client/Contact mới là stub (Lead một phần) → email tự động chưa đầy đủ; **scheduler reminders + purge audit chưa chắc đã đăng ký vào cron**; ActivityFormatter có nhưng chưa tích hợp render; orphan attachment cleanup chưa có job; notification preferences (mute theo loại/kênh email vs in-app) chưa có; thread comment chỉ 1 cấp.

### E. CRM Sales: Client / Contact / Pipeline / Lead / Convert ✅

**Mục đích**: backbone bán hàng — hồ sơ khách hàng + phễu lead + chuyển đổi an toàn.

**Năng lực**:
- **Client (công ty)**: CRUD + soft-delete; owner auto-stamp; địa chỉ billing/shipping; currency + default_language; dùng đủ custom fields/tags/attachments/notes/activity.
- **Contact (người)**: nhiều contact/khách; **primary contact** (tối đa 1, swap atomic); email unique theo workspace (partial index, cho phép null); cột portal (`password`, `email_verified_at`, `is_active`, `email_optin`) **đã có sẵn cho M2** nhưng chưa expose.
- **Client Group**: nhóm khách (many-to-many, pivot mang workspace_id cho RLS).
- **Customer-admin delegation**: gán user phụ trách full-access 1 client (`client_user`), validate là member active.
- **Client Vault**: lưu credential mã hoá (`Crypt::encrypt`), visibility private/shared, cờ share_in_projects.
- **Lead**: CRUD + `lead_number` sequence; đủ 6 concern (custom fields/tags/attachments/notes/activities/reminders).
- **Pipeline Kanban**: kéo-thả đổi stage (G8: stage phải thuộc pipeline — validate ở FormRequest + Service), reorder trong stage, log activity + bắn event.
- **Assignment**: gán user → bắn `LeadAssigned` → notification (DB + email qua TemplatedMailer).
- **Lost / Junk / Restore**: cache `last_stage_id` khi mark, khôi phục stage khi restore.
- **Convert Lead → Client + Contact (G7)**: isolation assert (sai workspace → 404), idempotency (convert 2 lần → 422), `DB::transaction` tạo Client + primary Contact, map custom field theo slug, re-point notes, đẩy lead sang stage `won`, backlink `client.leadid`.
- **Pipeline/Stage/Lead Source management** (settings): CRUD; single-default pipeline invariant; stage type open/won/lost + probability + color; guard xoá lead source đang được tham chiếu.

**UI**: clients (index/create/edit/show/groups) · leads (index/kanban/show/create/edit + lead-card, assign-popover, convert-dialog).
**Khoảng trống**: lọc nâng cao + bulk action + export; lead scoring & auto-assignment (rule engine); pipeline analytics/forecast; Client 360 view; lead merge; pipeline-stage SLA; email sync; webhook/API export.

### F. Projects & Tasks & Timers ✅

**Mục đích**: quản lý dự án gắn khách hàng + công việc đa hình + timesheet.

**Năng lực**:
- **Project**: gắn client (nullable); status từ lookup workspace-scoped; progress thủ công **hoặc** auto-tính từ tỉ lệ task xong (`progress_from_tasks`); cờ visible_to_customer; `project_number` sequence; đủ custom fields/tags/attachments/activity.
- **Project members**: role manager/member/viewer; validate member active.
- **Milestone kanban**: kéo-thả reorder (bulk update `milestone_order` trong transaction); name/due_date/color/status.
- **Discussions**: thread 2 cấp (discussion + replies qua comments); cờ `show_to_customer`.
- **Project files**: upload (dùng chung `Attachment` đa hình), cờ visible_to_customer.
- **Task**: **đa hình related-to** (lead/client/project/contact); status 1–5 + priority 1–4 (hằng số, kiểu Perfex, không DB enum); `task_number` sequence; billable/billed; đủ custom fields/tags/attachments/notes/activities/reminders.
- **Đa người thực hiện** (`task_assignees`) + **followers** (`task_followers`) — pivot mang workspace_id; sync idempotent; notify assignee mới.
- **Checklist** (`task_checklist_items`): CRUD + toggle done (audit `finished_at`/`finished_by`) + reorder + assign user.
- **Bộ đếm giờ / Timesheet** (`task_timers`): start/stop/log thủ công; **1 timer chạy/người** (partial unique index + auto-stop timer cũ); snapshot hourly_rate lúc start; **timer bất biến** (no soft-delete); **khoá khi task billed** (mọi thao tác timer throw); auto-stop khi task vào status hoàn tất hoặc khi gỡ assignee.
- **Kanban task**: 5 cột theo status, reorder atomic (status + kanban_order + finished_at).
- **Override quyền**: assignee xem/sửa task được dù role `viewer` (logic trong Policy).

**UI**: projects (index/show với tabs milestones/members/files/discussions/activity, create/edit) · tasks (index/kanban/show với checklist/assignees/timers/comments).
**Khoảng trống** (nhiều TODO P09 còn treo): gỡ assignee khi xoá member chưa hoàn chỉnh; xoá milestone chưa reassign task; progress auto-calc chưa cache/event-driven; chưa có dependency/recurrence task; chưa budget vs actual; timer analytics/burndown; @mention.

### G. Frontend, Settings, i18n, Feeds, Observability ✅

**Mục đích**: lớp giao diện + cấu hình + trải nghiệm.

**Năng lực**:
- **App shell**: sidebar điều hướng gated theo `membership.permissions`; breadcrumb; workspace switcher; badge unread (notifications + announcements).
- **Settings đầy đủ**: profile · password · appearance (dark/light/system, lưu localStorage) · workspace · teams · members · custom-fields · email-templates · lookups (lead-sources/pipelines/project-statuses) — nav lọc theo quyền.
- **Notifications**: bell + unread badge, dropdown 5 mục gần nhất, trang full pagination, mark read/read-all; scope qua `$user->notifications()` (404 nếu không thuộc user).
- **Announcements (What's New)**: feed phân trang + category badge + cover image; **modal auto-popup** cho announcement chưa đọc lần đầu (guard theo session); mark read idempotent.
- **i18n**: vi/en, hook translator + interpolation `:param`, namespace động; đổi ngôn ngữ lưu `user.locale` + session (`SetLocale`).
- **Observability**: Pulse + Telescope + Sentry; Horizon cho queue; Reverb realtime cho inbox (notification/announcement chưa realtime).

**Khoảng trống**: realtime đẩy notification/announcement qua Reverb chưa hook (inbox đã realtime); reminders consumer (UI) chưa render; notification action-link chưa click-through; filter/search announcement; command palette ⌘K; export/import cấu hình.

### H. Conversations / Inbox Zalo cá nhân ✅ (GĐ1, merge 2026-07-11)

**Mục đích**: cửa vào Conversational CRM — gom tin nhắn Zalo cá nhân về một inbox, biến hội thoại thành Lead.

**Năng lực**:
- **Bridge Zalo cá nhân** (`services/zalo-bridge`, Node + zca-js): QR login promote slot, session persist, generic dispatcher `POST /zca/:method` (allowlist reflection 146 method, guard outbound/destructive/elevated secret), relay forwarder 10 loại event về Laravel.
- **Ingest idempotent** (`InboundMessageService`): webhook → upsert conversation (unique `channel_account_id + peer_uid`) + message (dedup `source_id`, backfill `old_messages` replay-safe), enrich type (image/video/file/sticker/bank_card/danh thiếp), participants nhóm, replay-upgrade tin cũ.
- **Realtime**: Reverb + Echo private channel per-workspace; auto mark-read khi tab hiện; unread badge; stream version chống lệch UI đa tab.
- **Gửi tin** (`OutboundSendPipeline` — money-path): quota gate per-channel TRƯỚC transport → driver policy (cửa sổ 7h–22h, cap 3 tin QC/số/ngày, reply-exempt) → transport → persist + meter. Media/sticker/quote/reaction/recall theo `ChannelCapabilities`.
- **CRM layer**: hội thoại = Liên hệ nháp khi chưa gắn Contact; convert → Lead (dedup contract CDP Phase-08); phone enrichment từ danh thiếp/bank card.
- **Khung kênh chung**: `ChannelDriver` contract + `ChannelManager`; UI inbox channel-agnostic (`components/inbox/*`) — thêm Messenger/TikTok = thêm driver, 0 sửa lõi.

**Docs chi tiết**: [features/messaging/README.md](features/messaging/README.md) (13 flow doc).
**Khoảng trống**: chỉ mới kênh Zalo cá nhân (rủi ro ToS — không có API chính thức); notification khi `session_lost` chưa có; web widget/Messenger/Email chưa build.

### I. Billing: Metering + Entitlements ✅ (core, GĐ1)

**Năng lực**:
- **Metering per-channel** (`MeteringService` + `channel_usage`): đếm hội thoại theo từng kênh, CHỈ khi tenant trả lời (inbound không tính); luôn nhận inbound kể cả hết quota (bảo toàn lead capture).
- **Entitlements/plan**: marketplace items + `workspace_purchases` + plan grant; gate tính năng per-workspace.
- **Khoảng trống**: số quota 3 gói (Free/Team/Business) còn PLACEHOLDER chờ founder chốt; payment drivers VNPay/MoMo chưa build; admin catalog/billing UI chưa có.

### J. Automation / Workflow engine v1 ✅

**Năng lực**: `WorkflowEngine` chạy graph trigger→condition→action (bảng `workflows`/`workflow_runs`/`workflow_run_logs`, RLS đủ); node handlers v1: send_message (qua ChannelManager + pipeline), create_task, tag, condition; enroll theo subject lead/conversation; workflow canvas FE (@xyflow/react); permission `automation.manage`.
**Khoảng trống**: trigger tự động từ event (mới enroll thủ công/service-call); entitlement gate `module.marketing` chưa enforce trong engine; node registry v1 cố định (thiết kế đầy đủ: [crm-automation-workflow.md](crm-automation-workflow.md)).

---

## 5. Bản đồ trạng thái (để phân tích nhanh)

| Module | Trạng thái | Độ trưởng thành |
|---|---|---|
| Đa người thuê + Workspace | ✅ | Production-ready |
| Identity + Membership + Team + RBAC + Audit | ✅ | Production-ready (thiếu UI audit viewer) |
| Admin Plane (auth, panel, impersonation, announcements) | ✅ | Core xong; thiếu admin/billing/monitoring UI |
| Custom Fields engine | ✅ | Production-ready |
| Cross-cutting (attach/tag/note/comment/activity/reminder/email/notif) | 🟡 | Dùng được; vài job async + merge-field còn dở |
| CRM Sales (Client/Contact/Lead/Pipeline/Convert) | ✅ | Production-ready |
| Projects & Tasks & Timers | ✅ | Dùng được; vài TODO P09 treo |
| Frontend/Settings/i18n/Feeds | ✅ | Production-ready cho lõi |
| Conversations / Inbox Zalo cá nhân (full messaging + bridge) | ✅ | Dùng được; cần verify tay bằng tài khoản Zalo test |
| Billing: Metering per-channel + Entitlements | ✅ | Core xong; quota PLACEHOLDER + payment drivers ⬜ |
| Automation engine v1 (workflow graph + canvas) | ✅ | v1; trigger tự động từ event ⬜ |
| Support / Ticket + SLA | ⬜ | Chưa build (hạ tầng sẵn ~90%) |
| Marketing (campaign/segment/scoring) | ⬜ | Chưa build |
| Client Portal (M2) | ⬜ | Cột DB sẵn; chưa có auth flow |
| Webhooks + inbound API (Sanctum) | ⬜ | Chưa build (event stream sẵn) |
| Reporting / BI | ⬜ | Chưa build (compute-on-read posture) |
| Import dữ liệu (CSV) | ⬜ | Chưa build |

---

## 6. Khoảng trống & nợ kỹ thuật hiện tại (việc nên dọn trước/song song)

1. **Job async chưa chắc lên scheduler**: dispatch reminders + purge audit theo `audit_retention` cần verify/đăng ký vào `schedule` với RLS context per-workspace.
2. **Merge-field contracts dở** (Client/Contact stub) → email tự động (assignment, lead lifecycle) chưa đủ.
3. **TODO P09 treo** ở Projects/Tasks: gỡ assignee khi xoá member, reassign task khi xoá milestone, progress auto-calc hiệu năng.
4. **UI còn thiếu cho quyền đã định nghĩa**: audit viewer (tenant + platform), admin management, billing/monitoring (platform).
5. **Realtime ngoài inbox chưa hook**: inbox đã realtime qua Reverb; notification/announcement/kanban vẫn polling/refresh.
6. **Notification preferences** (kênh + mute theo loại) chưa có → khó scale số lượng thông báo; notification `session_lost` (bridge mất phiên Zalo) chưa có.
7. **Bulk/Import/Export** vắng mặt toàn hệ → cản trở onboarding khách có sẵn dữ liệu.

---

## 7. Hướng phát triển tiếp theo (vật liệu để phân tích)

Xếp theo **độ sẵn sàng** (hạ tầng tái dùng được nhiều = làm nhanh, rủi ro thấp). Đây là *vật liệu phân tích*, không phải quyết định.

| # | Hướng | Độ sẵn sàng | Vì sao sẵn sàng | Cần thêm |
|---|---|---|---|---|
| 1 | **Support / Ticket + SLA** | ~90% | Tái dùng pattern Lead/Task: custom fields, comments, activities, reminders, attachments, polymorphic, kanban, RBAC | Model Ticket, status lookup, **SLA engine** (24/7 calendar, pause/resume), escalate, CSAT |
| 2 | **Hoàn thiện Email system** | ~85% | EmailTemplate + TemplatedMailer + MergeFieldResolver gần xong | Hoàn thiện Client/ContactMergeFields, endpoint preview/test-send, khoá whitelist G9 |
| 3 | **Client Portal (M2)** | ~75% | Cột portal đã có trên Contact; cờ visible_to_customer rải khắp activity/comment/attachment | Guard portal, OTP/email verify, password reset, resource lọc field nhạy cảm, trang self-service |
| 4 | **Lead scoring + auto-assignment** | ~70% | Lead/source/pipeline/assignment + event stream sẵn | Rule engine (round-robin/skill/territory), công thức scoring, job dispatch |
| 5 | **Reporting/BI + Pipeline analytics** | ~70% | Activity/audit + denormalized fields; posture compute-on-read | Query/repository layer cho rollup, dashboard (forecast, conversion, win/loss), chart lib |
| 6 | **Payment drivers (VNPay/MoMo)** | ~70% | Entitlements + purchases + metering đã chạy; chỉ thiếu cổng thanh toán | Driver `PaymentProvider` per cổng, webhook confirm, reconcile |
| 7 | **Inbox kênh mới (Messenger/TikTok — GĐ2)** | ~70% | `ChannelDriver` contract + UI inbox channel-agnostic sẵn | Driver per kênh + OAuth/webhook riêng từng nền tảng |
| 8 | **Webhooks + inbound API (Sanctum)** | ~60% | Event domain + logic ở Service (controller mỏng) nên API gọi lại được core | Resource serializers, webhook dispatch (HMAC + retry), token scope theo membership |
| 9 | **Bulk ops + Import (CSV)** | ~65% | CRUD + validation custom fields sẵn | Importer (Lead/Contact/Client), bulk assign/status, idempotency/dedup |

**Gợi ý đọc thêm để quyết định**: [development-roadmap.md](development-roadmap.md) (lộ trình M2/M3/M4) · [crm-marketplace.md](crm-marketplace.md) (mô hình billing) · [crm-conversations-inbox.md](crm-conversations-inbox.md) (inbox) · [crm-business-rules.md](crm-business-rules.md) (46 quy tắc BR-*).

---

## 8. Bản đồ tài liệu liên quan

| Tài liệu | Nội dung |
|---|---|
| [README.md](../README.md) | Pitch tầm nhìn tổng quan |
| [system-architecture.md](system-architecture.md) | Kiến trúc: bounded context, data model, isolation, RBAC, TX, async, scale, frontend |
| [crm-authorization-model.md](crm-authorization-model.md) | Phân quyền 2 mặt phẳng (Platform + Workspace) |
| [crm-domain-definition.md](crm-domain-definition.md) | Định nghĩa entity, quan hệ, vòng đời, thuật ngữ |
| [crm-business-rules.md](crm-business-rules.md) | 46 quy tắc nghiệp vụ (BR-*) |
| [features/README.md](features/README.md) | Index tài liệu flow từng tính năng |
| [development-roadmap.md](development-roadmap.md) · [project-changelog.md](project-changelog.md) | Lộ trình & nhật ký thay đổi |
