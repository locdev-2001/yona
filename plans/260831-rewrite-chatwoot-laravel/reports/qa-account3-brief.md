# Brief chung cho các agent QA song song (07/09/2026)

Repo `/home/robertnguyen/www/yona`, nhánh `rewrite/chatwoot-laravel` (Laravel + Inertia/React port Chatwoot v4.17.1). Nguồn gốc Ruby/Vue: `refs/chatwoot` (**CẤM** mở `refs/chatwoot/enterprise/`). Giao tiếp tiếng Việt. Đọc thêm `reports/d3d4-brief.md` (bẫy môi trường) và `CLAUDE.md`.

## Mục tiêu
Đóng vai **người dùng cuối** kiểm thử nhóm tính năng được giao trên Yona dev, tìm lỗi thật (dữ liệu sai → realtime → tốc độ → mượt/console), sửa tận gốc trong phạm vi file được giao, báo cáo bằng chứng.

## Tài khoản & môi trường
- Yona dev: http://127.0.0.1:8000 — **kiểm thử trên tài khoản `dev.robertnguyen@gmail.com` (user id 3, account id 3 "Gmail", administrator, locale vi)**. KHÔNG dùng account 2 (john@acme.inc) — đó là fixture pixel-diff của agent `g3-e2e` đang chạy song song.
- Đăng nhập KHÔNG gõ mật khẩu: sinh token SSO một lần rồi mở
  `http://127.0.0.1:8000/app/login?email=dev.robertnguyen%40gmail.com&sso_auth_token=<token>`:
  ```bash
  php artisan tinker --execute='echo App\Models\User::find(3)->generateSsoAuthToken(), PHP_EOL;'
  ```
  Nếu trình duyệt đang có phiên khác thì SSO bị bỏ qua (giống gốc) — dùng context Playwright mới.
- Giới hạn 25 phiên/người: trước mỗi lượt Playwright dọn
  `php artisan tinker --execute='DB::table("user_sessions")->where("user_id",3)->where("user_agent","like","%Headless%")->delete();'`
- Oracle Chatwoot để so hành vi: http://127.0.0.1:3000 (account 1, john@acme.inc / Password1!, API token `815L32vRy9tXG3Tp1HxqSYqQ`). Chỉ đọc/so sánh; dữ liệu tạo trên oracle phải dọn.
- Trình duyệt: Playwright headless (`~/www/pixel-diff` có sẵn `node_modules` + helper `yona-api.mjs`, `compare.mjs`; KHÔNG sửa file trong thư mục đó, viết script riêng vào `~/www/pixel-diff/qa-<nhóm>/`). Realtime: mở 2 context cùng lúc.
- Queue worker đang chạy (`queue:work redis`), Reverb :8080, Zalo bridge thật :3710 (KHÔNG gọi, KHÔNG restart — phiên Zalo thật của founder). Inbox Zalo 58/59 + hội thoại 132 trong account 3 thuộc phiên chính — KHÔNG đụng.

## Cấm tuyệt đối
- `migrate:fresh/refresh/wipe`, `db:wipe`, drop bảng trên `yona_rw`. Pest chạy trên DB riêng: `psql -h 127.0.0.1 -U postgres -c "CREATE DATABASE yona_rw_test_<nhóm> OWNER yona_owner"` + `psql -h 127.0.0.1 -U postgres -d yona_rw_test_<nhóm> -c "CREATE EXTENSION pg_trgm; CREATE EXTENSION pgcrypto;"`, `DB_DATABASE=yona_rw_test_<nhóm> php artisan test --compact --filter=...`, dropdb khi xong.
- Không commit. Không `git add`/`git stash`/`git checkout` file của người khác.
- Không sửa file ngoài phạm vi được giao. Lỗi ở file dùng chung (`resources/js/shared/**`, `components-next/**` không thuộc nhóm, `lang/**`, `routes/*.php`, `app/Models/**`, `app/Http/Middleware/**`) → **ghi vào báo cáo với bằng chứng + đề xuất sửa**, không tự sửa.
- Build FE phải qua khóa để không đè nhau: `flock /tmp/yona-build.lock npm run build`. tsc/vitest chạy tự do.
- Người dùng cuối không bao giờ gõ slug/key/identifier kỹ thuật — form chỉ nhận tên tự do; nếu thấy ô slug/key trong UI là lỗi.
- Không xoá dữ liệu có sẵn trong account 3 mà mình không tạo.

## Quy trình mỗi tính năng
1. Đọc nhanh Ruby/Vue gốc + note port tương ứng trong `reports/*-notes.md` để biết hành vi chuẩn.
2. Kịch bản như người dùng thật: tạo/sửa/xoá qua UI, đổi trạng thái, mở 2 tab cho realtime, đọc console (0 lỗi), đo thời gian phản hồi rõ ràng chậm (> 1s cho thao tác thường).
3. So cùng thao tác trên oracle khi nghi ngờ.
4. Lỗi thật → nguyên nhân gốc → sửa trong phạm vi → test khoá (Pest/vitest) → gate phần sửa (`vendor/bin/pint --test`, `npx tsc --noEmit`, `npx vitest run <file>`, build qua flock, `php artisan i18n:generate --check` nếu đụng lang).
5. Dọn dữ liệu QA mình tạo (cả oracle nếu có).

## Báo cáo
`plans/260831-rewrite-chatwoot-laravel/reports/qa-<nhóm>-notes.md`: bảng kịch bản (tính năng · bước · kết quả PASS/FAIL · bằng chứng: ảnh chụp đường dẫn/log/số liệu), lỗi tìm thấy (nguyên nhân, file sửa, test), lỗi ngoài phạm vi (bằng chứng + đề xuất), trạng thái dọn dẹp. Kết thúc:
```
Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
Summary: 1–2 câu
Concerns/Blockers: nếu có
```
