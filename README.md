# Yona

**Conversational CRM & Automation** cho SME Việt: gom tin nhắn khách từ mọi kênh
chat về một inbox, biến hội thoại thành khách hàng, tự động hóa chăm sóc.

Codebase hiện tại là **bản viết lại toàn bộ trên Laravel + Inertia/React**, đã
merge vào `main` (08/09/2026). Mốc quay lại bản cũ: tag `main-truoc-rewrite`.

- Quyết định kiến trúc, trạng thái, việc kế tiếp → kế hoạch mới nhất trong `plans/`
- Triển khai production → [docs/deployment.md](docs/deployment.md)

---

## Trạng thái (20/09/2026)

Production đang chạy tại **https://yona.vn**. 40/40 tính năng Chatwoot đã port,
tiếng Việt đầy đủ, ~2.2k test Pest + ~800 test vitest xanh.

Nhưng **khách lạ chưa tự đi hết được từ trang chủ tới hộp thư**. Bốn nút chặn,
theo đúng thứ tự khách gặp:

| Chặn ở đâu | Vì sao | Issue |
|---|---|---|
| Đăng ký | Chưa cấu hình SMTP → thư xác nhận không bao giờ tới, mà đăng nhập lại đòi `confirmed_at` | [#36](https://github.com/locflamedia/yona/issues/36) |
| Onboarding | Website là trường bắt buộc duy nhất, thông báo lỗi không có chỗ hiện | [#62](https://github.com/locflamedia/yona/issues/62) |
| Màn hình đầu | "Liên hệ với quản trị viên của bạn" — nói với chính quản trị viên, không có nút kết nối kênh | [#63](https://github.com/locflamedia/yona/issues/63) |
| Kênh Zalo | Chưa nghiệm thu bằng tài khoản Zalo thật trên production | [#48](https://github.com/locflamedia/yona/issues/48) |

Kênh dùng được thật hôm nay: **Zalo cá nhân · widget website · email (IMAP/SMTP)**.
Telegram/LINE/Twilio chạy được nếu khách tự mang thông tin của họ. Messenger,
Instagram, WhatsApp Cloud, TikTok **chưa dùng được** — cần Meta App + App Review
đứng tên Yona ([#57](https://github.com/locflamedia/yona/issues/57)).

Ảnh rà soát giao diện kèm giải thích: [plans/reports/ui-audit-260920-evidence.md](https://github.com/locflamedia/yona/blob/evidence/ui-audit-260920/plans/reports/ui-audit-260920-evidence.md).

## Tech stack

| Lớp | Công nghệ |
|---|---|
| Backend | PHP 8.4 (tối thiểu 8.3), Laravel 13 |
| Frontend | Inertia + React 19 (TypeScript), Tailwind, Vite |
| Database | PostgreSQL (extension `pg_trgm`) |
| Cache / queue / session | Redis |
| Realtime | Laravel Reverb (WebSocket) |
| Kênh Zalo cá nhân | Bridge Node ở `services/zalo-bridge` (zca-js), PM2 |

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

Tài khoản seed: `john@acme.inc` / `Password1!`.

> **Đăng ký ở local sẽ kẹt.** `MAIL_MAILER=log` nên thư xác nhận chỉ nằm trong
> `storage/logs`, trong khi đăng nhập đòi `confirmed_at`. Tạo tài khoản thử bằng
> cách đánh dấu xác nhận sẵn:
>
> ```bash
> php artisan tinker --execute="(new App\\Builders\\AccountBuilder(accountName:'Shop thử', email:'thu@shop.test', userFullName:'Chị Hà', userPassword:'Password1!', confirmed:true))->perform();"
> ```

Super admin console (`/superadmin`):

```bash
php artisan super-admin:create ban@yona.vn --name="Tên" --password='<mật khẩu>'
```

`make help` liệt kê toàn bộ target.

---

## Gate chất lượng

```bash
make check     # pint + i18n-check + pest + tsc + vite build
```

Tách lẻ khi cần: `make format` (Pint) · `make test` (Pest, DB `yona_rw_test`) ·
`make i18n-check` · `make build` (tsc + vite) · `pnpm test` (vitest).

**i18n có một nguồn duy nhất:** `lang/{locale}/*.php`. Sửa chuỗi xong phải chạy
`make i18n` và commit `resources/js/i18n/generated/*`, nếu không deploy sẽ dừng ở
bước đối chiếu bundle.

---

## Bố cục repo

```text
app/
├── Http/              Controllers, Middleware, Requests, Resources — biên vào
├── Models/            Eloquent + morphMap cho quan hệ đa hình
├── Services/          Nghiệp vụ; Services/Zalo/ nói chuyện với bridge
├── Channels/          Khai năng lực từng kênh (CapabilitySet, DeclaresCapabilities)
├── Jobs/ Listeners/   Việc chạy nền theo tier queue
└── Console/Commands/  super-admin:create, i18n:generate, …

routes/                web.php · web_api.php · api.php · api_public.php · channels.php · console.php
resources/js/          dashboard · widget · survey · portal · superadmin · landing · sdk · v3 · shared
lang/{en,vi}/          Nguồn i18n duy nhất
services/zalo-bridge/  Bridge Node cho Zalo cá nhân
tests/                 Pest — Feature, Unit, Contracts
plans/                 Kế hoạch + báo cáo theo phiên
```

**Quy ước kiến trúc:** module chia theo **chức năng**, không gom theo "đồ bên
ngoài" — Zalo là adapter của chức năng nhắn tin, không phải "một loại tích hợp".
Lõi chỉ nói chuyện qua contract trung tính; thêm kênh mới = thêm driver, **không
sửa lõi**. Ba mặt tiền route (`web` / `web_api` / `api`) cùng gọi một lõi, nên
mọi tính năng phải mở ra API được mà không viết lại.

---

## Theo dõi việc

GitHub Issues là nơi duy nhất. Nhãn đọc theo hai trục:

- **Mức độ** — `P0` chặn khách, `P1` phải xong trước khi bán rộng, `P2` nợ chất lượng
- **Loại việc** — `type:fix` / `type:feat` / `type:docs` / `type:chore` cho việc trong code;
  `ops` hạ tầng, `legal` pháp lý & tuân thủ, `gtm` bán hàng & vận hành khách
- **Vùng** — `module:inbox` / `module:platform` / `module:marketing` / `module:billing`

Việc ngoài code (SMTP, sao lưu, giám sát, hồ sơ pháp lý, giá, tài liệu) nằm cùng
chỗ với việc code, vì phần lớn thứ đang chặn bán hàng không nằm trong repo.

## Deploy

```bash
cd /www/wwwroot/yona.vn
DEPLOY_DRY_RUN=1 ./deploy.sh   # xem trước
./deploy.sh                    # deploy thật
```

Chi tiết dựng server, Supervisor, Nginx, cron và cách dựng lại database từ đầu:
[docs/deployment.md](docs/deployment.md).
