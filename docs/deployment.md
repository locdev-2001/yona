# Triển khai Yona lên production

Runbook của `yona.vn`: Ubuntu 24.04 + aaPanel, deploy trực tiếp bằng `deploy.sh`
(không CI/CD, không release directory). Vừa là hướng dẫn dựng server mới, vừa là
quy trình deploy hằng ngày.

---

## 1. Kiến trúc production

| Thành phần | Cấu hình |
|---|---|
| OS | Ubuntu 24.04 LTS |
| App root | `/www/wwwroot/yona.vn` |
| Domain | `https://yona.vn`, `https://www.yona.vn` |
| Web server | aaPanel Nginx |
| PHP | aaPanel PHP 8.4 — `/www/server/php/84/bin/php` (tối thiểu 8.3) |
| PHP-FPM | `/etc/init.d/php-fpm-84` |
| Database | PostgreSQL 16 (aaPanel), port `5432` |
| Cache / queue / session | Redis `127.0.0.1:6379` |
| Queue | `artisan horizon` dưới Supervisor, dashboard `/horizon` |
| Realtime | Reverb dưới Supervisor, `127.0.0.1:8611` |
| Zalo bridge | PM2, `127.0.0.1:8612` |
| Scheduler | cron `* * * * *` gọi `artisan schedule:run` |
| Deploy user | `root` (chủ đích theo cấu hình aaPanel) |
| PHP runtime group | `www` |

```text
Internet ──443──▶ Nginx ──▶ public/index.php ──▶ PHP-FPM 8.4
                    └──▶ /app/<REVERB_APP_KEY>, /apps ──▶ Reverb :REVERB_SERVER_PORT (WebSocket)
Laravel ──▶ Redis ──▶ Horizon (supervisor) ──▶ worker theo tier
Laravel ◀─▶ Zalo bridge :8612 ──▶ Zalo
```

Không có Horizon và không có Inertia SSR. Frontend là bundle Vite tĩnh trong
`public/build`; mọi trang render ở client.

---

## 2. Yêu cầu hệ thống

### Phiên bản

```bash
/www/server/php/84/bin/php -v      # 8.4.x
composer --version                 # 2.x
node --version                     # 22.x
corepack pnpm --version            # 11.8.0 — lấy từ "packageManager" trong package.json
```

Luôn gọi `corepack pnpm` trong repo để dùng đúng bản đã pin, không đụng pnpm
global của dự án khác.

### PHP extensions

```text
bcmath curl dom fileinfo gd intl mbstring openssl pcntl
pdo_pgsql pgsql redis sodium xml zip Zend OPcache
```

```bash
/www/server/php/84/bin/php -m | grep -Ei 'fileinfo|opcache|pdo_pgsql|pgsql|redis|pcntl'
```

### PHP functions phải mở

aaPanel chặn sẵn trong `disable_functions` của `/www/server/php/84/etc/php.ini`.
Composer và queue worker cần:

```text
exec  putenv  proc_open  readlink  symlink
pcntl_alarm  pcntl_signal  pcntl_sigprocmask
```

Thiếu `pcntl_*` thì worker không nhận được tín hiệu dừng và
`horizon:terminate` sẽ không có tác dụng. Sau khi sửa:

```bash
/etc/init.d/php-fpm-84 reload
composer --version
```

---

## 3. Checkout repo

aaPanel đã tạo sẵn `/www/wwwroot/yona.vn`, `.user.ini`, `.well-known/` và SSL —
không xóa vhost/certificate để clone. Khởi tạo Git ngay trong thư mục có sẵn:

```bash
git config --global --add safe.directory /www/wwwroot/yona.vn
git -C /www/wwwroot/yona.vn init
git -C /www/wwwroot/yona.vn remote add origin git@github.com:locflamedia/yona.git
git -C /www/wwwroot/yona.vn fetch origin main
git -C /www/wwwroot/yona.vn switch -C main --track origin/main
```

`deploy.sh` từ chối chạy nếu working tree còn file tracked bị sửa hoặc file
untracked ngoài `.gitignore`.

---

## 4. PostgreSQL

Một database, một role runtime, **không dùng superuser `postgres`**. Schema
hiện tại không dùng Row-Level Security nên không cần role privileged thứ hai.

```bash
# Xác định đúng cụm PostgreSQL của aaPanel
ps -eo user,pid,command | grep '[p]ostgres'
sudo -u postgres /www/server/pgsql/bin/psql -d postgres -Atc "SHOW port;"
```

Tạo role + database (mật khẩu sinh ngẫu nhiên, đọc lại từ `.env` ở mục 5):

```bash
YONA_DB_PASSWORD="$(sed -n 's/^DB_PASSWORD=//p' /www/wwwroot/yona.vn/.env)"
test -n "$YONA_DB_PASSWORD" && printf "CREATE ROLE yona_app LOGIN PASSWORD '%s' NOSUPERUSER NOCREATEROLE NOREPLICATION;\n" "$YONA_DB_PASSWORD" \
  | sudo -u postgres /www/server/pgsql/bin/psql -v ON_ERROR_STOP=1 -d postgres

sudo -u postgres /www/server/pgsql/bin/createdb --owner=yona_app --encoding=UTF8 --template=template0 yona
sudo -u postgres /www/server/pgsql/bin/psql -d postgres -v ON_ERROR_STOP=1 -c "REVOKE ALL ON DATABASE yona FROM PUBLIC;"
```

`yona_app` là owner của database nên migration tự tạo/sửa được bảng; không cần
`ALTER DEFAULT PRIVILEGES`.

Sao lưu tự động do cron trên server đảm nhận, không nằm trong app. Backup tay
khi cần thêm (ví dụ trước một migration rủi ro):

```bash
sudo -u postgres /www/server/pgsql/bin/pg_dump -Fc yona > /www/backup/yona-$(date +%F-%H%M).dump
```

`pg_dump` không chứa tệp của kho sticker: bảng `stickers` chỉ giữ đường dẫn,
tệp nằm ở `storage/app/public/stickers` (disk `stickers`). Cron sao lưu phải
gom thêm thư mục này, cùng nhịp với database; khôi phục database mà thiếu tệp
thì sticker đã gửi và bảng chọn đều ra ảnh hỏng. Backup tay:

```bash
tar -C /www/wwwroot/yona.vn/storage/app/public -czf /www/backup/yona-stickers-$(date +%F-%H%M).tar.gz stickers
```

Tệp đặt theo hash nội dung nên chép chồng lên bản cũ an toàn. Đã chuyển disk
sang R2 (mục 9, "Kho sticker") thì thư mục này không còn dùng: sao lưu bucket.

### Thống kê truy vấn (`pg_stat_statements`)

**Đã bật trên production ngày 01/10/2026.** Hai bẫy của PostgreSQL do aaPanel dựng, gặp đúng lần đó:

- **Không có contrib.** Bản 18.0 do aaPanel biên dịch không kèm `pg_stat_statements.so`. Phải biên dịch từ mã
  nguồn cùng phiên bản (máy còn `/tmp/postgresql-18.0`):
  `cd /tmp/postgresql-18.0/contrib/pg_stat_statements && make USE_PGXS=1 PG_CONFIG=/www/server/pgsql/bin/pg_config install`.
  Nâng cấp PostgreSQL thì phải biên dịch lại, nếu không lần khởi động sau sẽ hỏng.
- **`RemoveIPC` của systemd-logind xoá shared memory của PostgreSQL.** `/etc/init.d/pgsql restart` chạy server
  trong phiên của user `postgres`. Phiên cuối của user đó đóng (kể cả `sudo -u postgres psql`) là logind xoá
  `/dev/shm/PostgreSQL.*`, mọi kết nối mới báo `could not open shared memory segment`. Production đã đặt
  `RemoveIPC=no` trong `/etc/systemd/logind.conf`. Dựng máy mới thì đặt trước khi restart PostgreSQL.
- `/up` không chạm DB nên trả 200 cả khi DB hỏng. Sau restart PostgreSQL, kiểm bằng
  `php artisan migrate:status` hoặc một trang có truy vấn.

Gom thời gian chạy của mọi câu SQL (đã chuẩn hoá tham số thành `$1`, `$2`) để
tìm truy vấn tốn nhất. Người có quyền root chạy, **một lần**. Bước 3 khởi động
lại PostgreSQL: vài giây mất kết nối DB, request đang chạy lúc đó trả 500, job
đang chạy có thể lỗi rồi được thử lại — chọn giờ thấp điểm.

```bash
PSQL="sudo -u postgres /www/server/pgsql/bin/psql -v ON_ERROR_STOP=1"

# 1. Kiểm tra: phiên bản, thư viện có sẵn, giá trị hiện tại.
#    aaPanel dựng PostgreSQL từ source KHÔNG kèm contrib (production 01/10/2026:
#    PG 18.0 thiếu cả hai tệp dưới). Thiếu tệp thì KHÔNG chạy bước 2: ghi
#    shared_preload_libraries trỏ tới thư viện không có làm PostgreSQL không lên
#    sau lần restart kế tiếp. Phải biên dịch contrib/pg_stat_statements từ đúng
#    mã nguồn cùng phiên bản trước. Lỡ ghi rồi thì gỡ bằng
#    ALTER SYSTEM RESET <tên> cho cả bốn tham số ở bước 2.
$PSQL -d postgres -Atc "SELECT version();"
ls "$(/www/server/pgsql/bin/pg_config --pkglibdir)/pg_stat_statements.so" \
   "$(/www/server/pgsql/bin/pg_config --sharedir)/extension/pg_stat_statements.control"
$PSQL -d postgres -Atc "SHOW shared_preload_libraries;"

# 2. Cấu hình (ALTER SYSTEM ghi vào postgresql.auto.conf, đè postgresql.conf).
#    Bước 1 in ra rỗng: chạy nguyên khối dưới. In ra khác rỗng (ví dụ `abc`):
#    giữ lại, mỗi thư viện một chuỗi riêng:
#    ALTER SYSTEM SET shared_preload_libraries = 'abc', 'pg_stat_statements';
#    (KHÔNG viết 'abc,pg_stat_statements' trong một chuỗi — Postgres coi đó là
#    MỘT tên thư viện và lần khởi động sau sẽ không lên.)
$PSQL -d postgres <<'SQL'
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
ALTER SYSTEM SET pg_stat_statements.max = 10000;
ALTER SYSTEM SET pg_stat_statements.track = 'all';
ALTER SYSTEM SET track_io_timing = on;
SQL
# Thư viện phải nạp được (ra `LOAD`) — lỗi ở đây thì RESET bốn tham số trên, không restart:
$PSQL -d postgres -c "LOAD 'pg_stat_statements';"
# shared_preload_libraries phải có pending_restart = t. pg_file_settings sẽ ghi
# "setting could not be applied" cho tham số này cho tới khi restart — đó là
# bình thường, không phải lỗi.
$PSQL -d postgres -c "SELECT name, setting, pending_restart FROM pg_settings WHERE name IN ('shared_preload_libraries','track_io_timing');"

# 3. Restart. Tìm đúng tên dịch vụ của aaPanel trước, rồi restart bằng cái có thật.
grep -n '^RemoveIPC' /etc/systemd/logind.conf    # phải là RemoveIPC=no (xem bẫy ở trên)
/etc/init.d/pgsql restart    # aaPanel không chạy PostgreSQL qua systemd, đừng dùng systemctl
$PSQL -d postgres -Atc "SHOW shared_preload_libraries;"   # phải có pg_stat_statements
cd /www/wwwroot/yona.vn && php artisan horizon:terminate   # worker mở lại kết nối DB sạch

# 4. Bật extension trong DB của app, cho role chỉ đọc xem được truy vấn của mọi role.
YONA_DB=$(grep -E '^DB_DATABASE=' /www/wwwroot/yona.vn/.env | cut -d= -f2- | tr -d "\"'")
$PSQL -d "$YONA_DB" -c "CREATE EXTENSION IF NOT EXISTS pg_stat_statements;"
$PSQL -d "$YONA_DB" -c "GRANT pg_read_all_stats TO yona_readonly;"

# 5. Kiểm tra đã chạy
$PSQL -d "$YONA_DB" -c "SELECT name, setting FROM pg_settings WHERE name IN ('shared_preload_libraries','pg_stat_statements.max','pg_stat_statements.track','track_io_timing');"
$PSQL -d "$YONA_DB" -c "SELECT count(*) AS statements, (SELECT stats_reset FROM pg_stat_statements_info) FROM pg_stat_statements;"
```

Đọc số liệu (qua tunnel chỉ đọc: `.claude/skills/yona-issues/scripts/prod-db.sh "<SQL>"`,
hoặc trên server `$PSQL -d "$YONA_DB"`). Đổi `ORDER BY` thành `calls` hay `rows`
để xem top theo số lần gọi hay số dòng trả về:

```sql
SELECT queryid,
       calls,
       round(total_exec_time::numeric, 1)                                AS total_ms,
       round(mean_exec_time::numeric, 2)                                 AS mean_ms,
       round((100 * total_exec_time / sum(total_exec_time) OVER ())::numeric, 1) AS pct_total,
       rows,
       shared_blks_hit,
       shared_blks_read,
       round(blk_read_time::numeric, 1)                                  AS io_read_ms, -- PG 17+: shared_blk_read_time
       left(regexp_replace(query, '\s+', ' ', 'g'), 300)                 AS query
FROM pg_stat_statements
WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
ORDER BY total_exec_time DESC   -- hoặc: calls DESC / rows DESC
LIMIT 20;
```

Xoá số liệu để đo lại từ đầu (chỉ superuser):
`$PSQL -d "$YONA_DB" -c "SELECT pg_stat_statements_reset();"`.
Chạy lại bước 3 của `.claude/skills/yona-issues/references/prod-db-setup.md` sau
đó vẫn an toàn: view `pg_stat_statements` không có cột bị ẩn nên role chỉ đọc
vẫn đọc được.

---

## 5. `.env` production

Lấy `.env.example` làm mốc rồi điền giá trị production:

```bash
cp --update=none /www/wwwroot/yona.vn/.env.example /www/wwwroot/yona.vn/.env
chown root:www /www/wwwroot/yona.vn/.env
chmod 640 /www/wwwroot/yona.vn/.env
```

Các giá trị `deploy.sh` kiểm tra bắt buộc:

```dotenv
APP_ENV=production
APP_DEBUG=false
APP_URL=https://yona.vn
APP_LOCALE=vi

DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=yona
DB_USERNAME=yona_app
DB_PASSWORD=

SESSION_DRIVER=redis
CACHE_STORE=redis
QUEUE_CONNECTION=redis
BROADCAST_CONNECTION=reverb

REVERB_APP_ID=
REVERB_APP_KEY=
REVERB_APP_SECRET=
REVERB_HOST=yona.vn
REVERB_PORT=443
REVERB_SCHEME=https
REVERB_SERVER_HOST=127.0.0.1
REVERB_SERVER_PORT=8611

VITE_REVERB_APP_KEY="${REVERB_APP_KEY}"
VITE_REVERB_HOST="${REVERB_HOST}"
VITE_REVERB_PORT="${REVERB_PORT}"
VITE_REVERB_SCHEME="${REVERB_SCHEME}"

REVERB_INTERNAL_HOST=127.0.0.1
REVERB_INTERNAL_PORT=8611
REVERB_INTERNAL_SCHEME=http

ZALO_BRIDGE_URL=http://127.0.0.1:8612
ZALO_BRIDGE_WEBHOOK_SECRET=
ZALO_BRIDGE_SEND_SECRET=
ZALO_BRIDGE_UI_SECRET=

# Bề mặt bán hàng. Lấy YONA_LEAD_INBOX_ID sau khi tạo hộp thư nhận lead (mục 9).
YONA_LEAD_INBOX_ID=
YONA_HOTLINE=
YONA_ZALO_CONTACT_URL=

ALLOW_PRIVATE_WEBHOOK_URLS=false

# Không bắt buộc, sai thì deploy.sh chỉ cảnh báo (xem "Phiên đăng nhập" và "Analytics" ngay dưới).
SESSION_LIFETIME=43200
SUPER_ADMIN_IDLE_MINUTES=120
REDIS_DB=0
REDIS_CACHE_DB=1

PLAUSIBLE_HOST=https://analytics.beru.io.vn
PLAUSIBLE_SCRIPT_PATH=/js/pa-wQjZXdJtBNUwcu_YEDiIb.js
PLAUSIBLE_PROXY_PATH=/yv
PLAUSIBLE_CLIENT_IP_HEADER=CF-Connecting-IP
```

> **`REVERB_INTERNAL_*` không phải thứ trang trí.** `REVERB_HOST` là tên miền
> công khai cho trình duyệt, đồng thời là `hostname` của app trong
> `config/reverb.php` — đổi nó là client không khớp nữa. Còn khi Laravel đẩy sự
> kiện, nó gọi HTTP từ chính server; để trống bộ `INTERNAL` là mỗi tin nhắn phải
> đi ra DNS, qua CDN rồi vòng về máy này. Một cú nấc DNS 10 giây đã giết 8 job
> `MessageReceived` ngày 16/09/2026 — 8 tin khách không hiện realtime mà không
> ai biết, cho tới khi Horizon phơi ra. Trỏ loopback là bỏ luôn cả DNS lẫn TLS
> cho đường nội bộ.
>
> Ba chỗ phải mang **cùng một số cổng**: `REVERB_SERVER_PORT` (Reverb nghe),
> `REVERB_INTERNAL_PORT` (Laravel gọi vào) và `proxy_pass` trong vhost Nginx
> (trình duyệt nối vào). Lệch một chỗ là realtime chết câm — giao diện vẫn chạy,
> chỉ không có tin mới. Con số cụ thể không quan trọng, khớp nhau mới quan trọng.
> Mẫu trong tài liệu này dùng `8611`; `yona.vn` hiện chạy `8080` (kiểm 24/09/2026:
> `.env` production và cả hai `proxy_pass` trong `laravel-runtime.conf` đều là 8080).

Sinh secret mà không ghi giá trị cố định vào Git:

```bash
cd /www/wwwroot/yona.vn
sed -i "s|^APP_KEY=$|APP_KEY=base64:$(openssl rand -base64 32)|" .env
sed -i "s/^DB_PASSWORD=$/DB_PASSWORD=$(openssl rand -hex 32)/" .env
sed -i "s/^REVERB_APP_ID=$/REVERB_APP_ID=$(openssl rand -hex 8)/" .env
sed -i "s/^REVERB_APP_KEY=$/REVERB_APP_KEY=$(openssl rand -hex 16)/" .env
sed -i "s/^REVERB_APP_SECRET=$/REVERB_APP_SECRET=$(openssl rand -hex 32)/" .env
sed -i "s/^ZALO_BRIDGE_WEBHOOK_SECRET=$/ZALO_BRIDGE_WEBHOOK_SECRET=$(openssl rand -hex 32)/" .env
sed -i "s/^ZALO_BRIDGE_SEND_SECRET=$/ZALO_BRIDGE_SEND_SECRET=$(openssl rand -hex 32)/" .env
sed -i "s/^ZALO_BRIDGE_UI_SECRET=$/ZALO_BRIDGE_UI_SECRET=$(openssl rand -hex 32)/" .env
```

Biến `VITE_*` được nướng vào bundle lúc build, nên đổi chúng thì phải build lại
(chạy `deploy.sh`), không chỉ `optimize:clear`.

### Giới hạn kích thước sự kiện realtime (Reverb)

Laravel đẩy mỗi sự kiện realtime (thông báo, đang gõ, cập nhật hội thoại) tới
Reverb bằng một lượt POST. Lượt nào vượt `REVERB_MAX_REQUEST_SIZE` bị Reverb đóng
với 413 và sự kiện mất lặng lẽ: job `ActionCableBroadcastJob` hỏng với
`Pusher error: Payload too large.`, nhân viên không thấy chuông, số chưa đọc hay
"đang gõ" cho tới khi tải lại trang. Mặc định cũ 10 000 byte quá hẹp: payload mang
cả hội thoại lẫn tin cuối (tin cuối lặp 2–3 lần), chữ tiếng Việt còn phình khi mã
hoá JSON hai lần.

Đo trên hội thoại Zalo dựng thử (byte của cả lượt POST):

| Hội thoại | `conversation.updated` | `conversation.typing_on` | `notification.created` |
|---|---|---|---|
| Tin ngắn, 1 ảnh | 6 266 | 6 489 | 9 117 |
| Album 10 ảnh | 16 075 | 16 310 | 23 839 |
| Tin 1 500 ký tự, album 10 ảnh, 12 nhãn | 28 463 | 28 682 | 42 302 |
| Tin 4 000 ký tự, album 20 ảnh, 12 nhãn | 60 732 | 60 949 | 90 690 |

Tin chữ dài (email, tin dán cả đơn hàng) nặng hơn album: tin cuối lặp ba lần
trong thông báo, mỗi ký tự tiếng Việt có dấu thành 7 byte sau hai lần mã hoá.
Đo trên hội thoại Zalo của DB dev, chỉ có chữ, phát thật tới Reverb:

| Độ dài tin | `conversation.updated` | `conversation.typing_on` | `notification.created` | Ở ngưỡng 128 KB cũ |
|---|---|---|---|---|
| 10 000 ký tự | 86 777 | 87 021 | 130 234 | lọt, sát ngưỡng |
| 12 000 ký tự | 103 441 | 103 685 | 155 230 | thông báo 413 |
| 20 000 ký tự | 170 217 | 170 461 | 255 394 | cả ba 413 |
| 40 000 ký tự | 337 145 | 337 389 | 505 786 | cả ba 413 |
| 45 000 ký tự | 378 841 | 379 085 | 568 330 | cả ba 413; thông báo vẫn 413 ở 512 KB |

Mặc định trong `config/reverb.php`:

| Biến | Mặc định | Vì sao |
|---|---|---|
| `REVERB_MAX_REQUEST_SIZE` | `10485760` (10 MB) | Phủ tin dài nhất được lưu (150 000 ký tự, `Message::MAX_CONTENT_LENGTH`): theo bảng trên thông báo tăng khoảng 12,6 byte mỗi ký tự, nên tin 150 000 ký tự khoảng 1,9 MB, tin toàn chữ có dấu khoảng 3 MB. Người gọi hợp lệ duy nhất là Laravel qua loopback; lượt POST phải ký bằng app secret, lượt không ký bị từ chối |
| `REVERB_APP_MAX_MESSAGE_SIZE` | `65536` (64 KB) | Chỉ áp khung WebSocket trình duyệt gửi lên (đăng ký kênh, client event), không phải sự kiện server phát xuống. Không gây lỗi trên, nâng cho đủ dư |

**Payload vẫn nặng.** Ngưỡng 10 MB phủ mọi tin lưu được, nhưng một tin dài vẫn
đẩy hàng trăm KB tới mỗi nhân viên cho mỗi sự kiện. Cách chữa tận gốc là thu gọn
payload (không lặp tin cuối, không mang cả nội dung tin dài trong thông báo, mã hoá
JSON không escape unicode); việc này còn mở. Nếu `.env` production có ghi cứng
`REVERB_MAX_REQUEST_SIZE` thì sửa cả ở đó, rồi `php artisan reverb:restart`.

`.env` production chưa khai hai biến thì mặc định có hiệu lực ngay sau
`deploy.sh` (script cache lại config và `reverb:restart`). Đã khai giá trị nhỏ hơn
thì sửa rồi chạy lại:

```bash
cd /www/wwwroot/yona.vn
grep -E '^REVERB_(MAX_REQUEST_SIZE|APP_MAX_MESSAGE_SIZE)=' .env
php artisan config:cache && php artisan reverb:restart
php artisan tinker --execute="dump(config('reverb.servers.reverb.max_request_size'), config('reverb.apps.apps.0.max_message_size'));"
```

Sau khi sửa, job hỏng cũ vẫn nằm trong `failed_jobs`. Không `retry` (sự kiện đã lỗi
thời): xoá đúng loại job này, rồi theo dõi không còn job mới:

```bash
php artisan tinker --execute="dump(DB::table('failed_jobs')->where('payload', 'like', '%ActionCableBroadcastJob%')->where('exception', 'like', '%Payload too large%')->count());"
php artisan tinker --execute="dump(DB::table('failed_jobs')->where('payload', 'like', '%ActionCableBroadcastJob%')->where('exception', 'like', '%Payload too large%')->delete());"
```

### Phiên đăng nhập

- Nhân viên giữ đăng nhập **30 ngày tính từ lần thao tác cuối**
  (`SESSION_LIFETIME=43200` phút, trượt: mỗi request gia hạn phiên và cookie).
  Còn `120` là ai không thao tác quá 2 giờ (gập máy qua đêm) sẽ bị đăng xuất.
- Console `/admin` (cùng `/horizon`, `/pulse`, `/logs`) dùng chung
  cookie phiên nhưng tự đăng xuất sau `SUPER_ADMIN_IDLE_MINUTES` không thao tác
  trong vùng quản trị. Phiên nhân viên trên cùng trình duyệt không bị ảnh hưởng.
- Phiên nằm ở Redis DB `REDIS_DB` (kết nối `default`), cache ở `REDIS_CACHE_DB`.
  **Hai số phải khác nhau** và `SESSION_CONNECTION` để trống: `deploy.sh` chạy
  `optimize:clear`, lệnh này flush cả DB của cache, nên phiên nằm chung DB là mỗi
  lần deploy đăng xuất mọi người. `deploy.sh` cảnh báo khi hai số trùng.
- Thu hồi một thiết bị (Hồ sơ → Phiên đăng nhập, hoặc màn chọn phiên khi chạm
  trần `MAX_USER_SESSIONS`) xoá key phiên trên Redis và dòng `user_sessions`, nên
  thiết bị đó văng ra ở request kế tiếp. Dòng `user_sessions` của phiên hết hạn tự
  nhiên được `model:prune` dọn lúc 03:10 mỗi ngày (scheduler, mục 8).
- Redis nên bật lưu đĩa (`appendonly yes` hoặc `save`). Không bật thì restart
  Redis hay reboot máy là đăng xuất tất cả. Có đặt `maxmemory` thì dùng
  `maxmemory-policy volatile-lru` (key phiên luôn có TTL). Đây là thao tác hạ tầng,
  hỏi founder trước khi đổi.
- Deploy bản này không đá ai: key phiên cũ giữ TTL 2 giờ tới request kế tiếp rồi
  được ghi lại với TTL mới. Không đổi `SESSION_COOKIE`, `APP_KEY`.

**Việc cho người có quyền máy chủ, làm trước khi đổi `SESSION_LIFETIME`** (chỉ đọc,
ghi kết quả vào task trên dash):

```bash
cd /www/wwwroot/yona.vn
grep -E '^(SESSION_|REDIS_DB|REDIS_CACHE_DB|REDIS_CACHE_CONNECTION)' .env
redis-cli CONFIG GET maxmemory
redis-cli CONFIG GET maxmemory-policy
redis-cli CONFIG GET save
redis-cli CONFIG GET appendonly
redis-cli INFO memory | grep used_memory_human
redis-cli INFO keyspace
# Key phiên nằm ở DB REDIS_DB (mặc định 0), tên = REDIS_PREFIX + CACHE_PREFIX + id phiên
# (mặc định "<app>-database-<app>-cache-<id>"); Horizon cùng DB nhưng tiền tố khác.
redis-cli -n 0 --scan --pattern '*cache-*' | head -5
redis-cli -n 0 --scan --pattern '*cache-*' | wc -l
redis-cli -n 0 MEMORY USAGE '<một key phiên mẫu>'
```

Ước lượng sau 30 ngày = số key phiên hiện tại × 360 (30 ngày / 2 giờ; con số trần
vì bot ghé landing cũng tạo phiên) × dung lượng trung bình một key. Dưới khoảng
300 MB và máy còn RAM thì giữ 30 ngày, đặt `maxmemory` + `volatile-lru`; lớn hơn thì
hạ `SESSION_LIFETIME` xuống `20160` (14 ngày) và báo founder.

### Đăng nhập console quản trị

- Super admin đăng nhập `/admin/sign_in` bằng email và mật khẩu; không yêu cầu
  cấu hình hoặc xác thực 2FA, kể cả tài khoản đã bật 2FA trước đây.
- `/admin/*`, `/horizon`, `/pulse`, `/logs` không chuyển super admin sang màn
  cài đặt 2FA. Dữ liệu 2FA đã lưu được giữ nguyên; 2FA của tài khoản người dùng
  thường vẫn hoạt động như trước.
- Bước mật khẩu throttle 5 lần/phút theo cặp email+IP.
- Đăng nhập hộ (`Impersonate user` trên trang chi tiết user) từ bản này bắt
  buộc nhập lý do (tối thiểu 10 ký tự) và ghi vào bảng
  `super_admin_impersonations` (ai, hộ ai, IP, user agent, thời điểm token SSO
  thật sự được tiêu thụ). Xem lại nhật ký ở mục "Super Admin Impersonations"
  trên thanh điều hướng console, lọc bằng `?super_admin_id=` trên URL.

### Analytics

- Script và sự kiện Plausible đi qua **chính domain app**: `GET /yv/s` (script) và
  `POST /yv/e` (sự kiện), route Laravel trong `routes/api.php` (nhóm `api`: không
  session, không cookie, không CSRF). Trình chặn quảng cáo không chặn được vì không
  còn domain analytics bên thứ ba hay mẫu `/api/event`, `pa-*.js` trong trang.
- Không cần `location` nginx. Đường dẫn cố ý không có đuôi `.js` để rule tĩnh
  `location ~ .*\.(js|css)?$` của aaPanel không nuốt nó.
- `PLAUSIBLE_HOST` hoặc `PLAUSIBLE_SCRIPT_PATH` trống = trang không gắn analytics và
  hai route trả 404. `PLAUSIBLE_PROXY_PATH` đổi được nếu một danh sách chặn bắt
  được `/yv`.
- `PLAUSIBLE_CLIENT_IP_HEADER=CF-Connecting-IP` **bắt buộc** khi app đứng sau
  Cloudflare. Máy chủ gửi IP khách sang Plausible bằng header `X-Plausible-IP`;
  thiếu biến này thì IP gửi đi là IP edge Cloudflare, mọi khách gộp thành một
  hoặc bị Plausible loại vì IP máy chủ.
- Đổi biến `PLAUSIBLE_*` thì chạy lại `deploy.sh` (hoặc `php artisan optimize`)
  vì config và route đã được cache.
- Kiểm tra sau deploy (`deploy.sh` tự kiểm `/yv/s` khi `DEPLOY_HEALTHCHECK=1`):

  ```bash
  curl -sI https://yona.vn/yv/s
  # mong đợi: 200, content-type: application/javascript, KHÔNG có set-cookie
  ```

  Sự kiện thì kiểm trên trình duyệt thật (DevTools → Network, lọc `yv`): `e` trả
  **202** và response **không** có header `x-plausible-dropped`. Có header đó nghĩa
  là Plausible nhận nhưng loại sự kiện (thường do IP khách sai → xem
  `PLAUSIBLE_CLIENT_IP_HEADER`). Không bắn sự kiện thử bằng `curl` lên production:
  nó thành lượt xem thật.
- yona.vn không gửi `Content-Security-Policy`. Nếu sau này thêm CSP thì `'self'`
  đã phủ cả `script-src` lẫn `connect-src` cho analytics.
- Mỗi sự kiện chiếm một worker PHP-FPM khoảng một lần gọi HTTPS ra ngoài (timeout
  5 giây, giới hạn 300 sự kiện/phút mỗi IP). Nếu thành nút nghẽn thì chuyển sang
  `location` nginx với **cùng đường dẫn công khai**, trang không phải đổi gì.

---

## 6. Zalo bridge

```bash
cd /www/wwwroot/yona.vn/services/zalo-bridge
cp --update=none .env.example .env
chmod 600 .env
```

Ba secret phải **trùng** với Laravel `.env` — không sinh bộ thứ hai:

```bash
cd /www/wwwroot/yona.vn
for pair in "ZALO_BRIDGE_WEBHOOK_SECRET:LARAVEL_WEBHOOK_SECRET" \
            "ZALO_BRIDGE_SEND_SECRET:BRIDGE_SEND_SECRET" \
            "ZALO_BRIDGE_UI_SECRET:BRIDGE_UI_SECRET"; do
    value="$(sed -n "s/^${pair%%:*}=//p" .env)"
    sed -i "s|^${pair##*:}=.*|${pair##*:}=$value|" services/zalo-bridge/.env
done
```

Còn lại trong `services/zalo-bridge/.env`:

```dotenv
LARAVEL_WEBHOOK_URL=https://yona.vn/webhooks/zalo
LARAVEL_BASE_URL=https://yona.vn
BRIDGE_HTTP_HOST=127.0.0.1
BRIDGE_HTTP_PORT=8612
BRIDGE_ELEVATED_SECRET=
BRIDGE_SESSION_KEY=
```

`deploy.sh` bắt `BRIDGE_HTTP_HOST=127.0.0.1`, `LARAVEL_WEBHOOK_URL` phải là
HTTPS, và `BRIDGE_SESSION_KEY` phải có giá trị. Bridge không bao giờ expose
thẳng ra Internet. `BRIDGE_ELEVATED_SECRET`
để trống = không bao giờ cho phép nhóm method destructive (fail-closed).

`ZALO_CUSTOM_STICKER_LAYOUT` (tuỳ chọn, mặc định `ai`) chọn dạng tin khi gửi
sticker tự tạo của Yona sang Zalo: `ai` gửi như sticker AI của Zalo
(`pStickerType` trong `jcp`) với ảnh đã đưa lên CDN Zalo (JPEG nền trắng; Zalo
Web tải ảnh sticker AI bằng `fetch()` và CSP `connect-src` của chat.zalo.me chặn
mọi miền ngoài Zalo, nên URL của yona.vn hiện trống trên Web); riêng `webp.url`
giữ tệp WebP gốc trên yona.vn vì app điện thoại vẽ sticker AI từ trường đó bằng
bộ giải mã WebP (trỏ JPEG thì điện thoại để trống). Đưa lên hỏng thì
tự gửi như `ai_direct`; `ai_direct` là sticker AI trỏ thẳng URL của yona.vn
(desktop hiện, Web trống); `plain` là ảnh không viền không `contentId`/`webp`;
`photo` là dạng PNG cũ (Web hiện, desktop mặt cười xám). Đổi xong chạy
`pm2 restart zalo-personal-bridge --update-env`.

### Mã hoá at-rest kho phiên (`BRIDGE_SESSION_KEY`)

Cookie trong `.sessions/c{id}.json` là toàn quyền tài khoản Zalo cá nhân của
khách — quyền tệp `0600` (mục "Kho phiên .sessions/" phía dưới) chỉ chặn user
khác trên cùng máy, không chặn backup/ảnh đĩa bị lộ. Từ bản này, bridge mã hoá
AES-256-GCM mọi tệp ghi vào `.sessions/` khi có `BRIDGE_SESSION_KEY`:

```bash
# Sinh khoá 32 byte MỘT LẦN, lưu như secret khác (không commit, không log):
openssl rand -base64 32
```

Dán giá trị vào `services/zalo-bridge/.env`:

```dotenv
BRIDGE_SESSION_KEY=<chuoi-openssl-vua-sinh>
```

- **Thiếu khoá CHẶN boot ở production**: bridge từ chối khởi động thay vì ghi
  phiên dạng plaintext. Cũng chặn boot nếu khoá **sai định dạng** (đặt rồi
  nhưng không phải 32 byte base64/hex), hoặc nếu có tệp phiên đã mã hoá trên
  đĩa mà khoá hiện tại/cũ không giải mã được — chặn ở đây thay vì âm thầm đánh
  dấu từng tenant `session_lost` một.
- **Di trú tệp cũ**: không cần thao tác tay. Tệp phiên ghi từ trước (plaintext)
  vẫn đọc được bình thường; ngay lần đọc đó (khôi phục phiên lúc bridge khởi
  động, hoặc lần ghi kế tiếp) bridge tự ghi đè lại dạng đã mã hoá.
