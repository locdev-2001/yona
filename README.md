# Yona

**Hộp thư cá nhân đa kênh.** Ai đăng ký (email hoặc Google) cũng có ngay một hộp
thư riêng và một `@username`. Trong hộp thư đó, người dùng nhắn với người dùng
Yona khác, kết nối Zalo cá nhân (quét QR) và Gmail/email để gom mọi tin nhắn về
một chỗ. Chạy trên trình duyệt và cài lên điện thoại như một ứng dụng (PWA).

Sản phẩm dành cho cá nhân (B2C). Bản cho doanh nghiệp trước ngày 19/10/2026 lấy
lại được qua tag `main-truoc-chat-ban-be`.

- Định vị và thông điệp → [docs/brand-positioning.md](docs/brand-positioning.md)
- Quyết định kiến trúc → [docs/system-architecture.md](docs/system-architecture.md)
- Quyết định UX có chủ đích → [docs/ux-decisions.md](docs/ux-decisions.md)
- Việc đang mở → Công việc của dash.yona.vn
- Triển khai production → [docs/deployment.md](docs/deployment.md)

---

## Trạng thái (19/10/2026)

**Đã có trong code (trên `main`):**

- **Mỗi người một hộp thư.** Đăng ký đi qua `App\Services\Users\PersonalSignUpService`
  (form và Google cùng một lối), gọi `App\Services\Yona\YonaInboxes::ensureFor()`:
  `App\Services\Users\PersonalAccounts` tạo account cá nhân (người dùng làm quản trị)
  và `YonaInboxes` tạo hộp thư kênh Yona trong account đó. Người dùng cũ chưa có
  account thì được tạo khi mở `/app`.
- **Chỉ vào được hộp thư của mình:** `App\Http\Middleware\SetCurrentAccount` chỉ cho
  vào account mà người dùng làm quản trị; dòng thành viên cũ ở account người khác
  vẫn giữ trong DB nhưng không mở được.
- **`@username` bắt buộc:** chọn ở `/chat/welcome` (middleware `EnsureUsername`) trước
  khi vào `/app`; hồ sơ ở `/chat/profile`.
- **Kênh Yona** (`Channel::Yona`, model `App\Models\Channel\Yona`, bảng `channel_yona`):
  người dùng nhắn cho nhau ngay trong hộp thư. Tin gửi từ hộp thư A thành tin đến
  trong hộp thư B; trả lời trích dẫn, cảm xúc, thu hồi, sticker, ảnh/file dùng lại
  tính năng hộp thư. Nhắn người mới: nút trong danh sách hội thoại tìm người theo
  username rồi gọi `POST /api/v1/accounts/{account}/yona/conversations`.
- **Kênh ngoài giữ nguyên:** Zalo cá nhân (bridge `services/zalo-bridge`), Gmail/email
  và các kênh khác của hộp thư.
- **Tính năng hộp thư giữ nguyên:** nhãn, ghi chú riêng, câu trả lời mẫu, liên hệ, bộ
  lọc, tìm kiếm, thẻ chuyển khoản VietQR, thông báo đẩy trên trình duyệt (Web Push),
  cài đặt dạng PWA, kho sticker, console Super Admin.
- **Phần B2B ẩn khỏi menu** (`HIDDEN_TEAM_ITEMS` trong
  `resources/js/dashboard/components-next/sidebar/menuItems.ts`): nhân viên, team,
  báo cáo, chiến dịch, automation, Help Center… Code và route vẫn còn, không xây
  thêm gì trên đó.

**Chưa có:** nhóm chat giữa người dùng Yona, tin chờ và chặn cho người lạ trên kênh
Yona, gọi thoại/video, gói cước/thanh toán, app gốc iOS/Android.

## Tech stack

| Lớp | Công nghệ |
|---|---|
| Backend | PHP 8.4 (tối thiểu 8.3), Laravel 13 |
| Frontend | Inertia + React 19 (TypeScript), Tailwind, Vite |
| Database | PostgreSQL (extension `pg_trgm`) |
| Cache / queue / session | Redis |
| Realtime | Laravel Reverb (WebSocket) |
| Sticker | Renderer Node ở `services/sticker-renderer` |
| Zalo cá nhân | Bridge Node ở `services/zalo-bridge` (zca-js, đăng nhập QR) |

---

## Chạy local

Yêu cầu: PHP 8.4, PostgreSQL, Redis, Node 22, `corepack pnpm`.

```bash
make setup     # deps + .env + key + DB yona_rw/yona_rw_test + migrate + seed + build
make up        # serve + queue worker + reverb chạy nền
make status    # kiểm tra từng service
make down      # tắt hết
```

Cổng lấy **một nguồn duy nhất** từ `.env`: app `8610` (`SERVER_PORT`), Reverb
`8611` (`REVERB_SERVER_PORT`), Zalo bridge `8612`. Đừng truyền `--port` ở nơi khác.

