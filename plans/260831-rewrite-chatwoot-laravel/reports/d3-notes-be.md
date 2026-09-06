# D3 Macros — backend (agent `d3-be`)

## CONTRACT API (d3-fe đọc phần này)

Base: `/api/v1/accounts/{accountId}` (routes/web_api.php, đã có sẵn).

| Method | Path | Body | Trả về |
|---|---|---|---|
| GET | `/macros` | — | `{ "payload": [Macro, ...] }` (global của account + personal do chính mình tạo, order id tăng) |
| GET | `/macros/{id}` | — | `{ "payload": Macro }` |
| POST | `/macros` | `{ name, visibility, actions[] }` (phẳng, KHÔNG bọc `macro`) | `{ "payload": Macro }` |
| PUT/PATCH | `/macros/{id}` | như POST, mọi trường optional | `{ "payload": Macro }` |
| DELETE | `/macros/{id}` | — | 200, body rỗng |
| POST | `/macros/{id}/execute` | `{ conversation_ids: [display_id, ...] }` | 200, body rỗng (chạy nền qua job queue `medium`) |

`Macro` (đúng `_macro.json.jbuilder`):
```jsonc
{
  "id": 12,
  "name": "Chốt đơn",
  "visibility": "personal" | "global",
  "created_by": { /* agent payload, chỉ có khi tác giả còn tồn tại */ },
  "updated_by": { /* agent payload, chỉ có khi còn tồn tại */ },
  "account_id": 2,
  "actions": [{ "action_name": "add_label", "action_params": ["support"] }],
  "files": [ // CHỈ xuất hiện khi macro có tệp đính kèm
    { "id": 3, "macro_id": 12, "file_type": "image/png", "account_id": 2,
      "file_url": "http://...", "blob_id": 3, "filename": "avatar.png" }
  ]
}
```

Mã lỗi:
- `404` — macro không thuộc account / không tồn tại.
- `401` `{"error":"You are not authorized to do this action"}` — sai quyền theo MacroPolicy:
  - xem/chạy: macro global HOẶC mình là tác giả;
  - sửa/xóa: macro global → phải là administrator; macro personal → phải là tác giả.
- `422` `{"error":{"actions":["Macro execution actions X not supported."]}}` — tên action ngoài `ACTIONS_ATTRS`.
- `422` `{"error":"Invalid attachment"}` — `send_attachment` mang tham chiếu tệp không hợp lệ.

`visibility`: agent gửi `global` vẫn bị ép về `personal` (chỉ administrator đặt được `global`).

`ACTIONS_ATTRS` (17 tên hợp lệ khi lưu): `send_message, add_label, assign_team, assign_agent, mute_conversation,
change_status, remove_label, remove_assigned_agent, remove_assigned_team, resolve_conversation, snooze_conversation,
change_priority, send_email_transcript, send_attachment, add_private_note, send_webhook_event`.

### Tệp của action `send_attachment`
1. FE upload tệp: **`POST /api/v1/accounts/{accountId}/upload`**, multipart field `attachment`
   → `{ "file_url": "...", "blob_id": "<chuỗi ký>" }` (tương đương `blob.signed_id` của Chatwoot; helper gốc
   `uploadHelper.js#uploadFile` trả `blobId` — giữ nguyên hình dạng).
2. Gửi `action_params: ["<blob_id chuỗi ký>"]` trong POST/PUT macro.
3. Backend gắn tệp vào macro và **ghi đè `action_params` thành `[<id số>]`**; `files[].blob_id` = đúng id số đó
   (`macroHelper.getFileName` khớp theo `blob_id` như bản gốc).
4. Lần sửa sau, gửi lại `action_params: [<id số>]` để giữ tệp cũ; giá trị lạ → 422 `Invalid attachment`.

> ⚠️ **CẦN PHIÊN CHÍNH THÊM ROUTE** (agent không sửa route file):
> ```php
> // routes/web_api.php — trong nhóm account
> Route::post('/upload', [\App\Http\Controllers\WebApi\UploadController::class, 'store']);
> ```
> Controller đã có: `app/Http/Controllers/WebApi/UploadController.php`. Chưa có route thì nút đính kèm
> trong macro builder chưa upload được (mọi phần còn lại của D3 không phụ thuộc route này).

