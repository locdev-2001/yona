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