- **Xoay khoá**: đặt khoá mới vào `BRIDGE_SESSION_KEY`, khoá cũ chuyển sang
  `BRIDGE_SESSION_KEY_PREVIOUS` rồi restart. Bridge mã hoá tệp MỚI bằng khoá
  mới, giải mã tệp cũ qua khoá cũ, và **ghi đè lại ngay bằng khoá mới** ở lần
  đọc đó. Sau một chu kỳ restart (mọi phiên đã được đọc lại ít nhất một lần),
  có thể bỏ `BRIDGE_SESSION_KEY_PREVIOUS` — phiên nào chưa được đọc lại lúc đó
  vẫn giải mã hỏng nếu bỏ khoá cũ quá sớm.
- Kiểm tra đã mã hoá: `cat services/zalo-bridge/.sessions/c<id>.json` phải ra
  JSON `{"v":1,"iv":"...","tag":"...","data":"..."}`, không phải cookie thô.

### Sống sót qua reboot

`deploy.sh` tự đăng ký pm2 vào systemd (`pm2 startup systemd` + `pm2 save`) cho
đúng user đang chạy deploy, và bỏ qua nếu unit đã tồn tại. Nếu deploy bằng user
không phải root, script in ra lệnh `sudo pm2 startup …` cần chạy một lần.

Nếu máy đã có unit `pm2-*` của user khác, script cảnh báo — hai daemon pm2 cùng
dựng bridge là chạy trùng.

Kiểm tra: `systemctl is-enabled pm2-root`.

### Hạn mức phiên đồng thời

Một process bridge giữ phiên WebSocket Zalo của **mọi** tenant trong RAM cùng
lúc. `session-cap.mjs` cố định `MAX_SESSIONS = 50` (chưa có dữ liệu RAM/phiên
thật để đưa thành biến cấu hình). Vượt hạn mức: `POST /auth/qr/start` trả `429
{code: "session_cap_reached"}` (dịch tiếng Việt ở `lang/vi/inbox_mgmt.php`).
Phiên đã kết nối từ trước không bị chặn — chỉ chặn mở phiên QR MỚI.

Kiểm tra: `curl -s -H "X-Bridge-UI-Secret: $BRIDGE_UI_SECRET" http://127.0.0.1:8612/health`
trả khối `bridge: {active_sessions, max_sessions, rss_bytes}`.

### Ảnh thẻ cho kênh không có dạng gốc (`POST /render/card`)

Zalo cá nhân không có nút/thẻ gốc: thẻ sản phẩm, tra đơn, mở trang, bài viết được
gửi thành ảnh PNG kèm bản chữ. Ảnh vẽ trong chính tiến trình bridge bằng `satori` +
`@resvg/resvg-js` (không Chromium, không service mới).

- Phụ thuộc cài cùng bridge ở bước `pnpm --dir services/zalo-bridge install --prod`
  của `deploy.sh`; `@resvg/resvg-js` tải binary dựng sẵn cho linux-x64, không cần
  build tools. Font Be Vietnam Pro nằm sẵn trong `services/zalo-bridge/assets/fonts/`.
- Laravel gọi bằng `ZALO_BRIDGE_URL` + `ZALO_BRIDGE_SEND_SECRET` đã có, hết giờ 3 giây;
  lỗi thì gửi chữ như cũ và ghi log `messaging.delivery.degraded` với `level: image_failed`.
- Ảnh cache trên disk `public` ở `storage/app/public/card-images/` (cần
  `php artisan storage:link` như ảnh đính kèm). Lịch `messaging:prune-card-images`
  chạy 03:40 hằng ngày xoá ảnh cũ hơn 30 ngày (kênh đã tải ảnh về lúc gửi; thẻ gửi
  lại thì vẽ lại). Chạy tay: `php artisan messaging:prune-card-images --dry-run`.
- Ảnh sản phẩm chỉ được tải từ địa chỉ công khai, không theo chuyển hướng. Máy
  local ảnh nằm ở 127.0.0.1 thì đặt trong `services/zalo-bridge/.env`:

```dotenv
CARD_RENDER_ALLOW_PRIVATE_MEDIA=1   # chỉ local; production để 0
```

### Gửi video dạng video gốc: ffmpeg + ffprobe

Video nhân viên gửi cho khách Zalo đi thành video phát được (khách thấy khung
phát kèm ảnh bìa và thời lượng) chỉ khi máy chạy bridge có `ffmpeg` và `ffprobe`:
bridge dùng `ffprobe` đo thời lượng + kích thước và `ffmpeg` cắt một khung làm
ảnh bìa. Thiếu một trong hai thì video vẫn tới khách nhưng thành **tệp** phải
tải về, như trước.

| Loại tệp | Đi đường nào |
|---|---|
| `.mp4` | Video gốc |
| `.mov` (video quay trên iPhone) | Đổi vỏ sang mp4 bằng `ffmpeg -c copy` (không mã hoá lại, thường dưới một giây), rồi đi video gốc. Đổi vỏ lỗi (vd video ProRes, mp4 không chứa được) thì gửi nguyên tệp `.mov` |
| Loại khác (`.webm`, `.mkv`, `.avi`…) | Tệp, như trước |

Đổi vỏ giữ nguyên mã hình: video iPhone quay ở chế độ "Hiệu quả cao" vẫn là HEVC.
Zalo trên máy quá cũ không giải được HEVC thì khách thấy khung video nhưng không
phát được; gặp phản ánh như vậy thì tắt video gốc (bên dưới).

```bash
# Ubuntu/Debian (aaPanel): cài một lần, không cần khởi động lại gì ngoài bridge
apt-get install -y ffmpeg
# Chạy được bằng đúng user chạy pm2 của bridge
ffmpeg -version | head -1 && ffprobe -version | head -1
```

Không nằm trong `PATH` của user chạy pm2 thì trỏ thẳng trong
`services/zalo-bridge/.env`:

```dotenv
FFMPEG_PATH=/usr/bin/ffmpeg
FFPROBE_PATH=/usr/bin/ffprobe
```

Bridge đọc `.env` và dò hai công cụ **một lần lúc khởi động**. Cài ffmpeg xong hay
sửa `services/zalo-bridge/.env` xong thì nạp lại bridge bằng đúng lệnh `deploy.sh`
dùng. `pm2 restart <tên>` giữ env đã lưu lúc khởi động, nên biến đã có từ trước
không nhận giá trị mới trong `.env`:

```bash
cd /www/wwwroot/yona.vn
corepack pnpm --dir services/zalo-bridge exec pm2 startOrReload \
    /www/wwwroot/yona.vn/services/zalo-bridge/ecosystem.config.cjs --update-env
grep 'zalo-bridge:send-video' storage/logs/zalo-bridge/out.log | tail -1
# mong đợi: [zalo-bridge:send-video] {"native_video":true,"enabled":true}
```

Nạp lại bridge làm mọi phiên Zalo nối lại, giống lúc deploy.

Một video rơi về đường tệp để lại một dòng cảnh báo cùng thẻ trong `error.log`,
có `message_id` và bước hỏng (`disabled`, `tools_missing`, `not_mp4`, `remux`,
`probe`, `thumbnail`, `upload_video`, `upload_thumbnail`, `send_video`), không
có URL hay nội dung tin.

**Tắt nhanh khi có sự cố.** Khách báo video không phát được, hoặc `error.log`
dồn dập `send_video`: đặt công tắc trong `services/zalo-bridge/.env` rồi nạp lại
bridge bằng lệnh trên. Mọi video đi đường tệp như trước khi có tính năng này,
không dò ffmpeg.

```dotenv
ZALO_NATIVE_VIDEO=0
```

- Log khởi động thành `{"native_video":false,"enabled":false}`.
- Mỗi video gửi đi để lại một dòng bước `disabled`.
- Bật lại: đặt `ZALO_NATIVE_VIDEO=1` rồi nạp lại. Đừng xoá dòng: pm2 giữ giá trị
  cũ của biến đã biến mất khỏi `.env`.
- Đừng tắt bằng cách trỏ `FFMPEG_PATH` sai. Log khi đó báo `tools_missing`, dễ
  nhầm với máy thiếu ffmpeg thật.

**Tải lên hai lần khi rơi về tệp.** Đường video gốc tải video lên Zalo trước rồi
mới gọi `sendVideo`. Zalo từ chối `sendVideo` thì bridge gửi lại cả video theo
đường tệp, tức video lên Zalo lần thứ hai. Toàn bộ lượt gửi phải xong trong
`zalo.bridge.media_timeout` = 120 giây của Laravel. Gồm: bridge tải tệp từ
Laravel, tải lên Zalo lần một, và lần hai nếu rơi về tệp. Quá hạn thì Laravel
báo gửi lỗi trong khi bridge vẫn đang gửi; nhân viên bấm Thử lại lúc đó có thể
làm khách nhận hai bản. `sendVideo` lỗi mạng hoặc quá giờ thì **không** rơi về
tệp: Zalo có thể đã nhận, nên bridge báo thất bại để nhân viên tự Thử lại.

**Kích thước nên dùng.**
- Bridge chỉ tải tối đa 25 MB mỗi tệp (`DEFAULT_MAX_FETCH_BYTES` trong
  `services/zalo-bridge/src/media-fetch.mjs`). Tệp lớn hơn báo lỗi
  `download_too_large`, dù Yona mặc định cho tải lên tới 40 MB
  (`MAXIMUM_FILE_UPLOAD_SIZE`).
- Khuyên nhân viên gửi video **dưới 20 MB**. Ở 25 MB, ca xấu nhất là 50 MB tải
  lên Zalo trong 120 giây: cần đường lên tới Zalo ổn định trên khoảng 4 Mbit/s.
- Log `[zalo-bridge:send-timing]` ghi `bytes` và thời gian từng chặng của mỗi
  lượt gửi, dùng để xem video thật đang tốn bao lâu.

### Gửi bản ghi âm dạng tin thoại: ffmpeg

Bản ghi âm nhân viên thu bằng nút micro ở ô soạn tới khách Zalo thành **tin
thoại** (bấm là nghe trong khung chat) chỉ khi máy chạy bridge có `ffmpeg`: trình
duyệt ghi WebM/Ogg Opus (Chrome, Edge, Firefox) hoặc mp4 AAC (Safari), còn Zalo phát
tin thoại m4a AAC, nên bridge đổi mã sang m4a mono 64 kbit/s, tải lên Zalo rồi gọi
`sendVoice`. Thiếu ffmpeg thì bản ghi vẫn tới khách nhưng thành **tệp âm thanh**.
Tệp âm thanh tải lên bằng nút kẹp giấy luôn đi dạng tệp, không thành tin thoại.

Cài và trỏ `FFMPEG_PATH` như mục video ở trên (dùng chung). Sau khi nạp lại bridge:

```bash
grep 'zalo-bridge:send-voice' storage/logs/zalo-bridge/out.log | tail -1
# mong đợi: [zalo-bridge:send-voice] {"native_voice":true,"enabled":true}
```

Bản ghi rơi về đường tệp để lại một dòng cảnh báo cùng thẻ trong `error.log`, có
`message_id` và bước hỏng (`disabled`, `tools_missing`, `transcode`,
`upload_voice`, `send_voice`). Tắt nhanh khi có sự cố (khách báo tin thoại không
nghe được): đặt `ZALO_NATIVE_VOICE=0` trong `services/zalo-bridge/.env` rồi nạp
lại bridge; bật lại bằng `ZALO_NATIVE_VOICE=1`, cùng luật giữ dòng như
`ZALO_NATIVE_VIDEO`. `sendVoice` lỗi mạng hoặc quá giờ thì không rơi về tệp, như
video gốc.

---


## 7. Nginx

Vhost chính `/www/server/panel/vhost/nginx/yona.vn.conf` — chỉ đổi document
root, giữ nguyên phần certificate do aaPanel quản lý:

```nginx
root /www/wwwroot/yona.vn/public;
include enable-php-84.conf;
```

Tạo `/www/server/panel/vhost/nginx/extension/yona.vn/laravel-runtime.conf`:

```nginx
# Laravel tự trả lỗi của nó: trang 404 có thương hiệu cho web, JSON cho /api/*.
# Xem "Lỗi 404 và URL tệp đính kèm phải tới được Laravel" ngay dưới.
fastcgi_intercept_errors off;

location / {
    try_files $uri $uri/ /index.php?$query_string;
}

# Route Laravel có URL kết thúc bằng đuôi ảnh: tệp đính kèm (.../anh.jpg) và
# pixel đếm lượt xem bài Help Center (/hc/<portal>/articles/<bài>.png). Không
# phải tệp tĩnh. Khớp tiền tố ^~ thắng rule regex ảnh của aaPanel.
location ^~ /attachments/ {
    try_files $uri /index.php?$query_string;
}

location ^~ /hc/ {
    try_files $uri $uri/ /index.php?$query_string;
}

# WebSocket của Reverb chiếm đúng MỘT path /app/<REVERB_APP_KEY>; phần còn lại
# của /app là dashboard Laravel. Đừng dùng `location ^~ /app`: nó đẩy cả
# dashboard sang Reverb. Thay <REVERB_APP_KEY> bằng giá trị trong .env.
location = /app/<REVERB_APP_KEY> {
    proxy_pass http://127.0.0.1:8611;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 600s;
    proxy_send_timeout 600s;
}

location ^~ /apps {
    proxy_pass http://127.0.0.1:8611;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 60s;
}
```

### Lỗi 404 và URL tệp đính kèm phải tới được Laravel

Vhost aaPanel sinh sẵn hai thứ chặn phản hồi của Laravel trước khi tới trình
duyệt. Đã xảy ra thật trên `yona.vn` (kiểm 24/09/2026): mọi 404 ra trang
`nginx` trần 146 byte, kể cả `/api/v1/<lạ>` (trả `text/html` thay vì JSON) và
`/terms`; ảnh trong hộp thư hiện "Ảnh này không còn nữa." dù tệp vẫn nằm
nguyên ở `/storage/...`.

**1. nginx đè trang lỗi của PHP.** Khối `#ERROR-PAGE-START` trong vhost có
`error_page 404 /404.html;`, và `fastcgi_intercept_errors on;` đang bật (thường
ở `nginx.conf` của aaPanel). Khi intercept bật, nginx thay phản hồi của PHP bằng
trang của nó cho **mọi mã có `error_page`**. Hành vi đo được khớp đúng cơ chế
này: 404 bị thay, còn `/api/v1/profile` vẫn trả 401 JSON vì 401 không có
`error_page`. `/404.html` không có trong `public/`, nên kết quả là trang 404
mặc định của nginx.

Sửa bằng hai việc:

- `fastcgi_intercept_errors off;` ở cấp server, đã có trong
  `laravel-runtime.conf` phía trên. Nó đè giá trị kế thừa từ khối `http`.
- Comment dòng `error_page 404 /404.html;` trong khối `#ERROR-PAGE-START` của
  vhost (aaPanel → Website → yona.vn → Config file).

Tìm chỗ đang bật intercept trước khi sửa:

```bash
grep -rn "fastcgi_intercept_errors\|error_page" \
    /www/server/nginx/conf/nginx.conf \
    /www/server/nginx/conf/enable-php-84.conf \
    /www/server/panel/vhost/nginx/yona.vn.conf
```

Nếu `fastcgi_intercept_errors on` nằm **trong một `location`** (ví dụ khối PHP
của `enable-php-84.conf`) thì dòng cấp server không đè được nó. Khi đó phải tắt
ngay tại `location` đó, và việc này ảnh hưởng mọi site cùng dùng PHP 8.4.

**2. Rule ảnh tĩnh nuốt URL tệp đính kèm.** Vhost aaPanel có
`location ~ .*\.(gif|jpg|jpeg|png|bmp|swf)$ { expires 30d; ... }`. URL đính kèm
trong hộp thư có dạng `/attachments/{id}/{chữ ký}/{tên tệp gốc}`, kết thúc bằng
`.jpg`/`.png`, nên rơi vào rule này. nginx đi tìm tệp tĩnh trong `public/`,
không thấy, trả 404, và trình duyệt không bao giờ nhận được lệnh chuyển hướng
301 sang `/storage/...`. Avatar không bị vì chúng trỏ thẳng `/storage/...`.
Còn `error_page 404` thì nginx chuyển tiếp 404 đó vào `index.php`: Laravel xử
lý đúng URL gốc nhưng nginx giữ mã 404 (đo 24/09: `/attachments/1/sai/x.pdf` →
403 của Laravel, `/attachments/1/sai/x.jpg` → cùng trang 403 đó nhưng mã 404).
Vì vậy gỡ `error_page 404` là bắt buộc, không chỉ tắt intercept: còn nó thì
bước kiểm của `deploy.sh` không phân biệt được ảnh hỏng với ảnh lành.

URL phải kết thúc bằng tên tệp gốc vì giao diện đọc tên hiển thị của tệp từ
chính đoạn cuối URL. Nên sửa ở nginx:
`location ^~ /attachments/` (đã có trong `laravel-runtime.conf`). Khớp tiền tố
`^~` làm nginx dừng tìm regex, nên rule ảnh không còn chạm tới đường dẫn này.

Cùng rule đó nuốt pixel đếm lượt xem của Help Center
(`/hc/<portal>/articles/<bài>.png`, route Laravel): trang bài viết vẫn mở được
nhưng lượt xem đứng yên. `location ^~ /hc/` sửa theo cùng cách. Thêm route
Laravel nào có URL kết thúc bằng `.jpg/.png/.gif/.js/.css` thì phải thêm
tiền tố của nó vào đây và vào bước `nginx 404` của `deploy.sh`.

**Kiểm bằng curl** sau khi `nginx -t` và reload. `deploy.sh` cũng tự chạy các
phép kiểm này ở bước `nginx 404`, sai là cảnh báo kèm trỏ về mục này.

