# F6 — Dashboard Apps + Integrations Hooks + tích hợp Slack/Dialogflow/Google Translate/OpenAI/Dyte

Agent `f6` (điều phối) + ba agent con: `f6-slack` (backend Slack), `f6-misc`
(Dialogflow/Google Translate/OpenAI/Dyte), `f6-slack-fe` (trang Slack).
Nguồn: Chatwoot v4.17.1 (`refs/chatwoot`), cấm `enterprise/`. Ngày 06/09/2026.

Note con: `f6-notes-slack.md`, `f6-notes-misc.md`, `f6-notes-slack-fe.md`.

## CONTRACT API

Tiền tố `/api/v1/accounts/{accountId}`. Lỗi phân quyền 401
`{"error":"You are not authorized to do this action"}`; lỗi validate 422
`{"message":"…","attributes":["…"]}` (`RecordInvalidResponse`); không tìm thấy 404.

### Dashboard apps (`DashboardAppPolicy`: đọc mở, ghi chỉ administrator)

Shape (port `api/v1/models/_dashboard_app.json.jbuilder`):

```jsonc
{ "id": 1, "title": "CRM", "content": [{ "type": "frame", "url": "https://…" }], "created_at": "…" }
```

| Method | Path | Body | Trả về |
|---|---|---|---|
| GET | `/dashboard_apps` | — | **mảng trần** `[app,…]` |
| GET | `/dashboard_apps/{id}` | — | `app` |
| POST | `/dashboard_apps` | `{dashboard_app:{title,content}}` hoặc phẳng | `app` |
| PUT/PATCH | `/dashboard_apps/{id}` | như trên | `app` |
| DELETE | `/dashboard_apps/{id}` | — | 204 |

- `content` phải là mảng ≥ 1 phần tử `{type:"frame", url:"http(s)://…"}`; sai → 422
  `{"message":"Content : Invalid data","attributes":["content"]}`.
- Khoá lạ trong phần tử `content` bị loại (permit của Rails).
- `user_id` = người tạo, gán tự động.

### Integrations hooks (`HookPolicy`: ghi chỉ administrator, `process_event` mở)

Shape (port `api/v1/models/_hook.json.jbuilder`):

```jsonc
{
  "id": 1, "app_id": "dialogflow", "status": true,
  "inbox": { "id": 9, "name": "Website" },   // null khi hook cấp account
  "account_id": 2, "hook_type": "account",   // hoặc "inbox"
  // hai khoá dưới CHỈ cho administrator:
  "settings": {},                            // đã lọc theo visible_properties
  "reference_id": null
}
```

| Method | Path | Body | Trả về |
|---|---|---|---|
| POST | `/integrations/hooks` | `{app_id, inbox_id?, settings?, status?}` (bọc `hook` hoặc phẳng) | `hook` |
| PUT/PATCH | `/integrations/hooks/{id}` | `{status?, settings?}` | `hook` |
| POST | `/integrations/hooks/{id}/process_event` | `{event,…}` | 422 `{"error":"No processor found"}` |
| DELETE | `/integrations/hooks/{id}` | — | 200, body rỗng |

- `hook_type` KHÔNG nhận từ client — lấy từ `hook_type` của app trong danh mục.
- `app_id`/`inbox_id`/`hook_type` là `attr_readonly` ở bản gốc → `update` chỉ nhận
  `status` + `settings`.
- Lỗi 422 giữ nguyên câu của Rails: `App can't be blank`, `App has already been taken`
  (app không `allow_multiple_hooks`), `Inbox can't be blank` (app `hook_type=inbox`),
  `Settings : Invalid settings data`, `Feature flag Feature not enabled`.
- `access_token` sinh tự động 24 ký tự lúc tạo (`has_secure_token`).

### Danh mục app

`GET /integrations/apps` và `/integrations/apps/{appId}` nay trả `hooks` THẬT
(trước F6 luôn rỗng), và `enabled` đo đúng bản gốc: `webhook` → có webhook nào chưa,
`dashboard_apps` → có dashboard app nào chưa, còn lại → có hook của app đó chưa.

## Trace Ruby ↔ PHP

