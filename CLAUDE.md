# Yona

> ## ⚠️ ĐỌC TRƯỚC MỌI THỨ KHÁC
> **Yona chạy Laravel 13 + Inertia/React 19 trên `main`.** Làm thẳng trên `main`. Mốc quay lại: tag `main-truoc-rewrite`.
> - **Nguồn chuẩn kiến trúc:** `docs/system-architecture.md`. Năng lực kênh khai DUY NHẤT ở `app/Channels/CapabilitySet.php` + `DeclaresCapabilities`. Triển khai production: `docs/deployment.md`.
> - **Việc đang mở theo dõi ở Công việc của dash.yona.vn** qua MCP `yona-dash` (skill `yona-issues`), không phải trong file này và không tạo GitHub issue nữa: `list_tasks` với `tag: "P0"`.
> - Thư mục `refs/` (không theo dõi trong git) chứa mã tham khảo bên ngoài: chỉ đọc lấy ý tưởng, **CẤM** mở mọi thư mục `enterprise/` trong đó (giấy phép thương mại). Code, comment, copy, commit, task không nhắc tên nguồn; nghĩa vụ giấy phép nằm ở `THIRD_PARTY_NOTICES.md`.
> - **Làm UI bề mặt công khai:** gọi skill `yona-ui` (`.claude/skills/yona-ui/`). Nghiệm thu bằng `npm run check:ui`, không phải bằng mắt mình.
> - **KHÔNG viết test tự động, dưới mọi hình thức** (Pest, vitest, `node --test`, e2e, snapshot): không tạo tệp `*.test.*`, không tạo lại `tests/`. Founder chốt 16/10/2026: test case không nói lên vấn đề gì. **Nghiệm thu = dùng thật trên UI** như người dùng cuối (máy tính và 375px khi đụng giao diện), **có ảnh chụp trước/sau làm bằng chứng** đính kèm vào báo cáo và việc trên dash.yona.vn. Chưa có ảnh = chưa xong.
> - **DoD:** tsc + pint + i18n-check + build xanh, ảnh chụp nghiệm thu trên UI, bảng đối chiếu hành vi khi dựng tính năng từ mã tham khảo trong `refs/` (ghi ở báo cáo, không vào code), nghiệm thu trên trình duyệt như người dùng cuối. Thiếu 1 = chưa done.
> - DB dev = `yona_rw`. **Cấm** `migrate:fresh/refresh/wipe`. Cổng dev lấy từ `.env`: app **8610**, Reverb **8611**, Zalo bridge **8612**.
> - **Cấm tạo tài khoản thử trên production.** Thử luồng khách thì làm ở local (xem README, mục Chạy local).

**Repo:** github.com/locflamedia/yona · **Domain:** yona.vn · **Team:** bootstrapped, 3 dev
**Định vị:** Conversational CRM — gom tin nhắn khách từ mọi kênh chat về một hộp thư, biến hội thoại thành hồ sơ khách hàng. Marketing KHÔNG giới hạn theo một kênh cụ thể.
**Đối tượng:** SME Việt bán online — kể cả hộ kinh doanh, nhà phân phối nhỏ, kinh doanh phi chính thức.

---

## Sản phẩm hôm nay thực sự là gì (20/09/2026)

Production chạy tại https://yona.vn. Tiếng Việt đầy đủ. Repo không còn test tự động (gỡ 16/10/2026); nghiệm thu bằng UI có ảnh.

**Có thật:** hộp thư đa kênh realtime · Zalo cá nhân (QR, thu hồi hai chiều, cảm xúc, tin nhóm) · widget website + SDK · email IMAP/SMTP · nhãn, ghi chú, mention, gán việc · automation rules + macro + câu trả lời mẫu · webhook + agent bot · liên hệ, thuộc tính tùy biến, bộ lọc, import/export CSV · báo cáo + CSAT · Help Center · chiến dịch live chat · thông báo đẩy trình duyệt (Web Push, VAPID tự sinh) · 2FA, RBAC, Platform API, Super Admin.

**Widget mới và tin có cấu trúc** (26/09/2026, nhánh `feat/widget-revamp`, chờ deploy): widget có Home + 4 tab (Tin nhắn nhiều hội thoại, Trợ giúp, Cập nhật), phóng to hai cột, khách thả cảm xúc · tin có cấu trúc một lõi (`app/Messaging/Structured`, `shared/messaging`): trả lời nhanh, thẻ sản phẩm + đặt mua chọn biến thể, chọn lịch, form, tra đơn, **thẻ chuyển khoản VietQR** + đánh dấu đã nhận · kênh không có nút gốc tự hạ cấp (Zalo nhận ảnh thẻ + chữ + danh sách số, khách **trả lời bằng số**) · trang công khai theo token `/m/{token}` hạn 14 ngày · lời mời chủ động có chip · màn cấu hình Widget chat xem trước bằng widget thật. Kiến trúc: `docs/system-architecture.md` §3.