```bash
# Trang lạ: 404 và là trang của Yona (có dấu data-page="not_found")
curl -s -o /tmp/yona-404.html -w '%{http_code} %{content_type}\n' https://yona.vn/khong-ton-tai
grep -c 'data-page="not_found"' /tmp/yona-404.html          # mong đợi: 1

# Tệp tĩnh không tồn tại: phải là trang nginx, KHÔNG phải trang Yona.
# Ra trang Yona nghĩa là error_page 404 vẫn còn (xem mục 2 ở trên).
curl -s https://yona.vn/khong-ton-tai.jpg | grep -c 'data-page="not_found"'   # mong đợi: 0

# API lạ: 404 kèm JSON
curl -s -w '\n%{http_code} %{content_type}\n' https://yona.vn/api/v1/khong-ton-tai
# mong đợi: {"error":"Resource could not be found"} / 404 application/json

# URL ảnh đính kèm tới được Laravel (id 0 không tồn tại nên Laravel trả 404 của nó)
curl -s -o /tmp/yona-att.html -w '%{http_code}\n' https://yona.vn/attachments/0/x/x.jpg
grep -c 'data-page="not_found"' /tmp/yona-att.html          # mong đợi: 1

# Pixel Help Center tới được Laravel (portal "x" không tồn tại nên Laravel trả 404 của nó)
curl -s -o /tmp/yona-hc.html -w '%{http_code}\n' https://yona.vn/hc/x/articles/x.png
grep -c 'data-page="not_found"' /tmp/yona-hc.html           # mong đợi: 1

# Chắc nhất: một ảnh thật trong hộp thư (chuột phải vào ảnh → sao chép địa chỉ ảnh)
curl -sI '<URL ảnh vừa chép>' | grep -Ei '^(HTTP|location)'
# mong đợi: HTTP/2 301 và location: https://yona.vn/storage/attachments/...
```

Trang nginx trần (`<center>nginx</center>`, 146 byte) ở bất kỳ lệnh nào, trừ
lệnh tệp tĩnh không tồn tại, nghĩa là cấu hình trên chưa ăn.

Tạo `/www/server/panel/vhost/nginx/extension/yona.vn/cache-policy.conf`:

```nginx
# KHÔNG dùng add_header trong các location này: add_header ở cấp location nuốt
# mất Strict-Transport-Security kế thừa từ server block.

# Tệp nhúng trên website khách. Tên cố định vì đoạn script do backend sinh
# (WebWidget::web_widget_script) trỏ thẳng BASE_URL + "/packs/js/sdk.js" và
# khách đã dán vào site của họ — không hash tên được. Rule chung của aaPanel
# `location ~ .*\.(js|css)?$ { expires 12h; }` khiến mọi bản sửa widget mất
# tới 12 tiếng mới tới khách. Khớp chính xác (=) thắng rule regex đó.
location = /packs/js/sdk.js {
    expires 1m;
    error_log /dev/null;
    access_log /dev/null;
}

# Ngược lại: asset có content hash, đổi nội dung là đổi tên nên cache dài được.
# 12h của rule chung chỉ làm khách tải lại vô ích.
location ^~ /build/assets/ {
    expires 1y;
    error_log /dev/null;
    access_log /dev/null;
}
```

Đổi xong phải **purge cache CDN một lần** cho `/packs/js/sdk.js`: header mới
không làm hết hạn những bản đã nằm sẵn ở edge. Sau đó bước `cdn sdk.js` của
`deploy.sh` sẽ tự canh — nó so `Last-Modified` giữa URL thường và URL kèm tham
số phá cache, lệch nhau là cảnh báo.

```bash
/www/server/nginx/sbin/nginx -t && /etc/init.d/nginx reload
```

### Tệp kho sticker

Tệp kho sticker (`/storage/stickers/<2 ký tự>/<hash>/sticker.webp`, `static.png`,
`original.<đuôi>`) đặt theo hash của ảnh gốc + thông số chỉnh: nội dung đổi là
đường dẫn đổi, nên cache một năm kèm `immutable` được. Thêm vào `cache-policy.conf`:

```nginx
# Khớp tiền tố ^~ thắng rule regex ảnh/js của aaPanel. add_header ở cấp location
# nuốt mất header kế thừa từ server block, nên chép lại nguyên dòng
# Strict-Transport-Security đang có ở server block vào đây.
location ^~ /storage/stickers/ {
    # Không "always": trang 404 (tệp chưa dựng) không được cache một năm.
    add_header Cache-Control "public, max-age=31536000, immutable";
    add_header Strict-Transport-Security "<giá trị y hệt server block>" always;
    access_log /dev/null;
}
```

Tên tệp sticker mang cạnh ảnh (`sticker-64.webp`, `static-128.png`, `sticker-128.gif`), nên
`php artisan stickers:rerender` sau khi đổi `STICKER_IMAGE_SIZE` hoặc
`STICKER_OUTBOUND_IMAGE_SIZE` ghi ra URL mới, không cần purge cache. Tệp cỡ cũ
nằm lại trong cùng thư mục cho tin đã gửi, dọn khi không còn gì trỏ tới. Chỉ bản
đầu (tên `sticker.webp`/`static.png`, trước 28/09) từng bị ghi đè tại chỗ: nếu
còn thấy ảnh cũ thì purge tiền tố `/storage/stickers/` một lần.

Xoá sticker lúc tin đã gửi còn mượn tệp thì thư mục hash được giữ; xoá tin sau đó
không kéo tệp đi theo. Lịch `stickers:prune-orphan-files` (Chủ nhật 03:50) xoá cả
thư mục hash không còn sticker nào dùng lẫn tin nào mượn, bỏ qua thư mục có tệp
ghi trong 24 giờ qua (tải lên ghi ảnh gốc trước khi tạo bản ghi). URL đã xoá vẫn
có thể còn trong cache CDN; tải lại đúng ảnh đó sinh lại đúng đường dẫn và nội dung
nên không cần purge. Chạy tay, xem trước số thư mục sẽ xoá:

```bash
php artisan stickers:prune-orphan-files --dry-run
```

Kiểm sau reload (lấy một sticker đã xuất bản):

```bash
curl -sI https://yona.vn/storage/stickers/<2 ký tự>/<hash>/sticker.webp | grep -Ei '^(content-type|cache-control|strict-transport-security)'
# mong đợi: image/webp, public, max-age=31536000, immutable và vẫn còn strict-transport-security
```

### IP thật của khách sau Cloudflare

Cloudflare ─▶ Nginx ─FastCGI─▶ PHP-FPM: `REMOTE_ADDR` mà PHP thấy là IP edge của
Cloudflare. Chưa cấu hình gì thì mọi khách sau cùng một edge chung một IP: khoá
đăng nhập (5 lần sai theo email + IP) và giới hạn form đặt demo chặn nhầm người
thật, danh sách phiên đăng nhập và `current_sign_in_ip` ghi IP của Cloudflare.

**Chọn một cách: trusted proxies phía Laravel.** Không bật `real_ip`
(`set_real_ip_from`, `real_ip_header`) trong vhost, để dải IP tin cậy chỉ nằm ở
một chỗ là `config/trustedproxy.php`.

- Request có `REMOTE_ADDR` thuộc dải Cloudflare trong `proxies`: `ip()` lấy từ
  `CF-Connecting-IP`; thiếu header đó thì lấy phần tử cuối chưa tin cậy của
  `X-Forwarded-For`.
- Request từ nguồn khác (gọi thẳng IP origin, `127.0.0.1`): header IP bị bỏ qua,
  `ip()` là `REMOTE_ADDR`. Header giả không vượt được khoá đăng nhập.
- Chỉ tin IP. Host và scheme vẫn do nginx quyết (`X-Forwarded-Host`,
  `X-Forwarded-Proto` bị bỏ qua), nên header giả không đổi được link app sinh ra.
- Mạng không bao giờ được gọi trong request: dải IP ghi sẵn trong file.

Cập nhật dải IP (Cloudflare hiếm khi đổi; kiểm mỗi quý hoặc khi Cloudflare báo):

```bash
# Trên máy dev, KHÔNG chạy trên server (deploy.sh dừng khi working tree bẩn)
php artisan trusted-proxies:refresh   # tải ips-v4 + ips-v6, nguồn lỗi thì không ghi gì
git diff config/trustedproxy.php
git commit -m "chore(proxy): cập nhật dải IP Cloudflare" config/trustedproxy.php
# rồi deploy.sh như thường (bước optimize cache lại config)
```

Thiếu một dải edge mới thì khách đi qua edge đó bị ghi IP của Cloudflare như cũ,
không có gì sập.

**Nghiệm thu sau deploy:**

1. Mở `https://www.cloudflare.com/cdn-cgi/trace` trên chính máy đang thử, ghi lại
   dòng `ip=` (IP công cộng của mình).
2. Đăng nhập `https://yona.vn`, vào Hồ sơ → **Phiên đăng nhập**. Phiên hiện tại
   phải hiện đúng IP ở bước 1, không phải IP thuộc dải trong
   `config/trustedproxy.php` (104.16.x, 172.64.x, 162.158.x, 2606:4700:…).
3. Phiên tạo trước lần deploy này vẫn giữ IP cũ; chỉ phiên mới mới đúng.

---

## 8. Supervisor và cron — `deploy.sh` tự dựng

Không phải dựng tay. Mỗi lần deploy, script:

1. **Gỡ** program không còn dùng nếu còn: `yona-queue` (worker `queue:work`
   trước khi chuyển sang Horizon — để lại là hai nguồn cùng lấy job) và
   `yona-ssr` (`inertia:start-ssr` đã biến mất khỏi ứng dụng).
2. **Cảnh báo** nếu trong `conf.d/` có file khác cũng chạy `queue:work`,
   `queue:listen`, `horizon` hoặc `reverb:start` trỏ vào cùng app — script không
   tự xóa đồ của người khác, nhưng nói cho bạn biết để gỡ, vì hai nguồn cùng
   chạy nghĩa là mỗi job xử lý hai lần.
3. **Ghi** `yona-horizon.conf` và `yona-reverb.conf` — chỉ khi nội dung lệch.
   Giống hệt thì không đụng, không `reread`, không restart.
4. `supervisorctl reread` + `update` khi có thay đổi, rồi `start` cả hai program.
5. **Ghi** `/etc/cron.d/yona-scheduler`, sau khi cảnh báo nếu đã có cron khác
   (trong `/etc/cron.d/` hoặc crontab của `root`/user runtime) cũng gọi
   `schedule:run` cho app này.

Hai file conf mang dòng đầu `; File này do deploy.sh sinh ra` — **sửa tay sẽ bị
ghi đè** ở lần deploy sau. Muốn đổi thì đổi biến môi trường (mục 10) hoặc sửa
`deploy.sh`.

Nội dung `yona-horizon.conf` sinh ra:

```ini
[program:yona-horizon]
directory=/www/wwwroot/yona.vn
command=/www/server/php/84/bin/php artisan horizon
numprocs=1
user=www
autostart=true
autorestart=true
startsecs=5
startretries=5
stopwaitsecs=180
stopasgroup=true
killasgroup=true
redirect_stderr=true
stdout_logfile=/www/wwwroot/yona.vn/storage/logs/yona-horizon.log
...
```

Supervisor chỉ nuôi **một** process: Horizon là master, nó tự đẻ worker con theo
`config/horizon.php`, chia ba pool cố định (số process không co giãn):

| Pool (supervisor Horizon) | Hàng đợi | Biến `.env` | Mặc định |
|---|---|---|---|
| `supervisor-realtime` | `critical` (phát realtime, tắt/bật "đang nhập…") | `HORIZON_REALTIME_PROCESSES` | 2 |
| `supervisor-1` | mọi tier còn lại theo thứ tự, `critical` đứng đầu | `HORIZON_MAX_PROCESSES` | 4 |
| `supervisor-media` | `media` (tin gửi kèm tệp, tới 120s mỗi lượt) | `HORIZON_MEDIA_PROCESSES` | 2 |
| `supervisor-stickers` | `stickers` | — | 1 |

Mỗi worker tốn khoảng 60–100 MB RAM; mặc định là 9 process. Máy ít RAM thì hạ
`HORIZON_MAX_PROCESSES` trước, giữ realtime ≥ 1 và media ≥ 1.

Pool phải **cố định** (`minProcesses = maxProcesses`): khi `balance` tắt, Horizon
hạ pool về `minProcesses` lúc hàng đợi rỗng rồi chỉ thêm **một** process mỗi 3 giây
khi có việc, và process mới chạy việc đầu tiên chậm vì nạp lại toàn bộ mã. Cấu
hình cũ (`minProcesses` mặc định 1, tối đa 4) vì thế co về **một** worker cho mọi
việc mỗi lần hàng đợi rỗng (`vendor/laravel/horizon/src/AutoScaler.php`).

Danh sách tier queue nằm ở `config/queue_tiers.php` — Horizon (production) và
`Makefile` (dev) đọc cùng file đó, sửa một chỗ là đủ. `balance` để `false` nên
worker quét tuần tự từ `critical` xuống `purgable`, đúng như `queue:work
--queue=...` trước đây; bật balance sẽ chia process theo hàng đợi và **mất ưu
tiên tuyệt đối**. Tin nào đi `media` hay `high` chỉ do `SendReplyJob::queueFor`
quyết định (có đính kèm = `media`). Thứ tự gửi ra kênh trong một hội thoại vẫn
đúng thứ tự tạo tin dù tin đi hai hàng đợi: `App\Messaging\Delivery\OutboundOrder`
chỉ đưa tin đầu hàng của hội thoại vào hàng đợi, tin sau chờ trên Redis (không
giữ worker) và được đẩy khi tin trước gửi xong hoặc hỏng hẳn; job mất thì
`SweepOutboundOrderJob` (mỗi phút) nhả hàng sau 10 phút.

> **Bất biến của hàng đợi, đừng phá:** `media_timeout` của kênh Zalo (120s,
> `config/zalo.php`) < `timeout` của worker (150s, `config/horizon.php`) <
> `retry_after` của Redis (180s, `config/queue.php`). Sai thứ tự này thì Redis
> trả job về hàng đợi trong lúc nó còn đang chạy → **một tin nhắn gửi hai lần
> cho khách**.

`yona-reverb.conf` tương tự, chạy `reverb:start` với `REVERB_SERVER_HOST` /
`REVERB_SERVER_PORT` đọc từ `.env`.

Muốn tự quản lý hết bằng tay: `DEPLOY_MANAGE_SERVICES=0 ./deploy.sh`.

Kiểm tra sau deploy:

```bash
SUPERVISORCTL="/www/server/panel/pyenv/bin/supervisorctl -c /etc/supervisor/supervisord.conf"
$SUPERVISORCTL status yona-horizon yona-reverb
cat /etc/cron.d/yona-scheduler
```

### Ba dashboard vận hành

| URL | Xem gì | Nguồn dữ liệu |
|-----|--------|----------------|
| `/horizon` | Hàng đợi theo tier, job đang chạy, job lỗi, throughput | Redis |
| `/pulse` | Request chậm, truy vấn chậm, job chậm, exception, user hoạt động | Bảng `pulse_*` trong PostgreSQL |
| `/logs` | `storage/logs/*.log` qua giao diện | File log của chính app |

Cả ba (và API nội bộ `/logs/api/*`) chặn sau cùng một middleware
`EnsureOperationsDashboardAccess`; điều kiện vào khai một chỗ ở
`SystemAccess::canOpenOperationsDashboards()` và gate `viewPulse`,
`viewLogViewer`, `Horizon::auth` gọi lại đúng điều kiện đó. Được vào:

- super admin đăng nhập `/admin/sign_in` bằng email và mật khẩu, không bắt 2FA;
- user đăng nhập dashboard thường (`/app/login`) có email trong
  `YONA_SYSTEM_ADMIN_EMAILS` (mục 9, "Kho sticker"), **không** bắt 2FA.

Khách lạ bị đẩy về `/admin/sign_in`; agent thường không có email hệ thống
nhận 403. Nghiệm thu: đăng nhập bằng tài khoản agent thường rồi mở `/logs` — phải
403; đăng nhập bằng user có email hệ thống — vào được cả ba.

Lưu ý vận hành:

- **Horizon chỉ hiển thị — cảnh báo chủ động nằm ở `monitor:check` và hai
  listener JobFailed/LongWaitDetected** (mục 13, "Cảnh báo vận hành").
- `horizon:snapshot` chạy 5 phút/lần qua scheduler; thiếu nó thì tab Metrics
  trống.
- **Pulse ghi thẳng vào PostgreSQL dùng chung với dữ liệu khách.** Recorder bắn
  theo mỗi request/job/cache-hit đã lấy mẫu 10% (`PULSE_*_SAMPLE_RATE`).
  Pulse tự dọn bản ghi quá `PULSE_STORAGE_KEEP` (7 ngày) khi ghi, không cần lệnh lịch. Thấy độ trễ request tăng thì hạ sample rate hoặc
  `PULSE_ENABLED=false`. Pulse ghi *pattern* route (`.../{website_token}`) chứ
  không ghi URL thật, nên token không rơi vào bảng.
- Pulse ingest mặc định `storage`: ghi DB ở `terminate` của request (sau khi
  response đã gửi, người dùng không chờ nhưng worker PHP-FPM bị giữ thêm vài ms)
  và giữa hai job của worker. Chuyển `PULSE_INGEST_DRIVER=redis` chỉ khi đã có
  daemon `php artisan pulse:work` chạy thường trực (deploy.sh chưa dựng program
  này); thiếu daemon thì Pulse ngừng có số liệu mà không báo lỗi.
- **Số đo Pulse ngay sau deploy không phải trạng thái thường.** `/up` chỉ được gọi
  bởi health check của deploy, chạy ngay sau khi reload PHP-FPM (opcache nguội) và
  `optimize:clear` (xoá cache Redis) nên thường 1,5–3,7 giây; các trang/API mở
  trong vài phút đó cũng chậm theo. Lọc những mốc này trước khi kết luận.
- Job chạy quá 1000 ms (cùng ngưỡng Pulse) ghi một dòng `queue.job.slow` vào log
  ứng dụng: `total_ms`, `db_ms`/`db_queries`, `http_ms`/`http_calls` (bridge, CDN,
  Web Push), `other_ms` (CPU, Redis, phát Reverb), `waited_since_push_ms` (gồm cả
  delay hẹn trước), `job_number_in_process`. Tin gửi Zalo còn có dòng
  `zalo.send.timing` (chờ hàng đợi + từng lượt gọi bridge). Xem ở `/logs` hoặc
  `grep -h 'queue.job.slow' storage/logs/laravel*.log | tail -50`.
- Thẻ **Servers** của Pulse tắt (`PULSE_SERVERS_ENABLED=false`) vì nó cần thêm
  một daemon `pulse:check`; CPU/RAM/đĩa xem ở aaPanel.
- Log Viewer chỉ đọc `storage/logs`, **không** mở `/var/log/nginx` hay log hệ
  thống, và **không cho xoá file** từ giao diện (gate `deleteLogFile` trả false).

