# D4 backend — Webhooks out + Agent Bots + danh mục ứng dụng tích hợp

Agent `d4-be`. Nguồn: Chatwoot v4.17.1 (`refs/chatwoot`).

## CONTRACT API (cho `d4-fe`) — CHỐT

Tiền tố chung: `/api/v1/accounts/{accountId}`. Lỗi phân quyền: HTTP 401
`{"error":"You are not authorized to do this action"}`. Lỗi validate: HTTP 422
`{"message": "<các câu lỗi nối bằng dấu phẩy>", "attributes": ["<tên trường>"]}`
(`RecordInvalidResponse`, giống D1/D3). Không tìm thấy bản ghi: 404.

### 1. Webhooks — chỉ administrator (WebhookPolicy: index/create/update/destroy)

Shape `webhook` (port `webhooks/_webhook.json.jbuilder`):

```jsonc
{
  "id": 1,
  "name": "Order sync",       // có thể null
  "url": "https://example.com/hook",
  "account_id": 2,
  "subscriptions": ["conversation_created", "message_created"],
  "secret": "aBc…24 ký tự",
  "inbox": { "id": 9, "name": "Website" }   // CHỈ có khi webhook gắn inbox
}
```

| Method | Path | Body | Trả về |
|---|---|---|---|
| GET | `/webhooks` | — | `{"payload":{"webhooks":[webhook,…]}}` |
| POST | `/webhooks` | `{"webhook":{"url":…,"name":…,"inbox_id":…,"subscriptions":[…]}}` | `{"payload":{"webhook":webhook}}` |
| PUT/PATCH | `/webhooks/{id}` | như trên | `{"payload":{"webhook":webhook}}` |
| DELETE | `/webhooks/{id}` | — | 200, body rỗng |

- Body nhận CẢ hai dạng: bọc trong khoá `webhook` (như Rails ParamsWrapper) hoặc phẳng.
- Thiếu hẳn payload → 422 `param is missing or the value is empty: webhook`.
- `subscriptions` bắt buộc, phải là mảng con của danh sách sau, lệch → 422 `Subscriptions Invalid events`:
  `conversation_status_changed, conversation_updated, conversation_created, contact_created,
  contact_updated, message_created, message_updated, webwidget_triggered, inbox_created,
  inbox_updated, conversation_typing_on, conversation_typing_off`
- `url` phải là http/https hợp lệ (`Url is invalid`) và duy nhất theo account (`Url has already been taken`).
- `secret` sinh tự động lúc tạo (24 ký tự), không nhận từ client.

### 2. Agent bots

Shape `agent_bot` (port `api/v1/models/_agent_bot.json.jbuilder` + `AgentBotPresenter`):

```jsonc
{
  "id": 3,
  "name": "Support bot",
  "description": "…",
  "thumbnail": "",              // avatar_url, chuỗi rỗng khi chưa có ảnh
  "outgoing_url": "https://…",  // VẮNG KHOÁ nếu là system bot (account_id = null)
  "bot_type": "webhook",
  "bot_config": {},
  "account_id": 2,              // null với system bot
  "access_token": "…",          // chỉ khi bot thuộc account hiện tại VÀ người gọi là administrator
  "secret": "…",                // chỉ khi không phải system bot VÀ người gọi là administrator
  "system_bot": false
}
```

| Method | Path | Quyền | Body | Trả về |
|---|---|---|---|---|
| GET | `/agent_bots` | admin + agent | — | **mảng trần** `[agent_bot,…]` (bot của account + system bot) |
| GET | `/agent_bots/{id}` | admin + agent | — | `agent_bot` |
| POST | `/agent_bots` | admin | `{name,description,outgoing_url,bot_type,bot_config,avatar_url}` | `agent_bot` |
| PUT/PATCH | `/agent_bots/{id}` | admin | như trên | `agent_bot` |
| DELETE | `/agent_bots/{id}` | admin | — | 200, body rỗng |
| DELETE | `/agent_bots/{id}/avatar` | admin | — | `agent_bot` |
| POST | `/agent_bots/{id}/reset_access_token` | admin | — | `agent_bot` (token mới) |
| POST | `/agent_bots/{id}/reset_secret` | admin | — | `agent_bot` (secret mới) |