| Ruby (refs/chatwoot) | PHP (yona) |
|---|---|
| `app/models/dashboard_app.rb` | `app/Models/DashboardApp.php` |
| `app/models/integrations/hook.rb` | `app/Models/Integrations/Hook.php` |
| `app/controllers/api/v1/accounts/dashboard_apps_controller.rb` | `app/Http/Controllers/WebApi/DashboardAppsController.php` |
| `…/integrations/hooks_controller.rb` | `app/Http/Controllers/WebApi/Integrations/HooksController.php` |
| `app/listeners/hook_listener.rb` | `app/Listeners/HookListener.php` |
| `app/jobs/hook_job.rb` | `app/Jobs/Integrations/HookJob.php` |
| bảng `INTEGRATION_PROCESSORS` + `supported_events_map` (hardcode) | khoá `event_processor` trong `config/integration/apps.php` + `App\Services\Integrations\Contracts\EventProcessor` + `App\Support\Integrations\EventProcessorResolver` |
| `Integrations::Openai::KeyValidator` gọi thẳng trong model | khoá `credential_validator` + `App\Services\Integrations\Contracts\CredentialValidator` |
| gem `JSONSchemer` | `App\Support\Integrations\JsonSchemaValidator` |
| jbuilder `_dashboard_app` | `app/Http/Resources/DashboardAppResource.php` |
| jbuilder `_hook` | `app/Http/Resources/Integrations/HookResource.php` |
| `Integrations::App#enabled?` | `App\Support\Integrations\App::isEnabled()` |

## Trace Vue ↔ TSX

| Chatwoot (Vue) | Yona (React/TS) |
|---|---|
| `store/modules/dashboardApps.js` + `api/dashboardApps.js` | `resources/js/dashboard/composables/useDashboardApps.ts` |
| `components/widgets/DashboardApp/Frame.vue` | `resources/js/dashboard/components/widgets/DashboardApp/Frame.tsx` |
| `components/widgets/conversation/ConversationBox.vue` (khối `woot-tabs` + `DashboardAppFrame`) | `resources/js/dashboard/conversation/conversationbox/ConversationBox.tsx` |
| `settings/integrations/DashboardApps/**` | đã có từ D4 — F6 chỉ nối API thật |
| `settings/integrations/{NewHook,SingleIntegrationHooks,MultipleIntegrationHooks}.vue` | đã có từ D4 — F6 làm cho luồng Connect/Disconnect chạy thật |

i18n mới: `lang/en/dashboard_apps.php` (namespace `DASHBOARD_APPS`, khoá
`LOADING_MESSAGE` — nguồn `generalSettings.json`, đó là namespace gốc ĐỘC LẬP,
không nằm dưới `GENERAL_SETTINGS`).

## Khác biệt cố ý

1. **Không có `if (app_id === 'x')` trong lõi.** Chatwoot hardcode ba bảng
   (`INTEGRATION_PROCESSORS` trong `hook_job.rb`, `supported_events_map` trong
   `hook_listener.rb`, `case params[:id]` trong `app.rb`). Bản port đưa hết vào
   `config/integration/apps.php`: thêm một tích hợp = thêm một driver +
   một dòng config, không sửa lõi (CLAUDE.md §Layered Architecture).
2. **`JsonSchemaValidator` chỉ hiện thực các từ khoá mà lược đồ trong repo dùng**
   (`type`, `properties`, `required`, `additionalProperties`, `enum`, `pattern`,
   `minItems`, `items`, `$ref`+`definitions`). Không phải JSON Schema đầy đủ —
   thêm từ khoá mới thì bổ sung ở lớp đó.
3. **`title` của dashboard app bắt buộc** (`Title can't be blank`). Bản gốc chỉ có
   ràng buộc NOT NULL ở DB nên thiếu title sẽ ra 500; bản port trả 422 cho gọn.
4. **`Hook::process_event`** luôn trả `No processor found` — đúng bản gốc v4.17.1
   (OpenAI đã chuyển sang Captain, thuộc `enterprise/`).
5. **Endpoint Slack events không auth** (`POST /api/v1/integrations/webhooks`) nằm
   trong một khối `// F6 Slack events … BEGIN/END` RIÊNG ở cuối `routes/web_api.php`,
   ngoài nhóm `auth`+`account.scope` — hai khối F6 được giao đều nằm trong nhóm
   có auth nên không dùng được. Phiên chính rà lại vị trí khối này.