**KHÔNG có trong code — đừng viết marketing hay code dựa trên chúng:**
- **Lead, Pipeline, Deal, Task, Project** — không một bảng nào. Landing đã sửa ngày 24/09 để không hứa nữa; sửa landing thì đọc lại toàn trang để chắc không hứa lại.
- **Gói cước, thanh toán, entitlements** — chưa có gì (thẻ chuyển khoản VietQR là khách trả tiền cho shop, không phải Yona thu tiền).
- **Trợ lý AI trong widget** — chưa có bộ não; tab Trợ lý AI ở màn cấu hình chỉ ghi "Sắp ra mắt".
- **Bộ đếm hội thoại (metering)** — `MeteringService` đã bỏ khi viết lại; chỉ còn số đếm của báo cáo.
- **Messenger, Instagram, WhatsApp Cloud, TikTok** — có wizard nhưng cần Meta App + App Review đứng tên Yona (#57).

**Luồng khách lạ tự đăng ký tới màn đầu tiên** đã thông trong code (24/09/2026): website không còn bắt buộc ở onboarding, quản trị viên account chưa có hộp thư thấy màn bắt đầu (cả trên điện thoại). Còn chờ deploy. Trên production, ảnh đính kèm và trang 404 chỉ đúng sau khi sửa vhost nginx theo `docs/deployment.md` mục 7.

Ảnh rà soát giao diện: nhánh `evidence/ui-audit-260920`, file `plans/reports/ui-audit-260920-evidence.md`.

---

## Quy ước kiến trúc — ĐỌC TRƯỚC KHI VIẾT CODE

Module chia theo **chức năng**, không có module "Integration" gom đồ bên ngoài — Zalo là adapter của chức năng nhắn tin. `app/Http/` + `app/Models/` ở gốc; module chỉ chứa nghiệp vụ. Ba mặt tiền route `web.php` / `web_api.php` / `api.php` cùng gọi một lõi — mọi tính năng phải mở ra API được mà không viết lại. Thêm kênh mới = thêm driver, **không sửa lõi**. UI gom theo chức năng.

Stack: PHP 8.3+ / Laravel 13 · Inertia + React 19 (TypeScript), Tailwind + Radix — KHÔNG Vue/Next · PostgreSQL · Redis · Reverb · bridge Node cho Zalo (`services/zalo-bridge`, zca-js).

## 4 quy tắc xuyên suốt

1. **Chống trùng:** một người từ nhiều nguồn gộp thành một hồ sơ — khóa chính = số điện thoại.
2. **Phân biệt rõ:** người lạ = "Liên hệ nháp", không phải khách tiềm năng.
3. **Ghi nguồn:** mỗi hồ sơ lưu rõ đến từ kênh nào.
4. **Tôn trọng nền tảng:** chỉ gửi khi còn trong cửa sổ cho phép của kênh (vd 24h của Meta). Yona không tự chặn tin chủ động: cửa sổ 7h–22h và trần 3 tin/số/ngày đã gỡ ngày 07/09/2026, `SendRateLimiter` chỉ còn đếm.

## Quyết định đã chốt — đừng làm sai lại

- **Zalo CÁ NHÂN, không phải Zalo OA.** Không có API chính thức → QR login qua zca-js; rủi ro ToS và khóa tài khoản là có thật, phải nói trước với khách (#43).
- Hội thoại đếm **per-channel**, không gộp theo người. Cùng người trên Zalo + Messenger = 2 hội thoại.
- Bộ đếm chỉ tính khi **tenant trả lời**, không tính tin inbound.
- **Gate hạn mức đã gỡ hoàn toàn** (25/07/2026) — dùng không giới hạn, chỉ thống kê. Đừng tự dựng lại gate khi chưa có lệnh.
- **Luôn nhận inbound** — để không mất lead.
- **Không** xây module e-commerce (order/inventory/shipping). KiotViet/Sapo chỉ là nguồn làm giàu dữ liệu.
- Quyết định UX có chủ đích (khác cách làm quen thuộc của loại sản phẩm này) phải ghi `docs/ux-decisions.md`.

## Nhánh mới = worktree mới (bắt buộc với mọi phiên AI)

Nhiều phiên AI chạy song song trên cùng một checkout. Đổi nhánh trong `~/Documents/GitHub/yona` là kéo nhánh dưới chân phiên khác: cây làm việc đổi, commit bị rebase mất SHA, tiến trình đang chạy đọc nhầm mã. **Đã xảy ra thật 20/09/2026.**

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

Công việc (kanban) của dash.yona.vn qua MCP `yona-dash` (skill `yona-issues`) là nơi DUY NHẤT; không dùng GitHub Issues. Nhãn: mức độ `P0`/`P1`/`P2` · loại `type:fix|feat|docs|chore`, `ops` hạ tầng, `legal` pháp lý, `gtm` bán hàng · vùng `module:*`. Việc ngoài code nằm cùng chỗ với việc code, vì phần lớn thứ đang chặn bán hàng không nằm trong repo. **Từ 01/10/2026 phiên AI chỉ làm issue về code:** việc có thẻ `vận hành` (thủ tục nền tảng, pháp lý, giá, hợp đồng, nội dung) do founder tự lo, AI bỏ qua khi lấy việc; tạo việc thủ tục mới thì gắn thẻ này ngay.

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
| **Conversation metering** | Đếm hội thoại theo từng kênh — quyết định cho gói cước sau này; **chưa có trong code** (bỏ khi viết lại), không chặn, không tính tiền |
| **Zalo cá nhân** | Kênh chính hiện tại, không phải OA |
| ~~Lead / Pipeline / Entitlements~~ | **Chưa tồn tại trong code.** Là dự định, không phải hiện trạng |

## Preferences
- Tiếng Việt xuyên suốt.
- Trả lời kỹ thuật trực tiếp, súc tích, không vòng vo.
- Luôn tạo artifact theo dõi tiến độ khi planning.