- `name` bắt buộc lúc tạo. `outgoing_url` tối đa 2000 ký tự (`Limits::URL_LENGTH_LIMIT`).
- System bot (account_id null) chỉ đọc: mọi thao tác ghi trên nó → 404.

### 3. Agent bot của inbox

| Method | Path | Quyền | Body | Trả về |
|---|---|---|---|---|
| GET | `/inboxes/{id}/agent_bot` | thành viên xem được inbox | — | `{"agent_bot": agent_bot}` — `{"agent_bot": {}}` khi inbox chưa gắn bot |
| POST | `/inboxes/{id}/set_agent_bot` | administrator | `{"agent_bot": <id hoặc null>}` | 200, body rỗng |

`agent_bot: null` (hoặc vắng) = gỡ bot khỏi inbox.

### 4. Danh mục ứng dụng tích hợp

| Method | Path | Trả về |
|---|---|---|
| GET | `/integrations/apps` | `{"payload":[app,…]}` — chỉ app đang `active` với account |
| GET | `/integrations/apps/{appId}` | `app` (không bọc `payload`); không có → 404 |

Shape `app` (port `api/v1/models/_app.json.jbuilder`):

```jsonc
{
  "id": "webhook",
  "name": "Webhooks",
  "description": "…",
  "short_description": null,          // null khi bản gốc không khai
  "enabled": true,                    // webhook: account đã có webhook nào chưa
  // các khoá dưới CHỈ trả cho administrator (đúng như bản gốc):
  "logo": "webhooks.png",
  "i18n_key": "webhooks",
  "action": "/webhook",
  "hook_type": "account",
  "allow_multiple_hooks": true,
  "settings_json_schema": {…},        // nếu app có
  "settings_form_schema": [ … ],      // nếu app có
  "visible_properties": [ … ],        // nếu app có
  "button": "/webhook",               // = action
  "hooks": []                         // luôn rỗng ở D4 (bảng hooks thuộc F6)
}
```

App hiện ra với account mặc định: `webhook`, `dashboard_apps`, `openai`, `dialogflow`,
`google_translate`, `dyte`. `slack`/`linear`/`notion`/`shopify`/`leadsquared` bị ẩn vì
thiếu cờ tính năng hoặc thiếu cấu hình client id/secret — giống oracle chạy trần.

### 5. Job dùng chung (cho `d3-be`)

`\App\Jobs\WebhookJob::dispatch(string $url, array $payload, string $webhookType = 'account_webhook', ?string $secret = null, ?string $deliveryId = null)`

---

## Trace Ruby ↔ PHP

