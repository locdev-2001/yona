# Chó Rách Management

> Hệ thống CRM (Customer Relationship Management) đa-tenant cấp doanh nghiệp — quản lý toàn bộ vòng đời khách hàng từ lead đến chăm sóc sau bán, hợp nhất Sales, Support và Marketing trên một nền tảng.

Tài liệu này mô tả **dự án là gì**: domain, cách dữ liệu được tổ chức, mô hình phân quyền, và công nghệ. Đọc để hiểu hệ thống trước khi đi vào chi tiết từng tài liệu.

---

## Chó Rách Management làm gì

CRM là hệ thống + quy trình quản lý mọi tương tác với khách hàng — từ người lạ quan tâm (lead), thành khách mua, đến quan hệ lâu dài. Chó Rách Management bao trùm cả ba mặt của một CRM:

| Mặt | Vai trò |
|---|---|
| **Operational** | Tự động hóa quy trình sales / marketing / support hằng ngày |
| **Analytical** | Biến dữ liệu tương tác thành insight, forecast, báo cáo |
| **Collaborative** | Chia sẻ ngữ cảnh khách hàng xuyên các phòng ban |

Hệ thống không chỉ *lưu trữ* dữ liệu khách hàng mà còn được thiết kế để *hành động* trên dữ liệu đó (chấm điểm lead, nhắc follow-up, đẩy deal, theo dõi SLA), với activity/event stream làm xương sống cho tự động hóa.

---

## Phạm vi

Một nền tảng all-in-one, chia ba nhóm: **CRM khách hàng dùng**, **Platform nền tảng** (shared), và **nội bộ Platform-staff**. 🟢 = miễn phí (base) · 🔵 = add-on tính phí (marketplace).

```
CUSTOMER-FACING (workspace)        PLATFORM / SHARED                INTERNAL (platform staff)
───────────────────────────       ──────────────────────────       ──────────────────────────
Sales 🟢                           Multi-tenancy + Workspace         Workspace administration
  Lead·Contact·Account·Deal        Identity + Membership             Marketplace catalog mgmt
  Pipeline·Forecast                RBAC (roles·teams·visibility)     Billing / subscription ops
Engagement 🟢 (Activity·Task)      Custom Fields engine              Support impersonation (audited)
Support 🔵 (Ticket·SLA·CSAT)       Audit log + soft-delete
Conversations/Inbox 🟢             Attachments · Notifications        COMMERCE
  live chat realtime               Product Announcements             ─────────
  omnichannel: web·Zalo·FB·email   Realtime (Reverb)                 Marketplace (add-ons)
  escalate → Ticket                Reporting/BI · API + Webhooks     Entitlements · Integrations
Marketing 🔵 (Campaign·Segment·Scoring)
```

Sales và tầng platform là lõi; Support, Marketing, và Inbox mở rộng trên cùng một domain model thống nhất. Năng lực mở/khóa theo **marketplace** (mua add-on), không phải gói cứng.

---

## Cách dữ liệu được tổ chức

Trung tâm của hệ thống là sáu thực thể và quan hệ giữa chúng:

```
┌─────────┐   convert    ┌──────────┐
│  LEAD   │ ───────────▶ │ CONTACT  │  người, đã qualify
│ chưa    │              └────┬─────┘
│ qualify │                   │ N  thuộc về  1
└─────────┘             ┌─────▼────┐  1   N  ┌─────────┐
                        │ ACCOUNT  │◀────────│  DEAL   │  cơ hội bán hàng
                        │ công ty  │         └────┬────┘
                        └──────────┘              │ ở 1 stage của
                                             ┌────▼─────┐
                                             │ PIPELINE │
                                             └──────────┘
   ACTIVITY / TASK / TICKET  ── gắn vào ─▶  Lead | Contact | Account | Deal
```

| Thực thể | Là gì |
|---|---|
| **Lead** | Một người ở một công ty có thể sẽ mua. Biệt lập tới khi được qualify. |
| **Contact** | Người đã qualify, đang được tương tác. Xương sống — mọi tương tác gắn vào Contact. |
| **Account** | Công ty đang có/theo đuổi quan hệ (Contact = người, Account = tổ chức). |
| **Deal** | Một cơ hội bán hàng, di chuyển qua các stage của pipeline. |
| **Pipeline / Stage** | Tập stage có thứ tự, cấu hình theo team; mỗi stage có xác suất thắng. |
| **Activity / Task / Ticket** | Tương tác đã ghi / việc cần làm / yêu cầu hỗ trợ — gắn polymorphic vào bất kỳ thực thể nào. |

