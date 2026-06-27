# Modular Architecture — Chó Rách CRM

> **Nguồn chuẩn kiến trúc.** Mọi docs/plans/code khác căn theo file này. Quyết định: **hand-rolled modular monolith** (không dependency ngoài) + **full modular** (mọi miền nghiệp vụ là module). Quy tắc nền: [[modular-core-extensible-architecture]] — build LÕI + mở rộng module hóa; channel/payment cắm qua contract không sửa lõi; disable 1 module không ảnh hưởng module khác.

Status: draft · Updated: 2026-06-27 · Áp dụng: **chuẩn hóa trước, code sau**.

---

## 1. Nguyên tắc

1. **Core định nghĩa contract — module hiện thực.** Lõi không bao giờ biết tên Zalo/VNPay; nó chỉ biết `ChannelDriver`, `PaymentProvider`. Thêm kênh/cổng = thêm 1 folder driver, **không sửa lõi**.
2. **Mỗi tính năng = 1 module tự chứa** trong `modules/{name}/` (models, http, services, contracts, routes, migrations, FE, tests, manifest).
3. **Cô lập:** module chỉ được phụ thuộc (a) **core**, (b) **Contracts** của module khác — **không bao giờ** Model/Service cụ thể của module khác. Giao tiếp chéo = **contract resolve từ container** hoặc **domain event**.
4. **Disable-safe:** tắt 1 module → ServiceProvider không boot, route/migration/nav không nạp, binding contract vắng mặt. Consumer phải xử lý "không có driver nào" mượt (vd inbox khi chưa kênh nào bật).
5. **Enable/disable 2 tầng:** `module.json` (bật mặc định toàn hệ) × **Entitlements** (bật theo workspace/gói). Entitlements = cơ chế gate sẵn có (xem `crm-marketplace.md`).
6. Không hard-code 1 nền tảng / 1 phương thức thanh toán.

---

## 2. Core (kernel) vs Module

**CORE — always-on, không bao giờ disable** (nền tảng kỹ thuật + trục dữ liệu):

| Core | Sở hữu | Vì sao là core |
|---|---|---|
| **platform** (kernel) | ModuleRegistry, ModuleServiceProvider loader, base contracts, event-bus, manager pattern | Bộ khung nạp/cô lập module |
| **tenancy** | Workspace, RLS (`TenantScope`), provisioning, `WorkspaceSequence`, `SettingsService` | Mọi bảng đều workspace-scoped |
| **identity** | User, Admin, Membership, Team, RBAC (spatie), Audit, impersonation | Mọi quyền/định danh dựa vào |
| **cdp** | Golden profile, identity-resolution, dedup theo SĐT | Trục trung tâm — mọi nguồn đổ vào, mọi module đọc ra |
| **shared** | custom-fields, attachments, tags, notes, comments, activity, reminders, notifications | Năng lực cross-cutting mọi module dùng (qua trait/contract) |

**MODULE — toggleable, disable-safe:**

| Module | Sở hữu | Contract phụ thuộc |
|---|---|---|
| `crm-sales` | Client, Contact, Lead, Pipeline, Convert | core, shared |
| `projects` | Project, Task, Milestone, Timer | core, shared |
| `inbox` | Conversation, Message, routing, inbox UI · **định nghĩa `ChannelDriver`** | core, cdp |
| `channel-zalo` | Zalo personal bridge driver (zca-js) · **hiện thực `ChannelDriver`** | `inbox` Contracts |
| `billing` | Plan, MarketplaceItem, WorkspacePurchase, Entitlements, metering · **định nghĩa `PaymentProvider`** | core |
| `payment-vnpay` / `payment-momo` | driver thanh toán · **hiện thực `PaymentProvider`** | `billing` Contracts |
| `announcements` | Product announcements | core |
| `email` | EmailTemplate, MergeFields, TemplatedMailer | core, shared |
| `import` (GĐ1.5) | Excel/CSV import, column map, dedup | core, cdp, crm-sales Contracts |