| Ruby (refs/chatwoot) | PHP (yona) |
|---|---|
| `app/models/webhook.rb` | `app/Models/Webhook.php` |
| `app/models/agent_bot.rb` | `app/Models/AgentBot.php` |
| `app/models/agent_bot_inbox.rb` | `app/Models/AgentBotInbox.php` |
| `app/models/concerns/webhook_secretable.rb` | `app/Models/Concerns/WebhookSecretable.php` |
| `app/policies/webhook_policy.rb`, `agent_bot_policy.rb` | `Controller::authorizeAdministrator()` tại chỗ (repo không dùng lớp Policy) |
| `app/listeners/webhook_listener.rb` | `app/Listeners/WebhookListener.php` |
| `app/listeners/agent_bot_listener.rb` | `app/Listeners/AgentBotListener.php` |
| `app/jobs/webhook_job.rb` | `app/Jobs/WebhookJob.php` |
| `app/jobs/agent_bots/webhook_job.rb` | `app/Jobs/AgentBots/WebhookJob.php` |
| `lib/webhooks/trigger.rb` | `app/Services/Webhooks/Trigger.php` (+ `RetryableError`) |
| `app/services/messages/webhook_content_normalizer.rb` | `app/Services/Messages/WebhookContentNormalizer.php` |
| `app/controllers/api/v1/accounts/webhooks_controller.rb` | `app/Http/Controllers/WebApi/WebhooksController.php` |
| `…/agent_bots_controller.rb` | `app/Http/Controllers/WebApi/AgentBotsController.php` |
| `…/inboxes_controller.rb#agent_bot/#set_agent_bot` | `WebApi/InboxesController@agentBot/@setAgentBot` |
| `…/integrations/apps_controller.rb` | `app/Http/Controllers/WebApi/Integrations/AppsController.php` |
| `app/models/integrations/app.rb` | `app/Support/Integrations/App.php` |
| `config/integration/apps.yml` | `config/integration/apps.php` |
| jbuilder `webhooks/_webhook` | `app/Http/Resources/WebhookResource.php` |
| jbuilder `api/v1/models/_agent_bot` + `AgentBotPresenter` | `app/Http/Resources/AgentBotResource.php` |
| jbuilder `api/v1/models/_app` | `app/Http/Resources/IntegrationAppResource.php` |
| `Conversation#webhook_data` (`PushDataHelper`) | `ConversationResource::webhookData()` |
| `Message#webhook_data` | `MessageResource::webhookData()` |
| `Contact#webhook_data` | `ContactResource::webhookData()` |
| `ContactInbox#webhook_data` | `ContactInbox::webhookData()` |
| `User#webhook_data` | `UserResource::webhookData()` |
| `Account#webhook_data` | `Account::webhookData()` |
| `Inbox#webhook_data` | `Inbox::webhookData()` |
| `Inbox::EventDataPresenter#webhook_data` | `InboxResource::eventWebhookData()` |
| `AgentBot#webhook_data` | `AgentBot::webhookData()` |
| `Account#api_and_webhooks_enabled?` | `Account::apiAndWebhooksEnabled()` |
| `AccessTokenAuthHelper::BOT_ACCESSIBLE_ENDPOINTS` | `AuthenticateApiAccessToken::BOT_ACCESSIBLE_ROUTES` |

## Trace spec ↔ Pest

| RSpec | Pest |
|---|---|
| `spec/models/webhook_spec.rb` | `tests/Feature/Models/WebhookTest.php` |
| `spec/models/agent_bot_spec.rb`, `agent_bot_inbox_spec.rb` | `tests/Feature/Models/AgentBotTest.php` |
| `spec/listeners/webhook_listener_spec.rb` | `tests/Feature/Listeners/WebhookListenerTest.php` |
| `spec/listeners/agent_bot_listener_spec.rb` | `tests/Feature/Listeners/AgentBotListenerTest.php` |
| `spec/jobs/webhook_job_spec.rb`, `spec/lib/webhooks/trigger_spec.rb` | `tests/Feature/Jobs/WebhookJobTest.php` |
| `spec/jobs/agent_bots/webhook_job_spec.rb` | `tests/Feature/Jobs/AgentBotWebhookJobTest.php` |
| `spec/controllers/…/webhook_controller_spec.rb` | `tests/Feature/WebApi/WebhooksControllerTest.php` |
| `spec/controllers/…/agent_bots_controller_spec.rb` | `tests/Feature/WebApi/AgentBotsControllerTest.php` |
| `spec/controllers/…/integrations/apps_controller_spec.rb` | `tests/Feature/WebApi/IntegrationAppsControllerTest.php` |

## Khác biệt cố ý

1. **Không có lớp Policy.** Repo chưa dựng tầng Policy; quyền admin kiểm bằng
   `Controller::authorizeAdministrator()` như D1/B-series. Cùng kết quả 401 + chuỗi lỗi.
2. **`webhookData()` đặt theo quy ước sẵn có của repo**, không phải "tất cả trên model":
   model có payload đơn giản (`Account`, `Inbox`, `ContactInbox`, `AgentBot`) giữ method trên
   model; model đã có `pushEventData()` nằm ở Resource (`Conversation`, `Message`, `Contact`,
   `User`, `Inbox::EventDataPresenter`) thì `webhookData()` nằm cạnh nó trong Resource.
   Mỗi model vẫn đúng MỘT chỗ, `pushEventData` không đổi hành vi.
