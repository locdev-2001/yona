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
**Định vị:** Hộp thư cá nhân đa kênh: mỗi người đăng ký có một hộp thư riêng, nhắn với người dùng Yona khác, kết nối Zalo cá nhân và Gmail/email để gom tin về một chỗ. B2C, không còn B2B (không nhân viên, team, gán việc, báo cáo). Chốt lại ngày 19/10/2026.
**Đối tượng:** người dùng cá nhân. Mỗi user = một hộp thư (một account do chính họ làm quản trị), không có thành viên bên trong.

---

## Sản phẩm hôm nay thực sự là gì (19/10/2026)

Production https://yona.vn vẫn chạy bản trước đổi hướng cho tới khi deploy `main`. Mốc quay lại: tag `main-truoc-chat-ban-be`. Repo không còn test tự động; nghiệm thu bằng UI có ảnh.

**Trên `main`:** giao diện hộp thư giữ nguyên 100% (khôi phục từ git sau một lần gỡ nhầm) · kết nối Zalo cá nhân, Gmail/email, các kênh khác như cũ · đăng ký (email/Google) tự tạo hộp thư cá nhân và kênh Yona · bắt buộc chọn `@username` ở `/chat/welcome` trước khi vào hộp thư · **kênh Yona** (`Channel::Yona`, bảng `channel_yona`): người dùng nhắn cho nhau, tin gửi từ hộp thư A thành tin đến trong hộp thư B, trả lời/cảm xúc/thu hồi/sticker/đính kèm dùng lại tính năng hộp thư · nút "Nhắn tin mới" ở đầu danh sách tìm người theo username · mỗi user chỉ vào được account mình làm quản trị (`SetCurrentAccount`) · menu ẩn phần B2B (`HIDDEN_TEAM_ITEMS` trong `menuItems.ts`), code và route vẫn còn · thẻ có cấu trúc chỉ còn VietQR · PWA mở `/app` · **nhóm giữa người dùng Yona (lõi + API, chưa có UI):** tin lưu một bản ở hội thoại gốc của account ẩn, mỗi thành viên một dòng trong hộp thư (`conversations.thread_conversation_id`, trait `SharesThread`), nghiệp vụ ở `App\Services\Groups\GroupService` (xem `docs/system-architecture.md`).

**Chưa có:** giao diện nhóm (lõi + API nhóm đã có, xem dưới) và gọi thoại/video/chia sẻ màn hình (founder mở phạm vi 20/10/2026; kế hoạch `plans/261020-group-calls-livekit/`, schema đã duyệt) · tin chờ/chặn cho người lạ trên kênh Yona · landing và `docs/brand-positioning.md` đang viết theo hướng "app nhắn tin bạn bè, bỏ kênh" (SAI), cần viết lại.

**Gọi đã chốt (20/10/2026):** nhóm chat + gọi kiểu nhóm Zalo (không phải server Discord), tin nhóm lưu một bản chung nhưng vẫn là một dòng trong hộp thư từng thành viên · nhóm tối đa 500, vai trò quản trị + thành viên, thêm trực tiếp chỉ bạn bè, link mời ai cũng vào · phòng thoại nhóm luôn mở, tối đa 25 người, không đổ chuông · gọi 1-1 có đổ chuông, chỉ giữa bạn bè · không ghi âm/ghi hình · LiveKit tự cài cùng server yona.vn, lõi cuộc gọi trung tính, LiveKit chỉ là driver.

**KHÔNG có:** gói cước, thanh toán · app gốc iOS/Android.

**Pháp lý chưa xong:** Nghị định 147/2024/NĐ-CP (founder đang hỏi luật sư); `users.phone` + `phone_verified_at` đã có sẵn.

---

## Quy ước kiến trúc — ĐỌC TRƯỚC KHI VIẾT CODE

Module chia theo **chức năng**, không có module "Integration" gom đồ bên ngoài — Zalo là adapter của chức năng nhắn tin. `app/Http/` + `app/Models/` ở gốc; module chỉ chứa nghiệp vụ. Ba mặt tiền route `web.php` / `web_api.php` / `api.php` cùng gọi một lõi — mọi tính năng phải mở ra API được mà không viết lại. Thêm kênh mới = thêm driver, **không sửa lõi**. UI gom theo chức năng.

Stack: PHP 8.3+ / Laravel 13 · Inertia + React 19 (TypeScript), Tailwind + Radix — KHÔNG Vue/Next · PostgreSQL · Redis · Reverb · bridge Node cho Zalo (`services/zalo-bridge`, zca-js).

## 4 quy tắc xuyên suốt

1. **Một người = một hộp thư cá nhân** (account do người đó làm quản trị) và một `@username`. Không có thành viên/team.
2. **Mọi tin đi qua hộp thư:** Zalo, email, người dùng Yona đều là kênh của cùng một hộp thư; thêm cách nhắn mới = thêm driver kênh, không dựng lõi chat thứ hai.
3. **Ghi nguồn:** mỗi liên hệ/hội thoại lưu rõ kênh; liên hệ kênh Yona có `source_id` = `yona:{user_id}`, tin Yona mang `source_id` = `yona-msg:{id}` ở cả hai bên.
4. **Tôn trọng nền tảng:** chỉ gửi khi còn trong cửa sổ cho phép của kênh. Luôn nhận inbound.

## Quyết định đã chốt — đừng làm sai lại

- **Giữ toàn bộ hộp thư, Zalo cá nhân, Gmail** (19/10/2026). Không bao giờ gỡ kênh, bridge Zalo, IMAP. Phần B2B chỉ ẩn khỏi menu, không xoá code.
- **Account = hộp thư cá nhân**, không đổi tên bảng; dữ liệu production giữ nguyên. Dòng thành viên cũ ở account người khác giữ trong DB nhưng không mở được.
- **Chat giữa người dùng = kênh `Channel::Yona`** trong hộp thư, gộp chung danh sách với Zalo/email. Lõi chat riêng (`Chat*`, `/chats`) đã bị gỡ.
- **Zalo CÁ NHÂN, không phải Zalo OA.** QR login qua zca-js; rủi ro ToS phải nói trước.
- **Giữ thẻ chuyển khoản VietQR**; bỏ thẻ sản phẩm, đặt mua, form.
- **Gate hạn mức không tồn tại** — dùng không giới hạn.
- Quyết định UX có chủ đích phải ghi `docs/ux-decisions.md`.

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