---

## 9. Những thứ vẫn phải làm tay một lần

`deploy.sh` không đụng vào những thứ này vì chúng chứa bí mật hoặc do aaPanel quản:

- Cài PHP/PostgreSQL/Redis/Node và mở `disable_functions` (mục 2).
- Tạo database + role, tạo `.env` và sinh secret (mục 4, 5, 6).
- Vhost Nginx + SSL (mục 7).
- **Timezone của PHP** — xem ngay dưới.
- **Hộp thư nhận lead** của trang `/dat-lich-demo` — xem ngay dưới.
- **Kiểm máy chủ gửi được thông báo đẩy** — xem ngay dưới (không có bí mật phải điền).
- **OAuth client cho nút "Tiếp tục với Google"** — xem ngay dưới. Chưa làm thì nút ẩn, không hỏng gì.
- **Dọn access token mồ côi** — một lần, sau lần deploy đầu có lệnh `access-tokens:prune-orphans`. Xem ngay dưới.
- **Kho sticker**: cài renderer, nginx cho tệp sticker, sao lưu thư mục sticker. Xem "Kho sticker" ngay dưới.
- **Hộp thư cá nhân cho người dùng cũ** — một lần, ngay sau lần deploy đầu có kênh Yona: `php artisan users:backfill-personal-inboxes --dry-run` để xem trước, rồi chạy lại không có `--dry-run`. Lệnh gán `@username` (gợi ý từ email) cho người chưa có và tạo hộp thư cá nhân + kênh Yona cho người còn thiếu; không sửa hay xoá dữ liệu cũ, chạy lại nhiều lần vẫn an toàn.

Xong mấy thứ đó thì từ đây về sau chỉ còn `./deploy.sh`.

### Hộp thư nhận lead cho `/dat-lich-demo`

Trang đặt lịch demo đổ lead vào một hộp thư kênh API của chính Yona: mỗi lead
thành một hội thoại đến, nằm cùng chỗ với tin khách. Không có bảng riêng, không
có hàng đợi riêng — cùng đường mà widget đang đi.

Chưa cấu hình `YONA_LEAD_INBOX_ID` thì form **báo lỗi kèm hotline/Zalo**, không
hiện trang cảm ơn giả. Đây là chủ ý: mất lead âm thầm tệ hơn nói thẳng là hỏng.

Tạo hộp thư trên chính production, bằng giao diện:

1. Đăng nhập tài khoản Yona nội bộ → **Cài đặt → Hộp thư → Thêm hộp thư → API**.
2. Đặt tên gợi nhớ, ví dụ `Lead từ trang đặt lịch demo`.
3. Gán đúng những người sẽ gọi lại cho khách.
4. Lấy `id` của hộp thư ở URL trang cài đặt hộp thư đó.

```bash
cd /www/wwwroot/yona.vn
sed -i 's|^YONA_LEAD_INBOX_ID=$|YONA_LEAD_INBOX_ID=<id vừa lấy>|' .env
sed -i 's|^YONA_HOTLINE=$|YONA_HOTLINE=<số thật>|' .env
sed -i 's|^YONA_ZALO_CONTACT_URL=$|YONA_ZALO_CONTACT_URL=<link zalo>|' .env
php artisan config:clear
```

Nghiệm thu bằng cách gửi thật một lượt qua `https://yona.vn/dat-lich-demo` rồi
mở hộp thư xem hội thoại có nổi lên không. Hotline và link Zalo để rỗng thì
trang **ẩn hẳn** khối liên hệ nhanh — không bày một số không ai bắt máy.

### Thông báo đẩy trình duyệt (Web Push)

Không phải cấu hình khoá: lần đầu một người đã đăng nhập mở dashboard, máy chủ tự
sinh cặp khoá VAPID và lưu vào `installation_configs` (`VAPID_KEYS`, locked). Bảng
`notification_subscriptions` do `deploy.sh` migrate như mọi bảng khác. Chỉ cần kiểm
một lần rằng máy chủ đủ điều kiện:

```bash
# OpenSSL phải có đường cong P-256 — thiếu thì dashboard ẩn hẳn phần thông báo đẩy
php -r 'var_dump(in_array("prime256v1", openssl_get_curve_names()));'
# Máy chủ phải gọi ra được các push service (Chrome/Cốc Cốc, Firefox, Safari)
curl -sI https://fcm.googleapis.com | head -1
curl -sI https://updates.push.services.mozilla.com | head -1
curl -sI https://web.push.apple.com | head -1
```

- `APP_URL` phải là `https://yona.vn`: vừa là `subject` của VAPID (Safari từ chối
  subject không phải https), vừa là gốc link mở hội thoại khi bấm thông báo.
- Horizon phải chạy queue `default` (có sẵn trong `config/queue_tiers.php`).
- `/sw.js` phục vụ tĩnh từ `public/` ở gốc tên miền. **Không** gắn cache dài hạn
  cho riêng file này — trình duyệt cần thấy bản mới khi service worker đổi.
- Muốn tự quản khoá: đặt **cả hai** `VAPID_PUBLIC_KEY` và `VAPID_PRIVATE_KEY`
  trong `.env` rồi `php artisan config:cache`. **Không đổi cặp khoá** sau khi đã
  có người bật thông báo: mọi đăng ký cũ mất hiệu lực, người dùng phải bật lại.

Nghiệm thu: Cài đặt hồ sơ → Tùy chọn thông báo → bật "cho phép trình duyệt hiện
thông báo đẩy", tick cột "Thông báo đẩy" cho "Một hội thoại được giao cho bạn",
nhờ người khác giao một hội thoại → hệ điều hành hiện thông báo, bấm vào mở đúng
hội thoại.

### Đăng nhập và đăng ký bằng Google

Nút "Tiếp tục với Google" ở `/app/login` và `/app/auth/signup` chỉ hiện khi `.env`
có **cả hai** `GOOGLE_CLIENT_ID` và `GOOGLE_CLIENT_SECRET`; thiếu một trong hai thì
nút ẩn và `/app/auth/oauth/google*` trả 404. Chỉ dành cho người dùng dashboard,
console `/admin` vẫn đăng nhập bằng mật khẩu.

Hành vi đã chốt: email Google phải được Google xác minh; email trùng tài khoản có
sẵn thì vào đúng tài khoản đó; email mới thì tạo tài khoản qua đúng đường đăng ký
thường (tên hiển thị Google làm tên người dùng và tên account, không gửi thư xác
nhận vì Google đã xác minh); tài khoản bật 2FA vẫn phải nhập mã.

Tạo OAuth client trên Google Cloud, **đứng tên Yona** (project của công ty, không
dùng project cá nhân):

1. Vào `https://console.cloud.google.com`, tạo hoặc chọn project của Yona.
2. **Google Auth Platform → Branding**: tên ứng dụng `Yona`, email hỗ trợ, trang chủ
   `https://yona.vn`, chính sách riêng tư `https://yona.vn/chinh-sach-rieng-tu`,
   điều khoản `https://yona.vn/dieu-khoan`, Authorized domain `yona.vn`.
3. **Audience**: User type **External**, rồi bấm **Publish app** để sang *In
   production*. Để ở *Testing* thì chỉ những email trong danh sách test user đăng
   nhập được. Ba scope dưới đây không nhạy cảm nên không phải qua thẩm định của
   Google; muốn hiện logo Yona trên màn đồng ý thì Google sẽ yêu cầu xác minh thương hiệu.
4. **Data Access → Add or remove scopes**: `openid`, `.../auth/userinfo.email`,
   `.../auth/userinfo.profile`. Ứng dụng không xin gì thêm.
5. **Clients → Create client → Web application**, tên `Yona web`.
   **Authorized redirect URIs** thêm đúng một dòng:

   ```text
   https://yona.vn/app/auth/oauth/google/callback
   ```

   Máy dev muốn thử thật thì thêm `http://localhost:8610/app/auth/oauth/google/callback`
   (Google cho phép `http://localhost`). Authorized JavaScript origins để trống được:
   luồng đổi mã chạy ở máy chủ.
6. Chép Client ID và Client secret vào `.env` production:

```bash
cd /www/wwwroot/yona.vn
# .env dựng từ .env.example cũ chưa có ba dòng này: thêm dòng trống trước khi sed.
for key in GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET GOOGLE_REDIRECT_URI; do
  grep -q "^$key=" .env || echo "$key=" >> .env
done
sed -i 's|^GOOGLE_CLIENT_ID=.*|GOOGLE_CLIENT_ID=<client id>|' .env
sed -i 's|^GOOGLE_CLIENT_SECRET=.*|GOOGLE_CLIENT_SECRET=<client secret>|' .env
sed -i 's|^GOOGLE_REDIRECT_URI=.*|GOOGLE_REDIRECT_URI=https://yona.vn/app/auth/oauth/google/callback|' .env
php artisan config:clear
```

`GOOGLE_REDIRECT_URI` phải khớp **từng ký tự** với dòng đã khai ở bước 5 (https, không
có `/` cuối). Bỏ trống thì app tự ghép theo host của request, sau CDN có thể ra
`http://` và Google báo `redirect_uri_mismatch`, nên production đặt rõ.

Nghiệm thu: mở `https://yona.vn/app/login` ở cửa sổ ẩn danh → bấm "Tiếp tục với
Google" → chọn một tài khoản Google đã có tài khoản Yona → vào thẳng dashboard, và
Hồ sơ → Phiên đăng nhập có thêm một dòng. **Không thử bằng email chưa có tài
khoản trên production**: lượt đó tạo account thật.

### Kết nối hộp thư email bằng OAuth (Outlook, Gmail)

Màn Thêm kênh → Email chỉ mở "Đăng nhập Google" (hiện khi `GOOGLE_MAIL_OAUTH_ENABLED=true`
và có client id/secret). Outlook (OAuth lẫn mật khẩu ứng dụng) và "Khác" (IMAP/SMTP tự
cấu hình) hiện "Sắp ra mắt": route `/app/accounts/{id}/email/oauth/microsoft` trả 404 cho
hộp mới, nhưng hộp Outlook đã nối vẫn "Kết nối lại" được khi có
`MICROSOFT_MAIL_CLIENT_ID` + `MICROSOFT_MAIL_CLIENT_SECRET`. Hộp đã nối bằng mật khẩu
ứng dụng/IMAP giữ nguyên.

Outlook (Azure / Microsoft Entra ID, **đứng tên Yona**):

1. `https://entra.microsoft.com` → App registrations → New registration, tên `Yona
   mail`, Supported account types: *Accounts in any organizational directory and
   personal Microsoft accounts*.
2. Redirect URI (Web): `https://yona.vn/app/email/oauth/microsoft/callback`.
3. API permissions → Add → *APIs my organization uses* → **Office 365 Exchange
   Online** → Delegated: `IMAP.AccessAsUser.All`, `SMTP.Send`; thêm Microsoft Graph
   `offline_access`, `email`, `openid`.
4. Certificates & secrets → New client secret; chép Application (client) ID và secret
   vào `MICROSOFT_MAIL_CLIENT_ID` / `MICROSOFT_MAIL_CLIENT_SECRET`, giữ
   `MICROSOFT_MAIL_TENANT=common`, rồi `php artisan config:clear`. Secret có hạn:
   ghi ngày hết hạn vào lịch để thay trước.

Gmail: dùng project Google Cloud của Yona, thêm scope `https://mail.google.com/`,
redirect URI `https://yona.vn/app/email/oauth/google/callback`, nộp thẩm định
(restricted scope cần kiểm tra bảo mật). Duyệt xong mới đặt
`GOOGLE_MAIL_OAUTH_ENABLED=true`. `GOOGLE_MAIL_CLIENT_ID/SECRET` trống thì dùng lại
client đăng nhập Google, nên client đó phải khai thêm redirect URI này (thiếu là
Google báo `redirect_uri_mismatch`). Máy dev thử thật thì thêm
`http://localhost:8610/app/email/oauth/google/callback`.

Redirect URI được ghép từ `APP_URL`, nên `APP_URL` phải là `https://yona.vn`.
Token (access + refresh) lưu mã hoá trong `channel_email.provider_config`, làm mới
trước mỗi lần quét thư/gửi thư; refresh token bị thu hồi thì hộp thư hiện cảnh báo
"Kết nối lại".

### Gmail push (thư mới về ngay)

Gmail báo thư mới vào Pub/Sub, Pub/Sub đẩy về `POST https://yona.vn/webhooks/gmail/push`
kèm OIDC token; Yona kiểm token rồi kéo thư hộp đó ngay qua Gmail API. Lượt quét mỗi phút vẫn
chạy làm lưới an toàn, nên push hỏng thì thư chỉ chậm tối đa một phút.

Cấu hình đã dựng trên project Google Cloud `yona-511104`:

- Topic `projects/yona-511104/topics/gmail-inbox`; `gmail-api-push@system.gserviceaccount.com`
  có `roles/pubsub.publisher` trên topic.
- Push subscription `gmail-inbox-push` → `https://yona.vn/webhooks/gmail/push`, bật
  authentication bằng service account `pubsub-push@yona-511104.iam.gserviceaccount.com`,
  audience `https://yona.vn/webhooks/gmail/push`, retry exponential backoff 10–600 giây,
  không hết hạn.

`.env` production:

```
GOOGLE_MAIL_PUBSUB_TOPIC=projects/yona-511104/topics/gmail-inbox
GOOGLE_MAIL_PUBSUB_AUDIENCE=https://yona.vn/webhooks/gmail/push
GOOGLE_MAIL_PUBSUB_SERVICE_ACCOUNT=pubsub-push@yona-511104.iam.gserviceaccount.com
```

rồi `php artisan config:clear`. Thiếu topic thì không đăng ký watch; thiếu audience hoặc
service account thì webhook bỏ qua mọi thông báo (vẫn trả 204).

Hộp Gmail đăng ký `users.watch` ngay khi nối/kết nối lại bằng OAuth; job
`RenewMailboxPushSubscriptionsJob` chạy 03:20 hằng ngày gia hạn hộp còn dưới 2 ngày
(watch sống 7 ngày) và đăng ký cho hộp chưa có. Hạn lưu ở
`channel_email.provider_config.push`. Sau khi deploy lần đầu, hộp Gmail đã nối từ trước
được đăng ký ở lượt chạy 03:20 kế tiếp; muốn ngay thì chạy
`php artisan tinker --execute="dispatch_sync(new App\\Jobs\\Inboxes\\RenewMailboxPushSubscriptionsJob)"`.

Nghiệm thu: gửi một thư tới hộp Gmail đã nối, thư hiện trong Inbox dưới 10 giây; log có
dòng `[IMAP] Enqueuing`/`Processing email` ngay sau request `POST /webhooks/gmail/push`.

### Timezone của PHP phải là `Asia/Ho_Chi_Minh`

aaPanel để mặc định `date.timezone = PRC` (UTC+8). Laravel tự đặt lại timezone
theo `config('app.timezone')` nên ứng dụng chạy đúng giờ — **trừ lúc exception
nổ trước khi app nạp xong config**. Những dòng log đó ghi giờ lệch +1, và hiện
channel là `laravel.ERROR` thay vì `production.ERROR`. Đủ để chẩn đoán nhầm một
sự cố đã qua thành sự cố đang xảy ra (đã xảy ra 20/09/2026).

Sửa **cả hai** file — PHP-FPM đọc `php.ini`, còn artisan và worker Horizon đọc
`php-cli.ini`:

```bash
cd /www/server/php/84/etc
cp php.ini php.ini.bak && cp php-cli.ini php-cli.ini.bak
sed -i 's|^date.timezone = PRC|date.timezone = Asia/Ho_Chi_Minh|' php.ini php-cli.ini
/etc/init.d/php-fpm-84 reload
cd /www/wwwroot/yona.vn && php artisan horizon:terminate

php -r 'echo date_default_timezone_get(), " ", date("H:i:s"), PHP_EOL;'
```

`php.ini` dùng chung cho mọi site chạy cùng bản PHP — kiểm site nào đang dùng
trước khi sửa:

```bash
grep -rl '/84/' /www/server/panel/vhost/nginx/*.conf
```

### Dọn access token mồ côi

Token API của user, bot và platform app giờ bị xoá cùng lúc với chủ của nó. Token
của những chủ đã bị xoá **trước** bản này vẫn nằm lại trong `access_tokens`. Không
dùng được (không còn chủ thì API trả 401) nhưng vẫn là bí mật của người đã rời hệ
thống, nên dọn một lần:

```bash
cd /www/wwwroot/yona.vn
# Đếm trước theo loại chủ, không xoá gì
php artisan access-tokens:prune-orphans --dry-run
# Xoá thật
php artisan access-tokens:prune-orphans
# Chạy lại phải ra 0
php artisan access-tokens:prune-orphans --dry-run
```

Lệnh chỉ xoá token mà bản ghi chủ không còn; loại chủ không nhận ra thì bỏ qua và
in cảnh báo. Chạy lại bao nhiêu lần cũng được.

---

### Ảnh thu nhỏ cho ảnh đính kèm có từ trước

Ảnh đính kèm tin nhắn mới được job `GenerateAttachmentThumbnailJob` (hàng đợi
`media`) dựng ảnh thu nhỏ WebP cạnh dài 240px ở `<thư mục ảnh>/thumbs/<tên>.webp`
và bù `meta.width/height` (đã xoay theo EXIF). Kiểm worker Horizon có chạy hàng
`media`. Ảnh có từ trước bản này dựng một lần, chạy nền nhẹ CPU:

```bash
cd /www/wwwroot/yona.vn
nice -n 19 php artisan attachments:generate-thumbnails --chunk=200
# Chạy lại phải ra "Đã xử lý 0 ảnh"
php artisan attachments:generate-thumbnails
```

Ảnh đã xử lý mang `meta.thumb` nên chạy lại không đọc lại ảnh. Ảnh chưa có ảnh
thu nhỏ (đã nhỏ sẵn, GIF động, chưa dựng xong) vẫn hiện bằng ảnh gốc. Quay lại:
cho `Attachment::thumbUrl()` trả `fileUrl()` rồi xoá các thư mục `thumbs/`; không
có thay đổi schema.

---

### Dọn liên hệ nháp rỗng của widget website