Mở `http://localhost:8610/` (trang giới thiệu) rồi đăng nhập; `/app` chuyển vào
hộp thư cá nhân (`/app/accounts/{id}/dashboard`), `/chat` cũng chuyển về `/app`.

**Kho sticker** cần thêm renderer và queue worker: cài một lần
`corepack pnpm --dir services/sticker-renderer install`, và phải có worker chạy
(`make up` hoặc `make worker`). Không có worker thì sticker vừa upload nằm mãi ở
`processing`. Trên macOS không có `prlimit`: đặt `STICKER_RENDERER_MEMORY_LIMITER=none`
trong `.env` (các biến `STICKER_RENDERER_*` ở `.env.example`).

Tài khoản seed: `john@acme.inc` / `Password1!` (lần đầu đăng nhập sẽ được hỏi chọn username).

> **Đăng ký ở local sẽ kẹt ở bước xác nhận email.** `MAIL_MAILER=log` nên thư
> xác nhận chỉ nằm trong `storage/logs`. Tạo người dùng thử đã xác nhận sẵn:
>
> ```bash
> php artisan tinker --execute="app(App\\Services\\Users\\PersonalSignUpService::class)->signUp(email:'an@ban.test', password:'Password1!', name:'An', emailVerified:true);"
> ```
>
> Tạo hai người như vậy, chọn username cho cả hai, rồi từ hộp thư người này nhắn
> người kia: tin hiện ở hộp thư người nhận, kênh Yona.
> Đăng nhập bằng Google ở local cần `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` trong `.env`.

Super admin console (`/admin`):

```bash
php artisan super-admin:create ban@yona.vn --name="Tên" --password='<mật khẩu>'
```

`make help` liệt kê toàn bộ target.

---

## Gate chất lượng

```bash
make check     # pint + i18n-check + tsc + vite build
```

Tách lẻ khi cần: `make format` (Pint) · `make i18n-check` · `make build` (tsc + vite).
Repo không viết test tự động; nghiệm thu bằng thao tác thật trên UI (máy tính và
375px), có ảnh chụp trước/sau làm bằng chứng.

**i18n có một nguồn duy nhất:** `lang/{locale}/*.php`. Sửa chuỗi xong phải chạy
`make i18n` và commit `resources/js/i18n/generated/*`, nếu không deploy sẽ dừng ở
bước đối chiếu bundle. Ngoại lệ: lời giới thiệu của trang chủ nằm ở
`resources/js/landing/copy.ts`.

---

## Bố cục repo

```text
app/
├── Http/              Controllers, Middleware, Requests, Resources: biên vào
├── Models/            Eloquent; Models/Channel/* là các kênh của hộp thư (Yona, Zalo, Email…)
├── Channels/          Contract kênh: năng lực (CapabilitySet), kết nối, nền tảng
├── Services/          Nghiệp vụ theo chức năng; Services/Yona/ là kênh Yona, Services/Users/ là đăng ký và hộp thư cá nhân
├── Messaging/         Đường vào chung cho tin đến và sự kiện của mọi kênh
├── Notifications/     Thông báo (Web Push)
├── Jobs/ Listeners/   Việc chạy nền theo tier queue
└── Console/Commands/  super-admin:create, i18n:generate, …

routes/                web.php · web_api.php · api.php · api_public.php · channels.php · console.php
resources/js/          dashboard (hộp thư) · chat (chọn username, hồ sơ) · landing · v3 (đăng nhập/đăng ký) · superadmin · shared
lang/{en,vi}/          Nguồn i18n duy nhất
services/              sticker-renderer · zalo-bridge
```

Code của phần B2B (`resources/js/widget`, `portal`, `survey`, `sdk`, báo cáo, chiến
dịch, automation…) còn trong repo nhưng đã ẩn khỏi menu; đừng xây tính năng mới trên
chúng.

**Quy ước kiến trúc:** module chia theo **chức năng**. Ba mặt tiền route (`web` /
`web_api` / `api`) cùng gọi một lõi, nên mọi tính năng phải mở ra API được mà
không viết lại.

---

## Theo dõi việc

Công việc (kanban) của dash.yona.vn là nơi **duy nhất**; không dùng GitHub Issues.
Nhãn: mức độ `P0`/`P1`/`P2` · loại `type:fix|feat|docs|chore`, `ops` hạ tầng,
`legal` pháp lý, `gtm` ra mắt · vùng `module:*`.

## Deploy

```bash
cd /www/wwwroot/yona.vn
DEPLOY_DRY_RUN=1 ./deploy.sh   # xem trước
./deploy.sh                    # deploy thật
```

Chi tiết dựng server, Supervisor, Nginx, cron và cách dựng lại database từ đầu:
[docs/deployment.md](docs/deployment.md).
