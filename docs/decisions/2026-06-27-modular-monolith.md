# ADR 2026-06-27 — Modular Monolith (hand-rolled, full modular)

Status: **Accepted** · Date: 2026-06-27 · Liên quan: [modular-architecture.md](../modular-architecture.md), memory [[modular-core-extensible-architecture]]

## Context
- Codebase hiện là **monolith phân lớp kỹ thuật** (`app/Models` 49, `app/Http` 126, `app/Services` 30) — gom theo loại file, không theo miền. Thêm 1 kênh/cổng thanh toán = rải code khắp nơi, không disable gọn.
- Định hướng đã xoay (board 26/06): **Omnichannel + CDP + Automation** + marketplace addon (GĐ5 mở bên thứ ba). Cần **kênh (Zalo/Mess/TikTok)** và **thanh toán (VNPay/MoMo/…)** cắm vào không sửa lõi.
- Chủ dự án chốt nguyên tắc xuyên suốt: build lõi + mở rộng module hóa; disable 1 module không ảnh hưởng module khác.

## Decision
Áp **hand-rolled modular monolith** (KHÔNG dùng package ngoài), **full modular** (mọi miền nghiệp vụ thành module):
- `modules/{name}/` tự chứa (models/http/services/contracts/routes/migrations/FE/tests/manifest), PSR-4, auto-register qua `ModuleServiceProvider`.
- **Core** (always-on): platform(kernel) · tenancy · identity · cdp · shared. **Module** (toggleable): crm-sales, projects, inbox(+channel-zalo), billing(+payment-*), announcements, email, import.
- **Contract lõi**: `ChannelDriver` (inbox), `PaymentProvider` (billing) → driver cắm vào, lõi không biết tên cụ thể.
- Enable/disable 2 tầng: `module.json` × Entitlements (per-workspace).
- Cô lập: module chỉ phụ thuộc core + Contracts module khác; giao tiếp chéo qua contract/event.

## Consequences
**+** Mở rộng kênh/cổng = thêm folder driver, không sửa lõi · cô lập lỗi · sẵn sàng marketplace · test theo module.
**−** Phải reorg code GĐ0 đang chạy (staged, refactor thuần, giữ test xanh) · cần kỷ luật review chống vi phạm cô lập · FE Inertia per-module cần cấu hình Vite/page-resolver.
**Chuẩn hóa trước, code sau:** docs + plans sửa cho khớp định hướng trước khi đụng code.

## Alternatives rejected
- **nwidart/laravel-modules**: thêm dependency + convention riêng, ma sát khi di dời 49 model + RLS/2-connection tùy biến.
- **DDD bounded contexts (`src/`)**: nhiều ceremony, chậm cho team 3 dev bootstrapped.
- **Giữ layered**: phình mỗi lần mở rộng — đúng vấn đề đang né. Loại.