## Bảng trace Ruby ↔ PHP

| Ruby (refs/chatwoot) | PHP (yona) |
|---|---|
| `app/models/macro.rb` | `app/Models/Macro.php` |
| `db/schema.rb` bảng `macros` | `database/migrations/2026_09_06_950000_create_macros_table.php` |
| `app/policies/macro_policy.rb` | `app/Policies/MacroPolicy.php` |
| `api/v1/accounts/macros_controller.rb` | `app/Http/Controllers/WebApi/MacrosController.php` |
| `concerns/attachment_concern.rb` | `app/Services/Macros/AttachmentActionPreparer.php` |
| `api/v1/accounts/upload_controller.rb` | `app/Http/Controllers/WebApi/UploadController.php` |
| `app/services/macros/execution_service.rb` | `app/Services/Macros/ExecutionService.php` |
| `Current.user = user` + `ensure Current.reset` (execution_service.rb) | `app/Support/CurrentUser.php::runAs()` |
| `ActionService` (phần hành động chung) | `app/Services/ConversationActions/ActionExecutor.php` (đã có từ D1, mở rộng) |
| `app/jobs/macros_execution_job.rb` | `app/Jobs/MacrosExecutionJob.php` |
| `views/api/v1/models/_macro.json.jbuilder` | `app/Http/Resources/MacroResource.php` |
| `user.rb#remove_macros` | hook `static::deleted` trong `app/Models/User.php` |
| `account.rb has_many :macros` | `Account::macros()` |

## Spec ↔ Pest

| RSpec | Pest |
|---|---|
| `spec/models/macro_spec.rb` | `tests/Feature/Models/MacroTest.php` |
| `spec/controllers/api/v1/accounts/macros_controller_spec.rb` | `tests/Feature/WebApi/MacrosControllerTest.php` |
| `spec/services/macros/execution_service_spec.rb` | `tests/Feature/Services/Macros/ExecutionServiceTest.php` |
| (không có spec job) | `tests/Feature/Jobs/MacrosExecutionJobTest.php` |
| (hành vi `Current.user`, không có spec riêng) | `ExecutionServiceTest`: "names the acting user in the activity messages it creates", "names the acting user in every activity an action can create", "restores the previous auth user after the run"; `MacrosExecutionJobTest`: "names the user who ran the macro in the activity messages" |

