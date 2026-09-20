# Yona

> ## ⚠️ ĐỌC TRƯỚC MỌI THỨ KHÁC
> **Codebase = bản viết lại 100% Chatwoot v4.17.1 sang Laravel + Inertia/React**, đã merge vào `main` 08/09/2026. Làm thẳng trên `main`. Mốc quay lại: tag `main-truoc-rewrite`.
> - **Nguồn chuẩn kiến trúc + việc kế tiếp:** `plans/260831-rewrite-chatwoot-laravel/plan.md`. Năng lực kênh khai DUY NHẤT ở `app/Channels/CapabilitySet.php` + `DeclaresCapabilities`. Triển khai production: `docs/deployment.md`.
> - **Việc đang mở theo dõi ở GitHub Issues**, không phải trong file này: `gh issue list --label P0`.
> - Nguồn Ruby/Vue để đối chiếu: `refs/chatwoot` — **CẤM** mở `refs/chatwoot/enterprise/`.
> - **Làm UI bề mặt công khai:** gọi skill `yona-ui` (`.claude/skills/yona-ui/`). Nghiệm thu bằng `npm run check:ui`, không phải bằng mắt mình.
> - **DoD:** Pest + vitest + tsc + pint + build xanh, bảng trace Ruby↔PHP khi port, nghiệm thu trên trình duyệt như người dùng cuối. Thiếu 1 = chưa done.
> - DB dev = `yona_rw`. **Cấm** `migrate:fresh/refresh/wipe`. Cổng dev lấy từ `.env`: app **8610**, Reverb **8611**, Zalo bridge **8612**; oracle Chatwoot podman :3000.
> - **Cấm tạo tài khoản thử trên production.** Thử luồng khách thì làm ở local (xem README, mục Chạy local).

**Repo:** github.com/locflamedia/yona · **Domain:** yona.vn · **Team:** bootstrapped, 3 dev
**Định vị:** Conversational CRM — gom tin nhắn khách từ mọi kênh chat về một hộp thư, biến hội thoại thành hồ sơ khách hàng. Marketing KHÔNG giới hạn theo một kênh cụ thể.
**Đối tượng:** SME Việt bán online — kể cả hộ kinh doanh, nhà phân phối nhỏ, kinh doanh phi chính thức.

---

## Sản phẩm hôm nay thực sự là gì (20/09/2026)

Production chạy tại https://yona.vn. 40/40 tính năng Chatwoot đã port, tiếng Việt đầy đủ, ~2.2k Pest + ~800 vitest xanh.

**Có thật:** hộp thư đa kênh realtime · Zalo cá nhân (QR, thu hồi hai chiều, cảm xúc, tin nhóm) · widget website + SDK · email IMAP/SMTP · nhãn, ghi chú, mention, gán việc · automation rules + macro + câu trả lời mẫu · webhook + agent bot · liên hệ, thuộc tính tùy biến, bộ lọc, import/export CSV · báo cáo + CSAT · Help Center · chiến dịch live chat · 2FA, RBAC, Platform API, Super Admin.

