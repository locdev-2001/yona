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
- Test DB (`cho_rach_test`) migrate một lần bằng `php artisan migrate`; transactions tự rollback giữa các test.
