# Database Safety — RULE TỐI THƯỢNG

> Overrides every other rule, convenience, or workflow. Khi mâu thuẫn, rule này thắng.

**Không bao giờ chạy bất kỳ thao tác nào có thể làm mất dữ liệu DB** — trên *mọi* database (dev, test, prod).

## Cấm tuyệt đối

- `RefreshDatabase` / `LazilyRefreshDatabase` (test traits)
- `php artisan migrate:fresh`, `migrate:reset`, `db:wipe`
- `migrate:rollback` làm mất dữ liệu
- `DROP DATABASE` / `DROP TABLE` / `TRUNCATE` trên dữ liệu thật, `dropdb`
- Seeder/factory xoá hoặc truncate dữ liệu đang có

## Thay bằng

| Nhu cầu | Cách an toàn |
|---|---|
| Cô lập dữ liệu test | `DatabaseTransactions` (wrap + rollback mỗi test), trên test DB đã migrate sẵn |
| Đổi schema | Migration **additive, forward-only** (expand → contract). Không sửa migration đã ship. |
| Cần DB test sạch | Tạo database **mới**, `migrate` một lần. Không `fresh` DB đang tồn tại. |
| Rollback | Chỉ khi migration `down()` không phá dữ liệu; ưu tiên migration bù (forward fix). |

## Thực thi trong repo

- `Makefile`: không có target `migrate:fresh`/`db:wipe` (cố ý).
- `tests/`: dùng `DatabaseTransactions`, không `RefreshDatabase`.
- Test DB (`yona_test`) migrate một lần bằng `php artisan migrate`; transactions tự rollback giữa các test.

## P10 — Hardening 2-DB-role (inbox-full-messaging-framework, 2026-07-04)

**Quyết định founder 04/07: GIỮ 2 role** — `yona_app` (RLS FORCE) + `yona_owner` (BYPASSRLS cho 3 seam: webhook resolve workspace, system command cross-tenant, audit-immutable) — nhưng siết least-privilege.

### Runbook siết owner (prod — cần bảo trì ngắn, chạy bằng superuser THẬT, vd `postgres`)
```sql
-- 1. Kiểm tra hiện trạng
SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname IN ('yona_owner', 'yona_app');
-- 2. Siết: owner mất superuser, GIỮ bypass RLS
ALTER ROLE yona_owner NOSUPERUSER BYPASSRLS;
-- 3. Xác nhận: cả 2 role rolsuper = f, owner rolbypassrls = t
SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname IN ('yona_owner', 'yona_app');
```
Rollback (chỉ khi migration cần quyền cluster): `ALTER ROLE yona_owner SUPERUSER;` → chạy việc cần → siết lại ngay.

### Boot-guard
`AppServiceProvider` (chỉ `production`): query `pg_roles.rolsuper` của `current_user` trên CẢ 2 connection — runtime là superuser → log critical + **từ chối boot** (`App\Support\DbRoleGuard`).

### Call-site nhóm [d] đã về connection mặc định (P10)
- `ZaloConnection::nextConnectionId()` (sequence đã GRANT — migration `2026_07_04_300001`)
- `ZaloConnectionController::store()` insert + `promote()` fallback update + `updateState(..., privileged: false)` — CẢ CỤM promote 1 session (né treo chéo session, bài học 04/07). Webhook vẫn dùng privileged (RLS var chưa bind).
