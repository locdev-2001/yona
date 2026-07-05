# Database Naming Standardization & RLS Restoration: When Dev Environment Silently Broke Security

**Date**: 2026-07-05 20:39
**Severity**: Critical
**Component**: Database + Configuration + Security
**Status**: Resolved (RLS restored, names unified, Docker removed, 760 tests pass)

## What Happened

During GĐ1 audit (2026-07-05), founder discovered that `.env` dev environment trỏ BOTH `pgsql` và `pgsql_privileged` connections về superuser `postgres` — trực tiếp, no role separation. Result: toàn bộ 50/74 bảng RLS FORCE bị bypass im lặng ở dev; tenant isolation chỉ còn app-layer (BelongsToWorkspace scope).

Parallel to that: 4 bộ tên database tồn tại cùng lúc:
- `.env` thực tế: `crm`
- docs/Makefile: `cho_rach`
- getting-started.md: `crm_dev`
- CI: `crm_test` + user `crm`

CI backend không thể xanh: migrations `GRANT TO cho_rach_app` mà role không tồn tại; missing `--database=pgsql_privileged` flag trên migrate.

Founder quyết định (duyệt từng tên): **DB = `crm` + `crm_test`; role = `crm_app` (runtime) + `crm_owner` (owner, BYPASSRLS NOSUPERUSER); GIỮ connection structure `pgsql`/`pgsql_privileged`; XÓA Docker**. Thực hiện commit 6c8dfcd: 54 file, +226/−653 (chủ yếu xóa docker/*, sync docs, rename GRANT trong ~20 migrations).

## The Brutal Truth

RLS không fail-loud ở dev — nó fail-silent. Vì app-layer global scope (BelongsToWorkspace) vẫn có, team không biết rằng database-level protection bị mất. Đây là cái kinh hãi nhất: không lỗi, không alert, chỉ… không bảo vệ. Có thể chạy đã được vài tuần.

Naming drift (4 bộ tên) là dấu hiệu của cái cơ bản hơn: không có **single source of truth**. Mỗi lớp (env, docs, CI, Makefile) viết ở thời điểm khác, rồi xong việc không update. Drift từ từ bị lãng quên — cho đến khi CI bị sắc. Đáng tiếc vì có thể tránh toàn bộ bằng cách doc ra rõ ngay.

Về emotional reality: phát hiện bug bảo mật sau khi shipped là **mất niềm tin**. Team đã test, đã review, RLS tests pass — nhưng ở dev, nó chỉ là illusion. Cảm giác như: "Chúng ta đã kiểm chứng gì vậy?"

## Technical Details

**Config chaos:**
- `.env` dev trỏ: `DB_CONNECTION=pgsql`, `DB_USERNAME=postgres`, `DB_PASSWORD=<empty>` (or socket), `PGSQL_PRIVILEGED_CONNECTION=pgsql` (lặp lại)
- Role `cho_rach_app` không tồn tại dev → migrations GRANT fail silent (PostgreSQL ignores missing role)
- Role `cho_rach_owner` cũng không tồn tại
- `phongtro86` superuser (thực tế trên prod, không dùng dev)

**Why RLS bypass:**
- RLS policy: `USING (tenant_id = current_setting('app.tenant_id')::int)`
- Nhưng role = superuser → `GRANT ... WITH GRANT OPTION` + implicit BYPASSRLS → SELECT toàn bộ mà không set tenant_id
- Test `DbRoleGuard::superuserViolations()` kiểm tra audit_logs không có superuser hành động → PASS (vì dev không set up test để trigger role superuser, test chạy qua app-layer scope)

**What was named what:**
```
DB name:  crm (env) | cho_rach (docs) | crm_dev (getting-started) | crm_test (CI)
Role:     postgres (dev) | cho_rach_app (migrations) | — không tồn tại
Owner:    — không định nghĩa
```

**Migration GRANT example (broken):**
```sql
-- 2026_06_25_100005_grant_notifications_to_app_role.php
GRANT SELECT ON notifications TO cho_rach_app;  -- role không tồn tại, fail silent
```

**CI timeline (khác):**
- Container Postgres init: tạo role `crm` (user), nhưng KHÔNG phải `cho_rach_app`
- Migrations chạy qua `pgsql_privileged` (superuser) mà không có flag; GRANT to role không tồn tại
- Tests try connect via `crm` role → permission denied (vì chưa GRANT)
- CI fail, team "works around" bằng cách chạy ở superuser (ignore GRANT issue)

**RLS restore (commit 6c8dfcd):**
- setup-roles.sql viết lại idempotent: tạo `crm_app` + `crm_owner` nếu chưa có
- `crm_owner`: `BYPASSRLS`, `NOSUPERUSER` (!) — owner schema mà không superuser, clever
- `crm_app`: `NOINHERIT` → explicit GRANT không auto inherit
- Chuỗi GRANT: DB `crm` → schema public → từng table → từng sequence → `crm_app`
- Chuỗi ownership: DB `crm` → `crm_owner`; schema public → `crm_owner`; 74 bảng → `crm_owner`; 13 sequences → `crm_owner`

**Verify (post-fix):**
```bash
# crm_app không bind workspace → default deny
SELECT * FROM clients WHERE tenant_id > 0;  -- 0 rows (RLS enforce)

# crm_owner bypass
SET ROLE crm_owner;
SELECT COUNT(*) FROM clients;  -- 2400 rows (admin visible all)

# Tests
php artisan test  -- 760 passed / 2214 assertions
# Lưu ý: KHÔNG chạy --parallel vì paratest cần CREATEDB mà 2 role cố tình không có
```

**Docker removal:**
- 10 file xóa: docker/, docker-compose.yml, .dockerignore, .env.docker.example, docker/php/Dockerfile, docker/postgres/init.sql, etc.
- Makefile rewrite: host-only (`localhost:5432` hardcoded), no compose
- Local dev: "Install Postgres locally hoặc dùng remote" (không dùng container)

## What We Tried

**Before detection:**
- Trusted `.env` là correct (vì cấu hình từ năm ngoái, chưa refactor)
- RLS tests pass → assumed security ok (nhưng test chạy via app-layer BelongsToWorkspace, lỗ hổng của test)
- CI GRANT failures ignored ("maybe PostgreSQL version issue")

**During fix (đập đi xây lại):**
- Thử rename `cho_rach_app` → `crm_app` đơn giản? Không, vì docs + migrations lộn xộn — phải sync tất cả.
- Thử gữ lại Docker? Founder quyết: xóa hết, local postgres hoặc remote. Docker = phức tạp, maintainers = 0.
- setup-roles.sql idempotent hay một lần chạy? Idempotent — để re-run safe ở CI mỗi lần.

## Root Cause Analysis

**Why security fail-silent:**
1. `.env` dev == superuser → app không biết rôle bị loại bỏ
2. RLS test == app-layer scope test, KHÔNG test actual Postgres RLS enforcement (BelongsToWorkspace scope che lỗ hổng)
3. No audit of actual role permissions (DbRoleGuard kiểm chứng app code, không kiểm chứng DB config reality)

**Why naming chaos:**
- Mỗi component tự chọn tên (env/docs/Makefile viết ở thời điểm khác)
- Không có cái gọi là "canonical source" cho DB name + role names
- CI viết bằng shell script, Makefile là file riêng, không sync
- Drift cộng dồn qua tuần → phát hiện lúc fix lớn (audit phase)

**Why CI broke:**
- Migrations assume role tồn tại (GRANT TO cho_rach_app)
- CI Docker init không tạo `cho_rach_app`, chỉ tạo `crm` (user)
- Fail-silent behavior PostgreSQL: missing role GRANT → no error, just skip
- Team không verify "GRANT đã chạy hay chưa?" (no audit query)

## Lessons Learned

1. **Dev environment == Prod threat model, không phải sandbox**: Nếu dev `.env` không match prod permissions structure (superuser vs. minimal role), bạn kiểm chứng sandbox, không sản phẩm. RLS ở prod hoạt động, ở dev bypass → thứ gì bảo vệ prod không che ở dev. Next: add DbRoleGuard check ở dev startup, "role current != app role → error".

2. **App-layer scope ≠ DB-layer security test**: BelongsToWorkspace (app) + RLS (DB) là 2 lớp riêng. Test 1 không chứng minh 2. Bây giờ: add migration test chạy qua actual `crm_app` role (không superuser), verify SELECT/INSERT/UPDATE obey RLS; fail nếu lấy được dữ liệu của tenant khác.

3. **Single source of truth: DB/role name phải ở 1 file**: Tạo `.env.spec` (hoặc `.env.canonical`) liệt kê DB, role, superuser — rồi docs, Makefile, CI, migration comments đều link vào file đó. Drift phát hiện ngay ở lúc review (grep source).

4. **Idempotency >> one-time setup scripts**: `setup-roles.sql` viết lại để chạy lặp lại safe. Ai chạy lần 2 không fail. Ai quên chạy, CI lặp lại auto-fix. Sạch hơn "first run script" cách quản lý, tìm lỗi.

5. **Naming should map to security boundary, not historical legacy**: `crm_app` (runtime, minimal) vs. `crm_owner` (schema owner, BYPASSRLS) = role khác nhau vì phần quyền khác nhau. Không gộp về 1 "cho_rach" account tất cả. Naming = architectural intent, không chỉ tên cái gì cũ.

## Next Steps

**Deployed (commit 6c8dfcd):**
- `setup-roles.sql`: idempotent, tạo `crm_app` + `crm_owner` + GRANT + ownership chains
- `.env.example`: `DB_DATABASE=crm`, `DB_USERNAME=crm_app`, `DB_PRIVILEGED_USERNAME=crm_owner`, rõ ràng
- `config/database.php`: map `pgsql` → `crm_app`, `pgsql_privileged` → `crm_owner`
- `phpunit.xml`: `DB_DATABASE=crm_test`
- ~20 migrations + 2 GRANT sequences: `crm_app` (lặp lại, không `cho_rach_app`)
- `ci.yml`: `psql -f setup-roles.sql`, migrate qua `pgsql_privileged`
- Docs: `local-development.md` = single source (tên chính thức), sync `database-safety.md`, `tenant-isolation.md`, `getting-started.md`
- Docker xóa hoàn toàn (10 file)

**Pending (chưa push remote):**
- Push commit lên github (chờ verify CI xanh trước)
- Restart dev postgres processes → nhả connection cũ (`pg_terminate_backend`)
- Tập team: "local-development.md là canonical DB/role naming, link trong docs"

**RLS test enhancements (Phase 2):**
- Add `tests/Feature/Rls/RoleSeparationTest.php`: chạy query thực tế ở `crm_app` role, verify SELECT blocked when tenant_id mismatch
- DbRoleGuard thêm check: "current connection role != superuser" ở dev startup (fail nếu `.env` superuser)
- CI: add post-migrate verify "GRANT executed" (query `table_privilege` để confirm)

**Time cost**: ~3 hours detect + understand (founder audit) + 2 hours implement + test. Lẽ ra have been caught ở phase design nếu "dev env security model == prod model" check từ đầu.

**Related**: [[db-destructive-guard-incident]] (orchestration failure → added guard), now [[db-naming-standardization-rls-restore]] (configuration drift → lost security); [[orchestration-protocol]] (subagent safeguards); [[tenant-isolation]] (updated with actual role names)