3. **`Message::webhookData()` chưa nối link khảo sát CSAT.** Bản gốc dùng
   `MessageContentPresenter#webhook_content` = `normalize(content_with_survey_link)`;
   `content_with_survey_link` chưa được port (thuộc cụm CSAT survey link). Hiện là
   `normalize(content)`. Khi port link khảo sát, sửa đúng một chỗ trong `MessageResource`.
4. **`Messages::StatusUpdateService` không ghi `external_error`** — cột này chưa có trong bảng
   `messages` của bản port. Chỉ đặt `status = failed`.
5. **`SafeFetch` → Laravel `Http`.** Bản gốc chặn IP nội bộ (SSRF) bằng `SafeFetch`;
   bản port dùng `Http` với `timeout`/`connectTimeout` = `config('webhooks.timeout')` (mặc
   định 5s, env `WEBHOOK_TIMEOUT`). Chốt chặn SSRF chưa port — ghi lại để làm cùng cụm bảo mật.
6. **Retry của agent bot dùng cơ chế queue của Laravel** (`$tries = 3`, `backoff() = [3, 3]`,
   `failed()` chạy nhánh `handle_failure`) thay cho `retry_on` của ActiveJob. Cùng số lần,
   cùng khoảng cách, cùng hệ quả.
7. **`Integrations::App#active?` không `case` theo từng app.** Điều kiện hiện/ẩn khai trong
   `config/integration/apps.php` (`feature_flag` + `requires_config`); giá trị cấu hình đọc từ
   `config/integration/credentials.php` (thay `GlobalConfigService`). Thêm app mới = thêm một
   mục config, không sửa lớp `App`.
8. **`hooks` luôn rỗng, `enabled` của app ngoài `webhook` luôn false** — bảng `hooks` và
   `dashboard_apps` thuộc F6. `action` của Linear bỏ tham số `state` (cần OAuth Linear, F6).
9. **`conversations.assignee_agent_bot_id` KHÔNG thêm khoá ngoại** — bản gốc cũng không có,
   và test sẵn có (`ConversationTest`) dùng id bot giả để kiểm scope.
10. **`Channel\Api` chưa chuyển sang trait `WebhookSecretable`** để tránh đụng file ngoài
    vùng đợt này; nó vẫn tự sinh + reset secret bằng `Channelable::generateToken()`.
    Việc gộp về trait nên làm ở lần dọn kế tiếp.

## Bẫy đã trả giá

- **Khoá ngoại `assignee_agent_bot_id` làm vỡ test của người khác.** Bản đầu có
  `foreign('assignee_agent_bot_id')`; `ConversationTest` gán id bot giả (99) để kiểm scope
  `unassigned/assigned` → vi phạm FK. Bản gốc không có FK ở cột này → đã gỡ khỏi migration
  và `DROP CONSTRAINT` trên `yona_rw`.
- **`ActionCableListenerTest` có test "ignores events without a handler" bắn
  `INBOX_CREATED` với `['inbox' => null]`.** Từ D4, `WebhookListener` nhận event này nên test
  vỡ với `Attempt to read property "account" on null`. Đã đổi test sang `AGENT_ADDED`
  (event chưa listener nào nhận). Đây là sửa CHÍNH ĐÁNG, không phải nới test.
- **Giá trị default của cột không tự có trên model vừa `create()`.** `AgentBotInbox::isActive()`
  trả false vì `status` chưa nạp lại từ DB → phải khai `protected $attributes`
  (tương tự `webhook_type`, `bot_type`).
- **`Account::$fillable` không có `feature_flags`** — test tắt cờ bằng `update()` im lặng
  không có tác dụng; phải `forceFill()->save()`.
- **Gán `assignee_agent_bot_id` tự bắn `conversation.updated`**, nên listener gửi thêm một
  job; test đếm job phải `Queue::fake()` lại sau khi gán.