Nguyên tắc dữ liệu định hình cả hệ thống:

- **Account ↔ Contact là 1:N** — một công ty nhiều người liên hệ.
- **Deal ↔ Contact là N:N** (qua `deal_contact_roles`) — model được *buying committee*, nhiều người cùng quyết định một deal.
- **Lead tách biệt Contact** — giữ phễu chuyển đổi đo được và dữ liệu sạch không bị nhiễm. Qualify một lead tạo Contact (kèm Account, Deal) trong một transaction, không mất dữ liệu.
- **Tính linh hoạt qua custom fields** — schema lõi cố định, mỗi workspace tự thêm field riêng (lưu JSONB).

---

## Vòng đời khách hàng

```
Người lạ → Lead → (qualify) → Contact + Account
                                   │ tạo
                                   ▼
                                 Deal → qua các stage Pipeline
                                   │
                          ┌────────┴────────┐
                       Won (khách hàng)   Lost (lưu lý do)
                          │
                          ▼
                  Onboarding → Support (Ticket) → Renewal / Upsell
```

Mỗi bước chuyển tiếp đều ghi lại Activity, tạo nên dòng lịch sử đầy đủ trên từng khách hàng.

---

## Mô hình đa-tenant & phân quyền

**Đa-tenant:** mỗi khách hàng doanh nghiệp là một **workspace** — ranh giới dữ liệu cứng. (Thực thể & cột tên là `workspace`/`workspace_id`; "đa-tenant"/"multi-tenant" chỉ là tên *pattern* kiến trúc.) Mọi bảng mang `workspace_id`, suy ra từ phiên đăng nhập phía server (không nhận từ client), với Postgres Row-Level Security làm lớp chặn cuối.

**Phân quyền = Role + Record ownership:**

- **Role** quy định *làm được tính năng gì*: `admin`, `sales_manager`, `sales_rep`, `support_manager`, `support_agent`, `marketer`, `viewer`.
- **Ownership** quy định *thấy được record nào*: mỗi record có `owner_id` + `team_id`.
- **Tầm nhìn (visibility)** theo vai trò:
  - Rep / Agent → record mình sở hữu
  - Manager → record của team mình **và toàn bộ nhánh con** (team tổ chức dạng cây)
  - Admin → tất cả trong workspace
- Tầm nhìn tính trên từng thực thể, không lan truyền qua liên kết — thấy một Account không đồng nghĩa thấy các Deal của người khác trên đó.

**Hai mặt phẳng quyền:** ngoài *Workspace plane* (khách hàng, mô tả trên), có *Platform plane* — nhân sự nội bộ (`super_admin`/`support_engineer`/`billing_ops`) vận hành xuyên workspace; truy cập dữ liệu khách qua **impersonation có thời hạn + audit đầy đủ**. Identity là **global** (một email, gia nhập nhiều workspace qua membership). Chi tiết: [docs/crm-authorization-model.md](docs/crm-authorization-model.md).

Hệ thống lưu **audit log** bất biến (append-only) và dùng **soft-delete** cho mọi thực thể — phục vụ truy vết và tuân thủ.

---

## Quyết định thiết kế

| Hạng mục | Lựa chọn |
|---|---|
| Sản phẩm | All-in-one (Sales + Support + Marketing), một domain model thống nhất |
| Tenancy | Multi-tenant row-level (`workspace_id`) + Postgres RLS |
| Phân quyền | Role + record ownership; team phân cấp dạng cây (manager rollup) |
| Custom fields | Schema lõi + JSONB engine theo workspace (không EAV, không template theo ngành) |
| Tiền tệ | Một base currency cho mỗi workspace |
| Quy mô | Mid-market (~ngàn workspace × ~triệu record/workspace) |
| Audit & xóa dữ liệu | Audit append-only, tối giản PII; soft-delete; hỗ trợ xóa PII theo GDPR |
| SLA | Tính theo thời gian calendar 24/7, có pause/resume |