Trước bản dựng khách LAZY (chỉ tạo contact + contact_inbox ở hành động thật đầu
tiên), mỗi lần tải trang có widget đều đẻ một "liên hệ nháp" dù khách không làm
gì. Dọn một lần các hồ sơ đó — chỉ xoá contact_inbox của inbox website CHƯA có
hội thoại và CHƯA được khách nhập email/phone/identifier/custom attribute nào;
contact đi kèm chỉ bị xoá nếu nó không còn gắn với contact_inbox nào khác:

```bash
cd /www/wwwroot/yona.vn
# Đếm trước, không xoá gì
php artisan widget:prune-empty-contacts --dry-run
# Xoá thật (theo lô, an toàn chạy lại nhiều lần)
php artisan widget:prune-empty-contacts
# Chạy lại phải ra 0
php artisan widget:prune-empty-contacts --dry-run
```

Nếu một tab khách đang mở đúng lúc chạy lệnh và hồ sơ của nó bị xoá, widget sẽ tự
dựng lại contact_inbox ở hành động thật kế tiếp nhưng KHÔNG tự nối lại kênh
realtime cho tới khi tải lại trang — chấp nhận được vì đây là lệnh dọn một lần.

---


### Tìm kiếm bằng Meilisearch (tuỳ chọn)

Mặc định tìm thẳng trong PostgreSQL (`SEARCH_DRIVER=pgsql`), không cần gì thêm.
Meilisearch cho tìm tương đối có xếp hạng (cụm liền, khớp đúng lên đầu, gõ không
dấu vẫn ra chữ có dấu kể cả `đ`). Quyền xem vẫn do Yona nạp lại từ PostgreSQL:
Meilisearch chỉ trả id.

**Cài** (bản ổn định mới nhất, đã chạy thử 1.54.0), chỉ nghe mạng nội bộ:

```bash
curl -L https://install.meilisearch.com | sh && sudo mv meilisearch /usr/local/bin/
sudo useradd --system --home /var/lib/meilisearch meilisearch
sudo mkdir -p /var/lib/meilisearch/{data,snapshots} && sudo chown -R meilisearch: /var/lib/meilisearch
openssl rand -hex 32   # master key, chỉ ghi vào EnvironmentFile dưới đây và .env của Yona
```

`/etc/meilisearch.env` (chmod 600, chủ `meilisearch`):

```ini
MEILI_ENV=production
MEILI_MASTER_KEY=<master key>
MEILI_HTTP_ADDR=127.0.0.1:7700
MEILI_DB_PATH=/var/lib/meilisearch/data
MEILI_SNAPSHOT_DIR=/var/lib/meilisearch/snapshots
MEILI_SCHEDULE_SNAPSHOT=86400
MEILI_NO_ANALYTICS=true
```

`/etc/systemd/system/meilisearch.service`:

```ini
[Unit]
Description=Meilisearch
After=network.target

[Service]
User=meilisearch
EnvironmentFile=/etc/meilisearch.env
ExecStart=/usr/local/bin/meilisearch
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload && sudo systemctl enable --now meilisearch
curl -s 127.0.0.1:7700/health   # {"status":"available"}
```

Không mở cổng 7700 ra Internet, không qua nginx. Chạy trên máy khác thì chỉ nghe
IP mạng nội bộ và chặn tường lửa cho riêng máy app.

**Key.** Yona ghi tài liệu và cấu hình bằng master key; mọi lượt tìm dùng key chỉ có
quyền `search` (Meilisearch tự tạo "Default Search API Key"). Không key nào ra trình duyệt.

```bash
curl -s 127.0.0.1:7700/keys -H "Authorization: Bearer <master key>" \
  | python3 -c "import json,sys; print([k['key'] for k in json.load(sys.stdin)['results'] if k['actions']==['search']][0])"
```

`.env` của Yona:

```dotenv
SEARCH_DRIVER=meilisearch
MEILISEARCH_HOST=http://127.0.0.1:7700
MEILISEARCH_KEY=<master key>
MEILISEARCH_SEARCH_KEY=<key chỉ search>
```

**Bật lần đầu** (sau `deploy.sh` để cache config lấy biến mới):

```bash
php artisan search:sync-settings   # tạo 4 chỉ mục, trường tìm/lọc, rankingRules
php artisan search:reindex         # dựng lại từ PostgreSQL theo lô, chạy được khi đang nhận tin
```

Sau đó mọi thay đổi đi qua bảng `search_outbox` (job hàng đợi `low`, lịch mỗi phút
vét lại). Thẻ "Search outbox" trên Pulse hiện số dòng tồn và tuổi dòng cũ nhất: tồn
lâu nghĩa là Meilisearch không tới được hoặc worker `low` không chạy.

**Vận hành.** Đổi cấu hình chỉ mục trong code thì chạy lại `search:sync-settings`.
Mất dữ liệu Meilisearch không mất gì của khách: khôi phục snapshot mới nhất
(`meilisearch --import-snapshot <tệp>`) hoặc xoá thư mục data rồi `search:reindex`.
Theo dõi dung lượng `/var/lib/meilisearch` (đo thử: ~1,3 GB cho mỗi 1 triệu tin
ngắn). Quay về PostgreSQL: `SEARCH_DRIVER=pgsql` rồi `php artisan config:cache`;
job outbox tự bỏ các dòng còn tồn.

### Kho sticker

Kho nền tảng (kho chung, mọi account thấy bộ đã xuất bản) do console Super Admin
(`/admin/sticker_packs`) và **tài khoản có quyền hệ thống** quản, ngay trong
Cài đặt → Kho sticker của dashboard. Quyền hệ thống = email user nằm trong
`YONA_SYSTEM_ADMIN_EMAILS` (nhiều email cách nhau dấu phẩy, không phân biệt hoa
thường; để trống = không ai có quyền):

```dotenv
YONA_SYSTEM_ADMIN_EMAILS=founder@yona.vn,ops@yona.vn
```

Đổi xong chạy `php artisan config:cache`. Gỡ một email khỏi danh sách là người đó
mất quyền kho nền tảng ngay ở lượt gọi sau. Cùng danh sách này mở `/horizon`,
`/pulse`, `/logs` (mục 8, "Ba dashboard vận hành"). Kho riêng của account mở
cho mọi thành viên account (cả nhân viên), không cần cờ hay cấu hình gì.

Sticker làm từ ảnh tải lên (PNG, JPG, WebP, GIF và WebP động) kèm thông số cắt +
xoá nền. Mỗi lần tải, ảnh gốc được lưu thành `original.<đuôi>` rồi
`RenderStickerJob` (hàng đợi `stickers`, supervisor Horizon `supervisor-stickers`
một process) gọi renderer Node `services/sticker-renderer` dựng `sticker.webp`
(động nếu ảnh gốc động, cạnh `STICKER_IMAGE_SIZE`), `static.png` (gửi kênh ngoài,
cạnh `STICKER_OUTBOUND_IMAGE_SIZE`, PNG đủ màu) và `sticker.gif` (cùng cạnh, động
như ảnh gốc, trong suốt 1 bit, dùng làm đính kèm cho kênh khai `outbound_gif`).
Zalo khai `outbound_custom_sticker`: sticker kho đi loại tin sticker tự tạo của
Zalo (cỡ gọn như sticker gốc, không bị phóng to như ảnh), Zalo **tự tải**
`static.png` và `sticker.webp` qua URL công khai của disk `stickers`
(`APP_URL/storage/stickers/…` hoặc `STICKERS_DISK_URL`). Vì vậy URL đó phải là
`https` truy cập được từ Internet, và host của nó phải nằm trong allowlist của
bridge (`LARAVEL_BASE_URL` hoặc `BRIDGE_FETCH_HOST_ALLOWLIST`), nếu không tin
sticker báo lỗi tải ảnh. Dev chạy `localhost` thì Zalo không tải được ảnh: thử
luồng này cần URL công khai (tunnel). Supervisor `supervisor-stickers` không chạy thì sticker
nằm mãi ở trạng thái đang xử lý; renderer chưa cài hoặc hỏng thì sticker thành
`failed`. Cả hai trường hợp đều không hiện trong bảng chọn. PHP
(`upload_max_filesize`, `post_max_size`) và nginx (`client_max_body_size`) phải
nhận được ít nhất `STICKER_MAX_ORIGINAL_MB`, nếu không ảnh lớn bị từ chối là quá cỡ.

**Chuyển từ sticker Lottie.** `php artisan migrate` (bước migrate của `deploy.sh`)
chạy `convert_stickers_to_images`: sticker Lottie đã dựng xong lấy `static.png` sẵn
có làm ảnh hiển thị (tĩnh), sticker chưa dựng xong thành `failed`; tin đã gửi vẫn
hiện ảnh tĩnh của nó. Sticker Lottie không có ảnh gốc nên `stickers:rerender` bỏ
qua chúng; muốn sticker động thì tải lại bằng ảnh GIF/WebP.

**Cài renderer.** Renderer có workspace pnpm riêng nên `pnpm install` ở gốc không
chạm tới; `deploy.sh` cài nó ở bước `sticker renderer` (ngay sau `zalo bridge`).
Cài tay khi cần (máy mới, kiểm lỗi):

```bash
cd /www/wwwroot/yona.vn
corepack pnpm --dir services/sticker-renderer install --frozen-lockfile --prod
# thử nhanh bằng đúng user chạy Horizon: phải in ra đường dẫn node, không lỗi
sudo -u www node -e "require.resolve('sharp', { paths: ['services/sticker-renderer'] }); console.log(process.execPath)"
```

Renderer cần Node `^18.17 || ^20.3 || >=21` (theo `sharp`,
`services/sticker-renderer/package.json`) và `prlimit` (gói `util-linux`, có sẵn
trên Ubuntu/Debian): mỗi lượt dựng bị cắt bộ nhớ bằng `prlimit --data` và cắt thời
gian. Renderer tự từ chối ảnh trên 20 MB, trên 25 triệu điểm ảnh mỗi khung, quá 200
khung hoặc hoạt ảnh dài quá 10 giây. Biến trong `.env` Laravel (đọc ở
`config/yona.php` → `stickers`, mẫu ở `.env.example`), mặc định dùng được luôn:

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `STICKER_RENDERER` | `node` | Chọn renderer trong `config/yona.php` → `stickers.renderers` |
| `STICKER_RENDERER_NODE_BINARY` | `node` | Đường dẫn node mà worker Horizon thấy (nvm/aaPanel không nằm trong PATH của `www` thì ghi đường dẫn tuyệt đối) |
| `STICKER_RENDERER_TIMEOUT` | `10` | Giây tối đa cho một lượt dựng |
| `STICKER_RENDERER_MEMORY_LIMITER` | `prlimit` | `none` chỉ dùng ở máy không có `prlimit` (macOS), không dùng trên server |
| `STICKER_RENDERER_MEMORY_MB` | `512` | Trần bộ nhớ dữ liệu của tiến trình dựng; tính cả stack luồng của libvips, dưới 512 thì GIF động lớn hỏng |
| `STICKER_IMAGE_SIZE` | `128` | Cạnh (px) `sticker.webp` hiển thị trong Yona, từ 16 đến 512 |
| `STICKER_OUTBOUND_IMAGE_SIZE` | `128` | Cạnh (px) `static.png` gửi Zalo và kênh ngoài, từ 16 đến 512; Zalo phóng to ảnh nhỏ hơn mức này làm vỡ hình |
| `STICKER_DISPLAY_SIZE` | bằng `STICKER_IMAGE_SIZE` | Cạnh (px CSS) khi hiện sticker ở hộp thư và widget; chỉ khai khi muốn khác cạnh tệp |
| `STICKER_MAX_ORIGINAL_MB` | `10` | Trần dung lượng ảnh gốc tải lên, tối đa 20 (trần của renderer) |

Đổi biến xong chạy `php artisan config:cache` rồi `php artisan horizon:terminate`
(Supervisor tự dựng lại worker). Đổi `STICKER_IMAGE_SIZE`, `STICKER_OUTBOUND_IMAGE_SIZE` hoặc cách dựng thì chạy
thêm `php artisan stickers:rerender` (thử trước bằng `--dry-run`) để dựng lại
sticker đã có từ ảnh gốc + thông số chỉnh đã lưu (ra tệp mới theo cỡ, không cần purge cache);
sticker vẫn dùng được trong lúc hàng đợi `stickers` chạy.

**Nginx và sao lưu.** Cache tệp sticker: mục 7, "Tệp kho sticker". Sao lưu
`storage/app/public/stickers` cùng database: mục 4; thư mục này có cả ảnh gốc, thiếu
ảnh gốc thì không dựng lại được khi đổi cỡ.

**Không có MCP hay REST bằng token cho kho sticker.** Migration
`drop_sticker_mcp_tokens_table` xoá bảng token, token đã cấp mất hiệu lực. Xoá
Platform App "MCP sticker" ở `/admin/platform_apps` nếu nó không dùng cho việc
khác.

**Chuyển disk sang R2/S3** (tuỳ chọn, chỉ bằng env; mặc định là đĩa local
`storage/app/public/stickers`, phục vụ qua `/storage/stickers` sau
`storage:link`):

1. Trên máy dev: `composer require league/flysystem-aws-s3-v3` (driver s3 chưa có
   trong `vendor`), commit `composer.json` + `composer.lock`, deploy như thường.
   Đừng chạy composer trên server: `deploy.sh` dừng khi working tree bẩn.
2. Chép nguyên cây thư mục hiện có lên bucket dưới tiền tố `STICKERS_DISK_ROOT`
   (giữ nguyên `<2 ký tự>/<hash>/...`). Tin cũ lưu đường dẫn tương đối, URL dựng
   lúc đọc, nên chép đủ là tin cũ vẫn hiện đúng.
3. Điền `STICKERS_DISK_*` trong `.env` theo mẫu `.env.example`: `STICKERS_DISK_DRIVER=s3`,
   `BUCKET`, `ENDPOINT`, `KEY`, `SECRET`, `REGION=auto`; `STICKERS_DISK_URL` là
   tên miền công khai của bucket, **không** kèm `ROOT` (Laravel tự nối).
4. Thêm host của `STICKERS_DISK_URL` vào `BRIDGE_FETCH_HOST_ALLOWLIST` trong
   `services/zalo-bridge/.env` rồi nạp lại bridge bằng `pm2 startOrReload …
   --update-env` (lệnh ở mục 6; `pm2 restart` không đọc lại `.env`). Sticker gửi
   ra Zalo mang thẳng URL của disk sticker và bridge từ chối URL có host ngoài
   allowlist, thiếu bước này thì mọi sticker gửi ra Zalo đều hỏng.
5. `php artisan config:cache`, `php artisan horizon:terminate`. Đặt
   `Cache-Control: public, max-age=31536000, immutable` cho bucket ở phía
   Cloudflare (job ghi tệp không gắn header này), vì block nginx ở mục 7 không còn
   áp cho tên miền bucket.

### PDF của thư khi chuyển tiếp sang kênh chat

Chuyển tiếp một email sang hộp thư không hiển thị được HTML thư (Zalo, Messenger,
kênh Yona…) thì Yona gửi **một tệp PDF của cả bức thư** (khối người gửi/người
nhận/ngày, thân thư giữ bố cục và ảnh), không gửi chữ trơn: Zalo từ chối tin chữ
dài (đo trên production: 2.258 ký tự qua, 4.991 ký tự bị từ chối) và chữ trơn làm
mất ảnh. Chuyển sang hộp thư email thì vẫn đi thành thư như cũ.

PDF dựng bằng `spatie/laravel-pdf` (driver Browsershot) + `chrome-headless-shell`
**ở worker, không trong request**: bấm Chuyển tiếp là tin hiện ngay với thẻ tệp
đang tạo (`content_attributes.pending_document`), `SendReplyJob` (hàng `media`,
supervisor `supervisor-media`) dựng PDF rồi mới gửi ra kênh
(`app/Messaging/Delivery/PendingDocument.php`). Dựng hỏng thì tin thành "Gửi thất
bại", bấm Thử lại là dựng lại. Chromium chạy với JS tắt và mọi request mạng bị đẩy
vào proxy không tồn tại: ảnh của thư (ảnh nhúng đã lưu và ảnh ở máy chủ ngoài) được
PHP tải song song trước qua `RemoteEmailImage` (chặn mạng nội bộ, trần 5 MB mỗi ảnh)
rồi nhúng thành data URI (`app/Services/Email/SelfContainedHtml.php`). Đo trên
production 20/10/2026: email 7.790 ký tự có ảnh dựng trong 1,7 giây, PDF 124 KB. Thẻ ảnh/đồ hoạ
cho Zalo vẫn vẽ bằng satori trong bridge, không dùng Chromium.

**Cài một lần trên server mới** (root): thư viện hệ thống Chromium cần và font có
đủ dấu tiếng Việt, emoji:

```bash
apt-get install -y libasound2t64 libatk1.0-0t64 libatk-bridge2.0-0t64 libatspi2.0-0t64 \
  libatomic1 libdbus-1-3 libdrm2 libgbm1 libnspr4 libnss3 libxkbcommon0 libxcomposite1 \
  libxdamage1 libxfixes3 libxrandr2 libxi6 libxres1 \
  fonts-noto-core fonts-noto-color-emoji fonts-liberation
```

**Cài renderer.** Workspace pnpm riêng `services/pdf-renderer`, `deploy.sh` cài ở
bước `pdf renderer` (ngay sau `sticker renderer`); postinstall của puppeteer tải
`chrome-headless-shell` vào `services/pdf-renderer/.cache/puppeteer` (~260 MB, đã
có đúng bản thì bỏ qua). Cài tay và thử bằng đúng user chạy PHP-FPM:

```bash
cd /www/wwwroot/yona.vn
corepack pnpm --dir services/pdf-renderer install --frozen-lockfile --prod
sudo -u www /www/server/php/84/bin/php artisan tinker --execute='echo strlen(Spatie\LaravelPdf\Facades\Pdf::html("<p>Tiếng Việt có dấu</p>")->withBrowsershot(fn ($b) => $b->setNodeModulePath(base_path("services/pdf-renderer/node_modules"))->setChromePath(glob(base_path("services/pdf-renderer/.cache/puppeteer/chrome-headless-shell/*/chrome-headless-shell-*/chrome-headless-shell"))[0]))->generatePdfContent());'
```