- **`refresh()` không làm mới quan hệ `account` đã nạp** — test tắt cờ tính năng phải
  truy vấn lại hội thoại từ DB.

## Kết quả gate

- Migration: `php artisan migrate` chạy trên `yona_rw` — 3 bảng `webhooks`, `agent_bots`,
  `agent_bot_inboxes` (precision 6, FK thật tới `accounts`/`inboxes`/`agent_bots`).
- Pest riêng D4 (DB `yona_rw_test_d4`): **37 test xanh**
  (`Models/WebhookTest` 3, `Models/AgentBotTest` 4, `Listeners/WebhookListenerTest` 8,
  `Listeners/AgentBotListenerTest` 5, `Jobs/WebhookJobTest` 5, `Jobs/AgentBotWebhookJobTest` 5,
  `WebApi/WebhooksControllerTest` 5, `WebApi/AgentBotsControllerTest` 5,
  `WebApi/AgentBotApiAccessTest` 4, `WebApi/IntegrationAppsControllerTest` 3).
- Toàn suite trên `yona_rw_test_d4`: **1274 test — 1273 pass, 1 fail**.
  Test hỏng DUY NHẤT nằm ngoài vùng D4: `Tests\Feature\App\AccountScopeTest` →
  "renders placeholder pages for unported child routes" nhận 302 thay vì 200, do agent
  **D2 Reports** vừa thêm route thật `/reports/*` vào `routes/web.php` (trước đó là trang
  placeholder). Chủ route cần cập nhật test đó.
- `vendor/bin/pint --test` trên danh sách file D4: **passed**.
- `php artisan i18n:generate` CHƯA chạy: `lang/en/integration_apps.php` là chuỗi backend
  (tên/mô tả app trả qua API), và bundle FE đang do `d3-fe`/`d4-fe` sinh — để tránh giẫm chân.

## Việc cho phiên chính

- Route đã có sẵn, KHÔNG cần thêm route mới cho D4.
- File ngoài vùng D4 phải sửa (tối thiểu): `app/Providers/AppServiceProvider.php`
  (morph map `'AgentBot'`), `app/Http/Middleware/{AuthenticateApiAccessToken,SetCurrentAccount}.php`
  (bot đăng nhập bằng access token), `app/Http/Controllers/Controller.php` +
  `app/Models/Conversation.php` (`isVisibleTo` nhận `AgentBot`),
  `app/Builders/Messages/MessageBuilder.php` (sender là `AgentBot`),
  `app/Models/{Account,Inbox,ContactInbox,Message}.php` (`webhookData`, `apiAndWebhooksEnabled`,
  `isWebhookSendable`), các Resource dùng chung, `lang/en/{conversations,errors}.php`,
  `tests/Feature/Listeners/ActionCableListenerTest.php` (một dòng, xem "Bẫy").
- FE cần ảnh logo tích hợp ở `public/dashboard/images/integrations/<logo>` — tên file lấy
  từ khoá `logo` trong `config/integration/apps.php`.

---

## Sửa lỗi QA 06/09 (đợt 2) — agent `d4-fix2`

QA trên trình duyệt + API bắt 2 lỗi backend: hội thoại mới trong inbox có bot vẫn
`open` (và bị auto-assign), và bot gọi `toggle_status` thì 500.

### Đã sửa