> Cùng người trên 2 kênh = 2 `channel-*` driver, 2 Conversation, **1 CDP profile** (cdp core dedup). Đây là lý do cdp nằm ở core, không ở inbox.

---

## 3. Cấu trúc thư mục module

```
modules/{name}/
  module.json                       # manifest
  composer.json (hoặc PSR-4 map ở root composer.json: "Modules\\{Name}\\": "modules/{name}/src/")
  src/
    Providers/{Name}ServiceProvider.php   # register binding + boot route/migration/view/event/policy
    Models/  Http/{Controllers,Requests,Middleware}/  Services/  Policies/
    Contracts/                        # interface module này PHƠI cho module khác
    Events/  Listeners/  Enums/
  database/migrations/                # migration riêng module (+ RLS theo pattern lõi)
  routes/{web,api,channels}.php
  resources/js/{pages,components}/    # Inertia FE của module
  config/{name}.php
  tests/
```

**module.json:**
```json
{
  "name": "channel-zalo",
  "version": "0.1.0",
  "enabled": true,
  "type": "feature|driver|core",
  "depends": ["inbox"],
  "provides": ["inbox.channel:zalo_personal"],
  "entitlement": "integration.zalo_personal"
}
```

**Nạp module:** `ModuleServiceProvider` (core/platform) quét `modules/*/module.json`, theo thứ tự `depends`, register `{Name}ServiceProvider` nếu `enabled`. PSR-4 khai trong `composer.json` root (autoload). Migration nạp qua `loadMigrationsFrom`, FE qua Vite glob.

---

## 4. Contracts lõi (chìa khóa "cắm vào không sửa lõi")

### 4.1 Channel (inbox)
```
Modules\Inbox\Contracts\ChannelDriver {
  channelKey(): string                     // 'zalo_personal'
  connect(ZaloConnection|...): ConnectResult
  disconnect(...): void
  sendMessage(Conversation $c, OutboundPayload $p): SentMessage
  parseInbound(array $raw): NormalizedInbound   // chuẩn hóa về 1 shape chung
}
```
- `ChannelManager` (driver-manager pattern, như Laravel `Manager`): driver tự `extend('zalo_personal', fn() => new ZaloChannelDriver)` trong ServiceProvider của `channel-zalo`.
- Inbox core chỉ gọi `ChannelManager::driver($channel)->sendMessage(...)`. **Không biết Zalo.** Thêm Messenger = module `channel-messenger` đăng ký driver mới.
- Webhook nhận tin: route ở driver, chuẩn hóa qua `parseInbound` → inbox core ghi `Conversation/Message`. Bridge Zalo (Node) thuộc `channel-zalo` (`modules/channel-zalo/services/bridge/`).

### 4.2 Payment (billing)
```
Modules\Billing\Contracts\PaymentProvider {
  key(): string                            // 'vnpay'
  createCheckout(WorkspacePurchase $p): CheckoutIntent   // redirect URL / token
  verifyCallback(Request $r): PaymentResult              // IPN/return, idempotent theo external_ref
  refund(WorkspacePurchase $p, int $amount): RefundResult
}
```
- `PaymentManager` chọn provider theo `key`. Billing core chỉ làm việc với `WorkspacePurchase` + `PaymentResult`. Thêm cổng = module `payment-x` hiện thực contract. **Lõi billing không đổi.**
- v1 (GĐ1): chỉ provider `manual` (admin cấp tay). VNPay/MoMo = thêm module sau, **không sửa billing core**.

### 4.3 Module framework
- `ModuleRegistry`: list module + trạng thái enabled (system) × entitled (workspace).
- Domain events qua Laravel event bus (`LeadCreated`, `MessageReceived`, `PurchaseGranted`…) — module nghe event module khác, **không gọi trực tiếp**.

---

## 5. Quy tắc cô lập (review sẽ chặn vi phạm)

