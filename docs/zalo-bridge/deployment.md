# Deployment — Zalo Personal Bridge

## Cấu trúc

Bridge Node.js chạy song song với Laravel app:
```
services/zalo-bridge/       ← bridge source
storage/logs/zalo-bridge/   ← pm2 logs (auto-created)
```

## Cài đặt

```bash
cd services/zalo-bridge
cp .env.example .env
# Điền secrets vào .env (xem bên dưới)
npm install
npm run pm2:start
```

## Biến môi trường

File `.env` bridge (KHÔNG commit):

```
LARAVEL_WEBHOOK_URL=http://127.0.0.1:8000/api/integrations/zalo-personal/webhook
LARAVEL_WEBHOOK_SECRET=<ZALO_BRIDGE_WEBHOOK_SECRET>   # phải khớp với Laravel
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
npm run pm2:logs     # trong bridge dir
# hoặc
pm2 logs zalo-personal-bridge
```

## CẢNH BÁO zca-js

- zca-js là thư viện **không chính thức** (reverse-engineer Zalo protocol)
- Pin version **chính xác** (không caret): `"zca-js": "2.0.0"` trong package.json
- Kiểm tra upstream thường xuyên: `npm outdated` — không auto-update khi có breaking change
- Rủi ro: ToS Zalo, nguy cơ khóa tài khoản nếu gửi quá nhiều (xem SendRateLimiter D-2)

## Health Check

```bash
# Bridge đang chạy?
curl http://127.0.0.1:3710/

# Slot status (cần connection_id)
curl "http://127.0.0.1:3710/health?connection_id=1" -H "X-Bridge-UI-Secret: <UI_SECRET>"
```
