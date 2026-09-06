# F6 Slack — port tích hợp Slack (Chatwoot → Laravel)

Agent `f6-slack`. Nguồn: Chatwoot v4.17.1 (`refs/chatwoot`, `lib/integrations/slack/*`,
`app/jobs/{send_on_slack_job,update_slack_message_job,slack_unfurl_job}.rb`,
`app/controllers/api/v1/{accounts/integrations/slack_controller,integrations/webhooks_controller}.rb`).

Hạ tầng dùng lại nguyên trạng (không sửa): `Hook` model, `HookFactory`, `App`/`config/integration/apps.php`,
`EventProcessor` contract, `HookJob`/`HookListener`, `EventProcessorResolver`.

## Trace Ruby ↔ PHP

| Ruby | PHP |
|---|---|
| `lib/integrations/slack/hook_builder.rb` | `app/Services/Integrations/Slack/HookBuilder.php` |
| `lib/integrations/slack/channel_builder.rb` | `app/Services/Integrations/Slack/ChannelBuilder.php` |
| `lib/integrations/slack/emoji_formatter.rb` | `app/Services/Integrations/Slack/EmojiFormatter.php` |
| `lib/integrations/slack/link_unfurl_formatter.rb` | `app/Services/Integrations/Slack/LinkUnfurlFormatter.php` |
| `lib/integrations/slack/slack_link_unfurl_service.rb` | `app/Services/Integrations/Slack/SlackLinkUnfurlService.php` |
| `lib/integrations/slack/send_on_slack_service.rb` | `app/Services/Integrations/Slack/SendOnSlackService.php` |
| `lib/integrations/slack/update_slack_message_service.rb` | `app/Services/Integrations/Slack/UpdateSlackMessageService.php` |
| `lib/integrations/slack/incoming_message_builder.rb` + `slack_message_helper.rb` | `app/Services/Integrations/Slack/IncomingMessageBuilder.php` (gộp một chỗ — helper chỉ dùng ở đây) |
| `Slack::Web::Client` (gem slack-ruby-client) | `app/Services/Integrations/Slack/SlackClient.php` (Illuminate Http, mọi service Slack gọi qua đây — DRY) |
| lớp lỗi `Slack::Web::Api::Errors::*` | `app/Services/Integrations/Slack/SlackApiException.php` (đọc `ok`/`error` của response) |
| `Slack::Messages::Formatting.unescape` + `RegexHelper::MENTION_REGEX` | `app/Services/Integrations/Slack/SlackFormatting.php` |
| `app/jobs/hook_job.rb` nhánh `process_slack_integration` | `app/Services/Integrations/Slack/SlackEventProcessor.php` (implements `EventProcessor`, cắm qua `config/integration/apps.php['slack']['event_processor']`) |
| `app/jobs/send_on_slack_job.rb` | `app/Jobs/Integrations/SendOnSlackJob.php` |
| `app/jobs/update_slack_message_job.rb` | `app/Jobs/Integrations/UpdateSlackMessageJob.php` |
| `app/jobs/slack_unfurl_job.rb` | `app/Jobs/Integrations/SlackUnfurlJob.php` |
| `Api::V1::Accounts::Integrations::SlackController` | `app/Http/Controllers/WebApi/Integrations/SlackController.php` |
| `Api::V1::Integrations::WebhooksController` | `app/Http/Controllers/Api/Integrations/WebhooksController.php` |
| `config/integration/apps.php['slack']` | + 1 dòng `'event_processor' => SlackEventProcessor::class` |

## Trace spec RSpec ↔ Pest

