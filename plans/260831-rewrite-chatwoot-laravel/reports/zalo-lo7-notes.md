# Lô 7 — Kiểm thử & CI (agent `zalo-lo7-finish`, 07/09/2026)

Tiếp nối `zalo-lo7-tests-3` (phiên trước thoát giữa chừng). Không commit; diff để nguyên
trong worktree. Diff của agent UI (`resources/js/**`, `lang/**`) không đụng tới.

## Bảng mục · trạng thái · file

| Mục | Trạng thái | File |
|---|---|---|
| (a) Bộ fixture vàng 19 loại tin | XONG (agent trước dựng, đã nghiệm thu bằng test) | `tests/Fixtures/channels/zalo/real/*.json` |
| (a) `ZaloHarness` đọc từ bộ vàng | XONG | `tests/Contracts/Channels/Harness/ZaloHarness.php` |
| (a) Khoá hình dạng + PII giả nhất quán | XONG (5 test, xanh) | `tests/Contracts/Channels/ZaloFixtureShapeTest.php` |
| (b) Flush redis DB test một lần đầu suite | XONG, đúng chỉ số 4 | `tests/TestCase.php` |
| (b) `Http::preventStrayRequests()` | XONG — **và đã lộ 13 test gọi bridge THẬT**, xem dưới | `tests/TestCase.php` |
| (b) `AgentBotFactory::outgoing_url` không phân giải | XONG (`*.invalid`, RFC 2606) | `database/factories/AgentBotFactory.php` |
| (b) Vá 13 test gọi bridge thật | **MỚI LÀM** | `tests/Feature/Channels/ZaloChannelTest.php`, `tests/Feature/Models/InboxChannelCascadeTest.php` |
| (c) `ci.yml` đủ 8 bước | XONG, YAML hợp lệ, 3 job `backend`/`frontend`/`bridge` | `.github/workflows/ci.yml` (gộp, xoá `lint.yml` + `tests.yml`) |
| (d) Harness g1: cổng bridge giả qua env, mặc định 3711 | **MỚI LÀM** | `~/www/pixel-diff/g1-zalo-e2e.mjs` |
| (d) Harness d4: tự dựng bot + receiver rồi dọn | **MỚI LÀM** | `~/www/pixel-diff/d4-bot-handoff-e2e.mjs` |
| (d) Harness c5: tự bật `csat_survey_enabled` rồi trả lại | **MỚI LÀM** | `~/www/pixel-diff/c5-widget-e2e.mjs` |

## Lỗi thật do lô 7 phát hiện

**13 test đang gõ thẳng vào bridge Zalo THẬT của founder ở `127.0.0.1:3710`.**
`Http::preventStrayRequests()` biến chúng từ "xanh nhưng bắn ra ngoài" thành đỏ có tên:

```
Attempted request to [http://127.0.0.1:3710/personal-messages/send] without a matching fake.
Attempted request to [http://127.0.0.1:3710/auth/logout] without a matching fake.
```

- 12 test ở `ZaloChannelTest`: `beforeEach` chỉ giả `cdn.zalo.test/*`. Tin đi ra và
  reaction/biên nhận chạy trong cùng request (`QUEUE_CONNECTION=sync`) nên chạm bridge.
  Sửa tại **một chỗ** — thêm `rtrim(config('zalo.bridge.url'),'/').'/*'` vào chính
  `Http::fake` của `beforeEach`, không rải fake từng test.
- 1 test ở `InboxChannelCascadeTest` (dataset `zalo`): xoá inbox Zalo gọi `/auth/logout`.
- 1 test ở `ZaloQrLifecycleTest` (agent trước đã vá bằng `fakeZaloBridge()`).

Hệ quả trước bản vá: mỗi lượt chạy suite gửi lệnh gửi tin / đăng xuất vào phiên Zalo
đang sống. Đây là lý do đủ để giữ `preventStrayRequests()` vĩnh viễn.

## Gate

| Gate | Kết quả |
|---|---|
| Pest toàn bộ, lượt 1 (`DB_DATABASE=yona_rw_test_lo7`) | **2256/2256 xanh**, exit 0 |
| Pest toàn bộ, lượt 2 liên tiếp | **2256/2256 xanh**, exit 0 |
| `vendor/bin/pint --test` | `{"tool":"pint","result":"passed"}` |
| `python3 -c yaml.safe_load(ci.yml)` | hợp lệ — jobs `backend`, `frontend`, `bridge` |
| `node --check` cả 3 harness | OK |

DB test tạo theo brief (`OWNER yona_owner` + `pg_trgm`/`pgcrypto`), **đã `dropdb` khi xong**.
Không chạm `yona_rw`, không `migrate:fresh/refresh/wipe`.

Lượt đo đầu tiên (trước khi vá) có thêm 1 đỏ `I18nVietnameseTest` do bundle i18n lệch
`lang/**` — nguyên nhân là diff đang mở của agent UI, không phải lô 7. Xác minh cơ học
không phá worktree bằng `php artisan i18n:generate --output=<thư mục tạm>` rồi `diff`:
lệch đúng 4 khoá của họ (`ZALO` channel label, `canned_mgmt.LIST.404`,
`chat_list.ASSIGNEE_TYPE_TABS.unassigned`, `sidebar_items.LOGOUT`). Agent UI đã chạy
`i18n:generate` trong lúc tôi làm; hai lượt gate cuối đều xanh.

