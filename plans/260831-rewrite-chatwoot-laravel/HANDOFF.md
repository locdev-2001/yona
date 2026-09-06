# BÀN GIAO — viết lại Chatwoot sang Laravel (nhánh `rewrite/chatwoot-laravel`)

Tài liệu này tự chứa: đọc xong là làm tiếp được, không cần hỏi lại. Cập nhật 06/09/2026.

---

## 1. Việc đang làm là gì

Viết lại **100% Chatwoot v4.17.1** (mã nguồn tham chiếu nằm sẵn trong repo tại `refs/chatwoot`) sang **Laravel 13 + Inertia + React 19 + TypeScript + Tailwind**, giao diện phải **giống 100% bản gốc tới từng điểm ảnh**.

- **CẤM TUYỆT ĐỐI mở hoặc port bất cứ file nào dưới `refs/chatwoot/enterprise/`** — giấy phép thương mại riêng. Phần ngoài thư mục đó là MIT, port được.
- `refs/chatwoot` phải luôn đứng đúng tag: kiểm bằng `git -C refs/chatwoot describe --tags` → phải ra `v4.17.1`. (Đã từng lệch sang nhánh develop +18 commit và làm port sai một đợt.)
- Cách giao hàng: **port từng tính năng trọn vẹn** (migration → backend → giao diện), xong là dùng được ngay trên trình duyệt. Không làm kiểu dựng khung trước rồi nối sau.
- Lộ trình 40 tính năng chia nhóm A→G nằm ở `plans/260831-rewrite-chatwoot-laravel/feature-roadmap.md`.

**Vị trí hiện tại: 25/40 (D1 xong, chờ founder nghiệm thu cuối).** Commit nền `eb5847e`; D1 đã commit riêng (chỉ file D1); phiên codex đang sửa nhóm B (labels tên tự do) trên cùng cây, phần đó chưa commit. Trace: `reports/trace-d1-automation-rules.md`.

| Nhóm | Xong | Ghi chú |
|---|---|---|
| A — Nền móng | 6/6 | founder đã nghiệm thu |
| B — Trục hội thoại | 11/11 | |
| C — Widget website | 5/5 | |
| D — Vận hành đội ngũ | 3/6 | D5 thông báo, D6 giờ làm việc, D1 automation |
| E, F, G | 0/15 | chưa bắt đầu |

**D1 Automation rules (xong 06/09, vòng 2):** đủ 5 cửa — pixel 9 trạng thái
sáng/tối ≤ 0,030% (kể cả bật `delayed_automations` qua `d1-delayed.sh`), e2e
`d1-e2e.mjs` 13/13, rà nút hai bên. Primitive mới dùng lại được: `SidePanel`,
`DropdownTeleportProvider`/`useDropdownPosition`, `MultiTextInput`, prop `tabs`
của `BaseSettingsHeader`, `components/widgets/AutomationActionInput` (D3 dùng
lại). Kế tiếp: D3 Macros.

Số liệu kiểm thử hiện tại: **giao diện 416 test** xanh; backend D1 10/10 — Pest toàn bộ chưa chạy lại vì working tree có thay đổi nhóm B đang dở của phiên khác (đếm lại khi cây sạch).

---

## 2. Chuẩn nghiệm thu — 5 cửa, thiếu một cửa là chưa xong

Mỗi tính năng phải qua đủ:

1. **Kiểm thử tự động**: `vendor/bin/pest` toàn bộ xanh (test port từ RSpec tương ứng của bản gốc, không tự nghĩ test), `npx tsc --noEmit`, `npm run build`, `npm test` (vitest), `vendor/bin/pint --test`, `php artisan i18n:generate --check`.
2. **Bảng đối chiếu**: một file trong `plans/260831-rewrite-chatwoot-laravel/reports/` ghi bảng Ruby↔PHP và Vue↔React, mục "khác biệt cố ý", mục "bẫy đã trả giá".
3. **Chấm ảnh với bản gốc ≤ 0,1%** ở mọi màn và mọi trạng thái bật/tắt (menu, hộp thoại, mở rộng), **cả giao diện sáng lẫn tối**.
4. **Rà nút hai bên**: mọi nút hiển thị phải phản ứng như bản gốc. Nút vẽ đúng nhưng bấm không làm gì = chưa xong. Nếu chức năng thuộc nhóm sau thì vẫn phải port phần tương tác thấy được ngay và ghi vào mục nợ.
5. **Tự mở trình duyệt bấm trọn vòng** như người dùng cuối, **tải lại trang** để chắc dữ liệu đã lưu thật.