Toàn bộ quy tắc nghiệp vụ chi tiết (46 quy tắc, mã `BR-XXX`) nằm trong [docs/crm-business-rules.md](docs/crm-business-rules.md).

---

## Công nghệ

| Tầng | Lựa chọn |
|---|---|
| Backend | Laravel 12 (PHP 8.3+) |
| Database | PostgreSQL 16+ (JSONB + GIN, RLS, partition khi cần) |
| ORM | Eloquent — query scopes cho workspace/visibility; raw SQL cho report nặng |
| Đa-tenant | `BelongsToWorkspace` global scope + middleware + Postgres RLS |
| Auth | Fortify/Breeze (Inertia React starter), session-based |
| Phân quyền | spatie/laravel-permission (roles) + Policies (record own/team/subtree) |
| Frontend | Inertia 2 + React + shadcn/ui + Tailwind + TanStack Table/Query |
| Jobs / Cron | Laravel Queue (Redis) + Horizon · Scheduler (SLA, alerts, forecast) |
| Realtime | Laravel Reverb (WebSocket) + Echo — live chat, presence, typing (channel auth scoped theo workspace + visibility) |
| Billing | Marketplace (add-on one-time/subscription) + entitlements; payment provider-agnostic (`payment-integration` sau) |
| Quan sát | Telescope (dev) + Sentry (prod) |
| Test | Pest (unit/feature) + Playwright (e2e) |
| Triển khai | Laravel Forge + VPS hoặc Docker |

---

## Cách dự án được xây dựng

Chó Rách Management theo một pipeline đặt **đúng domain model lên trước, code sau** — với một nguyên tắc cốt lõi: trong CRM, mô hình dữ liệu và ranh giới domain là nền móng, sai sẽ đắt nhất để sửa, nên kiến trúc và red-team luôn đi trước khi viết code.

Năm giai đoạn: **Discovery** (chốt phạm vi) → **Domain Architecture** (ERD, ranh giới, isolation) → **Red-team** (bẻ gãy thiết kế trên giấy) → **Plan** (chia phase) → **Build → Verify** (test → review → đồng bộ docs). Chi tiết: [docs/crm-build-pipeline.md](docs/crm-build-pipeline.md).

Nguyên tắc xuyên suốt: **YAGNI · KISS · DRY**.

---

## Bản đồ tài liệu

| Tài liệu | Nội dung |
|---|---|
| [docs/crm-domain-definition.md](docs/crm-domain-definition.md) | Định nghĩa CRM, thực thể, quan hệ, vòng đời, thuật ngữ |
| [docs/crm-actors-and-use-cases.md](docs/crm-actors-and-use-cases.md) | Actors, jobs-to-be-done, user stories, ma trận quyền |
| [docs/crm-business-rules.md](docs/crm-business-rules.md) | 46 quy tắc nghiệp vụ (`BR-XXX`) |
| [docs/crm-field-dictionary.md](docs/crm-field-dictionary.md) | Từ điển field đầy đủ + enums |
| [docs/system-architecture.md](docs/system-architecture.md) | **Kiến trúc**: bounded contexts, data model, isolation, RBAC, TX, async, scale, frontend |
| [docs/crm-authorization-model.md](docs/crm-authorization-model.md) | Phân quyền 2 mặt phẳng: Platform (nội bộ) + Workspace (khách) |
| [docs/crm-marketplace.md](docs/crm-marketplace.md) | Marketplace billing + entitlements (base free + add-on) |
| [docs/crm-conversations-inbox.md](docs/crm-conversations-inbox.md) | Live chat realtime, omnichannel inbox |
| [docs/crm-business-config.md](docs/crm-business-config.md) | Pipeline mặc định, enums, SLA, scoring, gói free, marketplace seed |
| [docs/crm-build-pipeline.md](docs/crm-build-pipeline.md) | Quy trình xây dựng 5 giai đoạn |
| [docs/development-roadmap.md](docs/development-roadmap.md) · [docs/project-changelog.md](docs/project-changelog.md) | Lộ trình & nhật ký thay đổi |
