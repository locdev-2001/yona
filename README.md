# Chó Rách Management

> Hệ thống CRM (Customer Relationship Management) đa-tenant cấp doanh nghiệp — quản lý toàn bộ vòng đời khách hàng từ lead đến chăm sóc sau bán, hợp nhất Sales, Projects và (kế hoạch) Support/Marketing trên một nền tảng.

Tài liệu này mô tả **dự án là gì**: domain, cách dữ liệu được tổ chức, mô hình phân quyền, và công nghệ. Đọc để hiểu hệ thống trước khi đi vào chi tiết từng tài liệu.

> **Bản kiểm kê tính năng chi tiết (state-of-the-code)** → [docs/project-overview.md](docs/project-overview.md). README này là tổng quan định hướng; tài liệu kia liệt kê đầy đủ những gì *đã build* để phân tích bước tiếp theo.

---

## Trạng thái hiện tại

Mốc **M1 — CRM Core (M0 + M1)** đã hoàn tất (2026-06-25): lõi CRM production-ready.

| Đã có ✅ | Kế hoạch ⬜ |
|---|---|
| Nền tảng đa-tenant + Workspace (RLS 3 lớp) | Support / Ticket + SLA |
| Identity + Membership + Team + RBAC + Audit | Conversations / Inbox (live chat omnichannel) |
| Admin plane (auth 2-guard, panel, impersonation, announcements) | Marketplace + Entitlements (billing) |
| Custom Fields engine + cross-cutting (attach/tag/note/comment/activity/reminder/email/notif) | Marketing (campaign/segment/scoring) |
| CRM Sales: Client/Contact/Pipeline/Lead/Convert | Client Portal (M2) |
| Projects & Tasks & Timers (timesheet) | Webhooks + inbound API · Reporting/BI · Import |
| Frontend lõi: settings, dark mode, i18n (vi/en), feeds | |

Quy mô: ~39 model · 61 controller · 66 migration · 19 policy · ~545 test (Pest) + Playwright E2E.

---

## Chó Rách Management làm gì

CRM là hệ thống + quy trình quản lý mọi tương tác với khách hàng — từ người lạ quan tâm (lead), thành khách mua, đến quan hệ lâu dài. Chó Rách Management bao trùm cả ba mặt của một CRM:

| Mặt | Vai trò | Trạng thái |
|---|---|---|
| **Operational** | Tự động hóa quy trình sales / projects / (sau) support, marketing | Sales + Projects ✅ |
| **Analytical** | Biến dữ liệu tương tác thành insight, forecast, báo cáo | Hạ tầng activity/audit ✅ · Reporting ⬜ |
| **Collaborative** | Chia sẻ ngữ cảnh khách hàng xuyên các phòng ban | Timeline + notes + activity ✅ · Inbox ⬜ |

Hệ thống không chỉ *lưu trữ* dữ liệu khách hàng mà còn được thiết kế để *hành động* trên dữ liệu đó (nhắc follow-up, đẩy lead qua stage, sau này chấm điểm lead / theo dõi SLA), với activity/event stream làm xương sống cho tự động hóa.

---

## Phạm vi

Một nền tảng all-in-one, chia ba nhóm: **CRM khách hàng dùng**, **Platform nền tảng** (shared), và **nội bộ Platform-staff**. 🟢 = miễn phí (base) · 🔵 = add-on tính phí (marketplace, kế hoạch). Năng lực mở/khóa theo marketplace (mua add-on), không phải gói cứng.

```
CUSTOMER-FACING (workspace)        PLATFORM / SHARED                INTERNAL (platform staff)
───────────────────────────       ──────────────────────────       ──────────────────────────
Sales 🟢 ✅                        Multi-tenancy + Workspace ✅      Workspace administration ✅
  Lead·Contact·Client·Pipeline     Identity + Membership ✅          Impersonation (audited) ✅
  Convert·Lost/Junk                RBAC (roles·teams·visibility) ✅  Product Announcements ✅
Projects & Tasks 🟢 ✅             Custom Fields engine ✅           Marketplace catalog mgmt ⬜
  Milestone·Timer/Timesheet        Audit log + soft-delete ✅        Billing / subscription ops ⬜
Support 🔵 ⬜ (Ticket·SLA·CSAT)    Attachments · Notifications ✅
Conversations/Inbox 🟢 ⬜          Reminders · Email Templates ✅    COMMERCE
  live chat realtime               Realtime (Reverb, hạ tầng) 🟡     ─────────
  omnichannel: web·Zalo·FB·email   Reporting/BI ⬜ · API+Webhooks ⬜ Marketplace (add-ons) ⬜
Marketing 🔵 ⬜                                                      Entitlements · Integrations ⬜
  Campaign·Segment·Scoring
```