Chốt mỗi tính năng ở mức "xong, còn chờ founder nghiệm thu cuối".

---

## 3. Môi trường

```bash
cd ~/www/yona && make up      # bật tất cả
make status                    # kiểm tra
make down                      # tắt
```

`make up` bật bốn thứ:

| Thành phần | Cổng | Ghi chú |
|---|---|---|
| Bản gốc Chatwoot (đối chiếu) | `localhost:3000` | chạy bằng podman, script `~/www/chatwoot-oracle/oracle.sh {up\|down\|status}` |
| Ứng dụng đang viết | `localhost:8000` | `php artisan serve`, dùng bản build sẵn, **không chạy `npm run dev`** |
| Máy chủ thời gian thực | `localhost:8080` | Laravel Reverb, pid ở `storage/logs/reverb.pid` |
| Worker hàng đợi | — | `queue:listen`, pid ở `storage/logs/worker.pid` |

Đăng nhập hai bên như nhau: `john@acme.inc` / `Password1!` (quản trị) và `sam@acme.inc` / `Password1!` (nhân viên).
**Số hiệu tài khoản khác nhau: bản gốc là 1, bản viết lại là 2.**

Cơ sở dữ liệu phát triển: `yona_rw` (nhánh `main` vẫn dùng `yona`, không đụng). Redis DB 2. Kiểm thử dùng `yona_rw_test`.

**Cấm tuyệt đối `migrate:fresh`, `migrate:refresh`, `db:wipe` trên `yona_rw`** — dữ liệu đối chiếu nằm trong đó, không có bản sao lưu.

Mã truy cập API để gọi thử: bản viết lại `cBJEn8Z6NY6arlfQhU5a07xV`, bản gốc `815L32vRy9tXG3Tp1HxqSYqQ` (gửi ở header `api_access_token`).

---

## 4. Dữ liệu đối chiếu — phải giữ nguyên

Hai bên được seed giống hệt nhau để chấm ảnh có nghĩa:

- Hộp thư `api-test` số 1 ở cả hai bên.
- Liên hệ "Trang Nguyen": bản gốc số 1, bản viết lại số 3.
- Một hội thoại đúng **5 tin nhắn**: bản gốc số hiển thị 1, bản viết lại số hiển thị 4. Mốc `last_activity_at` phải là `2026-09-01 06:11:52`.
- Không nhãn, không gán người phụ trách, không mức ưu tiên, không mốc đã xem.

**Sau mỗi lần thử nghiệm phải dọn sạch và chạy:**

```bash
~/www/pixel-diff/reset-fixture.sh
```

Script này đưa cả hai bên về đúng trạng thái trên, kể cả cài đặt giao diện của người dùng John (bảy khoá chuẩn). **Chạy nó ngay trước mỗi lần chấm ảnh** — trạng thái mở/đóng của các khối thu gọn nằm trong cài đặt người dùng, chạy kịch bản đo lần hai mà không đặt lại sẽ cho kết quả sai.

---

## 5. Bộ công cụ kiểm chứng

Tất cả nằm ở `~/www/pixel-diff` (có `node_modules` riêng — **script playwright bắt buộc đặt trong thư mục này**, để chỗ khác thì không nạp được thư viện).

| Công cụ | Dùng để |
|---|---|
| `node compare.mjs '<đường dẫn>' --login` | chụp và so hai bên, `{id}` tự thay số tài khoản mỗi bên; `--var conv=1:4` cho id bản ghi lệch nhau |
| `node mask-diff.mjs <slug>…` | so lại từ ảnh đã chụp sau khi che các vùng khác biệt **có chủ đích**; danh sách vùng che khai báo một chỗ duy nhất trong file |
| `node crop-diff.mjs <slug> x y w h` | cắt một vùng để soi kỹ |
| `node audit-buttons.mjs <gốc> <đường dẫn>` | bấm thật từng nút, báo nút nào không phản ứng |
| `node yona-api.mjs <METHOD> <path> '<json>'` | gọi API bằng phiên đăng nhập |
| `./reset-fixture.sh` | đưa dữ liệu hai bên về chuẩn |

Ngoài ra có sẵn hơn 100 kịch bản đã viết cho từng tính năng (`b5-*`, `b6-*`, `c2-*`, `d6-*`…) — **đọc lại và nhân bản chúng thay vì viết mới từ đầu**.

Nhiễu nền chấp nhận được khi so toàn màn: **0,030%** (biểu tượng thương hiệu trên thanh bên). Cao hơn thì phải soi ảnh khác biệt, đừng kết luận là nhiễu.