## Harness pixel-diff — nội dung sửa

**`g1-zalo-e2e.mjs`**
- Cổng bridge giả: `--bridge-port` hoặc `ZALO_E2E_BRIDGE_PORT`, **mặc định 3711**.
- Chặn cứng cổng 3710 (bridge thật của founder) — ném lỗi trước khi mở trình duyệt.
- `EADDRINUSE` báo rõ "chọn cổng trống", không im lặng chết.
- Đầu file ghi cách trỏ Laravel: `ZALO_BRIDGE_URL=http://127.0.0.1:3711` trong `.env`
  → `php artisan config:clear && php artisan queue:restart` → trả `.env` về 3710.
- Thêm chốt sớm `waitForBridgeCall('/auth/qr/start', 20s)`: nếu Laravel vẫn trỏ bridge
  thật thì script dừng ngay ở bước 3 kèm hướng dẫn, thay vì chạy tiếp trên kết quả vô nghĩa.

**`d4-bot-handoff-e2e.mjs`** — trước đây đòi sẵn một bot tên `Bot Trợ Lý QA`, không có
thì ném lỗi. Nay tự dựng đủ vật liệu và dọn ở `finally`:
- receiver HTTP nội bộ đóng vai `outgoing_url` (mặc định 3811, `--receiver-port` /
  `D4_RECEIVER_PORT`) — cùng lý do với `AgentBotFactory`: không để webhook bot treo theo DNS;
- tạo agent bot mới trỏ vào receiver, gán vào inbox, **ghi nhớ bot đang gán từ trước** và
  khôi phục đúng bot đó trước khi xoá bot tạm (nếu không inbox mất bot);
- thêm một bước kiểm: bot ngoài thực sự nhận được sự kiện qua `outgoing_url`;
- dọn: khôi phục gán bot → xoá bot tạm → xoá liên hệ → tắt receiver.

**`c5-widget-e2e.mjs`** — tra inbox theo `website_token`, tự bật `csat_survey_enabled`
nếu đang tắt, bọc toàn bộ kịch bản trong `try/finally` để **trả cờ về giá trị cũ kể cả
khi kịch bản lỗi**. Inbox vốn đã bật thì không đụng gì.

Chỉ sửa đúng 3 file này trong `~/www/pixel-diff`.

## Việc KHÔNG làm được trong phiên này (ghi rõ theo yêu cầu)

**Chưa chạy thật `g1-zalo-e2e.mjs` với bridge giả ở 3711.** Hai lý do độc lập:
1. `.env:75` là `ZALO_BRIDGE_URL=http://127.0.0.1:3710`. Đổi dòng này là đổi cấu hình
   dùng chung của worktree đang có phiên khác chạy, và cắt đường Laravel → bridge thật
   (`ss -ltn`: node PID 10783 vẫn đang giữ 3710, phiên Zalo sống của founder).
2. Harness đăng nhập `john@acme.inc` = account 2, đang là fixture pixel-diff của agent
   `g3-e2e`; chạy sẽ tạo/xoá inbox trong tài khoản đó.

Đã kiểm phần kiểm được mà không đụng gì: cả hai chốt cổng đều bắn **trước** khi mở trình
duyệt (`--bridge-port 3710` → chặn cổng thật; 3711 bị chiếm → EADDRINUSE có hướng dẫn),
và bridge thật 3710 không nhận một lời gọi nào trong suốt phiên.

Người chạy tiếp cần: đặt `ZALO_BRIDGE_URL=http://127.0.0.1:3711`, `config:clear` +
`queue:restart`, chạy `node g1-zalo-e2e.mjs`, rồi trả `.env` về 3710 và `config:clear` lại.

## Ghi chú CI

`ci.yml` mới bỏ `DB_PRIVILEGED_*` và `database/sql/setup-roles.sql` của bản cũ: kết nối
`pgsql_privileged` **không còn tồn tại** trên nhánh này (`grep pgsql_privileged config/ app/
database/` = 0 dòng), bước cũ chỉ dựng vai trò cho một kết nối đã chết. Suite chạy trên một
vai trò duy nhất, đúng như cách chạy ở máy dev (`DB_USERNAME=yona_owner`).
Bước `Snapshot năng lực kênh` dùng `git diff --exit-code` — an toàn vì test chỉ tự ghi lại
snapshot khi có `UPDATE_CAPABILITY_SNAPSHOT=1`, biến đó không đặt ở CI.

## Dọn dẹp

`yona_rw_test_lo7` đã xoá; thư mục bundle i18n tạm đã xoá; không tạo dữ liệu nào trên
`yona_rw` / oracle; không gọi và không restart bridge 3710.

```
Status: DONE_WITH_CONCERNS
Summary: Hoàn tất lô 7 — bộ fixture vàng + khoá hình dạng, suite ổn định (2256/2256 xanh
hai lượt liên tiếp), ci.yml gộp đủ 8 bước, ba harness pixel-diff tự dựng và tự dọn vật
liệu; `preventStrayRequests` lộ 13 test đang gõ vào bridge Zalo thật của founder, đã vá.
Concerns: (1) chưa chạy thật g1-zalo-e2e với bridge giả 3711 vì phải sửa .env dùng chung
và tài khoản e2e đang là fixture của agent khác — đã ghi lại quy trình chạy; (2) không
commit, toàn bộ thay đổi còn trong worktree chung với agent UI.
```