In ra một số byte là chạy được. Lỗi `No usable sandbox` (Ubuntu 24.04 chặn user
namespace không đặc quyền qua AppArmor) thì đặt `LARAVEL_PDF_NO_SANDBOX=true` trong
`.env` rồi `php artisan config:cache`: Chromium ở đây chỉ mở HTML đã làm sạch, tắt JS
và không ra được mạng. Biến khác (mẫu ở `.env.example`), mặc định dùng được luôn:

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `LARAVEL_PDF_NODE_BINARY` | `node` trong PATH | Đường dẫn node mà PHP-FPM thấy (nvm/aaPanel không nằm trong PATH của `www` thì ghi đường dẫn tuyệt đối) |
| `LARAVEL_PDF_CHROME_PATH` | bản trong `services/pdf-renderer/.cache` | Chỉ khai khi muốn dùng Chromium khác |
| `LARAVEL_PDF_NO_SANDBOX` | `false` | `true` khi Chromium không mở được sandbox (xem trên) |

Thiếu renderer hay Chromium hỏng thì tin chuyển tiếp email sang kênh chat thành
"Gửi thất bại" với lý do "Chưa dựng được bản PDF của thư này" (mã
`document_unavailable`), lỗi gốc ghi vào log Laravel.

## 10. Deploy

Dry-run (in ra lệnh sẽ chạy, không đổi gì):

```bash
cd /www/wwwroot/yona.vn
DEPLOY_DRY_RUN=1 DEPLOY_HEALTHCHECK=0 ./deploy.sh
```

Deploy thật:

```bash
cd /www/wwwroot/yona.vn
./deploy.sh
```

Thứ tự `deploy.sh` thực hiện:

1. Kiểm tra `.env`, binary, PHP-FPM, quyền ghi; lock chống deploy song song.
2. Fetch + **fast-forward only** (không reset, không rewrite history).
3. Bật maintenance mode.
4. `composer install --no-dev` + `pnpm install --frozen-lockfile`.
5. Đối chiếu bundle i18n với `lang/` (`i18n:generate --check`).
6. `pnpm run build` — dashboard, widget, survey, portal, superadmin, landing, SDK.
7. Migration (forward-only, hoặc dựng lại từ đầu nếu `DEPLOY_FRESH_DB=1`).
8. `storage:link`, `optimize:clear`, `optimize`.
9. Cài + `pm2 startOrReload` Zalo bridge, kiểm tra readiness và session.
10. Chuẩn hóa quyền: `.env` thành `root:www 640`, `storage/` + `bootstrap/cache` cho group `www`.
11. Dựng/đồng bộ Supervisor + cron scheduler, gỡ program cũ, cảnh báo trùng (mục 8).
12. `horizon:terminate`, `reverb:restart`, reload PHP-FPM.
13. Tắt maintenance, health-check `https://yona.vn/up`.
14. Kiểm CDN còn giữ `sdk.js` cũ không, và kiểm nginx có để lỗi của Laravel đi
    qua không: URL lạ phải ra trang 404 của Yona, `/api/v1/<lạ>` phải trả JSON,
    `/attachments/0/.../x.jpg` và `/hc/.../articles/x.png` phải tới được Laravel
    (mục 7). Hai bước này chỉ **cảnh báo**, không dừng deploy: ứng dụng đã chạy,
    cái hỏng nằm ở vhost.

Lỗi giữa chừng → script **giữ nguyên maintenance mode**. Sửa nguyên nhân rồi
chạy lại; đừng `artisan up` trước khi xác minh.

### Biến môi trường

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `DEPLOY_BRANCH` | `main` | Branch deploy |
| `DEPLOY_REMOTE` | `origin` | Git remote |
| `DEPLOY_MAINTENANCE` | `1` | Bật maintenance mode khi deploy |
| `DEPLOY_FRESH_DB` | `0` | `1` = **xóa sạch** database rồi migrate lại |
| `DEPLOY_FRESH_DB_CONFIRM` | — | Bắt buộc khi `FRESH_DB=1`: đúng tên `DB_DATABASE` |
| `DEPLOY_SEED_DEMO` | `0` | Chạy `DatabaseSeeder` (workspace demo Acme Inc) |
| `DEPLOY_ZALO_BRIDGE` | `auto` | `auto` = chạy khi bridge có `.env` |
| `DEPLOY_MANAGE_SERVICES` | `1` | Tự dựng Supervisor + cron + pm2 startup |
| `DEPLOY_RUNTIME_USER` | `www` | User chạy queue worker / Reverb / scheduler |
| `DEPLOY_SUPERVISOR_CONF_DIR` | `/etc/supervisor/conf.d` | Nơi ghi file program |
| `DEPLOY_SUPERVISORCTL` | tự dò aaPanel | Đè lệnh `supervisorctl` |
| `DEPLOY_HEALTHCHECK` | `1` | Gọi `APP_URL/up` sau deploy, rồi kiểm CDN `sdk.js` và kiểm nginx trả 404 của Laravel |
| `DEPLOY_HEALTH_URL` | — | Đè URL health-check |
| `DEPLOY_DRY_RUN` | `0` | In lệnh thay vì chạy |
| `DEPLOY_ALLOW_ROOT` | `1` | Cho phép deploy bằng root (aaPanel) |
| `DEPLOY_RUNTIME_GROUP` | `www` | Group runtime của PHP-FPM/Supervisor |
| `DEPLOY_PHP_FPM_SERVICE` | `php8.4-fpm` | systemd service; để trống thì bỏ qua |
| `DEPLOY_PHP_FPM_INIT_SCRIPT` | tự dò `/etc/init.d/php-fpm-84` | Ưu tiên hơn systemd |
| `DEPLOY_USE_COREPACK` | `1` | Dùng `corepack pnpm` theo bản đã pin |
| `DEPLOY_PHP_BIN` / `DEPLOY_NODE_BIN` / `DEPLOY_COMPOSER_BIN` / `DEPLOY_PNPM_BIN` | `php`/`node`/`composer`/`pnpm` | Đè đường dẫn binary |

---

## 11. Dựng lại database từ đầu

Dùng khi schema đổi tới mức migration forward không đi được — ví dụ lần đầu lên
bản viết lại. **Xóa sạch dữ liệu, không hoàn tác được.**

```bash
cd /www/wwwroot/yona.vn
sudo -u postgres /www/server/pgsql/bin/pg_dump -Fc yona > /www/backup/yona-truoc-fresh-$(date +%F-%H%M).dump

DEPLOY_FRESH_DB=1 DEPLOY_FRESH_DB_CONFIRM=yona ./deploy.sh
```

`DEPLOY_FRESH_DB_CONFIRM` phải khớp `DB_DATABASE` trong `.env` — chốt chặn để
không lỡ tay xóa nhầm database khác.

Sau khi xong, database trắng — không còn tài khoản nào:

```bash
php artisan super-admin:create ban@yona.vn --name="Tên" --password='<mật khẩu mạnh>'
```

Rồi đăng nhập `/admin`, tạo workspace đầu tiên, và **quét lại QR Zalo** cho
mọi inbox (session bridge cũ trỏ tới connection_id không còn tồn tại).

---

## 12. Chuyển server đang chạy bản cũ sang bản viết lại

Làm một lần, cho server đã chạy bản CRM cũ (Horizon, Inertia SSR, hai role
PostgreSQL, schema Perfex). Database cũ bị **xóa hẳn và dựng lại cùng tên** —
quyết định của chủ sản phẩm, dữ liệu cũ không giữ lại.

### B1. Sao lưu thứ sẽ bị ghi đè

```bash
cd /www/wwwroot/yona.vn
cp .env /root/yona-env-truoc-rewrite
mkdir -p /root/yona-supervisor-truoc-rewrite
cp /etc/supervisor/conf.d/yona-*.conf /root/yona-supervisor-truoc-rewrite/
```

`deploy.sh` sẽ **xóa** `yona-horizon.conf` và `yona-ssr.conf`. Không có bản sao
thì rollback phải gõ lại từ đầu.

### B2. Dừng mọi thứ đang ghi vào database cũ

```bash
SUPERVISORCTL="/www/server/panel/pyenv/bin/supervisorctl -c /etc/supervisor/supervisord.conf"
php artisan down --retry=60
$SUPERVISORCTL stop yona-horizon yona-ssr
corepack pnpm --dir services/zalo-bridge exec pm2 stop zalo-personal-bridge
```

### B3. Xóa database cũ, dựng lại cùng tên

**Không hoàn tác được.** Toàn bộ dữ liệu bản cũ mất vĩnh viễn.

```bash
PSQL="sudo -u postgres /www/server/pgsql/bin/psql"
PGBIN=/www/server/pgsql/bin

# ngắt mọi kết nối còn bám vào database trước khi drop
$PSQL -d postgres -v ON_ERROR_STOP=1 -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'yona' AND pid <> pg_backend_pid();"
$PSQL -d postgres -v ON_ERROR_STOP=1 -c "DROP DATABASE yona;"

sudo -u postgres $PGBIN/createdb --owner=yona_app --encoding=UTF8 --template=template0 yona
$PSQL -d yona -v ON_ERROR_STOP=1 -c "CREATE EXTENSION IF NOT EXISTS pg_trgm"
$PSQL -d postgres -v ON_ERROR_STOP=1 -c "REVOKE ALL ON DATABASE yona FROM PUBLIC;"
```

Dựng lại với owner `yona_app` (chính là `DB_USERNAME`) là có chủ đích: schema mới
không dùng RLS nên không cần role thứ hai, và migration cần quyền tạo bảng.

`pg_trgm` là bắt buộc: migration tạo index `gin_trgm_ops` cho `contacts` và
`messages`. Thiếu nó thì migrate chết giữa chừng. `deploy.sh` cũng tự tạo khi
chạy bằng root, đây chỉ là làm sẵn cho sạch.

Role `yona_owner` của kiến trúc RLS cũ không còn vai trò gì — để nguyên đó.

### B4. Dọn `.env`

```bash
cd /www/wwwroot/yona.vn
sed -i '/^DB_PRIVILEGED_/d;/^INERTIA_SSR_/d;/^HORIZON_/d;/^TELESCOPE_/d;/^PULSE_/d;/^LOG_VIEWER_/d;/^WIDGET_CHANNEL_INBOUND_SECRET=/d' .env
```

Xem còn thiếu key nào so với bản mẫu:

```bash
comm -23 <(grep -oE '^[A-Z][A-Z0-9_]*' .env.example | sort -u) <(grep -oE '^[A-Z][A-Z0-9_]*' .env | sort -u)
```

Điền các key thiếu theo mục 5. Ba secret Zalo giữ nguyên giá trị cũ — miễn là
vẫn khớp `services/zalo-bridge/.env`.

### B5. Xóa trạng thái Redis của bản cũ

Job trong hàng đợi trỏ tới class không còn tồn tại, session và cache mang cấu
trúc cũ. Chung prefix theo `APP_NAME` nên bản mới sẽ đọc phải đồ của bản cũ.

**Kiểm tra Redis có dùng chung với ứng dụng khác không trước đã** — server này
còn chạy app khác thì `FLUSHDB` sẽ xóa luôn dữ liệu của họ:

```bash
redis-cli -n 0 --scan --pattern '*' | sed 's/:.*//' | sort -u | head -20
```

Chỉ xóa đúng key của Yona (prefix = slug của `APP_NAME`):

```bash
PREFIX="$(sed -n 's/^APP_NAME=//p' .env | tr -d '"' | tr '[:upper:] ' '[:lower:]-')"
for db in 0 1; do
    redis-cli -n "$db" --scan --pattern "$PREFIX-*" | xargs -r -n 500 redis-cli -n "$db" DEL
done
```

Chỉ khi Redis này phục vụ riêng Yona mới được dùng `redis-cli -n 0 FLUSHDB`
và `redis-cli -n 1 FLUSHDB` cho nhanh.

### B6. Deploy

Script trên server vẫn là bản cũ (build SSR, seeder đã biến mất), nên phải kéo
code mới về trước rồi mới chạy — từ lần sau chỉ còn `./deploy.sh`:

```bash
cd /www/wwwroot/yona.vn
git fetch origin main
git merge --ff-only origin/main
./deploy.sh
```

Database `yona` vừa dựng lại đang trống nên migrate thường là đủ — **không** cần
`DEPLOY_FRESH_DB`. Script sẽ tự gỡ `yona-queue`/`yona-ssr`, dựng `yona-horizon` +
`yona-reverb`, tạo cron scheduler và đăng ký pm2 startup.

### B7. Tạo tài khoản và kết nối lại Zalo

```bash
php artisan super-admin:create ban@yona.vn --name="Tên" --password='<mật khẩu mạnh>'
rm -f services/zalo-bridge/.sessions/*.json
```

Đăng nhập `/admin` → tạo workspace → mời người dùng → vào phần inbox quét QR
Zalo lại. Session cũ trỏ `connection_id` của database cũ nên không dùng lại được.

### B8. Nghiệm thu

```bash
curl -fsS https://yona.vn/up && echo OK
$SUPERVISORCTL status yona-horizon yona-reverb
tail -f storage/logs/queue.log
```

Rồi mở trình duyệt: đăng nhập, gửi và nhận một tin Zalo thật, kiểm tra tin hiện
realtime không cần F5.

### Đường lui

```bash
cd /www/wwwroot/yona.vn
php artisan down
git reset --hard main-truoc-rewrite
cp /root/yona-env-truoc-rewrite .env                       # DB trỏ lại `yona`
cp /root/yona-supervisor-truoc-rewrite/*.conf /etc/supervisor/conf.d/
$SUPERVISORCTL reread && $SUPERVISORCTL update
composer install --no-dev --optimize-autoloader
corepack pnpm install --frozen-lockfile --prod=false && corepack pnpm run build:ssr
redis-cli -n 0 FLUSHDB && redis-cli -n 1 FLUSHDB
php artisan optimize:clear && php artisan optimize && php artisan up
```

Đường lui này chỉ trả **code và cấu hình** về bản cũ. Database cũ đã bị xóa ở B3
nên dữ liệu không quay lại được — bản cũ sẽ khởi động trên schema trống và phải
migrate lại từ đầu. Đây là cái giá đã chấp nhận khi chọn xóa sạch.

---

## 13. Vận hành

### Kiểm tra sức khỏe

```bash
curl -fsS https://yona.vn/up && echo OK

SUPERVISORCTL="/www/server/panel/pyenv/bin/supervisorctl -c /etc/supervisor/supervisord.conf"
$SUPERVISORCTL status yona-horizon yona-reverb

cd /www/wwwroot/yona.vn && corepack pnpm --dir services/zalo-bridge exec pm2 status
curl -fsS http://127.0.0.1:8612/ >/dev/null && echo "bridge OK"
```

### Log

```text
/www/wwwroot/yona.vn/storage/logs/laravel.log
/www/wwwroot/yona.vn/storage/logs/yona-horizon.log
/www/wwwroot/yona.vn/storage/logs/reverb.log
/www/wwwroot/yona.vn/storage/logs/scheduler.log
/www/wwwroot/yona.vn/storage/logs/zalo-bridge/{out,error}.log
```

Đọc qua giao diện: `/log-viewer` (chỉ super admin, chỉ `storage/logs`, không cho
xoá file). Qua CLI: `php artisan pail`.

### Cảnh báo vận hành