Vùng che có chủ đích hiện tại (trong `mask-diff.mjs`): biểu tượng thương hiệu, số hiệu bản ghi hiển thị, chỗ giữ chỗ của ô soạn tin (nợ từ B3), bút chì ở ô tìm kiếm.

---

## 6. Kiến trúc đã dựng — dùng lại, đừng viết bản thứ hai

### Backend

| Thứ | Ở đâu | Dùng khi nào |
|---|---|---|
| Ba mặt tiền route | `routes/web.php` (Inertia), `routes/web_api.php` (phiên đăng nhập), `routes/api.php` (mã thông báo, cho widget), `routes/api_public.php` (`/public/api/v1/*`, không xác thực) | mọi tính năng phải mở ra API được mà không viết lại lõi |
| Khung sự kiện | `App\Events\EventType` (enum giữ nguyên tên sự kiện của bản gốc) + `DomainEvent::dispatch()` | phát sự kiện nghiệp vụ |
| Đẩy thời gian thực | `App\Listeners\ActionCableListener` → `ActionCableBroadcastJob` → `RealtimeBroadcast` | kênh riêng đặt tên đúng chuỗi `pubsub_token` và `account_{id}` |
| Tin mẫu tự động | `App\Services\MessageTemplates\HookExecutionService` + `Template\BaseTemplate` | **điểm móc duy nhất** cho lời chào, xin email, ngoài giờ, tự đóng, khảo sát. Thêm mẫu mới = thêm một lớp con, không mở hook thứ hai |
| Thông báo | `App\Builders\NotificationBuilder` (cổng tạo duy nhất) + `App\Listeners\NotificationListener` (nơi quyết định duy nhất) | |
| Phân công | `App\Services\AutoAssignment\*` + hai concern `AssignmentHandler`, `AutoAssignmentHandler` | thứ tự khai báo trait quyết định thứ tự dòng hoạt động |
| Nhãn | trait `App\Models\Concerns\Labelable` | nguồn duy nhất cho cả hội thoại lẫn liên hệ |
| Cột cờ bitmask | `App\Support\FlagBitmask` | mọi cột kiểu bitmask |
| Cờ boolean từ biểu mẫu | `App\Support\BooleanParam` | vì `(bool) 'false'` trong PHP là `true` |
| Trạng thái trực tuyến | `App\Support\OnlineStatusTracker` (Redis, khoá y bản gốc, 20 giây) | |
| Kênh đa hình | `Inbox` + `app/Models/Channel/*` + bản đồ trong `AppServiceProvider` + `CHANNEL_TYPES` của `InboxesController` | **thêm kênh mới = một dòng bản đồ + một mục danh sách, không sửa lõi** |

### Giao diện

| Thứ | Ở đâu |
|---|---|
| Bảng điều khiển | `resources/js/dashboard/` |
| Ứng dụng chat cho khách | `resources/js/widget/` (phục vụ tại `/widget`) |
| SDK nhúng | `resources/js/sdk/` → build riêng bằng `vite.sdk.config.js` ra `public/packs/js/sdk.js` (đã bỏ qua trong git) |
| Trang khảo sát công khai | `resources/js/survey/` |
| Kho trạng thái thời gian thực | `resources/js/dashboard/realtime/` (một kho, đọc bằng `useSyncExternalStore`) |
| Ngữ cảnh hội thoại | `resources/js/dashboard/conversation/ConversationContext.tsx` — **nguồn duy nhất** cho danh sách hội thoại, kể cả danh sách nhắc tên |

### Ngôn ngữ hiển thị

Nguồn duy nhất là **file PHP trong `lang/{locale}/`** (giữ nguyên khoá của bản gốc). Chạy `php artisan i18n:generate` để sinh gói cho giao diện trước khi build; `--check` sẽ báo lệch nếu quên. Frontend **không** có file dịch riêng.

---

## 7. Bẫy đã trả giá — đọc trước khi viết code

**Về Laravel vs Rails**

