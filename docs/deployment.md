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

Backup khi bạn thấy cần (script không tự dump):

```bash
sudo -u postgres /www/server/pgsql/bin/pg_dump -Fc yona > /www/backup/yona-$(date +%F-%H%M).dump
```

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
```

`deploy.sh` bắt `BRIDGE_HTTP_HOST=127.0.0.1` và `LARAVEL_WEBHOOK_URL` phải là
HTTPS. Bridge không bao giờ expose thẳng ra Internet. `BRIDGE_ELEVATED_SECRET`
để trống = không bao giờ cho phép nhóm method destructive (fail-closed).

### Sống sót qua reboot

`deploy.sh` tự đăng ký pm2 vào systemd (`pm2 startup systemd` + `pm2 save`) cho
đúng user đang chạy deploy, và bỏ qua nếu unit đã tồn tại. Nếu deploy bằng user
không phải root, script in ra lệnh `sudo pm2 startup …` cần chạy một lần.

Nếu máy đã có unit `pm2-*` của user khác, script cảnh báo — hai daemon pm2 cùng
dựng bridge là chạy trùng.

Kiểm tra: `systemctl is-enabled pm2-root`.

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
chính đoạn cuối URL, như Chatwoot. Nên sửa ở nginx:
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
`config/horizon.php`. Số worker tối đa đặt bằng `HORIZON_MAX_PROCESSES` trong
`.env` (mặc định 4), không còn `DEPLOY_QUEUE_PROCESSES`.

Danh sách tier queue nằm ở `config/queue_tiers.php` — Horizon (production) và
`Makefile` (dev) đọc cùng file đó, sửa một chỗ là đủ. `balance` để `false` nên
worker quét tuần tự từ `critical` xuống `purgable`, đúng như `queue:work
--queue=...` trước đây; bật balance sẽ chia process theo hàng đợi và **mất ưu
tiên tuyệt đối**.

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
| `/log-viewer` | `storage/logs/*.log` qua giao diện | File log của chính app |

Cả ba **chặn sau guard `super_admin`** (`auth:super_admin`), khách lạ bị đẩy về
`/super_admin/sign_in`. Nghiệm thu: đăng nhập bằng tài khoản agent thường rồi mở
`/log-viewer` — phải không vào được.

Lưu ý vận hành:

- **Horizon chỉ hiển thị, không cảnh báo.** Worker chết vẫn phải có thứ khác báo
  (issue #38).
- `horizon:snapshot` chạy 5 phút/lần qua scheduler; thiếu nó thì tab Metrics
  trống.
- **Pulse ghi thẳng vào PostgreSQL dùng chung với dữ liệu khách.** Recorder bắn
  theo mỗi request/job/cache-hit đã lấy mẫu 10% (`PULSE_*_SAMPLE_RATE`).
  `pulse:trim` chạy mỗi giờ. Thấy độ trễ request tăng thì hạ sample rate hoặc
  `PULSE_ENABLED=false`. Pulse ghi *pattern* route (`.../{website_token}`) chứ
  không ghi URL thật, nên token không rơi vào bảng.
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

---


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

Rồi đăng nhập `/superadmin`, tạo workspace đầu tiên, và **quét lại QR Zalo** cho
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

Đăng nhập `/superadmin` → tạo workspace → mời người dùng → vào phần inbox quét QR
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

### Sự cố thường gặp

| Triệu chứng | Nguyên nhân hay gặp |
|---|---|
| Deploy dừng ở `Bundle i18n lệch lang/` | Ai đó sửa `lang/**` mà quên `php artisan i18n:generate` + commit |
| Giao diện đúng nhưng realtime chết | Reverb không chạy, hoặc `VITE_REVERB_*` lúc build khác `.env` hiện tại → build lại |
| Job không chạy sau deploy | `pcntl_*` còn bị chặn nên `horizon:terminate` vô hiệu → worker vẫn giữ code cũ. Mở `/horizon` xem master có sống không |
| Gửi Zalo báo "chưa kết nối" | Host của `APP_URL` không nằm trong allowlist fetch của bridge; hoặc session cần quét QR lại |
| Tin nhắn gửi hai lần | Bất biến `media_timeout < timeout < retry_after` bị phá (mục 8) |
| Job theo lịch nằm im | Sai tên hàng đợi trong `config/queue_tiers.php` → tab Horizon của tier đó trống |
| Deploy dừng vì working tree bẩn | Có file sửa trực tiếp trên server — commit hoặc `git checkout --` trước |
| Link lạ ra trang trắng chữ `nginx`, API lỗi trả HTML thay vì JSON | Vhost đang đè 404 của Laravel (`error_page 404` + `fastcgi_intercept_errors on`) — mục 7 |
| Ảnh trong hộp thư báo "Ảnh này không còn nữa." nhưng `/storage/...` vẫn mở được | Rule ảnh tĩnh của aaPanel nuốt URL `/attachments/.../*.jpg`, thiếu `location ^~ /attachments/` — mục 7 |
| Lượt xem bài Help Center đứng yên dù có người đọc | Rule ảnh tĩnh của aaPanel nuốt pixel `/hc/.../articles/*.png`, thiếu `location ^~ /hc/` — mục 7 |

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