## Khác biệt cố ý
- **Không có ActiveStorage**: `has_many_attached :files` → `attachments` polymorphic (quyết định #9).
  `blob_id` của bản gốc = id `attachments` ở đây; `signed_id` = chuỗi ký `Attachment::signUpload`.
- **`update` không xóa visibility**: bản gốc gán thẳng `visibility = params[:visibility]`, nên PUT thiếu
  `visibility` sẽ ghi NULL. Ở đây thiếu tham số thì giữ nguyên giá trị cũ.
- **`send_attachment` nằm ở lõi, nguồn tệp ở lớp macro**: `ActionExecutor` nhận danh sách tham chiếu tệp đã ký
  (trung tính), `Macros\ExecutionService` mới biết tệp đó thuộc macro nào. Lõi thêm `$actor` (người bấm nút) để
  `send_message`/`add_private_note` có người gửi và `assign_agent: ['self']` giải ra đúng người đó.
- **`send_email_transcript`**: giữ trong `ACTIONS_ATTRS` (lưu được) nhưng lúc chạy ném
  `UnsupportedActionException` → bị `report()` nuốt như Rails nuốt lỗi từng action. Mailer thuộc F1.
- **`send_webhook_event`**: gọi `\App\Jobs\WebhookJob::dispatch($url, $payload)` với
  `payload = conversation->webhookData() + ['event' => 'macro.executed']`. Cả hai do `d4-be` port; hiện bọc
  `class_exists`/`method_exists` nên chưa có thì action im lặng bỏ qua. **d4-be**: giữ đúng chữ ký
  `WebhookJob::dispatch(string $url, array $payload)` và `Conversation::webhookData(): array`; khi có rồi
  gỡ guard trong `app/Services/Macros/ExecutionService.php::sendWebhookEvent()` và bật lại test tương ứng.

## Bẫy đã trả giá
- **`Current.user` trong job nền (QA bắt 06/09, đã sửa)**: bấm macro "Add a Label → Resolve" từ accordion sinh
  activity *"Conversation was marked resolved by system due to 0 minutes of inactivity"* và **không** có
  *"John added Khách mới"*. `Conversation.php` lấy tên chủ thể bằng `auth()->user()`; trong `MacrosExecutionJob`
  không có auth user nên rơi vào nhánh auto-resolve và bỏ qua activity nhãn (Pest cũ không bắt được vì test
  chạy sau `actingAs`). Sửa: `ExecutionService::perform()` bọc toàn bộ vòng action trong
  `CurrentUser::runAs($user, ...)` — đúng chỗ `Current.user = user` của Ruby, `finally` trả guard về trạng thái
  cũ vì worker chạy nhiều job tuần tự trên cùng tiến trình.
  - **Helper dùng chung**: `app/Support/CurrentUser::runAs(?User, callable)` là nguồn duy nhất cho ngữ cảnh
    người dùng trong job nền (D1/D4 dùng lại thay vì tự `Auth::setUser`). `BulkActionsJob` đã tự làm tay đúng
    kiểu này → refactor cho gọi helper, gỡ trùng lặp. `CurrentExecutedBy` là khái niệm KHÁC (tác nhân không
    phải người: rule/policy/inbox), không gộp.
  - `send_message`/`add_private_note` không dính lỗi này vì `MessageBuilder` nhận `$actor` tường minh.
- **Activity ghi bất đồng bộ**: `ActivityMessageJob` chạy trên queue, nên e2e phải chờ activity xuất hiện
  rồi mới khẳng định; đọc ngay sau khi status đổi là đọc trạng thái nửa vời (lần chạy đầu báo FAIL giả).
- Spec Ruby `PUT ... expect(json_response['name']).to eql(params['name'])` là **so nil với nil**
  (`params` là hash khóa symbol, response bọc trong `payload`). Đừng bắt chước bỏ `payload` — jbuilder có bọc.
- `visibility` là enum số trong DB nhưng chuỗi trên API → accessor/mutator ở model, mọi so sánh trong policy
  dùng `isGlobal()` đọc giá trị thô, không so chuỗi.
- Xóa user: macro **personal** chết theo, macro **global** ở lại với `created_by` rỗng → macro global mồ côi chỉ
  admin xóa được (spec bắt đúng ca này).

## Kết quả gate — vòng sửa `Current.user` (06/09/2026, agent `d3-be-fix`)
- Đối chiếu oracle (account 1, hội thoại tạm display 32, macro tạm, nhãn tạm — đã xoá sạch sau khi đo):
  `assign_agent self` → `Assigned to John by Default Policy` (auto-assignment của inbox chạy trước),
  `John added d3fixtmp`, `John set the priority to urgent`, `John removed d3fixtmp`,
  `Conversation was snoozed by John`, `Conversation was marked resolved by John`,
  `John has muted the conversation`. Yona khớp toàn bộ chuỗi này (test "every activity an action can create",
  riêng assign_agent self ra `John self-assigned this conversation` vì không có policy auto-assign chen vào).
- Pest trên DB riêng `yona_rw_test_d3fix`: `ExecutionServiceTest` 11/11, `MacrosExecutionJobTest` 3/3;
  **toàn suite 1332/1332 pass** (0 fail — các lỗi D4 ghi ở vòng trước đã hết). DB đã `dropdb`.
- Kiểm chứng ngược: bỏ `CurrentUser::runAs` → `MacrosExecutionJobTest` fail đúng ở activity nhãn.
- `vendor/bin/pint` trên file đã đụng → passed.
- E2E thật trên `yona_rw`: `node ~/www/pixel-diff/d3-macros-e2e.mjs` → **33/33 PASS** (đã thêm 3 bước:
  tin macro mang tên John, activity nhãn mang tên John, activity resolve mang tên John).
- Dọn dữ liệu: message 491 và mọi activity test đã xoá khỏi hội thoại display 4 (`reset-fixture.sh`
  + xoá tay tin activity ghi trễ); hội thoại 4 còn đúng 5 tin gốc, không nhãn, status open.
- Sửa harness (ngoài repo): `~/www/pixel-diff/d3-macros-e2e.mjs` — chờ activity trước khi khẳng định,
  khớp ĐÚNG tên macro (dev DB còn macro `Cảm ơn & đóng (QA)` của phiên QA, khớp chuỗi con báo xoá hụt),
  chờ 6s trước `reset-fixture.sh` để activity ghi trễ không sống sót.

## Kết quả gate (06/09/2026)
- `vendor/bin/pint <file của d3-be>` → passed (chạy `--test` trên toàn `app/` còn 2 file của agent khác
  chưa format: `app/Models/ContactInbox.php`, `app/Http/Resources/UserResource.php` — không sửa hộ).
- Pest riêng (DB `yona_rw_test_d3`):
  - `tests/Feature/Models/MacroTest.php` 4/4
  - `tests/Feature/WebApi/MacrosControllerTest.php` 11/11
  - `tests/Feature/Services/Macros/ExecutionServiceTest.php` 8/8
  - `tests/Feature/Jobs/MacrosExecutionJobTest.php` 2/2
- Toàn suite trên `yona_rw_test_d3`: **1227 test — 1222 pass, 1 fail + 4 error, tất cả nằm ngoài vùng D3**
  (cây làm việc dùng chung với `d4-be` đang code dở):
  - `Finders/ConversationFinderTest` (2) + `Models/ConversationTest` (1): FK
    `conversations_assignee_agent_bot_id_foreign` — bảng `agent_bots` của D4.
  - `Listeners/ActionCableListenerTest`: `Attempt to read property "account" on null`.
  - `App/AccountScopeTest` "renders placeholder pages for unported child routes": 302 thay vì 200 — trùng thời
    điểm `app/Http/Middleware/SetCurrentAccount.php` được sửa cho AgentBot (D4).
  → Đã báo `d4-be` qua note này; d3-be không sửa file của D4.
- `php artisan migrate` trên `yona_rw`: `2026_09_06_950000_create_macros_table` DONE.
- DB test `yona_rw_test_d3` đã `dropdb` sau khi chạy xong.

## File đã đụng (d3-be)
Mới: `database/migrations/2026_09_06_950000_create_macros_table.php`, `app/Models/Macro.php`,
`app/Policies/MacroPolicy.php`, `app/Http/Resources/MacroResource.php`,
`app/Http/Controllers/WebApi/MacrosController.php`, `app/Http/Controllers/WebApi/UploadController.php`,
`app/Services/Macros/{ExecutionService,AttachmentActionPreparer}.php`, `app/Jobs/MacrosExecutionJob.php`,
`database/factories/MacroFactory.php`, 4 file test ở trên.

Vòng sửa `Current.user`: mới `app/Support/CurrentUser.php`; sửa `app/Services/Macros/ExecutionService.php`,
`app/Jobs/BulkActionsJob.php` (dùng helper thay đoạn `Auth::setUser` viết tay), 2 file test macro ở trên.

Sửa file dùng chung (tối thiểu, không đụng vùng agent khác):
- `app/Services/ConversationActions/ActionExecutor.php`: thêm `$actor`, `assign_agent: 'self'`,
  `send_attachment`, `change_status`; gom việc dựng tin nhắn vào `buildMessage()`.
- `app/Models/Attachment.php`: thêm `signedReference()` (ký lại một tệp đã lưu để gửi lại).
- `app/Models/Account.php`: quan hệ `macros()`.
- `app/Models/User.php`: hook `deleting` xóa macro personal của tác giả (`remove_macros`).
  Bẫy: dùng `deleted` là hỏng — FK `nullOnDelete` đã xóa sạch `created_by_id` trước khi hook chạy.