| Cho phép | Cấm |
|---|---|
| `crm-sales` dùng `cdp` core, `shared` traits | `inbox` `use Modules\CrmSales\Models\Lead` trực tiếp |
| `inbox` gọi `ChannelManager` (contract) | `inbox` `new ZaloChannelDriver` (biết tên driver) |
| `payment-vnpay implements PaymentProvider` | `billing` `use Modules\PaymentVnpay\...` (lõi biết driver) |
| Giao tiếp chéo qua **event/contract** | import Model/Service cụ thể giữa 2 feature module |
| Module tự chứa migration + FE | sửa lõi để thêm 1 kênh/cổng |

Consumer phải chịu được module vắng: `if (! ChannelManager::hasAny()) // empty state`.

---

## 6. Chiến lược chuẩn hóa (full modular, staged — KHÔNG migrate:fresh, giữ GĐ0 xanh)

> Hiện tại: monolith phân lớp (`app/Models` 49, `app/Http` 126, `app/Services` 30, `app/Policies` 19). Di dời theo lát cắt, mỗi bước test xanh.

| Bước | Việc | Gate |
|---|---|---|
| **S0** | Scaffold `modules/` + PSR-4 + `ModuleServiceProvider` loader + `module.json` + 1 module mẫu; CI xanh (chưa move gì) | Pest+build xanh |
| **S1** | Tách 1 module lá làm proof (`announcements`) → namespace `Modules\Announcements` | test announcements xanh |
| **S2** | Core kernel: gom `tenancy` + `identity` + `cdp`(mới) + `shared` thành module core always-on | RLS/RBAC test xanh |
| **S3** | `crm-sales` (Client/Contact/Lead/Pipeline) → module | convert/dedup test xanh |
| **S4** | `projects` → module | projects/tasks test xanh |
| **S5** | `email`, các module còn lại | full suite xanh |
| **S6+** | Build GĐ1 native modular: `inbox` + `channel-zalo`, `billing` + `payment-manual` | (sang plan GĐ1) |

Mỗi bước = move file + đổi namespace + cập nhật PSR-4, **giữ nguyên behavior** (refactor thuần). RLS migration/policy không đổi nội dung, chỉ đổi vị trí + `RlsPolicyCoverageTest` whitelist path.

---

## 7. Ảnh hưởng docs/plans (cần đồng bộ sau file này)
- `docs/decisions/2026-06-27-modular-monolith.md` — ADR ghi quyết định.
- `docs/system-architecture.md` — thêm tầng module + sơ đồ core/contract.
- `docs/development-roadmap.md` — đóng khung phase theo core + module.
- `docs/crm-marketplace.md` — Entitlements = cơ chế gate module.
- `docs/feature-documentation.md` flow docs → đặt theo module.
- Plan GĐ1 (`shiny-finding-ripple` cũ) → **viết lại theo module** (inbox-core + channel-zalo; billing-core + payment-driver; cdp-core).
- README — gắn cờ lỗi thời (Account/Deal, stack).

## 8. Quyết định đã chốt (open items resolved — 2026-06-27)
- **Vị trí core:** loader/kernel glue ở `app/` trước (phase-01); gom `modules/platform` (+ tenancy/identity/cdp/shared) khi vào phase-03. Đích: core cũng là module always-on; `app/` chỉ còn glue Laravel.
- **`shared` gộp 1 module** GĐ này (custom-fields/attachments/tags/notes/comments/activity/reminders/notifications); tách từng capability sau nếu cần.
- **FE per-module:** Vite resolver glob `modules/*/resources/js/pages` + alias `@modules` (phase-01). **React (Inertia)**, KHÔNG Vue/Next.js. SSR module pages: bỏ (YAGNI).
- **PSR-4:** entry per-module trong `composer.json` gốc (`"Modules\\Inbox\\": "modules/inbox/src/"`), tường minh, không thêm merge-plugin.
- **Base `ChannelManager`/`PaymentManager`:** scaffold ở phase-07 (khi inbox/billing có domain thật), KHÔNG phase-01; phase-01 chỉ chứng minh loader bằng module `sample`.
