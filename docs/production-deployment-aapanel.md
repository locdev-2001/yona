# Production Deployment — Ubuntu 24.04 + aaPanel

Runbook này là bản ghi của production `yona.vn`, triển khai trực tiếp bằng
`deploy.sh` (không CI/CD, không release directory, không code backup tự động).
Nó cũng là checklist dựng lại server mới theo cùng cấu hình.

## 1. Kiến trúc production chuẩn

| Thành phần | Cấu hình |
|---|---|
| OS | Ubuntu 24.04 LTS |
| App root | `/www/wwwroot/yona.vn` |
| Domain | `https://yona.vn` và `https://www.yona.vn` |
| Web server | aaPanel Nginx |
| PHP | aaPanel PHP 8.4, `/www/server/php/84/bin/php` |
| PHP-FPM | `/etc/init.d/php-fpm-84` |
| Database | aaPanel PostgreSQL, `/www/server/pgsql`, port `5432` |
| Cache/queue/session | Redis `127.0.0.1:6379` |
| Queue | Horizon dưới Supervisor |
| Realtime | Reverb dưới Supervisor, `127.0.0.1:8611` |
| SSR | Inertia SSR dưới Supervisor, port `13714` |
| Zalo Bridge | PM2, `127.0.0.1:8612` |
| Deploy user | `root` (chủ đích theo cấu hình aaPanel hiện tại) |
| PHP runtime group | `www` |

Luồng request:

```text
Internet -> Nginx 443 -> public/index.php -> PHP-FPM 8.4
                    |-> /app/*, /apps/* -> Reverb :8611
Laravel -> Redis -> Horizon
Laravel -> Inertia SSR :13714
Laravel <-> Zalo Bridge :8612 -> Zalo
```

## 2. Yêu cầu hệ thống

### Phiên bản đã xác minh

```bash
/www/server/php/84/bin/php -v       # PHP 8.4.x
composer --version                  # Composer 2.x
node --version                      # Node 22.x
corepack --version
corepack pnpm --version             # lấy pnpm 10.26.1 từ package.json
```

Luôn dùng `corepack pnpm` trong repo. Không đổi pnpm global của các dự án khác.

### PHP extensions

Tối thiểu:

```text
bcmath curl dom fileinfo gd intl mbstring openssl pcntl
pdo_pgsql pgsql redis sodium xml zip Zend OPcache
```

Kiểm tra:

```bash
/www/server/php/84/bin/php -m | grep -Ei 'fileinfo|opcache|pdo_pgsql|pgsql|redis|pcntl'
```

### PHP functions phải được mở

aaPanel thường đặt chúng trong `disable_functions` của
`/www/server/php/84/etc/php.ini`. Yona/Composer/Horizon cần mở:

```text
exec
putenv
proc_open
readlink
symlink
pcntl_alarm
pcntl_signal
pcntl_sigprocmask
```

`shell_exec` không bắt buộc và hiện vẫn bị tắt. Vì vậy không dựa vào Tinker cho
provisioning production.

Sau khi sửa PHP config:

```bash
/etc/init.d/php-fpm-84 reload
composer --version
```

## 3. SSH GitHub và checkout trực tiếp

Server dùng SSH alias riêng cho tài khoản `locdev-2001`:

```sshconfig
Host github-locdev
    HostName github.com
    User git
    IdentityFile ~/.ssh/locdev2001
```

Kiểm tra:

```bash
ssh -T git@github-locdev
git ls-remote git@github-locdev:locflamedia/cho-rach-management.git HEAD
```

aaPanel đã tạo `/www/wwwroot/yona.vn`, `.user.ini`, `.well-known/` và SSL. Không
xóa vhost/certificate để clone. Checkout repo trực tiếp vào thư mục có sẵn:

```bash
git config --global --add safe.directory /www/wwwroot/yona.vn
git -C /www/wwwroot/yona.vn init
git -C /www/wwwroot/yona.vn remote add origin git@github-locdev:locflamedia/cho-rach-management.git
git -C /www/wwwroot/yona.vn fetch origin main
git -C /www/wwwroot/yona.vn switch -C main --track origin/main
```

