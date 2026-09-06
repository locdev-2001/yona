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

## Kết quả gate

(điền ở cuối phiên)
