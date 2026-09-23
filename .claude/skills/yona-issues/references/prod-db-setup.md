# Dựng quyền đọc DB production của yona.vn (chỉ đọc)

Founder tự chạy các bước trên server bằng root. AI không SSH vào server và không tự đổi gì ở production.
Sau khi xong, AI chỉ đọc được qua `scripts/prod-db.sh`, bằng role PostgreSQL chỉ có quyền SELECT.
DB của dash.yona.vn dựng riêng trong repo dash_yona (`scripts/prod-db-setup.md`).

```
máy dev ── ssh -L (user dbtunnel, key chỉ mở được 127.0.0.1:5432) ──▶ server ──▶ PostgreSQL yona
```

## Những gì bị chặn đọc

- Bảng phiên và token: `sessions`, `user_sessions`, `access_tokens`, `password_reset_tokens`,
  `personal_access_tokens`, `cache`, `cache_locks`.
- Ở mọi bảng khác, các cột có tên khớp mẫu sau bị ẩn:
  `token|secret|password|passwd|pass_key|credential|api_key|apikey|private_key|cookie|otp|auth_code|provider_config|hash|attachment_key|ticketkey|form_key|verification_key|key_id`.
  Với bảng có cột bị ẩn, `SELECT *` sẽ lỗi, phải chọn cột cụ thể (`prod-db.sh --describe <bảng>`).
- Bảng tạo sau lần cấp quyền gần nhất chưa đọc được. Deploy xong có bảng mới thì chạy lại bước 3
  (chạy lại được nhiều lần; muốn giữ mật khẩu cũ thì bỏ `PASSWORD :'pw'` khỏi dòng `ALTER ROLE`).

## 1. Tunnel user (một lần, dùng chung với dash)

Mỗi người một key, **một key dùng cho cả hai DB** (yona và dash). `<PUBKEY>` là nội dung `~/.ssh/yona_prod_db.pub`
ở máy người đó (chưa có thì `ssh-keygen -t ed25519 -N '' -C "yona-prod-db-<tên>" -f ~/.ssh/yona_prod_db`).
Mỗi key đúng **một dòng** mở cả hai cổng — hai dòng cho cùng một key thì SSH chỉ dùng dòng đầu.

```bash
id dbtunnel >/dev/null 2>&1 || useradd --system --create-home --shell /usr/sbin/nologin dbtunnel
install -d -m 700 -o dbtunnel -g dbtunnel ~dbtunnel/.ssh
echo 'restrict,port-forwarding,permitopen="127.0.0.1:5432",permitopen="127.0.0.1:3306" <PUBKEY>' >> ~dbtunnel/.ssh/authorized_keys
chown dbtunnel:dbtunnel ~dbtunnel/.ssh/authorized_keys && chmod 600 ~dbtunnel/.ssh/authorized_keys
sshd -T | grep -iE '^(allowtcpforwarding|allowusers|allowgroups)'   # forwarding phải là yes/local; có AllowUsers thì thêm dbtunnel
```

## 2. Sinh mật khẩu

```bash
YONA_RO_PW=$(openssl rand -hex 24)
YONA_DB=$(grep -E '^DB_DATABASE=' /www/wwwroot/yona.vn/.env | cut -d= -f2- | tr -d "\"'"); echo "$YONA_DB"
```

## 3. Role chỉ đọc + cấp quyền

```bash
sudo -u postgres /www/server/pgsql/bin/psql -v ON_ERROR_STOP=1 -d "$YONA_DB" \
  -v db="$YONA_DB" -v ro=yona_readonly -v pw="$YONA_RO_PW" <<'SQL'
SELECT format('CREATE ROLE %I LOGIN', :'ro') WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'ro') \gexec
ALTER ROLE :"ro" WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD :'pw';
ALTER ROLE :"ro" SET default_transaction_read_only = on;
ALTER ROLE :"ro" SET statement_timeout = '30s';
ALTER ROLE :"ro" SET idle_in_transaction_session_timeout = '60s';
GRANT CONNECT ON DATABASE :"db" TO :"ro";
GRANT USAGE ON SCHEMA public TO :"ro";
SELECT set_config('prod_db.ro', :'ro', false);
DO $$
DECLARE
  ro      text   := current_setting('prod_db.ro');
  secret  text   := '(token|secret|password|passwd|pass_key|credential|api_key|apikey|private_key|cookie|otp|auth_code|provider_config|hash|attachment_key|ticketkey|form_key|verification_key|key_id)';
  blocked text[] := ARRAY['sessions', 'user_sessions', 'access_tokens', 'password_reset_tokens', 'personal_access_tokens', 'cache', 'cache_locks'];
  rel     record;
  cols    text;
BEGIN
  FOR rel IN
    SELECT c.oid, c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p', 'v', 'm')
  LOOP
    -- Thu hồi cấp bảng cũng thu hồi quyền theo cột, nên mỗi lần chạy là cấp lại từ đầu.
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM %I', rel.relname, ro);
    CONTINUE WHEN rel.relname = ANY (blocked);

    SELECT string_agg(quote_ident(attname), ', ' ORDER BY attnum) INTO cols
    FROM pg_attribute
    WHERE attrelid = rel.oid AND attnum > 0 AND NOT attisdropped AND attname !~* secret;

    IF cols IS NOT NULL THEN
      EXECUTE format('GRANT SELECT (%s) ON TABLE public.%I TO %I', cols, rel.relname, ro);
    END IF;
  END LOOP;
END $$;
SQL
```

`pg_hba.conf` (aaPanel: `/www/server/pgsql/data/pg_hba.conf`) phải cho `yona_readonly` đăng nhập từ `127.0.0.1/32`
bằng mật khẩu — thường dòng mà `yona_app` đang dùng đã phủ; nếu không, thêm
`host yona yona_readonly 127.0.0.1/32 scram-sha-256` rồi reload PostgreSQL.

## 4. Đưa mật khẩu về máy dev

```bash
echo "PROD_DB_NAME=$YONA_DB"; echo "PROD_DB_PASSWORD=$YONA_RO_PW"
```

Dán vào nhóm `PROD_DB_*` trong `.env` của repo yona ở máy dev, rồi thử:

```bash
.claude/skills/yona-issues/scripts/prod-db.sh --tables
.claude/skills/yona-issues/scripts/prod-db.sh "SELECT id, name, created_at FROM accounts ORDER BY id DESC LIMIT 5"
.claude/skills/yona-issues/scripts/prod-db.sh "UPDATE accounts SET name = name"   # phải bị từ chối: read-only transaction
```

## Thu hồi

```bash
sudo -u postgres /www/server/pgsql/bin/psql -d yona -c 'ALTER ROLE yona_readonly NOLOGIN'
sed -i '/yona-prod-db-<tên>/d' ~dbtunnel/.ssh/authorized_keys   # thu hồi quyền tunnel của một người (cả hai DB)
```
