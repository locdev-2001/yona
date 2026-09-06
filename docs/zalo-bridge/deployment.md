# Deployment — Zalo Personal Bridge

> Bản trên nhánh `rewrite/chatwoot-laravel`: đường webhook đã đổi thành
> `POST /webhooks/zalo` (cùng chỗ với webhook các kênh ngoài khác) và mỗi inbox
> Zalo giữ đúng một tài khoản — `connection_id` mà bridge dùng làm khóa slot
> chính là `channel_zalo.id`. Runbook production của nhánh `main` chưa port.

## Cấu trúc

Bridge Node.js chạy song song với Laravel app:
```
services/zalo-bridge/       ← bridge source
storage/logs/zalo-bridge/   ← pm2 logs (auto-created)
```

## Cài đặt

```bash
# Cách nhanh (từ project root): make bridge  — tự pnpm install + chạy foreground
# Hoặc thủ công (chạy nền bằng pm2):
cd services/zalo-bridge
cp .env.example .env
# Điền secrets vào .env (xem bên dưới)
pnpm install
pnpm pm2:start
```

## Biến môi trường

File `.env` bridge (KHÔNG commit):

```
LARAVEL_WEBHOOK_URL=https://yona.vn/webhooks/zalo
LARAVEL_WEBHOOK_SECRET=<ZALO_BRIDGE_WEBHOOK_SECRET>   # phải khớp với Laravel
LARAVEL_BASE_URL=https://yona.vn
BRIDGE_HTTP_HOST=127.0.0.1
BRIDGE_HTTP_PORT=3710
BRIDGE_SEND_SECRET=<ZALO_BRIDGE_SEND_SECRET>
BRIDGE_UI_SECRET=<ZALO_BRIDGE_UI_SECRET>
```

File `.env` Laravel (thêm vào `.env`):

```
ZALO_BRIDGE_URL=http://127.0.0.1:3710
ZALO_BRIDGE_WEBHOOK_SECRET=<same as above>
ZALO_BRIDGE_SEND_SECRET=<same as above>
ZALO_BRIDGE_UI_SECRET=<same as above>
```

## pm2 Log Paths

Logs ghi vào `storage/logs/zalo-bridge/` (relative từ project root).
pm2 tự tạo thư mục nếu chưa có.

Xem logs:
```bash
pnpm pm2:logs        # trong bridge dir
# hoặc
pm2 logs zalo-personal-bridge
```

## CẢNH BÁO zca-js

- zca-js là thư viện **không chính thức** (reverse-engineer Zalo protocol)
- Pin version **chính xác** (không caret): `"zca-js": "2.0.0"` trong package.json
- Kiểm tra upstream thường xuyên: `pnpm outdated` — không auto-update khi có breaking change
- Rủi ro: ToS Zalo, nguy cơ khóa tài khoản nếu gửi quá nhiều (xem SendRateLimiter D-2)

## Health Check

```bash
# Bridge đang chạy?
curl http://127.0.0.1:3710/

# Slot status (cần connection_id)
curl "http://127.0.0.1:3710/health?connection_id=1" -H "X-Bridge-UI-Secret: <UI_SECRET>"
```

`deploy.sh` kiểm tra mọi file session `c{id}.json` sau khi restart. Session
không khôi phục được sẽ được cảnh báo để scan QR lại, nhưng không giữ toàn bộ
Laravel app ở maintenance mode vì trạng thái đăng nhập Zalo là dữ liệu vận hành.