Repo đã ignore `/.user.ini`, `/.well-known/`, `/public/storage`, build frontend
và bundle SSR. `deploy.sh` từ chối chạy nếu còn source tracked/untracked ngoài
các rule này.

## 4. PostgreSQL: hai role, không superuser

Yona bắt buộc tách:

- `yona_app`: connection runtime, không superuser, không bypass RLS.
- `yona_owner`: owner/migration và các privileged seam đã kiểm soát; không
  superuser nhưng **phải `BYPASSRLS`** theo kiến trúc RLS của dự án.

Xác định đúng PostgreSQL aaPanel:

```bash
ps -eo user,pid,command | grep '[p]ostgres'
sudo -u postgres /www/server/pgsql/bin/psql -d postgres -Atc "SHOW port; SHOW unix_socket_directories;"
```

Kết quả production hiện tại: port `5432`, socket `/tmp`.

### Tạo database/role mới

Tạo `.env` trước (mục 5), sinh hai mật khẩu rồi đọc kín từ file:

```bash
sed -i "s/^DB_PASSWORD=$/DB_PASSWORD=$(openssl rand -hex 32)/" /www/wwwroot/yona.vn/.env
sed -i "s/^DB_PRIVILEGED_PASSWORD=$/DB_PRIVILEGED_PASSWORD=$(openssl rand -hex 32)/" /www/wwwroot/yona.vn/.env
```

Tạo owner:

```bash
YONA_OWNER_PASSWORD="$(sed -n 's/^DB_PRIVILEGED_PASSWORD=//p' /www/wwwroot/yona.vn/.env)"; test -n "$YONA_OWNER_PASSWORD" && printf "CREATE ROLE yona_owner LOGIN PASSWORD '%s' NOSUPERUSER BYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION;\n" "$YONA_OWNER_PASSWORD" | sudo -u postgres /www/server/pgsql/bin/psql -v ON_ERROR_STOP=1 -d postgres
```

Tạo runtime role:

```bash
YONA_APP_PASSWORD="$(sed -n 's/^DB_PASSWORD=//p' /www/wwwroot/yona.vn/.env)"; test -n "$YONA_APP_PASSWORD" && printf "CREATE ROLE yona_app LOGIN PASSWORD '%s' NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION;\n" "$YONA_APP_PASSWORD" | sudo -u postgres /www/server/pgsql/bin/psql -v ON_ERROR_STOP=1 -d postgres
```

Tạo DB và khóa quyền mặc định:

```bash
sudo -u postgres /www/server/pgsql/bin/createdb --owner=yona_owner --encoding=UTF8 --template=template0 yona
sudo -u postgres /www/server/pgsql/bin/psql -d postgres -v ON_ERROR_STOP=1 -c "REVOKE ALL ON DATABASE yona FROM PUBLIC;"
sudo -u postgres /www/server/pgsql/bin/psql -d postgres -v ON_ERROR_STOP=1 -c "GRANT CONNECT ON DATABASE yona TO yona_app;"
sudo -u postgres /www/server/pgsql/bin/psql -d yona -v ON_ERROR_STOP=1 -c "GRANT USAGE ON SCHEMA public TO yona_app;"
```

Mọi object do migration tạo sau này tự cấp quyền cho runtime role:

```bash
sudo -u postgres /www/server/pgsql/bin/psql -d yona -v ON_ERROR_STOP=1 -c "ALTER DEFAULT PRIVILEGES FOR ROLE yona_owner IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO yona_app;"
sudo -u postgres /www/server/pgsql/bin/psql -d yona -v ON_ERROR_STOP=1 -c "ALTER DEFAULT PRIVILEGES FOR ROLE yona_owner IN SCHEMA public GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO yona_app;"
```

Sau khi restore database cũ, cấp lại quyền cho object đã tồn tại:

```bash
sudo -u postgres /www/server/pgsql/bin/psql -d yona -v ON_ERROR_STOP=1 -c "GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO yona_app;"
sudo -u postgres /www/server/pgsql/bin/psql -d yona -v ON_ERROR_STOP=1 -c "GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO yona_app;"
```