**KHÔNG có trong code — đừng viết marketing hay code dựa trên chúng:**
- **Lead, Pipeline, Deal, Task, Project** — không một bảng nào. (Trang chủ đang hứa sai: issue #35.)
- **Gói cước, thanh toán, entitlements** — chưa có gì.
- **Thông báo đẩy** — có công tắc trong cài đặt nhưng không có service worker/VAPID (#58).
- **Messenger, Instagram, WhatsApp Cloud, TikTok** — có wizard nhưng cần Meta App + App Review đứng tên Yona (#57).

**Bốn nút đang chặn khách lạ tự đi hết:** SMTP chưa có nên không ai đăng ký được (#36) → onboarding bắt buộc Website (#62) → màn hình đầu bảo chủ tài khoản đi hỏi quản trị viên (#63) → Zalo chưa nghiệm thu bằng tài khoản thật (#48).

Ảnh rà soát giao diện: nhánh `evidence/ui-audit-260920`, file `plans/reports/ui-audit-260920-evidence.md`.

---

## Quy ước kiến trúc — ĐỌC TRƯỚC KHI VIẾT CODE

Module chia theo **chức năng**, không có module "Integration" gom đồ bên ngoài — Zalo là adapter của chức năng nhắn tin. `app/Http/` + `app/Models/` ở gốc; module chỉ chứa nghiệp vụ. Ba mặt tiền route `web.php` / `web_api.php` / `api.php` cùng gọi một lõi — mọi tính năng phải mở ra API được mà không viết lại. Thêm kênh mới = thêm driver, **không sửa lõi**. UI gom theo chức năng.

Stack: PHP 8.3+ / Laravel 13 · Inertia + React 19 (TypeScript), Tailwind + Radix — KHÔNG Vue/Next · PostgreSQL · Redis · Reverb · bridge Node cho Zalo (`services/zalo-bridge`, zca-js).

## 4 quy tắc xuyên suốt

1. **Chống trùng:** một người từ nhiều nguồn gộp thành một hồ sơ — khóa chính = số điện thoại.
2. **Phân biệt rõ:** người lạ = "Liên hệ nháp", không phải khách tiềm năng.
3. **Ghi nguồn:** mỗi hồ sơ lưu rõ đến từ kênh nào.
4. **Tôn trọng luật & nền tảng:** tin chủ động chỉ 7h–22h, ≤3 tin QC/số/ngày, luôn có opt-out, chỉ gửi khi còn trong cửa sổ cho phép của kênh.

## Quyết định đã chốt — đừng làm sai lại

- **Zalo CÁ NHÂN, không phải Zalo OA.** Không có API chính thức → QR login qua zca-js; rủi ro ToS và khóa tài khoản là có thật, phải nói trước với khách (#43).
- Hội thoại đếm **per-channel**, không gộp theo người. Cùng người trên Zalo + Messenger = 2 hội thoại.
- Bộ đếm chỉ tính khi **tenant trả lời**, không tính tin inbound.
- **Gate hạn mức đã gỡ hoàn toàn** (25/07/2026) — dùng không giới hạn, chỉ thống kê. Đừng tự dựng lại gate khi chưa có lệnh.
- **Luôn nhận inbound** — để không mất lead.
- **Không** xây module e-commerce (order/inventory/shipping). KiotViet/Sapo chỉ là nguồn làm giàu dữ liệu.
- Lệch Chatwoot có chủ đích phải ghi `plans/260831-rewrite-chatwoot-laravel/reports/ux-deviations.md`.

## Nhánh mới = worktree mới (bắt buộc với mọi phiên AI)

Nhiều phiên AI chạy song song trên cùng một checkout. Đổi nhánh trong `~/Documents/GitHub/yona` là kéo nhánh dưới chân phiên khác: cây làm việc đổi, commit bị rebase mất SHA, test đang chạy đọc nhầm mã. **Đã xảy ra thật 20/09/2026.**

Luật: **phiên AI nào cần nhánh mới để code thì tạo worktree, không `git checkout -b` trong checkout chính.**

```bash
git worktree add /Users/beru/Documents/GitHub/worktrees/<slug> -b <ten-nhanh>
cd /Users/beru/Documents/GitHub/worktrees/<slug>
```

Hoặc gọi skill `ck:worktree` — nó dùng đúng gốc `/Users/beru/Documents/GitHub/worktrees` này.

- Checkout chính `~/Documents/GitHub/yona` **luôn ở `main`**; sửa lặt vặt và tài liệu thì commit thẳng trên đó.
- **Cổng dev là tài nguyên dùng chung:** 8610/8611/8612 lấy từ `.env`. Chỉ MỘT worktree được `make up` tại một thời điểm; worktree khác muốn chạy song song phải đổi `SERVER_PORT`/`REVERB_SERVER_PORT`/`ZALO_BRIDGE_URL` trong `.env` riêng của nó. **DB `yona_rw` cũng dùng chung** — worktree này migrate là worktree kia thấy ngay.
- Xong việc: merge rồi `git worktree remove <path>`, đừng để worktree chết nằm lại.
- Trước khi đụng vào checkout chính: `git worktree list` và `git status` xem có phiên khác đang làm dở không.

## Theo dõi việc

GitHub Issues, nhãn hai trục: mức độ `P0`/`P1`/`P2` · loại `type:fix|feat|docs|chore`, `ops` hạ tầng, `legal` pháp lý, `gtm` bán hàng. Việc ngoài code nằm cùng chỗ với việc code, vì phần lớn thứ đang chặn bán hàng không nằm trong repo.

## Ghi chú công cụ

Figma FigJam board (file key `YAvnMFXP9hAHb2CSaLy7sB`) — board vẫn mang tên cũ "Chó rách CRM"; mỗi lần tạo diagram là một node mới, phải xóa bản cũ thủ công.

---

# Memory

## Me
Technical founder & kỹ sư phần mềm. Nền tảng PHP/Laravel, Vue/Next.js. GitHub **locflamedia**. Dẫn team 3 dev bootstrapped; tự chạy phần lớn việc và là người định hướng sản phẩm.

## Terms
| Term | Nghĩa |
|------|-------|
| **Tenant** | Một khách hàng (doanh nghiệp) dùng SaaS, có không gian dữ liệu riêng |
| **Liên hệ nháp** | Người lạ nhắn lần đầu, chưa xác nhận nhu cầu |
| **Conversation metering** | Đếm hội thoại theo từng kênh — hiện chỉ THỐNG KÊ, không chặn, không tính tiền |
| **Zalo cá nhân** | Kênh chính hiện tại, không phải OA |
| **Oracle** | Bản Chatwoot gốc chạy podman :3000 để đối chiếu pixel |
| ~~Lead / Pipeline / Entitlements~~ | **Chưa tồn tại trong code.** Là dự định, không phải hiện trạng |

## Preferences
- Tiếng Việt xuyên suốt.
- Trả lời kỹ thuật trực tiếp, súc tích, không vòng vo.
- Luôn tạo artifact theo dõi tiến độ khi planning.