| Lỗi | Nguồn gốc | Sửa ở đâu |
|---|---|---|
| Hội thoại mới không vào `pending`, không gán bot | `determine_conversation_status` + `set_active_bot_conversation` (`conversation.rb:313-331`) chưa port | `app/Models/Conversation.php` — `determineConversationStatus()` + `setActiveBotConversation()` gọi trong hook `creating` |
| Auto-assignment gán John cho hội thoại lẽ ra pending | Hệ quả của lỗi trên. `AutoAssignmentHandler` đã đúng sẵn: `statusChangedToOpen()` false khi pending, và `shouldRunAutoAssignment()` trả false khi `assignee_agent_bot_id` có giá trị | không sửa gì thêm — test `ConversationBotHandoffTest` khoá lại hành vi |
| `POST /conversations/{id}/toggle_status {status:open}` bằng token bot → 500 `isAdministrator() on null` | `bot_handoff?` + `handle_human_open` chỉ chạy khi `Current.user.is_a?(User)` (`conversations_controller.rb:82-99,178`) | `WebApi/ConversationsController@toggleStatus` — thêm `isBotHandoff()`, gọi `Conversation::botHandoff()`, và chỉ gọi `handleHumanOpen` khi `$request->user() instanceof User` |
| `handle_human_open` không gỡ bot | thiếu `ai_assignee = nil` | `handleHumanOpen()` đặt `assignee_agent_bot_id = null` cho cả admin lẫn agent |
| Chưa có nơi dispatch `CONVERSATION_BOT_HANDOFF` (`d2-be` chờ) | `bot_handoff!` (`conversation.rb:185-192`) | `Conversation::botHandoff()` — `waiting_since` nếu trống → gỡ bot → `open` → `dispatcherDispatch(CONVERSATION_BOT_HANDOFF)` |
| `reset_agent_bot_when_assignee_present` chưa port | `conversation.rb:79,307` | hook `saving` của `Conversation` |
| `meta.assignee`/`assignee_type` không bao giờ là bot | `assigned_entity = assignee_agent_bot \|\| assignee` (`conversation.rb:232`), jbuilder `_conversation` | `ConversationResource::meta()` + `AgentBotResource::slim()` (port `_agent_bot_slim.json.jbuilder`) |
| `Conversations::AssignmentService` bỏ hẳn nhánh AgentBot | `assignment_service.rb` | `app/Services/Conversations/AssignmentService.php` — thêm tham số `assigneeType`, nhánh `assignAgentBot()`, và nhánh "agent nhận việc từ bot → mở lại hội thoại + đặt `waiting_since`"; `AssignmentsController` render `agent_bot_slim` khi trả về bot |

### Rà actor `User` trên toàn bộ endpoint bot được phép gọi

Danh sách từ `AuthenticateApiAccessToken::BOT_ACCESSIBLE_ROUTES`. Bot không có
`currentAccountUser` (xem `SetCurrentAccount`), nên mọi chỗ đọc thuộc tính đó đều nổ.

| Endpoint | Kết quả rà | Xử lý |
|---|---|---|
| `ConversationsController@toggleStatus` | **LỖI** (QA bắt) | đã sửa như bảng trên |
| `ConversationsController@store` | **LỖI tiềm ẩn** — `authorizeInbox()` gọi `$accountUser->isAdministrator()` | `authorizeInbox()` trả sớm khi actor là `AgentBot` (đúng `InboxPolicy#show?`: `return true if @user.is_a?(AgentBot)`) |
| `ConversationsController@toggleTypingStatus` | **LỖI tiềm ẩn** — `TypingStatusManager` type-hint `User\|Contact` → TypeError | mở rộng thành `User\|Contact\|AgentBot`; `ActionCableListener` dùng `AgentBot::pushEventData($inbox)` và bỏ qua `pubsub_token` (bản gốc `respond_to?(:pubsub_token)`); `WebhookListener::typingStatus` trả `webhookData()` của bot thay vì `null` |
| `ConversationsController@show/@update/@togglePriority` | sạch — chỉ dùng `$request->user()->id`, `isVisibleTo()` đã nhận `AgentBot` | — |
| `Conversations\MessagesController@store` | sạch — `MessageBuilder` đã nhận `User\|AgentBot` từ đợt trước | — |
| `Conversations\AssignmentsController@create` | sạch về actor | bổ sung nhánh gán bot (xem trên) |
| `Conversations\LabelsController@index/@create` | sạch — `Labelable` dùng `auth()->user()?->name`, `AgentBot` có `name` | — |

### `AgentBotListener` — xác minh (câu hỏi 4 của QA)

Đối chiếu `app/listeners/agent_bot_listener.rb`: `message_created`/`message_updated`
**KHÔNG** lọc theo trạng thái pending, chỉ lọc `message.webhook_sendable?`; danh sách bot
= `conversation.assignee_agent_bot` + bot đang active của inbox. Bản port
`app/Listeners/AgentBotListener.php` giống hệt → **không phải lỗi, không sửa**.

