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
**Định vị:** Ứng dụng nhắn tin giữa bạn bè — nhắn riêng 1-1 và nhắn nhóm, tìm nhau bằng `@username`, chạy trên trình duyệt và cài lên điện thoại (PWA). Đổi hướng ngày 19/10/2026; Yona **không còn là CRM/omnichannel**. Nguồn định vị: `docs/brand-positioning.md`.
**Đối tượng:** người Việt nhắn tin với bạn bè, gia đình, lớp học, hội nhóm. Mỗi người dùng là một cá nhân, không có doanh nghiệp/tenant.

---

## Sản phẩm hôm nay thực sự là gì (19/10/2026)

Production chạy tại https://yona.vn nhưng **vẫn là bản CRM cũ** cho tới khi deploy `main`. Deploy `main` = 3 tài khoản CRM đang dùng mất giao diện CRM, nên phải xong việc báo khách và xuất dữ liệu (phase 0 của kế hoạch đổi hướng) trước. Mốc quay lại: tag `main-truoc-chat-ban-be`. Repo không còn test tự động; nghiệm thu bằng UI có ảnh.

**Có trong code trên `main`:** đăng ký email hoặc Google (chỉ tạo user, không tạo account) · chọn `@username` ở `/chat/welcome` (chưa có thì không vào được chat) · hồ sơ `/chat/profile` · tìm người theo username · nhắn riêng 1-1 bằng chữ, trả lời trích dẫn, đã xem, đang gõ, realtime · Tin chờ cho người lạ (chấp nhận/xoá, trả lời = chấp nhận) · chặn (hiệu lực hai chiều) · báo cáo vi phạm người/hội thoại/tin · Web Push cho tin mới · `/app` chuyển về `/chat` · màn chat dùng lại y hệt giao diện hộp thư cũ · landing đã viết lại cho ứng dụng nhắn tin · kho sticker và Super Admin giữ lại. Kiến trúc lõi: `docs/system-architecture.md` mục "Lõi nhắn tin giữa người dùng".

**Đang dựng (có trong phạm vi sản phẩm, CHƯA có code chạy):** nhóm phẳng (trưởng/phó nhóm, tối đa 500 người; mới có hằng `Chat::KIND_GROUP` và bảng `conversation_invite_links`) · mời vào nhóm bằng username hoặc link · ảnh/file, sticker, cảm xúc, thu hồi, sửa tin trong chat (API gửi tin hiện chỉ nhận chữ) · thẻ chuyển khoản VietQR trong chat · cài dạng PWA đầy đủ.

**KHÔNG có và không làm ở giai đoạn này — đừng viết marketing hay code dựa trên chúng:**
- **Gọi thoại, gọi video.**
- **Bảng bạn bè / kết bạn** — nhắn tự do, người lạ vào Tin chờ.
- **Gói cước, thanh toán** — chưa có gì (thẻ VietQR là người dùng chuyển tiền cho nhau, Yona không thu tiền).
- **Mã hoá đầu cuối** — máy chủ đọc được nội dung tin.
- **App gốc iOS/Android** — Web/PWA trước.
- **Mọi thứ của CRM:** hộp thư đa kênh, Zalo cá nhân, email, widget website, Help Center, báo cáo, nhân viên/team, gán việc, CDP/liên hệ, automation, chiến dịch, nhân viên AI. Code CRM còn chạy ngầm trong `app/` và `routes/` cho tới khi gỡ xong (phase 6); không xây thêm gì trên đó.

**Pháp lý chưa xong:** Nghị định 147/2024/NĐ-CP có thể xếp ứng dụng nhắn tin có nhóm vào "mạng xã hội" (xác thực số điện thoại). Founder đang hỏi luật sư; schema có sẵn `phone` + `phone_verified_at` để thêm xác thực SMS mà không đổi lõi.

---

## Quy ước kiến trúc — ĐỌC TRƯỚC KHI VIẾT CODE

Module chia theo **chức năng**, không có module "Integration" gom đồ bên ngoài — Zalo là adapter của chức năng nhắn tin. `app/Http/` + `app/Models/` ở gốc; module chỉ chứa nghiệp vụ. Ba mặt tiền route `web.php` / `web_api.php` / `api.php` cùng gọi một lõi — mọi tính năng phải mở ra API được mà không viết lại. Thêm kênh mới = thêm driver, **không sửa lõi**. UI gom theo chức năng.

Stack: PHP 8.3+ / Laravel 13 · Inertia + React 19 (TypeScript), Tailwind + Radix — KHÔNG Vue/Next · PostgreSQL · Redis · Reverb · bridge Node cho Zalo (`services/zalo-bridge`, zca-js).

## 4 quy tắc xuyên suốt

1. **Một người = một tài khoản cá nhân, một `@username`.** Tìm nhau bằng username hoặc link mời; không cần trao số điện thoại.
2. **Người lạ vào Tin chờ:** tin đầu từ người chưa từng trò chuyện không vào danh sách chính, không gửi thông báo đẩy, cho tới khi người nhận chấp nhận hoặc trả lời.
3. **Người dùng làm chủ an toàn của mình:** chặn có hiệu lực hai chiều ở 1-1; báo cáo được người, hội thoại, tin; Super Admin xử lý báo cáo.
4. **Một đường gửi tin:** mọi tin của chat đi qua `App\Services\Chat\ChatMessageSender` (kiểm thành viên + chặn, ghi tin, cập nhật hội thoại, phát realtime, đẩy thông báo); mọi sự kiện realtime đi qua `ChatBroadcaster`. Thêm loại tin mới = thêm payload vào đường này, không mở đường gửi thứ hai.

## Quyết định đã chốt — đừng làm sai lại

- **Ứng dụng nhắn tin giữa bạn bè, không phải CRM** (19/10/2026). Đừng dựng lại hộp thư theo kênh, liên hệ, phụ trách, báo cáo cho doanh nghiệp.
- **Dùng lại bảng `conversations`/`messages`**, không đổi tên sang `legacy_*`. Hàng có `kind` (1 = 1-1, 2 = nhóm) là chat bạn bè, `account_id`/`inbox_id` để rỗng. Trả lời, thu hồi, cảm xúc dùng `content_attributes`, không có bảng `message_reactions`.
- **Model riêng `Chat`/`ChatMember`/`ChatMessage`** trên cùng bảng; không dùng `Conversation`/`Message` cho chat vì chúng mang hook CRM và hỏng khi `inbox` rỗng.
- **Màn chat dùng lại y hệt giao diện hộp thư** (`ConversationView`), không biến tấu.
- **Nhóm phẳng** như Zalo/Messenger (trưởng nhóm, phó nhóm, tối đa 500), không có server → kênh con.
- **Nhắn tự do**, không bảng bạn bè; 1-1 mỗi cặp đúng một hội thoại (`direct_key`).
- **Đăng ký bằng email hoặc Google**, không tạo account/tenant. Super Admin vẫn là một người dùng tìm thấy được qua username.
- **Giữ thẻ chuyển khoản VietQR**; bỏ thẻ sản phẩm, đặt mua, form.
- **Web/PWA trước**, app gốc sau; chưa gọi thoại/video.
- **Gate hạn mức không tồn tại** — dùng không giới hạn. Đừng tự dựng gate khi chưa có lệnh.
- Quyết định UX có chủ đích (khác cách làm quen thuộc của ứng dụng nhắn tin) phải ghi `docs/ux-decisions.md`.

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
