# Yona

**Ứng dụng nhắn tin giữa bạn bè.** Nhắn riêng 1-1 và nhắn nhóm, tìm nhau bằng
`@username`, chạy trên trình duyệt và cài lên điện thoại như một ứng dụng (PWA).

Ngày 19/10/2026 Yona đổi hướng: trước đó là phần mềm hộp thư đa kênh cho doanh
nghiệp. Bản đó vẫn lấy lại được qua tag `main-truoc-chat-ban-be`. Phần code cũ
đang được gỡ dần; trong lúc gỡ, repo còn những thư mục của bản cũ (ghi rõ ở dưới).

- Định vị và thông điệp → [docs/brand-positioning.md](docs/brand-positioning.md)
- Quyết định kiến trúc → [docs/system-architecture.md](docs/system-architecture.md)
- Quyết định UX có chủ đích → [docs/ux-decisions.md](docs/ux-decisions.md)
- Việc đang mở → Công việc của dash.yona.vn
- Triển khai production → [docs/deployment.md](docs/deployment.md)

---

## Trạng thái (19/10/2026)

**Đã có trong code (trên `main`):**

- Đăng ký bằng email hoặc Google, chọn `@username` ở màn chào mừng, hồ sơ cá nhân, tìm người theo username.
- Nhắn riêng 1-1: tin chữ, trả lời trích dẫn, đã xem, đang gõ, realtime qua Reverb.
- Tin chờ cho người lạ (chấp nhận hoặc xoá), chặn, báo cáo vi phạm.
- Thông báo đẩy trên trình duyệt (Web Push, khoá VAPID tự sinh).
- Màn chat dùng lại giao diện hộp thư cũ.

**Đang dựng:** nhóm (trưởng nhóm/phó nhóm, tối đa 500 người, link mời), ảnh và
file, sticker và cảm xúc trong chat, thu hồi và sửa tin, thẻ chuyển khoản VietQR
trong chat, cài đặt dạng PWA. Chưa có gọi thoại/video.

**Đang gỡ:** toàn bộ phần CRM: hộp thư theo kênh (Zalo cá nhân, email, widget
website, Telegram…), liên hệ, báo cáo, nhân viên, automation, chiến dịch, Help
Center. Code của chúng còn trong `app/` và `routes/` cho tới khi gỡ xong.

## Tech stack

| Lớp | Công nghệ |
|---|---|
| Backend | PHP 8.4 (tối thiểu 8.3), Laravel 13 |
| Frontend | Inertia + React 19 (TypeScript), Tailwind, Vite |
| Database | PostgreSQL (extension `pg_trgm`) |
| Cache / queue / session | Redis |
| Realtime | Laravel Reverb (WebSocket) |
| Sticker | Renderer Node ở `services/sticker-renderer` |
| Zalo cá nhân | Bridge Node ở `services/zalo-bridge` (**đang gỡ**, không thuộc sản phẩm mới) |

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

Mở `http://localhost:8610/` (trang giới thiệu) rồi đăng nhập; người dùng đã đăng
nhập vào thẳng `/chat`.

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
> Tạo hai người như vậy để thử nhắn cho nhau (người thứ hai thấy tin ở Tin chờ).
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
├── Models/            Eloquent; Chat, ChatMember, ChatMessage là lõi nhắn tin
├── Services/          Nghiệp vụ; Services/Chat/ là lõi nhắn tin giữa người dùng
├── Notifications/     Thông báo (Web Push cho tin mới)
├── Jobs/ Listeners/   Việc chạy nền theo tier queue
└── Console/Commands/  super-admin:create, i18n:generate, …

routes/                web.php · web_api.php · api.php · api_public.php · channels.php · console.php
resources/js/          dashboard (màn chat dùng lại giao diện hộp thư) · chat · landing · v3 (đăng nhập/đăng ký) · superadmin · shared
lang/{en,vi}/          Nguồn i18n duy nhất
services/              sticker-renderer · zalo-bridge (đang gỡ)
```

Thư mục và module của bản CRM (`app/Channels`, `resources/js/widget`, `portal`,
`survey`, `sdk`…) còn nằm trong repo cho tới khi gỡ xong; đừng xây tính năng mới
trên chúng.

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