| RSpec | Pest |
|---|---|
| `spec/lib/integrations/slack/hook_builder_spec.rb` | `tests/Feature/Integrations/Slack/HookBuilderTest.php` |
| (không có spec riêng cho ChannelBuilder ở bản gốc — phủ qua request spec) | `tests/Feature/Integrations/Slack/ChannelBuilderTest.php` |
| `spec/lib/integrations/slack/emoji_formatter_spec.rb` | `tests/Unit/Integrations/Slack/EmojiFormatterTest.php` |
| `Slack::Messages::Formatting.unescape` + `RegexHelper::MENTION_REGEX` (không có spec riêng) | `tests/Unit/Integrations/Slack/SlackFormattingTest.php` |
| `spec/lib/integrations/slack/link_unfurl_formatter_spec.rb` | `tests/Feature/Integrations/Slack/LinkUnfurlFormatterTest.php` |
| `spec/lib/integrations/slack/slack_link_unfurl_service_spec.rb` | `tests/Feature/Integrations/Slack/SlackLinkUnfurlServiceTest.php` |
| `spec/lib/integrations/slack/send_on_slack_service_spec.rb` | `tests/Feature/Integrations/Slack/SendOnSlackServiceTest.php` |
| `spec/lib/integrations/slack/update_slack_message_service_spec.rb` | `tests/Feature/Integrations/Slack/UpdateSlackMessageServiceTest.php` |
| `spec/lib/integrations/slack/incoming_message_builder_spec.rb` | `tests/Feature/Integrations/Slack/IncomingMessageBuilderTest.php` |
| `spec/jobs/send_on_slack_job_spec.rb` | `tests/Feature/Integrations/Slack/SendOnSlackJobTest.php` |
| `spec/jobs/update_slack_message_job_spec.rb` | `tests/Feature/Integrations/Slack/UpdateSlackMessageJobTest.php` |
| `spec/jobs/slack_unfurl_job_spec.rb` | `tests/Feature/Integrations/Slack/SlackUnfurlJobTest.php` |
| `spec/requests/api/v1/accounts/integrations/slack_request_spec.rb` | `tests/Feature/Integrations/Slack/SlackControllerTest.php` |
| `spec/controllers/api/v1/integrations/webhooks_controller_spec.rb` (route port) | `tests/Feature/Integrations/Slack/WebhooksControllerTest.php` |
| `app/jobs/hook_job.rb#process_slack_integration` (không có spec riêng — phủ qua hook_job_spec chung) | `tests/Feature/Integrations/Slack/SlackEventProcessorTest.php` |

## Khác biệt cố ý

1. **`SlackClient` thay gem `slack-ruby-client`.** Mọi lời gọi Slack Web API đi qua
   `Illuminate\Http\Client` (`Http::asForm()->post('https://slack.com/api/<method>', …)`),
   đọc `ok`/`error` của response, ký thành `SlackApiException`. Một điểm sửa duy nhất khi cần
   đổi cách gọi Slack (timeout, retry…).
2. **`files_upload_v2` port đúng luồng 3 bước thật của Slack** (`files.getUploadURLExternal` →
   POST nhị phân tới `upload_url` → `files.completeUploadExternal`) thay vì gọi thẳng
   `files.upload` (endpoint cũ Slack đã khai tử theo chính comment trong gem gốc).
3. **`avatar_url` không đi qua route `/slack_uploads?blob_key=…`.** Route đó (controller
   `SlackUploadsController`, phục vụ blob ActiveStorage riêng cho Slack) chưa port — dùng thẳng
   `Attachment::url()` của avatar sender (`Avatarable::avatarUrl()`), tương đương chức năng
   (một URL công khai trỏ tới avatar). Nợ: nếu sau này cần route riêng, thêm ở đúng
   `SendOnSlackService::avatarUrl()`.
4. **`hook.prompt_reauthorization!` (Redis "cần cấp quyền lại" + email admin) CHƯA port.**
   Đây là hành vi của module `Reauthorizable` — bản port hiện có `App\Models\Channel\Concerns\Reauthorizable`
   nhưng CHƯA gắn vào `Hook` (sửa `app/Models/Integrations/Hook.php` ngoài phạm vi agent này).
   Mọi nơi Ruby gọi `hook.prompt_reauthorization! + hook.disable` (SendOnSlackService,
   UpdateSlackMessageService, IncomingMessageBuilder) ở bản port chỉ gọi `hook->disable()` —
   đúng phần chức năng cốt lõi (ngăn spam lỗi lặp lại), thiếu phần thông báo admin. Nợ 1 dòng:
   thêm `use Reauthorizable;` vào `Hook` rồi đổi 3 chỗ gọi `disable()` thành `promptReauthorization(); disable();`.
5. **`valid_channel_for_slack?` (chặn kênh Twitter/X) bỏ qua** — kênh `Channel::TwitterProfile`
   chưa có trong bản port (`grep app/Models` không thấy). Coi mọi kênh hợp lệ; thêm kênh đó sau
   thì chỉ cần thêm guard đúng 1 chỗ trong `SendOnSlackService::perform()`.