6. **Route trang Slack** (`/settings/integrations/slack`) phải đăng ký TRƯỚC
   `/settings/integrations/{integrationId}` (regex `[a-z_]+` khớp cả `slack`) nên
   nằm cạnh các route D4 chứ không trong khối F6 ở cuối file `routes/web.php`.

## Bẫy đã trả giá

- **`settings` rỗng phải là `{}` chứ không phải `[]`.** Mảng rỗng của PHP
  serialize thành `[]`, jbuilder trả `{}` → phải ép `(object) []` trong
  `HookResource::visibleSettings()`.
- **`content` rỗng `[]` lọt qua rule `required` sai thông điệp**: Laravel coi mảng
  rỗng là "thiếu" nên trả `The content field is required.` thay vì
  `Content : Invalid data`. Phải dùng `present` + closure kiểm lược đồ.
- **`$fail()` không tự thêm tên thuộc tính** như `full_messages` của Rails — phải
  viết đủ `'Content : Invalid data'`.
- **Test listener: `$conversation->update(['status' => resolved])` tự bắn
  `conversation.resolved`** nên job bị đẩy hai lần. Dùng `saveQuietly()` khi chỉ
  muốn đổi dữ liệu.
- **`IntegrationAppResource` N+1**: mỗi app một truy vấn hooks. `collectionFor`
  nạp một lượt hooks của account rồi lọc trong bộ nhớ.

7. **`NewHook` không áp `default` của schema.** FormKit chỉ hiểu prop `value`, nên
   khoá `default` trong `settings_form_schema` bị bỏ qua ở bản gốc và ô select luôn
   mở ở tuỳ chọn ĐẦU TIÊN (`language_code` hiện "Auto-detect from contact" chứ
   không phải `en-US`). Bản port làm đúng như vậy — nếu sửa "cho đúng ý config"
   thì lệch oracle.
8. **`Integration` (trang Slack) nhận `integration.id` rỗng khi Slack chưa cấu hình**
   `SLACK_CLIENT_SECRET`: app không có trong danh mục nên logo hỏng — y hệt oracle.
   Không thay bằng hằng `'slack'` (đẹp hơn nhưng lệch pixel); nút xoá chỉ hiện khi
   đã kết nối, lúc đó id luôn có thật.

## Sửa lỗi bắt được trong đợt

| Lỗi | Nơi | Xử lý |
|---|---|---|
| `HookListener` đọc sai khoá `changed_attributes` trong khi `Message::sendUpdateEvent()` bắn `previous_changes` → nhánh `message.updated` của MỌI app (Slack, Dialogflow) không bao giờ chạy | `app/Listeners/HookListener.php` | đổi sang `previous_changes` + thêm test khoá hành vi |
| `Hook` thiếu `Reauthorizable` nên `prompt_reauthorization!` của bản gốc mất | `app/Models/Integrations/Hook.php` + 3 chỗ gọi trong `Services/Integrations/Slack/**` | gắn trait (`AUTHORIZATION_ERROR_THRESHOLD = 2`) và gọi `promptReauthorization()` trước `disable()` |
| 6 chuỗi hiển thị bị hardcode (agent con không được sửa `lang/**`) | `lang/en/errors.php` (`openai`/`dyte`/`slack`), `lang/en/integration_apps.php` (`dyte.meeting_name`), `lang/en/slack_unfurl.php` (mới) | thêm khoá đúng nguyên văn `config/locales/en.yml` rồi đổi code sang `__()` |
| Ghi "nợ cột `messages.translations`" | `MessagesController::translate` | KHÔNG phải nợ: `Message#translations` của bản gốc là `store_accessor :content_attributes` — bản port đã lưu đúng chỗ; chỉ sửa lại chú thích |

## Bẫy đo đạc (harness)

- **F8 giới hạn 25 phiên đăng nhập/người dùng** vừa lên nhánh: mỗi lượt chụp là một
  phiên mới nên chạy vài kịch bản là màn login hiện "Active session limit reached"
  và harness treo ở `waitForURL`. Hai script F6 gọi `clearYonaSessions()` (xoá
  `user_sessions` của tài khoản đo) trước mỗi lượt đăng nhập Yona.
