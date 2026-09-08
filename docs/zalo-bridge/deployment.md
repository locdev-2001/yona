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
# Chạy nền bằng pm2 (Makefile ở gốc KHÔNG có target `bridge`):
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
BRIDGE_HTTP_PORT=8612
BRIDGE_SEND_SECRET=<ZALO_BRIDGE_SEND_SECRET>
BRIDGE_UI_SECRET=<ZALO_BRIDGE_UI_SECRET>
```

File `.env` Laravel (thêm vào `.env`):

```
ZALO_BRIDGE_URL=http://127.0.0.1:8612
ZALO_BRIDGE_WEBHOOK_SECRET=<same as above>
ZALO_BRIDGE_SEND_SECRET=<same as above>
ZALO_BRIDGE_UI_SECRET=<same as above>
```

### Host của đính kèm chiều ra (`fetch_host_not_allowed`)

Khi agent gửi ảnh/tệp, Laravel đưa cho bridge một URL tải tệp dựng từ `APP_URL`,
còn bridge chỉ tải từ những host nằm trong allowlist (fail-closed, chống SSRF).
Allowlist mặc định gồm host của `LARAVEL_WEBHOOK_URL` **và** `LARAVEL_BASE_URL`.

`APP_URL` khai host khác cả hai — kinh điển là `http://localhost:8610` trong khi
bridge nói chuyện với `127.0.0.1` — thì bridge trả HTTP 500 `fetch_host_not_allowed`;
trên Yona tin hiện lỗi **"chưa kết nối"** chứ không nói host, nên rất dễ đi tìm nhầm
chỗ. Hai cách xử lý:

- đặt `APP_URL` cùng host với `LARAVEL_BASE_URL` (khuyến nghị), hoặc
- thêm host đó vào `BRIDGE_FETCH_HOST_ALLOWLIST` (CSV) trong `.env` của bridge:

```
BRIDGE_FETCH_HOST_ALLOWLIST=localhost
```

Đổi biến này phải **khởi động lại bridge** mới có hiệu lực.

### Cờ log gỡ rối (mặc định TẮT)

Log bridge mặc định **không** chứa nội dung tin của khách. pm2 không xoay log, nên
bật những cờ dưới đây ở production là biến file log thành bản sao inbox nằm ngoài
mọi kiểm soát truy cập — chỉ bật tạm khi đang truy một lỗi cụ thể, rồi tắt.

| Biến | `=1` bật gì |
|---|---|
| `ZALO_BRIDGE_LOG_QUOTE` | Dump raw `message.data` của tin có trích dẫn (tới 16KB/tin) |
| `ZALO_BRIDGE_DEBUG_LOG` | Cờ chung — bật mọi dump raw ở trên |
| `ZALO_BRIDGE_DEBUG_FRIEND_REQUESTS` | Dump raw danh sách gợi ý kết bạn |

Từ 07/09/2026 các cờ này là **opt-in** (`ZALO_BRIDGE_LOG_QUOTE` trước đây mặc định
BẬT, chỉ tắt khi `=0`). Bật ở `NODE_ENV=production` thì bridge in cảnh báo lúc boot.
Token QR và uid Zalo trong log luôn bị che (`0f2c1a4b…`, `******7890`).

## Tự nối lại khi rớt WebSocket

Bridge tự lo phần rớt mạng, **không cần thao tác tay**:

1. `listener.start({ retryOnClose: true })` — zca-js tự thử lại với các mã đóng mà
   server Zalo cho phép.
2. Hết hạn mức nó phát `closed`; bridge nhận **mọi mã** (không chỉ 3000/3003), báo
   `bridge_session state=session_lost` về Laravel ngay để UI hiện banner, rồi tự
   đăng nhập lại từ cookie đã lưu với backoff **5s → 15s → 30s → 1m → 2m → 5m**.
3. Đăng nhập lại xong → `session_ok` + backfill gap như lần khôi phục sau restart.
4. Mã 3000/3003 (phiên bị kết nối khác chiếm) **không** nối lại — phải quét QR lại,
   nối lại chỉ đá qua đá lại với phiên kia.
5. Cookie đã bị xoá (đã gỡ kết nối qua `POST /auth/logout`) → dừng hẳn, không hẹn nữa.

Một lỗi giải mã **một** frame không còn bị coi là mất phiên (chỉ tăng bộ đếm
`frame_error`), và một exception lạc trong handler không còn giết process — nhớ là
**một** process giữ phiên Zalo của **mọi** tenant.

Theo dõi qua `/health` → khối `resilience`:

```
handler_error        handler ném lỗi (đã nuốt, không sập)
frame_error          frame giải mã hỏng (phiên vẫn sống)
unhandled_rejection  promise lạc — >0 là có đường async chưa bọc, cần truy
uncaught_exception   exception lạc — >0 là có bug thật, cần truy
relogin_scheduled / relogin_ok / relogin_failed
relogin_pending / relogin_attempt   riêng slot đang hỏi
```

`unhandled_rejection` hoặc `uncaught_exception` tăng đều = có lỗi đang bị che, phải
đọc log tìm `zalo-bridge: uncaughtException` — chốt chặn chỉ để không mất inbox của
khách, không phải để sống chung với bug.

## pm2 Log Paths

Logs ghi vào `storage/logs/zalo-bridge/` (relative từ project root).
pm2 tự tạo thư mục nếu chưa có.

Xem logs:
```bash
pnpm pm2:logs        # trong bridge dir
# hoặc
pm2 logs zalo-personal-bridge
```

## Khởi động lại bridge

Restart làm **rớt mọi phiên Zalo đang giữ** rồi khôi phục lại từ `.sessions/c{id}.json`.
Chỉ restart khi thực sự cần (đổi code bridge, đổi biến môi trường).

```bash
cd services/zalo-bridge && pnpm pm2:restart
```

Kiểm sau restart:

```bash
# 1. Sống lại chưa
curl http://127.0.0.1:8612/

# 2. Từng slot đã ready chưa (phase=ready, connected=true)
curl -s "http://127.0.0.1:8612/health?connection_id=<id>" -H "X-Bridge-UI-Secret: <UI_SECRET>" | jq '{phase, connected, session_lost_reason, resilience}'

# 3. Log khôi phục
pm2 logs zalo-personal-bridge --lines 50 | grep -E "restored session|mat phien|hen dang nhap lai"
```

Slot nào còn `session_lost` sau vài phút → cookie đã chết, phải quét QR lại từ UI
Yona. `resilience.relogin_pending=true` nghĩa là bridge đang tự thử lại, cứ chờ hết
backoff (tối đa 5 phút) rồi kiểm lại trước khi động tay.

## CẢNH BÁO zca-js

- zca-js là thư viện **không chính thức** (reverse-engineer Zalo protocol)
- Pin version **chính xác** (không caret): hiện là `"zca-js": "2.1.2"` trong `services/zalo-bridge/package.json`
- Kiểm tra upstream thường xuyên: `pnpm outdated` — không auto-update khi có breaking change
- Rủi ro: ToS Zalo, nguy cơ khóa tài khoản nếu gửi quá nhiều (xem SendRateLimiter D-2)

## Health Check

```bash
# Bridge đang chạy? — liveness, KHÔNG cần secret, không tham số
curl http://127.0.0.1:8612/

# Slot status — BẮT BUỘC secret (từ 07/09/2026 gọi thiếu secret trả 403).
# Chỉ đọc: không tạo slot, không ghi meta.
curl "http://127.0.0.1:8612/health?connection_id=1" -H "X-Bridge-UI-Secret: <UI_SECRET>"
```

Dùng `GET /` cho uptime check của pm2/nginx — `GET /health` mang uid, tên và avatar
của tài khoản Zalo nên không được để hở.

`deploy.sh` kiểm tra mọi file session `c{id}.json` sau khi restart. Session
không khôi phục được sẽ được cảnh báo để scan QR lại, nhưng không giữ toàn bộ
Laravel app ở maintenance mode vì trạng thái đăng nhập Zalo là dữ liệu vận hành.

## Kho phiên `.sessions/` — quyền tệp

Cookie trong `c{connection_id}.json` là **toàn quyền tài khoản Zalo cá nhân của
khách**: đọc được tệp là đăng nhập được, không cần OTP. Kho phiên vì thế được siết
ở đúng một cổng (`src/session-store-fs.mjs`):

- thư mục `.sessions/` → `0700`, mọi tệp bên trong → `0600`;
- mỗi lần ghi đều `chmod` lại (`mode` của `writeFile` chỉ áp khi TẠO MỚI và còn bị
  umask trừ đi);
- lúc boot, `hardenSessionStore()` siết lại tệp do bản bridge cũ ghi ra (664) và
  log `siết quyền N tệp phiên`.

Kiểm tra sau khi restart:

```bash
stat -c '%a %n' services/zalo-bridge/.sessions services/zalo-bridge/.sessions/*
# 700 .../.sessions
# 600 .../.sessions/c6.json
```

Backup `.sessions/` là backup **bí mật đăng nhập** — cùng mức bảo vệ với `.env`,
không đưa vào ảnh chụp/artifact/log.

### Mã hoá at-rest (`BRIDGE_SESSION_KEY`) — thiết kế, CHƯA thi công