6. **Chuỗi hiển thị (`lang/en/errors.php` khoá `slack`, namespace `slack_unfurl`) hardcode
   trong code** thay vì `__()`. `lang/**` ngoài phạm vi agent này (chỉ thấy `integration_apps.slack`
   đã có, thiếu `errors.slack.invalid_channel_id` và toàn bộ `slack_unfurl.*`). Giữ đúng NGUYÊN VĂN
   tiếng Anh gốc (`'Invalid slack channel. Please try again'`, `'Name'`, `'Open conversation'`…) để
   khi porting lang sau này chỉ cần thay `'chuỗi'` bằng `__('key')` — không đổi hành vi.
7. **`FRONTEND_URL` → `config('app.url')`.** Bản port không có biến môi trường `FRONTEND_URL`
   riêng (dự án single-app); `App::slackRedirectUri()` (D4) đã dùng cùng quy ước, `HookBuilder`
   và `SendOnSlackService::linkToConversation()` đi theo cho nhất quán.
8. **`ChatwootExceptionTracker` (Sentry) không port** — nơi Ruby capture exception trước khi
   `disable_and_reauthorize` (IncomingMessageBuilder khi `MissingScope`), bản port chỉ `Log::error`.
9. **`prompt_reauthorization!`/mail thông báo admin khi mất quyền** — xem mục 4, cùng một nợ.

## Bẫy đã trả giá

- **`Http::fake()` gọi nhiều lần KHÔNG ghi đè — stub đăng ký TRƯỚC luôn thắng** (`PendingRequest::
  buildStubHandler` dùng `->map->__invoke(...)->filter()->first()`, tức duyệt đúng thứ tự đăng ký).
  Test đầu đặt `Http::fake([...])` chung trong `beforeEach` rồi từng `it()` gọi `Http::fake([...])`
  riêng để đổi response — SAI: fake của `beforeEach` (đăng ký trước) luôn khớp trước, fake riêng
  của test không bao giờ được dùng. Phát hiện qua 2 test agent Chatwoot khớp email/sinh
  `sender_name` luôn thất bại dù logic đúng (đã xác minh qua script tinker độc lập chạy đúng).
  Sửa: bỏ fake mặc định ở `beforeEach`, mỗi test tự khai fake nó cần (helper
  `fakeSlackUsersInfo()` trong `IncomingMessageBuilderTest.php`).
- **`User` KHÔNG có cột `account_id`** (multi-tenant qua bảng `account_users`, không phải cột
  trực tiếp trên `users`) — factory test ban đầu viết `User::factory()->create(['account_id' => …])`
  vỡ SQL `column "account_id" of relation "users" does not exist`. Sửa: tạo `User::factory()`
  trần rồi gắn qua `AccountUser::factory()->create(['account_id' => …, 'user_id' => $user->id])`.
- **Mass-assignment im lặng bỏ qua cột không có trong `$fillable`.** `Attachment::create([
  'attachable_type' => …, 'attachable_id' => …, …])` không lỗi cú pháp nhưng 2 cột đó bị BỎ QUA
  (không có trong `Attachment::$fillable`) → insert `attachable_type/attachable_id = NULL` vỡ
  NOT NULL. Sửa: dùng quan hệ morph `$message->attachments()->create([...])` để Eloquent tự gắn
  đúng 2 cột polymorphic.
- **`submitted_values`/`submitted_email`/`items`/`external_source_id_slack` KHÔNG phải cột
  riêng** (ban đầu tưởng là "nợ migration") — đọc `refs/chatwoot/app/models/message.rb` mới thấy
  đây là `store :content_attributes, accessors: [...]` và `store :external_source_ids, accessors:
  [:slack], prefix: :external_source_id` của Rails — tức đã có sẵn trong `content_attributes` và
  `external_source_ids` (cả hai đã port, cast `array`). Không cần thêm cột nào, không có nợ.
- **`Http::fake('https://slack.com/api/conversations.list*')` khớp CẢ hai loại `private_channel`
  và `public_channel`** nếu không phân biệt theo body — test đầu tiên cho `list_all_channels` bị
  nhân đôi kết quả (Slack thật ra gọi 2 lần: 1 cho private, 1 cho public). Sửa: fake bằng closure
  đọc `$request->body()` chứa `'public_channel'`/`'private_channel'` để trả đúng từng loại.