1. `Model::created` của Laravel bắn **ngay lập tức**, không phải sau khi commit như `after_create_commit` của Rails → tin mẫu tự kích hoạt lại chính nó thành vòng lặp vô hạn. Phải khoá theo id hội thoại.
2. `blank(false)` của Laravel trả `false`, còn `false.blank?` của Ruby trả `true` → điều kiện lọc sai với tham số kiểu boolean.
3. Cột có giá trị mặc định trong cơ sở dữ liệu **không tự có trên model mới tạo** (Rails đọc được từ schema) → phải khai `protected $attributes`, nếu không phản hồi tạo mới trả `null`.
4. Mốc thời gian phải để **6 chữ số lẻ** (`timestamps(6)`, `dateTime('x', 6)`) — mặc định của Laravel là 0 chữ số, làm nhiều tin trong cùng một giây bị xáo thứ tự. Đã có lớp kết nối riêng ép định dạng ghi.
5. Quan hệ đã nạp trước khi hook chạy sẽ trả **giá trị cũ** — dùng `Conversation::currentAssignee()` thay vì đọc thẳng quan hệ.
6. Hàm trợ giúp khai trong file test Pest là **hàm toàn cục**: trùng tên giữa hai file làm cả bộ test chết bằng lỗi nghiêm trọng, không phải test đỏ.
7. `$conversation->messages()` đã sắp xếp sẵn theo thời gian tạo → lấy tin mới nhất phải `reorder('id','desc')`.

**Về giao diện**

8. Bản gốc dùng `<style scoped>` của Vue với hai lớp chọn nên **thắng utility Tailwind cùng độ đặc hiệu**. Port sang utility là thua và lệch âm thầm (đã dính hai lần: bộ chọn màu, dải nhắc). Kiểm bằng ảnh cắt, đừng tin class trông giống.
9. Bộ chọn kiểu `[&>button]:w-full` xuyên component: thừa hoặc thiếu một lớp bọc là bộ chọn trượt. Tìm `[&` ở nơi gọi rồi soi lớp bọc vô hình trong template gốc.
10. Ẩn phần tử bằng `visibility:hidden` làm mất khả năng nhận con trỏ — dùng `opacity:0`.

**Về vận hành**

11. Worker `queue:listen` **kế thừa biến môi trường lúc khởi động** → đổi cấu hình xong phải tắt worker rồi `make up`, nếu không việc chạy xanh mà không có tác dụng.
12. Nhiều tác nhân chạy Pest song song trên cùng cơ sở dữ liệu kiểm thử làm bộ test đỏ giả. Mỗi tác nhân phải dùng cơ sở dữ liệu riêng: `DB_DATABASE=yona_rw_test_<tên> vendor/bin/pest` (nhớ tạo trước, bật extension `pg_trgm` và `pgcrypto`, xoá sau khi xong).
13. `vendor/bin/pint --dirty` sẽ định dạng cả file của tác nhân khác — chạy pint theo danh sách file cụ thể.
14. Rà nút bấm thật vào nút Đóng và các nút đổi bố cục → làm bẩn dữ liệu đối chiếu. Chạy nó **sau** khi chấm ảnh, rồi đặt lại dữ liệu.
15. Trạng thái trực tuyến chỉ sống **20 giây** — đo chia việc vòng tròn phải làm mới trạng thái ngay trước mỗi lần tạo hội thoại, nếu không cả hai bên đều không gán và cho kết quả âm tính giả.

---

## 8. Cách tổ chức công việc (đã chạy hiệu quả cho 15 tính năng)

- Phiên chính **chỉ làm kiểm chất lượng**: đọc mã nguồn gốc, chia tính năng thành các đầu việc song song có **ranh giới file rõ ràng**, sau đó tự chạy 5 cửa nghiệm thu và tự commit.
- Phần viết mã giao cho nhiều tác nhân chạy **song song** — đợt lớn nhất là 5 tác nhân cùng lúc. Có thể **ghép hai tính năng ít đụng nhau vào một đợt** rồi cử một tác nhân "dọn cuối" trả nợ liên tính năng (đã làm với nhãn + tệp đính kèm, chưa đọc + tiện ích soạn thảo).
- **Không bao giờ để hai tác nhân sửa cùng một file.** Với file dùng chung không tránh được (`routes/*.php`, `vite.config.js`, `lang/en/*.php`), yêu cầu chèn bằng **một lệnh đọc-sửa-ghi nguyên tử** rồi kiểm lại ngay.
- Nếu công cụ nhắn tin giữa các tác nhân không dùng được: bắt tác nhân backend **ghi hợp đồng API vào đầu file ghi chú của nó ngay khi chốt**, tác nhân giao diện đọc file đó. Cách này chạy tốt.
- Mỗi tác nhân kết thúc bằng khối trạng thái: `Status / Summary / Concerns`.

---

## 9. Việc tiếp theo — thứ tự đề xuất

### D1 Automation rules (làm trước)