- **Không chạy hai lượt pixel song song**: cả hai cùng seed/xoá một fixture
  `dashboard_apps` → một bên thấy 2 app, bên kia 1 (`dashboard-apps-list` nhảy lên
  0.202%). Chạy tuần tự thì về 0.030%.
- **URL fixture phải có tên miền cấp cao.** `http://localhost:…` làm nút submit của
  oracle mờ đi (validator `url` của vuelidate từ chối host không có TLD) trong khi
  bản port dùng `new URL()` nên vẫn bật → lệch 0.328%. **Khác biệt có sẵn của repo**
  (`isUrlInvalid` bị nhân bản ở `DashboardAppModal`, `AgentBotModal`, `WebhookForm`)
  — không sửa trong đợt này vì siết lại sẽ chặn URL localhost và làm hỏng e2e của
  D4; đề nghị phiên chính gom về một helper dùng chung rồi quyết một lần.
- **Khung hội thoại không so nguyên màn**: dữ liệu hội thoại hai máy khác nhau
  (fixture của F1/Zalo trên Yona) nên kịch bản `conversation-app-tab` chỉ chụp dải
  tab (`clip`), đúng phần thuộc F6.

## Bẫy đã trả giá — giao diện

- **Khoảng cách trong `NewHook` lệch 16px mỗi trường**: bản gốc đặt
  `.formkit-input { margin-bottom: 0px !important }`; ô `<input>` của repo có
  `margin-bottom: 16px` từ CSS toàn cục và **`mb-0` của Tailwind không thắng** —
  phải dùng `!mb-0`. Textarea/select không dính vì CSS toàn cục chỉ áp cho input.
- **`help` phải là `block`**: để `inline` thì line-box của `<label>` đẩy thêm 13px
  và chiều cao lệch 5px.
- Bố cục form: `grid gap-4` trên `<form>` + `mt-2` trên từng trường = đúng 24px
  như `.formkit-outer { @apply mt-2 }` + gap của bản gốc; hàng nút KHÔNG có `mt-2`.

## Spec ↔ Pest / vitest

| Spec Chatwoot | Bản port |
|---|---|
| `spec/controllers/api/v1/accounts/dashboard_apps_controller_spec.rb` | `tests/Feature/WebApi/DashboardAppsControllerTest.php` (14 test) |
| `spec/controllers/api/v1/accounts/integrations/hooks_controller_spec.rb` | `tests/Feature/WebApi/Integrations/HooksControllerTest.php` (12 test) |
| `spec/models/integrations/hook_spec.rb` (bỏ phần EE: reauthorizable shared, crm/leadsquared, cloudflare) | `tests/Feature/Models/Integrations/HookTest.php` (5 test) |
| `spec/listeners/hook_listener_spec.rb` | `tests/Feature/Listeners/HookListenerTest.php` (9 test) |
| gem `JSONSchemer` (không có spec riêng) | `tests/Feature/Support/JsonSchemaValidatorTest.php` (10 test) |
| `spec/models/dashboard_app_spec.rb` | **KHÔNG tồn tại ở bản gốc** — luật lược đồ nội dung được phủ trong controller test + `JsonSchemaValidatorTest` |
| `store/modules/specs/dashboardApps/*.spec.js`, `api/specs/dashboardApps.spec.js` | `resources/js/dashboard/composables/useDashboardApps.test.ts` (5 test) |
| `spec/lib/integrations/slack/**`, `spec/services/integrations/**` | xem `f6-notes-slack.md`, `f6-notes-misc.md` |

## Kết quả gate (06/09/2026)

- **Pest toàn suite** trên DB riêng `yona_rw_test_f6`: **1982 test / 4828 assertion — XANH**
  (`DB_DATABASE=yona_rw_test_f6 vendor/bin/pest`). DB đã `DROP` sau khi chạy.
  Riêng nhóm F6: 50 test lõi + 122 test tích hợp (Slack/Dialogflow/Google Translate/OpenAI/Dyte).
- **`vendor/bin/pint`** trên toàn bộ danh sách file của F6: passed.
- **`php artisan migrate`** trên `yona_rw`: chạy được, `dashboard_apps` + `integrations_hooks` đã lên.
- **`npx tsc --noEmit`**: sạch với mọi file của F6. Lỗi còn lại của toàn dự án nằm ở
  `resources/js/dashboard/helper/facebookSdk.ts` (`window.FB`/`window.fbAsyncInit` chưa khai kiểu) —
  file của nhóm khác, không sửa hộ.