## Nợ để lại (không tự vá vì ngoài phạm vi/đợi hạ tầng khác)

1. `Hook::prompt_reauthorization!` — cần gắn `Reauthorizable` trait vào `app/Models/Integrations/Hook.php`
   (mục "Khác biệt cố ý" #4). Ảnh hưởng: khi Slack mất quyền, hook vẫn tự tắt đúng (chức năng
   cốt lõi hoạt động) nhưng admin KHÔNG nhận email cảnh báo.
2. `Channel::TwitterProfile` chưa port → guard `valid_channel_for_slack?` không có gì để chặn;
   không phải lỗi hiện tại, chỉ ghi chú cho người port kênh Twitter/X sau này.
3. Chuỗi hiển thị hardcode chờ `lang/en/errors.php['slack']` + `lang/en/slack_unfurl.php` (xem
   mục #6) — người port lang cần đối chiếu đúng các chuỗi đã liệt kê ở trên.
4. **`HookListener::messageEvent()` có khả năng luôn gửi `previous_changes = null`.** Phát hiện
   khi đọc code (không sửa — file ngoài phạm vi agent này): `Message::sendUpdateEvent()` bắn
   event với khoá `'previous_changes'`, nhưng `HookListener.php` (dòng ~42) lại đọc
   `$event->data['changed_attributes']` (khoá KHÁC — quy ước dùng ở `BaseListener`/`WebhookListener`/
   `AutomationRuleListener`) để gán vào `'previous_changes'` gửi cho `EventProcessor`. Nếu đúng
   như đọc code, `SlackEventProcessor::onMessageUpdated()`'s guard
   `array_key_exists('content_attributes', $previousChanges)` — và tương tự guard của mọi app
   khác dùng `previous_changes` (Dialogflow) — sẽ LUÔN false, khiến nhánh `message.updated`
   không bao giờ chạy trong thực tế (dù test đơn vị của `SlackEventProcessor` ở đây xanh vì gọi
   `process()` trực tiếp, bỏ qua `HookListener`). Đây là bug ở lõi `HookListener.php`
   (thuộc sở hữu agent khác, không nằm trong vùng file agent này được sửa) — cần một agent có
   quyền sửa `app/Listeners/HookListener.php` đổi `changed_attributes` → `previous_changes` (đổi
   1 dòng). Founder/agent phụ trách HookListener nên xác nhận trước khi sửa.

## Kết quả gate

- `vendor/bin/pint --test` trên toàn bộ file đã tạo/sửa (`app/Services/Integrations/Slack`,
  `app/Jobs/Integrations/{SendOnSlackJob,UpdateSlackMessageJob,SlackUnfurlJob}.php`,
  `app/Http/Controllers/WebApi/Integrations/SlackController.php`,
  `app/Http/Controllers/Api/Integrations/WebhooksController.php`,
  `tests/Feature/Integrations/Slack`, `tests/Unit/Integrations/Slack`): **passed**.
- Pest (DB riêng `yona_rw_test_f6a`): `tests/Feature/Integrations/Slack` +
  `tests/Unit/Integrations/Slack` → **71/71 xanh** (103 assertion).
- Chạy rộng hơn `tests/Feature/Integrations tests/Unit/Integrations` (gồm cả file của agent
  khác đang làm song song — GoogleTranslate, MessageTranslate): 2 test KHÔNG liên quan Slack thất
  bại (`GoogleTranslateProcessorServiceTest` — "Undefined array key mimeType";
  `MessageTranslateTest` — `MessagesController::translate()` sai kiểu trả về). Cả hai thuộc
  module Google Translate của agent khác đang sửa `config/integration/apps.php` song song trong
  phiên này — không đụng tới, không thuộc vùng file được giao.

## Kiểm tra thủ công (đọc cấu hình, không chạy server)

- `config/integration/apps.php['slack']` có thêm đúng 1 khoá `'event_processor' =>
  SlackEventProcessor::class` — đọc lại file trước khi sửa như yêu cầu; các agent khác
  (`dialogflow`, `openai`) đã thêm khoá tương tự của họ song song, không xung đột.