Activity "Conversation was marked open by Bot Trợ Lý QA" cũng đúng gốc:
`determine_user_name` = `Current.user&.name`, mà `Current.user` khi bot gọi API là
`AgentBot` (có `name`). `Conversation::createActivity()` dùng `auth()->user()?->name` — trùng.

### Bẫy đã trả giá

- **`SafeFetch` của Chatwoot chặn mọi địa chỉ nội bộ.** Oracle chạy trong podman nên webhook
  của bot tới receiver cục bộ (`localhost:9999`, cả `host.containers.internal`) LUÔN hỏng →
  `Webhooks::Trigger#handle_error` tự `open!` hội thoại và chèn activity
  "…moved to open due to an error with the agent bot", trong khi bản port gửi được (khác biệt
  cố ý #5 ở trên) nên giữ pending. Muốn so pixel phải bật `keep_pending_on_bot_failure` **cả hai
  bên** để hỏng hay không cũng giữ pending — `d4-bot-conv-diff.mjs` tự bật/tắt.
- **`determineConversationStatus()` phải chạy TRƯỚC khi chốt `created_at`/`waiting_since`** trong
  hook `creating`, đúng thứ tự `before_create` của bản gốc (`determine_conversation_status`
  khai trước `ensure_waiting_since`).
- **Thứ tự `before_validation` không tái lập được nguyên vẹn:** bản gốc chạy
  `reset_agent_bot_when_assignee_present` TRƯỚC `ensure_assignee_is_from_team` (trait
  `AssignmentHandler` boot trước `booted()` trong PHP). Đặt reset ở đầu hook `saving` của
  `booted()` nên nó chạy SAU. Khác biệt chỉ lộ khi một hội thoại vừa có `assignee_id` vừa có
  `assignee_agent_bot_id` — trạng thái không đường code nào tạo ra được (cả
  `set_active_bot_conversation` lẫn `assign_agent` đều loại trừ nhau). Ghi lại để khỏi tìm lại.
- `AgentBot` **không có `pubsub_token`** — bản gốc né bằng `respond_to?`, bản port phải rẽ theo
  `instanceof`, đừng gọi thẳng thuộc tính.

### Kết quả gate

- Pest mới `tests/Feature/WebApi/ConversationBotHandoffTest.php`: **11 test xanh**
  (pending + gán bot, không auto-assign khi pending, bot inbox tắt → open, đã có assignee thì
  không gán bot, bot handoff + dispatch `CONVERSATION_BOT_HANDOFF`, bot resolve đi đường thường,
  agent mở hội thoại pending → tự nhận + gỡ bot, gán agent cho hội thoại pending → mở lại,
  gán bot → về pending, bot tạo hội thoại trong inbox không phải thành viên, bot bật typing).
- Toàn suite trên `yona_rw_test_d4fix`: **1343 test / 3231 assertion — xanh hết**; đã `dropdb`.
- `vendor/bin/pint --test` trên danh sách file đợt này: passed.
- Kiểm tay trên `yona_rw` (server thật): hội thoại mới → `status=2 (pending)`,
  `assignee_agent_bot_id=10`, `assignee_id=NULL`; `POST /conversations/{id}/toggle_status
  {status:open}` bằng token bot → **200** (trước là 500), sau đó `assignee_agent_bot_id=NULL`,
  `status=0`, `waiting_since` có giá trị.
- Pixel-diff + e2e: xem `d4-notes-fe.md`.

### Dữ liệu để lại

Đã xoá hội thoại 63 (display 62) + contact 107 và mọi fixture do script sinh ra ở cả hai bên.
**Giữ** agent bot id 10 `Bot Trợ Lý QA` + liên kết inbox 1 và webhook 12 `QA Receiver Đợt D4`
trên `yona_rw` cho phiên chính. Oracle đã sạch (0 agent bot, inbox 1 không gắn bot, 1 hội thoại).