Xác minh role (kỳ vọng `yona_owner: rolsuper=f, rolbypassrls=t` và
`yona_app: rolsuper=f, rolbypassrls=f`):

```bash
sudo -u postgres /www/server/pgsql/bin/psql -d postgres -x -c "SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname IN ('yona_owner','yona_app');"
```

Không chạy `migrate:fresh`, `db:wipe`, `migrate:reset` hoặc rollback phá dữ
liệu. Xem [database-safety.md](database-safety.md).

## 5. Laravel production environment

```bash
cp --update=none /www/wwwroot/yona.vn/.env.production.example /www/wwwroot/yona.vn/.env
chown root:www /www/wwwroot/yona.vn/.env
chmod 640 /www/wwwroot/yona.vn/.env
```

Các giá trị nền tảng:

```dotenv
APP_ENV=production
APP_DEBUG=false
APP_TIMEZONE=Asia/Ho_Chi_Minh
APP_URL=https://yona.vn

DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=yona
DB_USERNAME=yona_app
DB_PRIVILEGED_USERNAME=yona_owner

SESSION_DRIVER=redis
QUEUE_CONNECTION=redis
CACHE_STORE=redis
BROADCAST_CONNECTION=reverb

REVERB_HOST=yona.vn
REVERB_PORT=443
REVERB_SCHEME=https
REVERB_SERVER_HOST=127.0.0.1
REVERB_SERVER_PORT=8611

INERTIA_SSR_ENABLED=true
INERTIA_SSR_URL=http://127.0.0.1:13714

HORIZON_MAX_PROCESSES=4
TELESCOPE_ENABLED=false
PULSE_ENABLED=false
LOG_VIEWER_ENABLED=false
```

Sinh secrets mà không ghi giá trị cố định vào Git:

```bash
sed -i "s|^APP_KEY=$|APP_KEY=base64:$(openssl rand -base64 32)|" /www/wwwroot/yona.vn/.env
sed -i "s/^REVERB_APP_ID=$/REVERB_APP_ID=$(openssl rand -hex 8)/" /www/wwwroot/yona.vn/.env
sed -i "s/^REVERB_APP_KEY=$/REVERB_APP_KEY=$(openssl rand -hex 16)/" /www/wwwroot/yona.vn/.env
sed -i "s/^REVERB_APP_SECRET=$/REVERB_APP_SECRET=$(openssl rand -hex 32)/" /www/wwwroot/yona.vn/.env
sed -i "s/^WIDGET_CHANNEL_INBOUND_SECRET=$/WIDGET_CHANNEL_INBOUND_SECRET=$(openssl rand -hex 32)/" /www/wwwroot/yona.vn/.env
sed -i "s/^ZALO_BRIDGE_WEBHOOK_SECRET=$/ZALO_BRIDGE_WEBHOOK_SECRET=$(openssl rand -hex 32)/" /www/wwwroot/yona.vn/.env
sed -i "s/^ZALO_BRIDGE_SEND_SECRET=$/ZALO_BRIDGE_SEND_SECRET=$(openssl rand -hex 32)/" /www/wwwroot/yona.vn/.env
sed -i "s/^ZALO_BRIDGE_UI_SECRET=$/ZALO_BRIDGE_UI_SECRET=$(openssl rand -hex 32)/" /www/wwwroot/yona.vn/.env
```

Chỉ `SENTRY_LARAVEL_DSN=` được phép trống trong Laravel `.env` nếu chưa dùng
Sentry:

```bash
grep -nE '^[A-Z][A-Z0-9_]*=$' /www/wwwroot/yona.vn/.env
```

## 6. Zalo Bridge environment

```bash
cp --update=none /www/wwwroot/yona.vn/services/zalo-bridge/.env.production.example /www/wwwroot/yona.vn/services/zalo-bridge/.env
chmod 600 /www/wwwroot/yona.vn/services/zalo-bridge/.env
```

Đồng bộ ba secret; không tự sinh bộ thứ hai:

```bash
YONA_SECRET="$(sed -n 's/^ZALO_BRIDGE_WEBHOOK_SECRET=//p' /www/wwwroot/yona.vn/.env)"; test -n "$YONA_SECRET" && sed -i "s/^LARAVEL_WEBHOOK_SECRET=$/LARAVEL_WEBHOOK_SECRET=$YONA_SECRET/" /www/wwwroot/yona.vn/services/zalo-bridge/.env
YONA_SECRET="$(sed -n 's/^ZALO_BRIDGE_SEND_SECRET=//p' /www/wwwroot/yona.vn/.env)"; test -n "$YONA_SECRET" && sed -i "s/^BRIDGE_SEND_SECRET=$/BRIDGE_SEND_SECRET=$YONA_SECRET/" /www/wwwroot/yona.vn/services/zalo-bridge/.env
YONA_SECRET="$(sed -n 's/^ZALO_BRIDGE_UI_SECRET=//p' /www/wwwroot/yona.vn/.env)"; test -n "$YONA_SECRET" && sed -i "s/^BRIDGE_UI_SECRET=$/BRIDGE_UI_SECRET=$YONA_SECRET/" /www/wwwroot/yona.vn/services/zalo-bridge/.env
```

`BRIDGE_ELEVATED_SECRET` và `BRIDGE_FETCH_HOST_ALLOWLIST` có thể để trống.
Bridge bắt buộc listen `127.0.0.1`, không expose trực tiếp ra Internet.

Chi tiết session/QR/health: [zalo-bridge/deployment.md](zalo-bridge/deployment.md).

## 7. Nginx aaPanel — giữ nguyên SSL

Vhost chính:

```text
/www/server/panel/vhost/nginx/yona.vn.conf
```

Chỉ đổi document root:

```nginx
root /www/wwwroot/yona.vn/public;
include enable-php-84.conf;
```

Không xóa/chỉnh đường dẫn certificate do aaPanel quản lý. Tạo file extension:

```text
/www/server/panel/vhost/nginx/extension/yona.vn/laravel-runtime.conf
```

Nội dung:

```nginx
location / {
    try_files $uri $uri/ /index.php?$query_string;
}

location ^~ /app {
    proxy_pass http://127.0.0.1:8611;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
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

Kiểm tra rồi reload:

```bash
/www/server/nginx/sbin/nginx -t
/etc/init.d/nginx reload
```

## 8. Supervisor: Horizon, Reverb, Inertia SSR

aaPanel Supervisor hiện dùng:

```text
/www/server/panel/pyenv/bin/supervisord -c /etc/supervisor/supervisord.conf
/etc/supervisor/conf.d/*.conf
```

### `/etc/supervisor/conf.d/yona-horizon.conf`

```ini
[program:yona-horizon]
directory=/www/wwwroot/yona.vn
command=/www/server/php/84/bin/php artisan horizon --no-interaction
user=www
autostart=true
autorestart=true
startsecs=5
startretries=5
stopwaitsecs=3600
stopasgroup=true
killasgroup=true
redirect_stderr=true
stdout_logfile=/www/wwwroot/yona.vn/storage/logs/horizon.log
stdout_logfile_maxbytes=20MB
stdout_logfile_backups=5
umask=002
environment=HOME="/home/www",USER="www",PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
```

### `/etc/supervisor/conf.d/yona-reverb.conf`

```ini
[program:yona-reverb]
directory=/www/wwwroot/yona.vn
command=/www/server/php/84/bin/php artisan reverb:start --host=127.0.0.1 --port=8611 --no-interaction
user=www
autostart=true
autorestart=true
startsecs=5
startretries=5
stopwaitsecs=30
stopasgroup=true
killasgroup=true
redirect_stderr=true
stdout_logfile=/www/wwwroot/yona.vn/storage/logs/reverb.log
stdout_logfile_maxbytes=20MB
stdout_logfile_backups=5
umask=002
environment=HOME="/home/www",USER="www",PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
```

### `/etc/supervisor/conf.d/yona-ssr.conf`

```ini
[program:yona-ssr]
directory=/www/wwwroot/yona.vn
command=/www/server/php/84/bin/php artisan inertia:start-ssr --no-interaction
user=www
autostart=true
autorestart=true
startsecs=5
startretries=5
stopwaitsecs=30
stopasgroup=true
killasgroup=true
redirect_stderr=true
stdout_logfile=/www/wwwroot/yona.vn/storage/logs/ssr.log
stdout_logfile_maxbytes=20MB
stdout_logfile_backups=5
umask=002
environment=HOME="/home/www",USER="www",PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
```

Nạp config:

```bash
/www/server/panel/pyenv/bin/supervisorctl -c /etc/supervisor/supervisord.conf reread
/www/server/panel/pyenv/bin/supervisorctl -c /etc/supervisor/supervisord.conf update
/www/server/panel/pyenv/bin/supervisorctl -c /etc/supervisor/supervisord.conf status yona-horizon yona-reverb yona-ssr
```

## 9. Laravel Scheduler

Tạo `/etc/cron.d/yona-scheduler`:

```cron
* * * * * www cd /www/wwwroot/yona.vn && /www/server/php/84/bin/php artisan schedule:run >> /www/wwwroot/yona.vn/storage/logs/scheduler.log 2>&1
```

File phải là `root:root 0644`:

```bash
chown root:root /etc/cron.d/yona-scheduler
chmod 0644 /etc/cron.d/yona-scheduler
```

## 10. First deploy và deploy hằng ngày

Dry-run lần đầu:

```bash
cd /www/wwwroot/yona.vn
DEPLOY_DRY_RUN=1 DEPLOY_HEALTHCHECK=0 ./deploy.sh
```

Deploy thật:

```bash
cd /www/wwwroot/yona.vn
./deploy.sh
```

Script thực hiện theo thứ tự:

1. Lock chống deploy đồng thời và kiểm tra Git sạch.
2. Fetch + fast-forward only; không reset, không rewrite history.
3. Bật maintenance (first deploy chưa có vendor thì bỏ qua).
4. `composer install --no-dev` và pnpm frozen install.
5. Build frontend + SSR.
6. Forward-only migrations bằng `pgsql_privileged`.
7. Đồng bộ permission catalogs.
8. Cache Laravel, restart Zalo Bridge qua PM2.
9. Chuẩn hóa `.env` thành `root:www 640`; sửa quyền runtime cho group `www`.
10. Graceful restart Horizon, Reverb, SSR; reload PHP-FPM.
11. Tắt maintenance và health-check `https://yona.vn/up`.

Nếu lỗi, script giữ maintenance mode. Sửa nguyên nhân rồi chạy lại; không chạy
`artisan up` trước khi xác minh.

### Seeder trong deploy

- `PlatformPermissionSeeder`: catalog code là nguồn chuẩn; `syncPermissions()`
  ghi lại mapping của role chuẩn và xóa permission guard `web` không còn trong
  enum. Custom permission sửa trực tiếp trong DB có thể bị xóa.
- `AdminPermissionSeeder`: ghi lại mapping của platform roles.
- `PlanSeeder`: mặc định không chạy. Chỉ bật có chủ đích bằng
  `DEPLOY_SEED_PLANS=1 ./deploy.sh`.

Bootstrap data/tài khoản theo cấu hình hiện tại được chạy một lần:

```bash
php artisan db:seed --class=FoundationSeeder --force --no-interaction
```

Seeder này tạo `admin@gmail.com`, workspace `yona`, lookup defaults và email
templates. Không thêm nó vào deploy hằng ngày nếu không cần bootstrap lại.

## 11. PM2 và Zalo session

`deploy.sh` chạy `startOrReload` process `zalo-personal-bridge`. Sau first deploy:

```bash
pm2 status
pm2 save
systemctl is-enabled pm2-root
```

Nếu chưa có startup service:

```bash
pm2 startup systemd -u root --hp /root
pm2 save
```

Sau reboot, kiểm tra bridge và login state:

```bash
curl http://127.0.0.1:8612/
pm2 logs zalo-personal-bridge --lines 100
```

Các file `.sessions/c{id}.json` là trạng thái đăng nhập Zalo. Mất chúng thì phải
scan QR lại.

## 12. Health checklist

```bash
curl -fsS https://yona.vn/up
cd /www/wwwroot/yona.vn && php artisan horizon:status
cd /www/wwwroot/yona.vn && php artisan inertia:check-ssr
/www/server/panel/pyenv/bin/supervisorctl -c /etc/supervisor/supervisord.conf status yona-horizon yona-reverb yona-ssr
pm2 status
ss -ltnp | grep -E ':(8612|8611|13714)'
/www/server/nginx/sbin/nginx -t
```

Kỳ vọng:

- `/up` HTTP 200.
- Horizon `running`.
- Inertia SSR `running`.
- Supervisor cả ba process `RUNNING`.
- Bridge PM2 `online`.
- `8612` và `8611` chỉ bind `127.0.0.1`; SSR ở port `13714`.

Log vận hành:

```text
/www/wwwlogs/yona.vn.error.log
/www/wwwroot/yona.vn/storage/logs/laravel-YYYY-MM-DD.log
/www/wwwroot/yona.vn/storage/logs/horizon.log
/www/wwwroot/yona.vn/storage/logs/reverb.log
/www/wwwroot/yona.vn/storage/logs/ssr.log
/www/wwwroot/yona.vn/storage/logs/zalo-bridge/
```

## 13. Chuyển sang server mới

Phải mang theo:

1. PostgreSQL dump và khôi phục đúng owner/privileges.
2. Laravel `.env` (secret transfer an toàn, không gửi qua chat/Git).
3. `services/zalo-bridge/.env`.
4. `services/zalo-bridge/.sessions/` để tránh scan QR lại.
5. `storage/app/` nếu có upload/media người dùng.
6. SSL certificate hoặc cấp lại qua aaPanel.
7. Nginx extension, ba Supervisor configs và scheduler cron ở trên.

Không cần copy:

```text
vendor/
node_modules/
public/build/
bootstrap/ssr/
services/zalo-bridge/node_modules/
```

Các thư mục này được `deploy.sh` cài/build lại. Sau restore, chạy cấp quyền
`ALL TABLES/ALL SEQUENCES`, chạy `./deploy.sh`, nạp Supervisor, `pm2 save`, rồi
chạy health checklist trước khi chuyển traffic.

## 14. Sự cố thường gặp

### Composer báo `undefined function putenv/proc_open`

Mở các function ở mục 2 và reload PHP-FPM. Không tạo PHP binary/config tách nếu
server đã thống nhất cho phép chúng.

### `/up` trả 500 nhưng Laravel log không cập nhật

PHP-FPM `www` không ghi được runtime hoặc không đọc được `.env`:

```bash
chown root:www /www/wwwroot/yona.vn/.env
chmod 640 /www/wwwroot/yona.vn/.env
chgrp -R www /www/wwwroot/yona.vn/storage /www/wwwroot/yona.vn/bootstrap/cache
chmod -R ug+rwX /www/wwwroot/yona.vn/storage /www/wwwroot/yona.vn/bootstrap/cache
find /www/wwwroot/yona.vn/storage /www/wwwroot/yona.vn/bootstrap/cache -type d -exec chmod g+s {} +
```

`deploy.sh` hiện tự thực hiện phần này ở mỗi release.

### Horizon Supervisor RUNNING nhưng `horizon:status` inactive

Kiểm tra `.env` có đọc được bởi `www`:

```bash
sudo -u www /www/server/php/84/bin/php /www/wwwroot/yona.vn/artisan config:show horizon.prefix
```

Kỳ vọng `yona_horizon:`. Nếu ra `laravel_horizon:`, sửa `.env` thành
`root:www 640`, rồi restart Supervisor.

### SSR `window is not defined`

Source đã có browser guards. Pull bản mới, chạy deploy để build lại bundle, sau
đó:

```bash
/www/server/panel/pyenv/bin/supervisorctl -c /etc/supervisor/supervisord.conf restart yona-ssr
php artisan inertia:check-ssr
```

### Bridge báo connection refused ngay sau PM2 reload

Session restore xảy ra trước khi HTTP server listen. `deploy.sh` đã retry
connection-refused trong khoảng 30 giây. Nếu vẫn lỗi, xem PM2 log và bridge env.

### `public/storage` làm Git dirty

Symlink này đã được ignore. Không xóa; nó được `artisan storage:link` quản lý.