Chuẩn trong repo là mã hoá bí mật kênh ở tầng lưu trữ (`bot_token` của Telegram
cast `encrypted`). Kho phiên bridge chưa theo chuẩn đó; quyền `0600` chỉ chặn user
khác trên cùng máy, không chặn backup/ảnh đĩa bị lộ. Thiết kế đề xuất:

- `BRIDGE_SESSION_KEY` = 32 byte base64 (`openssl rand -base64 32`), nạp qua env,
  KHÔNG nằm cùng thư mục `.sessions`;
- ghi: AES-256-GCM, tệp chứa `{v:1, iv, tag, data}`; đọc: thiếu trường `v` ⇒ tệp
  bản cũ (plaintext) ⇒ đọc thẳng rồi **ghi đè lại dạng đã mã hoá** (tự di trú, không
  cần thao tác tay);
- `NODE_ENV=production` mà thiếu `BRIDGE_SESSION_KEY` ⇒ **từ chối boot**, cùng chỗ
  guard đang kiểm `BRIDGE_SEND_SECRET`/`BRIDGE_UI_SECRET`;
- đổi khoá = xoá `.sessions` + quét QR lại (không có đường xoay khoá tự động).

Chưa làm vì phải restart bridge ĐANG GIỮ PHIÊN THẬT và phải đi kèm một lượt quét QR
dự phòng nếu di trú hỏng — việc này cần cửa sổ vận hành do founder chốt.

## Secret của bridge

| Biến | Dùng ở đâu | Cách gửi |
|---|---|---|
| `BRIDGE_UI_SECRET` | `/health`, mọi route UI-actions | **Chỉ header** `X-Bridge-UI-Secret` |
| `BRIDGE_SEND_SECRET` | `/send`, `/zca/*` | Header `X-Bridge-Send-Secret` |
| `BRIDGE_ELEVATED_SECRET` | thao tác nhóm rủi ro cao (`/zca/*` elevated) | Header `X-Bridge-Elevated-Secret` |
| `LARAVEL_WEBHOOK_SECRET` | bridge → Laravel | Header `X-Zalo-Personal-Bridge-Secret` |

Từ 07/09/2026:

- query string `?ui_secret=` **không còn được chấp nhận** — secret trong URL đi vào
  access log của reverse proxy, lịch sử shell và header `Referer`. Client duy nhất
  (`ZaloBridgeClient` của Laravel) và `deploy.sh` đều đã gửi header;
- mọi so sánh secret đi qua `safeEqual()` (`src/secret-compare.mjs`,
  `timingSafeEqual`) — chuỗi rỗng luôn bị từ chối, không có đường vòng khi cấu hình
  thiếu secret.

## Worker hàng đợi Laravel

Job của kênh (nhận webhook, gửi trả lời, typing, health sweep) nằm rải trên nhiều
hàng đợi — `queue:work` **không** `--queue` chỉ rút `default`, các hàng còn lại nằm
im. Thứ tự ưu tiên bám đúng `config/sidekiq.yml` của bản gốc:

```
critical, high, medium, default, mailers, low, scheduled_jobs, purgable
```

Supervisor mẫu (production):

```ini
[program:yona-worker]
command=php /var/www/yona/artisan queue:work redis
    --queue=critical,high,medium,default,mailers,low,scheduled_jobs,purgable
    --tries=3 --timeout=150 --max-time=3600 --sleep=1
autostart=true
autorestart=true
stopwaitsecs=180        ; > --timeout để job đang chạy được kết thúc tử tế
numprocs=2
user=www-data

[program:yona-scheduler]
command=php /var/www/yona/artisan schedule:work   ; nhịp tim kênh (ZaloHealthSweepJob) chạy ở đây
autostart=true
autorestart=true
user=www-data
```

**Bất biến về thời gian — sai là gửi trùng tin cho khách:**

```
zalo.bridge.media_timeout (120s)  <  worker --timeout (150s)  <  queue.redis.retry_after (180s)
```

`retry_after` nhỏ hơn `--timeout` thì Redis trả job về hàng đợi trong lúc nó **còn
đang chạy**, worker thứ hai nhặt lên và khách nhận tin hai lần. Mặc định
`REDIS_QUEUE_RETRY_AFTER` đã nâng lên 180.

Sau mỗi lần deploy hoặc mỗi lần sửa `app/**.php`:

```bash
php artisan queue:restart   # worker giữ code cũ trong RAM cho tới khi được nhắc thoát
```

Dev chạy **một** consumer duy nhất (`make up` / `make worker` → `queue:listen` đủ
tier). Hai worker song song với `--tries` khác nhau là nguồn của những lần "job chạy
hai lần, mỗi lần một hành vi" rất khó truy.