Nguồn: `app/models/automation_rule.rb`, `app/services/automation_rules/action_service.rb` (và cả `app/services/action_service.rb`), `app/listeners/automation_rule_listener.rb`, `app/controllers/api/v1/accounts/automation_rules_controller.rb`, giao diện `app/javascript/dashboard/routes/dashboard/settings/automation/**`. Bảng `automation_rules` (`account_id`, `name`, `description`, `event_name`, `conditions` jsonb, `actions` jsonb, `active`, `execution_delay`).

Điểm quan trọng: **bộ thực thi hành động dùng chung với D3 Macros** — thiết kế nó thành một lớp độc lập ngay từ đầu, đừng nhét vào lớp luật. 18 hành động bản cộng đồng; hành động nào chạm tính năng chưa port thì bỏ và ghi nợ.

### D3 Macros (làm liền sau D1)

Nguồn: `app/models/macro.rb`, `app/controllers/api/v1/accounts/macros_controller.rb`, giao diện `settings/macros/**` và nút chạy macro trong khối bên phải của hội thoại (khối "Macros" **đã dựng vỏ, thân đang để trống** — chỉ cần điền). Bảng `macros` (`account_id`, `name`, `visibility`, `created_by_id`, `updated_by_id`, `actions` jsonb). Dùng lại nguyên bộ thực thi hành động của D1.

### D2 Reports

Nguồn: bảng `reporting_events`, `app/builders/v2/report_builder.rb` và thư mục `app/builders/v2/reports/`, các controller báo cáo, giao diện `routes/dashboard/settings/reports/**`. Cần cả biểu đồ theo thời gian và bản đồ nhiệt. Báo cáo khảo sát hài lòng đã được C5 để dành cho nhóm này.

### D4 Webhooks + Agent Bots

Nguồn: bảng `webhooks`, `agent_bots`, ký chữ ký `X-Chatwoot-Signature`, chính sách thử lại. Nhánh bot trong ô chọn người phụ trách đã ghi nợ từ B6.

Sau nhóm D là E (dữ liệu và tìm kiếm), F (kênh ngoài, 8 tính năng), G (Zalo cá nhân và hợp nhất về nhánh chính).

---

## 10. Nợ kỹ thuật đang mở

| Nợ | Thuộc nhóm sẽ trả |
|---|---|
| Nút ghi âm trong ô soạn tin (khác biệt duy nhất còn lại khi rà nút) | B9 |
| Ảnh thu nhỏ 250px cho tệp đính kèm; bong bóng "đang gửi" khi gửi kèm tệp | B9 |
| Gợi ý thời điểm tạm ẩn theo ngôn ngữ tự nhiên; menu chuột phải đầy đủ trên thẻ | B10 |
| Đẩy thông báo qua trình duyệt; âm báo (thiếu tệp âm thanh) | D5 |
| Giao diện email thông báo dựng bằng Blade nên không so ảnh được | D5 / F1 |
| Gửi bản ghi hội thoại qua email; nửa "gửi email" của việc nối lại hội thoại theo email | F1 |
| Trường tuỳ biến trong biểu mẫu trước chat; thuộc tính tuỳ biến của liên hệ | E1 |
| Trung tâm trợ giúp trong cấu hình widget | E4 |
| CORS và danh sách tên miền cho phép khi nhúng khác tên miền | khi triển khai thật |
| Thanh công cụ ô soạn tin dùng thẻ khác bản gốc (hiển thị giống hệt, ảnh vẫn đạt) | B10 |

Chi tiết đầy đủ nằm trong từng file `reports/trace-*.md` mục "khác biệt cố ý" và "nợ".

---

## 11. Bản đồ tài liệu

```
plans/260831-rewrite-chatwoot-laravel/
├── plan.md              ← 13 quyết định kiến trúc + mục Trạng thái + bàn giao từng tính năng
├── feature-roadmap.md   ← 40 tính năng, thứ tự thi công, tiêu chí thử của từng cái
├── HANDOFF.md           ← file này
└── reports/
    ├── trace-*.md       ← bảng đối chiếu chính thức của từng tính năng đã đóng
    ├── *-notes-*.md     ← ghi chú chi tiết của từng tác nhân (hợp đồng API, bẫy)
    └── *-inventory.md   ← ba bản kiểm kê Chatwoot làm lúc đầu
```

Trang tiến độ cho founder: https://claude.ai/code/artifact/d740e226-5b81-4f5c-8910-12ecf84a999c

**Bắt đầu một phiên mới**: đọc `plan.md` mục Trạng thái → đọc mục roadmap của tính năng sắp làm → đọc các `trace-*.md` của tính năng liên quan (nhất là mục "bẫy đã trả giá") → `make up` → làm.