`App\Support\Alerts\OpsAlerter` là kênh cảnh báo duy nhất: gửi Telegram khi có
`ALERT_TELEGRAM_BOT_TOKEN` + `ALERT_TELEGRAM_CHAT_ID` (`.env`), rơi về ghi log
(`storage/logs`) khi chưa cấu hình. Tạo bot bằng
[@BotFather](https://t.me/BotFather), lấy chat id bằng cách nhắn bot rồi gọi
`https://api.telegram.org/bot<token>/getUpdates`.

**Chỉ id, mã lỗi, số đếm — không bao giờ số điện thoại hay nội dung tin nhắn
khách** đi vào cảnh báo. Đây là bất biến khi thêm điểm cảnh báo mới, không phải
gợi ý.

Dedup: một chữ ký (job lỗi = lớp job + lớp exception, KHÔNG phải nội dung
message vì message mang id/timestamp riêng mỗi lần; Horizon chờ lâu =
connection + queue; trạng thái tiến trình = tên tiến trình) chỉ gửi tối đa 1
tin/15 phút. Một cơn bão lỗi (vd 20 job cùng loại lỗi liên tiếp) ra đúng một
tin Telegram; số lần bị gộp trong cửa sổ trước hiện ở tin kế tiếp sau khi cửa
sổ đó hết, không sửa lại tin Telegram cũ.

Các điểm cảnh báo:

| Sự kiện | Nơi xử lý | Ghi chú |
|---|---|---|
| Job lỗi hẳn (`JobFailed`) | `App\Listeners\Alerts\AlertOnJobFailure` | Gộp theo lớp job + lớp exception; tin chỉ có tên lớp, id job, tên hàng đợi |
| Hàng đợi chờ quá lâu (`LongWaitDetected`) | `App\Listeners\Alerts\AlertOnLongWaitDetected` | Ngưỡng ở `config/horizon.php` (`waits`), có `redis:critical` riêng cho tier Zalo/webhook |
| Kênh Zalo mất phiên đăng nhập | `App\Jobs\Zalo\ZaloHealthSweepJob` | Chỉ id kênh + mã lý do, không có tên/số điện thoại khách. Bỏ qua khi lý do là `bridge_down` — `monitor:check` đã báo bridge chết, một alert mỗi kênh chỉ là bão trùng lặp |
| Horizon / Reverb / zalo-bridge chết | `php artisan monitor:check` (mỗi phút, `routes/console.php`) | Chỉ báo khi ĐỔI trạng thái (down→up/up→down), không phải mỗi phút |

**`monitor:check` chết theo cùng máy chủ nếu cả server sập** — nó không thay
được một external uptime monitor. Việc founder phải tự làm, chưa có trong
code:

- **External uptime monitor** (UptimeRobot, BetterStack, …) bắn HTTP GET vào
  `https://yona.vn/up` mỗi vài phút — bắt được cả trường hợp scheduler/cron
  chết (lúc đó `monitor:check` cũng chết theo, im lặng luôn).
- **Sentry** (hoặc tương đương) cho exception tracking có context đầy đủ
  (stack trace, breadcrumb) — `OpsAlerter` chỉ báo "có lỗi", không thay được
  công cụ debug lỗi.

### Sự cố thường gặp

| Triệu chứng | Nguyên nhân hay gặp |
|---|---|
| Deploy dừng ở `Bundle i18n lệch lang/` | Ai đó sửa `lang/**` mà quên `php artisan i18n:generate` + commit |
| Giao diện đúng nhưng realtime chết | Reverb không chạy, hoặc `VITE_REVERB_*` lúc build khác `.env` hiện tại → build lại |
| Có lúc mất chuông thông báo / "đang gõ", `failed_jobs` có `Payload too large` | `REVERB_MAX_REQUEST_SIZE` quá nhỏ so với payload — mục 5, Giới hạn kích thước sự kiện realtime |
| Job không chạy sau deploy | `pcntl_*` còn bị chặn nên `horizon:terminate` vô hiệu → worker vẫn giữ code cũ. Mở `/horizon` xem master có sống không |
| Gửi Zalo báo "chưa kết nối" | Host của `APP_URL` không nằm trong allowlist fetch của bridge; hoặc session cần quét QR lại |
| Khách Zalo thấy khung video nhưng không phát được, hoặc `error.log` dồn dập bước `send_video` | Tắt video gốc bằng `ZALO_NATIVE_VIDEO=0` rồi nạp lại bridge; video đi dạng tệp như cũ (mục 6, Gửi video dạng video gốc) |
| Tin nhắn gửi hai lần | Bất biến `media_timeout < timeout < retry_after` bị phá (mục 8) |
| Job theo lịch nằm im | Sai tên hàng đợi trong `config/queue_tiers.php` → tab Horizon của tier đó trống |
| Deploy dừng vì working tree bẩn | Có file sửa trực tiếp trên server — commit hoặc `git checkout --` trước |
| Link lạ ra trang trắng chữ `nginx`, API lỗi trả HTML thay vì JSON | Vhost đang đè 404 của Laravel (`error_page 404` + `fastcgi_intercept_errors on`) — mục 7 |
| Ảnh trong hộp thư báo "Ảnh này không còn nữa." nhưng `/storage/...` vẫn mở được | Rule ảnh tĩnh của aaPanel nuốt URL `/attachments/.../*.jpg`, thiếu `location ^~ /attachments/` — mục 7 |
| Lượt xem bài Help Center đứng yên dù có người đọc | Rule ảnh tĩnh của aaPanel nuốt pixel `/hc/.../articles/*.png`, thiếu `location ^~ /hc/` — mục 7 |
| Nhân viên bị đăng xuất sau khoảng 2 giờ không thao tác | `.env` production còn `SESSION_LIFETIME=120` → `43200` rồi chạy `deploy.sh` (mục 5, Phiên đăng nhập) |
| Mọi người bị đăng xuất sau mỗi lần deploy | Phiên và cache chung một DB Redis (`REDIS_DB` = `REDIS_CACHE_DB` hoặc `SESSION_CONNECTION=cache`) — mục 5, Phiên đăng nhập |
| Danh sách phiên hiện IP Cloudflare, khách bị khoá đăng nhập vì lượt sai của người khác | Config cache cũ chưa có `config/trustedproxy.php`, hoặc IP edge nằm ngoài dải đã ghi → `php artisan trusted-proxies:refresh` ở máy dev, commit, deploy (mục 7, IP thật của khách) |
| Plausible không ghi lượt xem | `/yv/s` phải 200 JavaScript, `/yv/e` phải 202 và không có `x-plausible-dropped`; có header đó thì kiểm `PLAUSIBLE_CLIENT_IP_HEADER` (mục 5, Analytics) |
| Không thấy cảnh báo Telegram dù có sự cố thật | `ALERT_TELEGRAM_BOT_TOKEN`/`ALERT_TELEGRAM_CHAT_ID` trống → chỉ rơi về `storage/logs`; kiểm `.env` rồi `php artisan config:clear` (mục 13, Cảnh báo vận hành) |

### Tính lại loại tệp media lưu nhầm là tệp

Trước bản sửa chiều nhận, video (hoặc ảnh, âm thanh) khách gửi qua Zalo bằng
"gửi tệp" được lưu là tệp. Hộp thư hiện thẻ tệp .mp4 phải tải về thay vì trình
phát. Tin mới đã đúng. Tin cũ sửa bằng một lệnh trung tính: lệnh chỉ đụng đính
kèm tin nhắn đang là tệp, có tệp trên đĩa và có MIME xem trước được. Loại mới
lấy đúng luật của lõi (`Attachment::fileTypeFor`).

```bash
cd /www/wwwroot/yona.vn
# Đếm trước, in id từng đính kèm, không ghi gì
php artisan attachments:reclassify-media --dry-run
# Ghi thật
php artisan attachments:reclassify-media
# Chạy lại phải ra 0
php artisan attachments:reclassify-media --dry-run
```

Lệnh không đổi nội dung tệp. Chạy lại bao nhiêu lần cũng được.

### Bảng `messages` chia partition theo tháng

Migration `2026_10_01_100000_partition_messages_by_month` đổi `messages` thành
bảng chia theo tháng (`created_at`), khoá chính `(id, created_at)`, một partition
`messages_pYYYY_MM` mỗi tháng từ tháng cũ nhất có dữ liệu tới 3 tháng sau, cộng
`messages_default` hứng tin ngoài mọi tháng. Ba bảng trỏ vào tin
(`csat_survey_responses`, `message_access_tokens`,
`automation_rule_pending_executions`) có thêm cột `message_created_at` và khoá
ngoại ghép. Chạy trong một transaction, khoá ghi `messages` tới khi xong (vài
trăm tin: dưới một giây). `deploy.sh` chạy nó ở bước migration như mọi lần.

Trước deploy:

```bash
pg_dump -Fc -d yona -f /root/yona-truoc-partition-$(date +%F).dump
```

Sau deploy:

```bash
cd /www/wwwroot/yona.vn
# Phải ra một dòng messages | r
psql -d yona -c "SELECT partrelid::regclass, partstrat FROM pg_partitioned_table"
# Số tin trước và sau phải bằng nhau; tin chia vào các tháng
psql -d yona -c "SELECT tableoid::regclass, count(*) FROM messages GROUP BY 1 ORDER BY 1"
# Lệnh tạo tháng tới chạy lại được, lần hai phải báo "Không cần tạo partition mới"
php artisan messages:create-partitions --months=3
```

Scheduler chạy `messages:create-partitions --months=3` hằng ngày lúc 03:20.
Lệnh báo lỗi "Bỏ qua vì messages_default đang giữ tin của tháng đó" nghĩa là đã
có tin của tháng ấy rơi vào DEFAULT (lịch không chạy suốt nhiều tháng, hoặc tin
mang ngày ở tương lai xa). Tin vẫn ghi và đọc bình thường; chỉ tháng đó không có
partition riêng. Xem các tin đó bằng
`SELECT id, created_at FROM messages_default ORDER BY created_at DESC LIMIT 20`.

Rollback (phải chạy khi code mới **còn** trên server, vì file migration nằm ở đó;
giữ maintenance suốt quá trình vì code mới ghi `message_created_at`):

```bash
cd /www/wwwroot/yona.vn
php artisan down
php artisan migrate:status | tail -3                # migration partition phải là dòng cuối, không thì tăng --step
php artisan migrate:rollback --step=1 --force   # messages về bảng thường, dữ liệu giữ nguyên
# rồi về commit cũ theo mục Rollback ngay dưới, cuối cùng:
php artisan up
```

Rollback lỗi thì khôi phục từ bản `pg_dump` ở trên.

### Rollback

Không có release directory, nên rollback = deploy lại commit cũ:

```bash
cd /www/wwwroot/yona.vn
git log --oneline -10
git switch -C main --track origin/main   # nếu cần về đúng đầu branch
git reset --hard <commit-cu>
composer install --no-dev --optimize-autoloader
corepack pnpm install --frozen-lockfile --prod=false && corepack pnpm run build
php artisan optimize:clear && php artisan optimize
php artisan horizon:terminate && php artisan reverb:restart
/etc/init.d/php-fpm-84 reload
```

Migration **không** rollback tự động. Nếu commit cũ cần schema cũ thì phải khôi
phục từ `pg_dump` — đó là lý do luôn dump trước khi deploy có migration.


### Tự phục hồi đồng bộ IMAP (03/10/2026)

- `IMAP_READ_TIMEOUT=20`: timeout đọc/kết nối IMAP riêng, không dùng `SMTP_READ_TIMEOUT`.
- `IMAP_SLOW_FETCH_MS=10000`: ngưỡng chung cho log pha IMAP, cảnh báo `queue.job.slow` của job quét IMAP và thẻ Slow Jobs trong Pulse. Job khác vẫn dùng `PULSE_SLOW_JOBS_THRESHOLD` (mặc định 1000 ms); thêm ngưỡng riêng cho job khác tại `config/pulse.php`, không rẽ nhánh theo kênh trong bộ ghi log.
- `IMAP_LOGOUT_TIMEOUT=2`: chờ phản hồi logout của phiên khỏe. Phiên lỗi đóng socket ngay, không NOOP/reconnect.
- `IMAP_RETRY_MAX_SECONDS=600`: khoảng chờ lỗi mạng tăng từ 60 giây, tối đa 600 giây cộng 0–15 giây jitter; lịch mỗi phút nên lượt thử thực tế được làm tròn tới nhịp scheduler tiếp theo.
- Giới hạn lượt fetch kiểm tra giữa các pha là 90 giây; job có timeout cứng 120 giây, lock 150 giây. Timeout socket là thời gian chờ đọc, không phải deadline tuyệt đối nếu server gửi nhỏ giọt. Worker phải bật xử lý timeout của Laravel (`pcntl`).
- Migration `2026_10_03_110000_add_imap_sync_state_to_channel_email` thêm JSONB nullable. Deploy migration trước khi worker chạy code mới. Không backfill thư hoặc sửa dữ liệu khách.
- `imap_sync_state` lưu định danh hộp thư, UIDVALIDITY, UID đã quét và UID còn phải thử. Lượt đầu giữ cửa sổ SINCE hiện tại; các lượt sau lấy UID mới nên outage nhiều ngày không làm thư mới rơi ra ngoài cửa sổ. UIDVALIDITY đổi thì quét lại INBOX theo lô, chống trùng theo Message-ID.
- Cờ cấp quyền lại từ bản cũ có lỗi gần nhất là `connection` được coi là có thể phục hồi. Không cần xóa Redis hàng loạt. Lỗi xác thực vẫn yêu cầu người dùng kết nối lại.
- Nghiệm thu production sau deploy: theo dõi từng pha, trạng thái lỗi, khoảng chờ; thử một email có Message-ID biết trước trên inbox được phép và đối chiếu DB. Chưa đo được tuyến mạng production qua cổng SSH chỉ cho status/deploy/log; cần thao tác trên server hoặc bổ sung một hành động chẩn đoán chỉ đọc riêng để đo DNS/TCP/TLS/IPv4/IPv6.

## 14. Cuộc gọi (LiveKit)

Cuộc gọi thoại, video và chia sẻ màn hình (phòng thoại nhóm, gọi 1-1) đi qua `livekit-server` tự cài trên cùng server. Laravel cấp vé, mở và đóng phòng, nhận webhook; media đi thẳng giữa trình duyệt và LiveKit. **Chưa cấu hình thì mọi nút gọi tự ẩn** (`globalConfig.callsEnabled`), nên deploy code trước khi cài LiveKit vẫn an toàn.

### 14.1 Đo trước khi bật

Kiểm trước, chưa thay đổi gì:

```bash
nproc; free -m; uptime
# Băng thông thực tế (cài speedtest-cli nếu chưa có):
speedtest-cli --simple
```

Ước lượng thô từ local: 3 người, 2 camera 640×360 và 1 màn hình tốn khoảng 12 Mbit/s tổng và khoảng 6% một nhân. Phòng nhóm tối đa 25 người. Nếu băng thông lên dưới khoảng 100 Mbit/s thì hạ trần khi bật camera, quyết định cùng founder.

### 14.2 Cài binary

```bash
LK_VERSION=1.13.10   # cùng bản đã nghiệm thu ở local
curl -fsSL -o /tmp/livekit.tar.gz   "https://github.com/livekit/livekit/releases/download/v${LK_VERSION}/livekit_${LK_VERSION}_linux_amd64.tar.gz"
tar -xzf /tmp/livekit.tar.gz -C /usr/local/bin livekit-server
livekit-server --version
```

### 14.3 `.env` production

```dotenv
MEDIA_PROVIDER=livekit
LIVEKIT_PORT=7880
LIVEKIT_URL=wss://rtc.yona.vn
LIVEKIT_API_KEY=        # livekit-server generate-keys
LIVEKIT_API_SECRET=
LIVEKIT_TURN_DOMAIN=    # turn.yona.vn, xem 14.6
LIVEKIT_TURN_CERT_FILE=
LIVEKIT_TURN_KEY_FILE=
```

Laravel gọi API phòng qua cùng địa chỉ (`https://rtc.yona.vn`). Sau khi sửa thì chạy `php artisan config:cache`.

### 14.4 Supervisor

Tạo `/etc/supervisor/conf.d/yona-livekit.conf`, chạy cạnh `yona-reverb`:

```ini
[program:yona-livekit]
command=/bin/bash /www/wwwroot/yona.vn/services/livekit/production.sh
directory=/www/wwwroot/yona.vn
user=www
autostart=true
autorestart=true
stopsignal=TERM
stopwaitsecs=30
stdout_logfile=/www/wwwroot/yona.vn/storage/logs/livekit.log
redirect_stderr=true
```

```bash
SUPERVISORCTL="/www/server/panel/pyenv/bin/supervisorctl -c /etc/supervisor/supervisord.conf"
$SUPERVISORCTL reread && $SUPERVISORCTL update && $SUPERVISORCTL status yona-livekit
```

`production.sh` tự kiểm: thiếu key, `APP_URL` không phải https hoặc chưa cài binary thì dừng với thông báo rõ. Cấu hình cố định trong script:

- `room.auto_create: false`: phòng chỉ mở qua `CallService`, vé cũ không dựng lại được phòng đã đóng.
- `use_external_ip: true`.
- Dải UDP 50000–60000, ICE TCP 7881, TURN/UDP 3478.
- Webhook về `APP_URL/webhooks/media/livekit`.

### 14.5 DNS (Cloudflare)

DNS của `yona.vn` nằm ở Cloudflare; `yona.vn` bật proxy. Thêm hai bản ghi A trỏ về IP server, **DNS only (đám mây xám)**: proxy Cloudflare không chuyển UDP và không chuyển TURN.

| Type | Name | Nội dung | Proxy |
|---|---|---|---|
| A | `rtc` | IP server | DNS only |
| A | `turn` | IP server | DNS only |

Kiểm: `dig +short rtc.yona.vn turn.yona.vn` ra đúng IP server.

### 14.5b Nginx: `wss://rtc.yona.vn`

Thêm tên miền `rtc.yona.vn` trong aaPanel, cấp chứng chỉ, rồi thêm vào vhost của tên miền đó:

```nginx
location / {
    proxy_pass http://127.0.0.1:7880;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_read_timeout 86400s;
    proxy_send_timeout 86400s;
}
```

Cổng 7880 **không** mở ra ngoài, chỉ nginx gọi vào.

### 14.6 Firewall (aaPanel và nhà cung cấp VPS)

| Cổng | Giao thức | Dùng cho |
|---|---|---|
| 7881 | TCP | ICE TCP (mạng chặn UDP) |
| 50000–60000 | UDP | Media WebRTC |
| 3478 | UDP | TURN/UDP |
| 7880 | — | **Không mở**, nginx proxy |

**TURN/TLS: founder chốt 21/10/2026 là để sau**, bật LiveKit trước với UDP + ICE TCP 7881. LiveKit luôn quảng bá TURN/TLS dạng `turns:<LIVEKIT_TURN_DOMAIN>:443`. Mạng công ty chặn hết UDP và chỉ cho 443 thì phải tới được LiveKit qua `turn.yona.vn:443`. Cổng 443 trên server đang là nginx, nên có hai cách:

1. Thêm một IP công khai thứ hai cho TURN. Đơn giản nhất, có thể tốn phí VPS.
2. Chuyển nginx sang `stream` + `ssl_preread`: tách theo tên miền ở cổng 443, `turn.yona.vn` vào LiveKit `5349`, còn lại vào vhost web (dời sang 8443 nội bộ). Đây là đổi cấu hình nginx chính, rủi ro cho mọi trang.

Chưa chọn thì để trống ba biến `LIVEKIT_TURN_*`: TURN/TLS tắt, cuộc gọi vẫn chạy qua UDP và ICE TCP 7881.

### 14.7 Kiểm sống sau khi bật

```bash
curl -fsS http://127.0.0.1:7880 && echo                 # LiveKit trả "OK"
curl -fsSI https://rtc.yona.vn | head -1                  # qua nginx
grep -c "webhooks/media/livekit" storage/logs/laravel.log # webhook về tới
```

Rồi gọi thử giữa hai thiết bị ở hai mạng khác nhau (4G và wifi).

### 14.8 Quay lại

```bash
$SUPERVISORCTL stop yona-livekit
sed -i 's/^MEDIA_PROVIDER=.*/MEDIA_PROVIDER=/' .env && php artisan config:cache
```

Nút gọi ẩn ngay; nhóm chat và tin nhắn không bị ảnh hưởng. Job đối soát chỉ chạy khi đã cấu hình, nên các cuộc gọi đang mở phải khép tay. Nếu không, lần bật lại sau, người đang có cuộc 1-1 treo sẽ bị báo "đang bận":

```bash
php artisan tinker --execute="
DB::table('call_participants')->whereNull('left_at')->update(['left_at' => now()]);
DB::table('calls')->whereNull('ended_at')->where('status', 'ringing')->update(['status' => 'missed', 'ended_at' => now()]);
DB::table('calls')->whereNull('ended_at')->where('status', 'active')->update(['status' => 'ended', 'ended_at' => now()]);
DB::table('calls')->whereNull('ended_at')->update(['ended_at' => now()]);"
```