- **`npx vitest run`**: 83 file / 671 test xanh.
- **`npm run build`** (vite + sdk): xanh.
- **Pixel-diff `~/www/pixel-diff/f6-integrations-ui.mjs`** (ngưỡng 0.1%, nhiễu nền ~0.030%):

| Kịch bản | light | dark |
|---|---|---|
| `dashboard-apps-empty` | 0.030% | 0.031% |
| `dashboard-apps-list` | 0.030% | 0.031% |
| `dashboard-app-add` | 0.041% | 0.033% |
| `dashboard-app-edit` | 0.041% | 0.033% |
| `show-dialogflow-hook` | 0.041% | 0.033% |
| `show-openai-hook` | 0.045% | 0.038% |
| `show-slack` | 0.030% | 0.031% |
| `conversation-app-tab` (chỉ dải tab) | 0.000% | 0.000% |

- **`audit-buttons.mjs /settings/integrations/dashboard_apps`**: Yona và oracle ra **cùng
  hai nút** (`‹ Integrations` → `/app/accounts/{id}/dashboard`, `Add a new dashboard app` Δel=19),
  không có nút DEAD.
- **E2E `~/www/pixel-diff/f6-dashboard-apps-e2e.mjs`**: **18/18 bước đạt**, dữ liệu tự dọn —
  đăng nhập → tạo dashboard app qua UI (`POST` 200, không điều hướng native) → app vào danh sách,
  F5 vẫn còn → mở hội thoại thấy tab `Bảng QA F6` cạnh `Messages` → bấm tab, iframe nạp và **nhận
  `postMessage` `appContext` đủ `conversation` + `contact` + `currentAgent`** → quay lại tab Messages
  → sửa tên qua UI (`PATCH` 200) → xoá (`DELETE` 204) → danh sách sạch.

## Lệnh chạy lại

```bash
cd ~/www/yona && php artisan i18n:generate && npm run build && npx tsc --noEmit
psql -h 127.0.0.1 -U postgres -c "CREATE DATABASE yona_rw_test_f6 OWNER yona_owner"
psql -h 127.0.0.1 -U postgres -d yona_rw_test_f6 -c "CREATE EXTENSION IF NOT EXISTS pg_trgm; CREATE EXTENSION IF NOT EXISTS pgcrypto;"
DB_DATABASE=yona_rw_test_f6 vendor/bin/pest
psql -h 127.0.0.1 -U postgres -c "DROP DATABASE yona_rw_test_f6"
cd ~/www/pixel-diff && node f6-integrations-ui.mjs                 # tất cả kịch bản (KHÔNG chạy song song)
cd ~/www/pixel-diff && node f6-integrations-ui.mjs show-slack      # một kịch bản
cd ~/www/pixel-diff && node audit-buttons.mjs http://localhost:8000 /settings/integrations/dashboard_apps
cd ~/www/pixel-diff && node f6-dashboard-apps-e2e.mjs              # e2e dashboard apps (tự dọn)
```

## Việc còn lại cho phiên chính

1. **`isUrlInvalid` bị nhân bản 3 nơi** (`DashboardAppModal`, `AgentBotModal`, `WebhookForm`) và
   lỏng hơn validator `url` của vuelidate (chấp nhận host không có TLD như `localhost`). Gom về một
   helper dùng chung rồi quyết một lần: siết theo oracle (sẽ chặn URL localhost, làm hỏng
   `d4-bots-e2e.mjs`) hay giữ nới. F6 không tự quyết vì ảnh hưởng chéo sang D4.
2. **Khối route `// F6 Slack events`** nằm ở cuối `routes/web_api.php` (ngoài nhóm `auth`) và route
   trang Slack nằm cạnh các route D4 — cả hai đều BẮT BUỘC ở vị trí đó (xem "Khác biệt cố ý" #5, #6);
   phiên chính xác nhận lại quy ước hai-khối.
3. `Reauthorizable` đang nằm ở `app/Models/Channel/Concerns/` nhưng nay dùng chung cho cả
   `Integrations\Hook` — nên chuyển sang `app/Models/Concerns/` (đụng 5 model kênh, thuộc vùng F1).