Sales + Projects và tầng platform là lõi (đã build); Support, Marketing, và Inbox mở rộng trên cùng một domain model thống nhất.

---

## Cách dữ liệu được tổ chức

> **⚠️ WARNING: Data model section references Account/Deal below — these tables do NOT exist. The codebase uses Client/Contact/Lead/Pipeline instead (decision #2). See [docs/project-overview.md](docs/project-overview.md) (state-of-code) for the ACTUAL schema implemented, or [docs/crm-domain-definition.md](docs/crm-domain-definition.md) for full entity definitions.**

> **Mô hình thực tế: Client / Contact / Lead / Pipeline** (quyết định khóa #2 — thay cho Account/Deal kiểu HubSpot, vốn overkill cho SMB/B2C). Bảng `accounts`/`deals` **không tồn tại** trong code.

```
┌─────────┐   convert (transaction G7)   ┌──────────┐
│  LEAD   │ ───────────────────────────▶ │ CONTACT  │  người liên hệ (thuộc Client)
│ tiềm    │                              └────┬─────┘
│ năng    │                                   │ N thuộc 1
└─────────┘                            ┌──────▼─────┐
  Lead.pipeline_id → PIPELINE          │   CLIENT   │  công ty/tổ chức
                   → PIPELINE_STAGES    └────────────┘
                     (open / won / lost)
  PROJECT ── gắn ─▶ CLIENT ; có MILESTONE + TASK + TIMESHEET
  ACTIVITY / TASK / NOTE / ATTACHMENT / TAG / REMINDER ── đa hình ─▶ Lead | Client | Contact | Project | Task
```

| Thực thể | Là gì |
|---|---|
| **Lead** | Một người ở một công ty *có thể* sẽ mua. Biệt lập trong phễu tới khi convert. |
| **Client** | Công ty/tổ chức có quan hệ kinh doanh — source of truth cho relationship. |
| **Contact** | Người liên hệ thuộc một Client; đúng 1 là **primary**. |
| **Pipeline / Stage** | Tập stage có thứ tự, cấu hình theo workspace; mỗi stage có `type` (open/won/lost) + xác suất thắng. |
| **Project / Milestone / Task** | Dự án gắn với Client; task đa hình (gắn lead/client/project/contact) có timesheet. |
| **Activity / Note / Attachment / Tag / Reminder** | Tương tác/metadata đã ghi — gắn polymorphic vào bất kỳ thực thể nào. |

Nguyên tắc dữ liệu định hình cả hệ thống:

- **Client ↔ Contact là 1:N** — một công ty nhiều người liên hệ; đúng 1 primary (swap atomic).
- **Lead tách biệt Client/Contact** — giữ phễu chuyển đổi đo được và dữ liệu sạch không bị nhiễm. Convert một lead tạo Client + primary Contact trong **một transaction** (isolation + idempotency + rollback), không mất dữ liệu.
- **Tính linh hoạt qua custom fields** — schema lõi cố định, mỗi workspace tự thêm field riêng (lưu JSONB + GIN index).
- **Định danh hybrid**: FK tới `users` là bigint; còn lại UUID.

---

## Vòng đời khách hàng

```
Người lạ → Lead → kéo-thả qua các stage Pipeline (kanban) → stage Won
                                                              │ convert (TX)
                                                              ▼
                                                  Client + primary Contact
                                                              │
                                          Project (gắn Client) → Milestone + Task → Timesheet
                                                              │
                          ┌───────────────────────────────────┴─────────────────┐
                       Lost / Junk (lưu last_stage để restore)         [Kế hoạch] Support · Renewal / Upsell
```

Mỗi bước chuyển tiếp đều ghi lại Activity (append-only), tạo nên dòng lịch sử đầy đủ trên từng khách hàng.

---

## Mô hình đa-tenant & phân quyền

**Đa-tenant:** mỗi khách hàng doanh nghiệp là một **workspace** — ranh giới dữ liệu cứng. Mọi bảng mang `workspace_id`, suy ra từ phiên đăng nhập phía server (không nhận từ client), với **PostgreSQL Row-Level Security default-deny** làm lớp chặn cuối. Ba lớp cô lập (defense-in-depth):

1. **App** — trait `BelongsToWorkspace`: global scope tự lọc + tự đóng dấu `workspace_id` khi tạo.
2. **Middleware `IdentifyWorkspace`** — suy ra workspace active từ session, kiểm tra membership active (else 403), bind `app.current_workspace` cho RLS.
3. **Postgres RLS** — policy `workspace_id = current_setting('app.current_workspace')` trên mọi bảng; app chạy role non-owner; CI test đảm bảo mọi bảng có policy.

**Phân quyền = Role + Record ownership:**

- **Role** quy định *làm được tính năng gì*: `admin`, `sales_manager`, `sales_rep`, `support_manager`, `support_agent`, `marketer`, `viewer` (spatie, scoped theo workspace qua `team_foreign_key = workspace_id`). Quyền dạng `tenant.*` (vd `tenant.lead.create`).
- **Ownership + Visibility** quy định *thấy được record nào*: mỗi record có `owner_id` + `team_id`.
  - Rep → record mình sở hữu (`own`)
  - Manager → record của team mình **và toàn bộ nhánh con** (team dạng cây + closure table cho subtree O(1))
  - Admin → tất cả trong workspace
- Tầm nhìn tính trên **từng thực thể**, không lan qua liên kết; out-of-scope trả **404 (không 403)** để chống dò bản ghi.

**Hai mặt phẳng quyền (2 guard riêng):** *Workspace plane* — khách hàng (guard `web`, bảng `users`), một email gia nhập nhiều workspace qua membership; *Platform plane* — nhân sự nội bộ (guard `admin`, bảng `admins` tách riêng) với roles `super_admin`/`support_engineer`/`billing_ops`, vận hành xuyên workspace và truy cập dữ liệu khách qua **impersonation + audit đầy đủ** (dual-actor). Chi tiết: [docs/crm-authorization-model.md](docs/crm-authorization-model.md).

Hệ thống lưu **audit log** bất biến (append-only, PII-minimized) và dùng **soft-delete** cho hầu hết thực thể — phục vụ truy vết và tuân thủ.

---

## Quyết định thiết kế

| Hạng mục | Lựa chọn |
|---|---|
| Sản phẩm | All-in-one (Sales + Projects, sau là Support/Marketing), một domain model thống nhất |
| Tenancy | Multi-tenant row-level (`workspace_id`) + Postgres RLS (2 role / 2 connection) |
| Mô hình CRM | Client/Contact/Lead/Pipeline (không Account/Deal) — SMB/B2C focus |
| Phân quyền | Role + record ownership; team phân cấp dạng cây (closure table, manager rollup) |
| Định danh | Global identity + membership (1 user, N workspace); ID hybrid (users bigint, còn lại UUID) |
| Custom fields | Schema lõi + JSONB engine theo workspace (không EAV, không template theo ngành) |
| Tiền tệ | Một base currency cho mỗi workspace |
| Audit & xóa dữ liệu | Audit append-only, tối giản PII; soft-delete; hỗ trợ xóa PII theo GDPR |

Toàn bộ quy tắc nghiệp vụ chi tiết (46 quy tắc, mã `BR-XXX`) nằm trong [docs/crm-business-rules.md](docs/crm-business-rules.md).

---

## Công nghệ

> **⚠️ OUTDATED: Some libraries listed below are not yet added to the codebase (React Hook Form, Zod, Recharts, sonner, cmdk, dnd-kit).** Current stack built with Inertia 3 + React 19 + vanilla HTML5 drag-drop. See [docs/system-architecture.md](docs/system-architecture.md) § **9b. Frontend** for the authoritative breakdown.

| Tầng | Lựa chọn |
|---|---|
| Backend | Laravel 13 (PHP 8.4) |
| Database | PostgreSQL 16+ (JSONB + GIN, RLS default-deny) |
| ORM | Eloquent — global scope cho workspace/visibility |
| Đa-tenant | `BelongsToWorkspace` global scope + `IdentifyWorkspace` middleware + Postgres RLS |
| Auth | Session-based (Inertia React starter), 2 guard (`web` + `admin`) |
| Phân quyền | spatie/laravel-permission v8 (roles team-aware) + Policies |
| Frontend | Inertia 3 + React 19 + TypeScript; Tailwind v4 + Radix UI (shadcn-style) + lucide-react |
| Data/UI | TanStack Query + TanStack Table v8 · date-fns · **drag-drop HTML5 native** |
| Jobs / Cron | Laravel Queue (Redis) + Horizon · Scheduler |
| Realtime | Laravel Reverb (đã cài hạ tầng; chưa subscribe vào UI) |
| Routing FE | Ziggy (route names → JS) |
| Markdown | league/commonmark (render announcement an toàn XSS) |
| Quan sát | Telescope + Pulse + Sentry |
| Test | Pest (unit/feature) + Playwright (e2e) |
| Format/Lint | Pint + Prettier + ESLint (`make format`) |
| Triển khai | VPS / Docker (xem [docs/local-development.md](docs/local-development.md)) |

---

## Kiến trúc & Định hướng mới

**Hiện tại (M1):** Monolith phân lớp kỹ thuật (`app/Models`, `app/Http`, `app/Services`).

**Định hướng mới (chuẩn hóa, Phase 4.0):** Hand-rolled **modular monolith** — core modules (always-on) + feature modules (toggleable) + extensible contracts (ChannelDriver, PaymentProvider). Mục đích: mở rộng kênh/cổng = thêm module, **0 sửa lõi**; cô lập module, test độc lập.

**Spec:** [docs/modular-architecture.md](docs/modular-architecture.md) · [docs/decisions/2026-06-27-modular-monolith.md](docs/decisions/2026-06-27-modular-monolith.md) · Plan: [plans/260627-modular-standardization/](../plans/260627-modular-standardization/).

---

## Cách dự án được xây dựng

Chó Rách Management theo một pipeline đặt **đúng domain model lên trước, code sau** — nguyên tắc cốt lõi: trong CRM, mô hình dữ liệu và ranh giới domain là nền móng, sai sẽ đắt nhất để sửa, nên kiến trúc và red-team luôn đi trước khi viết code.

Năm giai đoạn: **Discovery** (chốt phạm vi) → **Domain Architecture** (ERD, ranh giới, isolation) → **Red-team** (bẻ gãy thiết kế trên giấy) → **Plan** (chia phase) → **Build → Verify** (test → review → đồng bộ docs). Chi tiết: [docs/crm-build-pipeline.md](docs/crm-build-pipeline.md).

Nguyên tắc xuyên suốt: **YAGNI · KISS · DRY**.

---

## Bản đồ tài liệu

| Tài liệu | Nội dung |
|---|---|
| [docs/project-overview.md](docs/project-overview.md) | **Bản kiểm kê tính năng hiện tại (state-of-the-code)** + hướng phát triển tiếp theo |
| [docs/crm-domain-definition.md](docs/crm-domain-definition.md) | Định nghĩa CRM, thực thể, quan hệ, vòng đời, thuật ngữ |
| [docs/crm-actors-and-use-cases.md](docs/crm-actors-and-use-cases.md) | Actors, jobs-to-be-done, user stories, ma trận quyền |
| [docs/crm-business-rules.md](docs/crm-business-rules.md) | 46 quy tắc nghiệp vụ (`BR-XXX`) |
| [docs/crm-field-dictionary.md](docs/crm-field-dictionary.md) | Từ điển field đầy đủ + enums |
| [docs/system-architecture.md](docs/system-architecture.md) | **Kiến trúc**: bounded contexts, data model, isolation, RBAC, TX, async, scale, frontend |
| [docs/crm-authorization-model.md](docs/crm-authorization-model.md) | Phân quyền 2 mặt phẳng: Platform (nội bộ) + Workspace (khách) |
| [docs/crm-marketplace.md](docs/crm-marketplace.md) | Marketplace billing + entitlements (base free + add-on) — kế hoạch |
| [docs/crm-conversations-inbox.md](docs/crm-conversations-inbox.md) | Live chat realtime, omnichannel inbox — kế hoạch |
| [docs/crm-business-config.md](docs/crm-business-config.md) | Pipeline mặc định, enums, SLA, scoring, gói free, marketplace seed |
| [docs/crm-build-pipeline.md](docs/crm-build-pipeline.md) | Quy trình xây dựng 5 giai đoạn |
| [docs/features/README.md](docs/features/README.md) | Index tài liệu flow từng tính năng |
| [docs/local-development.md](docs/local-development.md) | Chạy local bằng Docker (PHP/Postgres/Redis) |
| [docs/development-roadmap.md](docs/development-roadmap.md) · [docs/project-changelog.md](docs/project-changelog.md) | Lộ trình & nhật ký thay đổi |
