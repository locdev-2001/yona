# C2 — Ghi chú backend (agent `c2-be`)

## HỢP ĐỒNG API WIDGET (chốt — `c2-sdk` và `c2-app` đọc mục này)

### Nguyên tắc chung

| | |
|---|---|
| Tiền tố | `/api/v1/widget/...` (mặt tiền `routes/api.php`, KHÔNG session, KHÔNG CSRF) |
| Nhận diện inbox | query `?website_token=<token>` trên MỌI request (cũng nhận trong body) |
| Nhận diện phiên khách | header `X-Auth-Token: <JWT>` — lấy từ `POST /config` |
| Thiếu/sai `website_token` | `404 {"error":"Resource could not be found"}` |
| Account bị đình chỉ | `401 {"error":"Account is suspended"}` |
| Có `website_token` nhưng chưa/không có phiên khách | `404` cho mọi endpoint TRỪ `/config` và `/inbox_members` |
| CORS | chưa mở (widget chạy trong iframe cùng origin với app) — nếu SDK cần gọi cross-origin thì báo lại |

`X-Auth-Token` là JWT HS256 ký bằng `APP_KEY`, payload `{source_id, inbox_id, iat, exp}`,
hạn `WIDGET_TOKEN_EXPIRY` ngày (mặc định 180). Widget lưu nó trong cookie `cw_conversation`
như bản gốc; server không quan tâm chỗ lưu.

### Luồng dựng phiên khách (bắt buộc theo thứ tự)

1. `POST /api/v1/widget/config?website_token=...` — **không** header lần đầu.
   Server tạo Contact + ContactInbox (source_id = uuid) và trả token.
2. Lưu `website_channel_config.auth_token` → gửi lại ở header `X-Auth-Token` cho mọi request sau.
3. Lưu `contact.pubsub_token` → tên kênh realtime.
4. Gọi lại `/config` kèm header ở các lần tải sau → trả **đúng** khách cũ, không đẻ hồ sơ mới.
   Token hỏng/hết hạn = coi như chưa có phiên → tạo khách mới (đúng bản gốc).

### `POST /config`

Phản hồi:

```jsonc
{
  "website_channel_config": {
    "allow_messages_after_resolved": true,
    "api_host": "http://localhost:8000",     // = config('app.url'), thay ENV FRONTEND_URL
    "auth_token": "<JWT>",
    "avatar_url": "",
    "csat_survey_enabled": false,
    "disable_branding": false,
    "enabled_features": ["attachments","emoji_picker","end_conversation"],
    "enabled_languages": [{"name":"English","iso_639_1_code":"en"}],
    "locale": "en",
    "out_of_office_message": null,
    "portal": null,                          // help center — nhóm D
    "pre_chat_form_enabled": false,
    "pre_chat_form_options": { "pre_chat_message": "...", "pre_chat_fields": [...] },
    "reply_time": "in_a_few_minutes",        // chuỗi, không phải số
    "timezone": "UTC",
    "utc_off_set": "+00:00",
    "website_name": "c2-widget-test",
    "website_token": "...",
    "welcome_tagline": null,
    "welcome_title": null,
    "widget_color": "#1f93ff",
    "working_hours": [],                     // Business Hours chưa port
    "working_hours_enabled": false
  },
  "contact": { "email": null, "id": 9, "identifier": null, "name": "young-tooth-491",
               "phone_number": null, "pubsub_token": "Ulzd5ZY7mFq29iURZDlPZgf4" },
  "global_config": { "LOGO_THUMBNAIL": "/brand-assets/logo.svg", "BRAND_NAME": "Yona",
                     "WIDGET_BRAND_URL": "https://yona.vn", "MAXIMUM_FILE_UPLOAD_SIZE": 40,
                     "INSTALLATION_NAME": "Yona" }
}
```

### Hội thoại

| Method + path | Body | Trả về |
|---|---|---|
| `GET /conversations` | — | `{}` khi chưa có, ngược lại `{id, inbox_id, contact_last_seen_at, status}` (`id` = display_id, `contact_last_seen_at` = unix, 0 khi null, `status` = chuỗi) |
| `POST /conversations` | `{contact:{name,email,phone_number,custom_attributes}, message:{content,timestamp,referer_url,echo_id,reply_to}, custom_attributes}` | như trên + `messages[]` + `custom_attributes` + `contact` (bản ghi contact đầy đủ) |
| `POST /conversations/update_last_seen` | — | `200`, body rỗng |
| `POST /conversations/toggle_typing` | `{typing_status:"on"\|"off"}` | `200` |
| `GET /conversations/toggle_status` | — | `200`; `403` khi inbox tắt cờ `end_conversation`; `404` khi phiên chưa có hội thoại |
| `POST /conversations/set_custom_attributes` | `{custom_attributes:{...}}` | `204` (bản gốc không có view → Rails trả 204) |
| `POST /conversations/destroy_custom_attributes` | `{custom_attribute:["key"]}` | `200` + bản ghi conversation |
| `POST /conversations/transcript` | — | `200` (**chưa gửi email** — mailer thuộc F1); `429` khi chưa có hội thoại |

`POST /conversations` luôn TẠO MỚI (không áp `lock_to_single_conversation`) — đúng bản gốc.

### Tin nhắn

| Method + path | Body | Trả về |
|---|---|---|
| `GET /messages?before=&after=` | — | `{payload:[...], meta:{contact_last_seen_at}}`; `payload` rỗng + `meta` `{}` khi chưa có hội thoại |
| `POST /messages` | `{message:{content, timestamp, referer_url, echo_id, reply_to, attachments[]}, custom_attributes, labels[]}` | bản ghi tin vừa tạo |
| `PATCH /messages/{id}` | `{contact:{email}}` hoặc `{message:{submitted_values:[...]}}` | `{contact: <bản ghi contact>}` |

- Tin của khách LUÔN `message_type = 0` (incoming); `sender` = contact.
- Chưa có hội thoại → tin đầu tiên tự tạo hội thoại và **chỉ khi đó** mới áp `custom_attributes` + `labels`
  (nhãn phải đã tồn tại trong account, tên lạ bị bỏ qua).
- `attachments`: multipart `message[attachments][]` (tệp) hoặc mảng `signed_id` từ `/direct_uploads`.
- `reply_to` trỏ tin ngoài hội thoại → `content_attributes.in_reply_to` về `null`, không lỗi.
- Hội thoại đã `resolved` + inbox `allow_messages_after_resolved = false` →
  `403 {"error":"Conversation is resolved and does not accept new messages"}`.
- Nội dung > 150000 ký tự → `422 {"message":"Content is too long (maximum is 150000 characters)"}`
  (khóa `message`, KHÔNG phải `error`).

**Shape tin nhắn** — hai shape khác nhau, đúng như hai jbuilder gốc:

- `GET /messages` và `messages[]` trong `POST /conversations`:
  `{id, content, message_type, content_type, content_attributes, created_at (unix), conversation_id (display_id)}`
  + `attachments` và `sender` chỉ khi có.
- `POST /messages`: `{id, content, inbox_id, conversation_id, message_type, created_at, private,
  source_id, content_attributes}` + `attachments`/`sender` khi có — **không có `content_type`**.

### Liên hệ

| Method + path | Body | Trả về |
|---|---|---|
| `GET /contact` | — | `{id, has_email, has_name, has_phone_number, identifier}` |
| `PATCH /contact` | `{name, email, phone_number, identifier, identifier_hash, avatar_url, custom_attributes, additional_attributes}` | `{id, has_email, has_name, has_phone_number}` |
| `PATCH /contact/set_user` | `{identifier, identifier_hash, ...}` | như trên + `widget_auth_token` khi server cấp phiên mới |
| `POST /contact/destroy_custom_attributes` | `{custom_attributes:["key"]}` | bản ghi contact |

- Email/số điện thoại sai định dạng bị **bỏ qua** (giữ giá trị cũ), không trả lỗi.
- HMAC: `identifier_hash = HMAC_SHA256(hmac_token, identifier)` hex.
  - `PATCH /contact` chỉ đòi chữ ký khi body có `identifier`; cập nhật pre-chat ẩn danh vẫn chạy
    trên inbox `hmac_mandatory`.
  - Sai/thiếu chữ ký → `401 {"error":"HMAC failed: Invalid Identifier Hash Provided"}`.
  - `set_user` với identifier KHÁC identifier hiện tại → server cấp ContactInbox mới +
    `widget_auth_token` mới; SDK phải thay `X-Auth-Token` bằng token đó.

### Còn lại

| Method + path | Body | Trả về |
|---|---|---|
| `GET /inbox_members` | — (không cần `X-Auth-Token`) | `{payload:[{id,name,avatar_url,availability_status}]}` |
| `POST /events` | `{name, event_info:{...}, locale}` | `204`; tên sự kiện không thuộc `EventType` → `404` |
| `POST /labels` | `{label:"..."}` | `204` |
| `DELETE /labels/{label}` | — | `204` |
| `POST /direct_uploads` | multipart `file` | `{signed_id, filename, content_type, byte_size, url}` |
| `POST /presence` | — | `{account_id, users}` (heartbeat 60s) |
| `POST /broadcasting/auth` | `{socket_id, channel_name}` | `{auth: "..."}` |

### Realtime (thay ActionCable)

- Kênh: **private**, tên = đúng chuỗi `contact.pubsub_token` (client Echo/pusher gửi
  `private-<pubsub_token>`).
- Auth: `POST /api/v1/widget/broadcasting/auth?website_token=...` kèm header `X-Auth-Token`.
  **KHÔNG dùng `/broadcasting/auth` của dashboard**: đường đó nằm trong nhóm `web` → đòi cookie
  phiên + CSRF, mà widget chạy iframe trên tên miền khách hàng nên cookie bên thứ ba hay bị chặn.
- Chỉ ký cho đúng kênh của phiên đang gọi; kênh khác → `403`.
- Cấu hình Echo giống dashboard (`resources/js/dashboard/realtime/echo.ts`) nhưng thay `authorizer`
  bằng fetch tới endpoint trên, và **không** gửi cookie (`credentials: 'omit'`).
- Sự kiện nhận được trên kênh khách: `message.created`, `message.updated`,
  `conversation.typing_on`, `conversation.typing_off`, `conversation.status_changed`,
  `conversation.created`, `contact.merged`, `presence.update`
  (`presence.update` chỉ về sau khi widget gọi `POST /presence`).
- Đã kiểm thật: agent trả lời từ dashboard → khách nhận `message.created` qua WS trong ~1s.

---

## Bảng trace Ruby ↔ PHP

| Nguồn Chatwoot | Đích Laravel | Ghi chú |
|---|---|---|
| `config/routes.rb` khối `namespace :widget` | `routes/api.php` | mặt tiền `api` mới (§0.4); đăng ký thêm `api:` trong `bootstrap/app.php` |
| `concerns/website_token_helper.rb` (`set_web_widget`, `set_contact`, `auth_token_params`) | `app/Http/Middleware/ResolveWidgetChannel.php` | đặt kênh/phiên/payload vào request attributes |
| `raise RecordNotFound unless @contact` | `app/Http/Middleware/EnsureWidgetContact.php` | tách ra để `/config` + `/inbox_members` chạy khi chưa có khách |
| `Current.contact = @contact` | `app/Support/CurrentContact.php` (set trong middleware, tự reset) | cùng lối với `CurrentExecutedBy` |
| `base_token_service.rb` (JWT.encode/decode) | `app/Support/Jwt.php` | HS256 tự ký, không thêm phụ thuộc |
| `widget/token_service.rb` (exp 180 ngày) | `app/Support/WidgetTokenService.php` | khóa = `APP_KEY` thay `secret_key_base`; hạn từ `config('yona.widget_token_expiry_days')` |
| gem `browser` (`browser.name`, `platform`, `accept_language`) | `app/Support/BrowserInfo.php` | trả đúng bộ khóa panel hội thoại đang đọc |
| `widget/base_controller.rb` | `app/Http/Controllers/Widget/WidgetController.php` | conversations/conversation/create_conversation/message_params/contact_* |
| `widget/configs_controller.rb` + `GlobalConfig` | `Widget/ConfigsController.php` + `Http/Resources/Widget/WidgetConfigResource.php` | `GlobalConfig` → `config/yona.php` (`branding`, `available_locales`) + `config/limits.php` |
| `widget/conversations_controller.rb` | `Widget/ConversationsController.php` | |
| `widget/messages_controller.rb` | `Widget/MessagesController.php` | |
| `widget/contacts_controller.rb` + `widget_helper.rb` | `Widget/ContactsController.php` | gồm cả `set_user` + HMAC |
| `widget/events_controller.rb` | `Widget/EventsController.php` | |
| `widget/labels_controller.rb` | `Widget/LabelsController.php` | |
| `widget/inbox_members_controller.rb` | `Widget/InboxMembersController.php` | |
| `widget/direct_uploads_controller.rb` | `Widget/DirectUploadsController.php` | gộp 2 bước ActiveStorage thành 1 POST, như dashboard |
| `RoomChannel#update_subscription` + `#broadcast_presence` (nhánh Contact) | `Widget/PresenceController.php` | heartbeat HTTP thay `perform('update_presence')` |
| `RoomChannel#current_user` nhánh `params[:user_id].blank?` | `routes/channels.php` + guard `widget` trong `config/auth.php` + `Widget/BroadcastingAuthController.php` | **trả nợ B4** |
| `actions/contact_identify_action.rb` | `app/Actions/ContactIdentifyAction.php` | dùng lại `ContactMergeAction` (B2) |
| `contact.rb#discard_invalid_attrs` | `Contact::discardInvalidAttrs()` | |
| `Channel::WebWidget#create_contact_inbox` | `ConfigsController::buildContactInbox()` qua `ContactInboxWithContactBuilder` | nợ ghi ở C1 |
| `FlagShihTzu` `end_conversation?` | `WebWidget::featureEnabled()` | |
| `message.rb#reopen_conversation` (`return if conversation.muted?`) | `Message::reopenConversation()` | sửa lỗi sót ở B3 |
| jbuilder `configs/create`, `conversations/{index,create}`, `messages/{index,create}`, `contacts/{show,update,set_user}`, `_widget_message` | `app/Http/Resources/Widget/Widget{Config,Conversation,Message,Contact}Resource.php` | |
| `spec/controllers/api/v1/widget/*_spec.rb` | `tests/Feature/Widget/*Test.php` (78 test) | + `tests/Feature/Support/{WidgetTokenService,BrowserInfo}Test.php` |

## Khác biệt cố ý

1. **Mặt tiền `api`.** Widget là bên ngoài gọi vào bằng token nên nằm ở `routes/api.php`
   (§0.4), không session/CSRF. `bootstrap/app.php` được thêm đúng một dòng `api:`.
2. **Auth realtime riêng cho khách.** `/api/v1/widget/broadcasting/auth` thay vì
   `/broadcasting/auth` (lý do CSRF/cookie bên thứ ba ở trên). Quyết định ai nghe kênh nào vẫn ở
   `routes/channels.php`. Guard `widget` là driver `token` sẵn có của Laravel, tra
   `contact_inboxes.pubsub_token` — vì thế `ContactInbox` phải `implements Authenticatable`
   (chỉ để broadcasting dùng, KHÔNG dùng đăng nhập HTTP).
3. **`MessageBuilder` nhận cờ `incomingAllowed`.** Bản gốc bỏ qua builder và tạo message trực
   tiếp cho widget; ở đây giữ MỘT đường tạo tin (đính kèm, echo_id, validate, event) nên cửa vào
   tự khai quyền tạo tin `incoming`. Mặc định `false` → dashboard/Application API không đổi hành vi.
4. **`Messages::InReplyToMessageBuilder` chỉ port cho luồng widget** (một hàm private trong
   `WidgetController`). Hook `before_save :ensure_in_reply_to` toàn cục thuộc B3/kênh email-social;
   bật ngay sẽ phá `tests/Feature/Builders/MessageBuilderTest.php` (test cố ý giữ `in_reply_to` thô).
5. **`TypingStatusManager` nhận `User|Contact`.** Widget bắn typing với sender là khách;
   `ActionCableListener` vốn đã xử lý được cả hai.
6. **`enabled_languages` = 1 locale (`en`)** vì `lang/` mới có `en`. Nguồn: `config/yona.php`.
7. **`transcript` chưa gửi email.** Guard đã port; mailer thuộc F1 (kênh email) — cùng nợ mà B5
   đã ghi cho nút transcript của dashboard.
8. **`update_last_seen` chưa đánh dấu tin agent là read.** `Conversations::UpdateMessageStatusJob`
   đi cùng B8 (trạng thái tin); ở đây chỉ ghi `contact_last_seen_at`.
9. **`json.contact` trả nguyên bản ghi contact** (`attributesToArray`) như jbuilder gốc —
   `POST /conversations` và `PATCH /messages/{id}` đều vậy.
10. **`POST /contact/destroy_custom_attributes` dùng đường `/contact/...`** (như `widget/api/contacts.js`),
    không phải `/api/v1/widget/destroy_custom_attributes` mà spec Ruby gọi — URL trong spec đó
    404 và bài test vẫn xanh vì assertion rỗng nghĩa.
11. **`content_type` không có trong phản hồi `POST /messages`** — đúng jbuilder gốc, đừng "sửa cho đều".
12. **422 nội dung quá dài chỉ có khóa `message`**, chưa có `attributes` (shape `render_record_invalid`
    đầy đủ cần validate ở tầng model — chưa port).

## Nợ / việc cho người khác

- **`yona-i18n`: thêm file mới `lang/en/errors.php` (khóa `errors.conversations.resolved`) chưa
  được sinh vào bundle FE.** `php artisan i18n:generate --check` sẽ BÁO LỆCH cho tới khi chạy
  `php artisan i18n:generate`. Mình không chạy theo yêu cầu phân vai.
- CORS cho widget nhúng cross-origin chưa mở (`allowed_domains` của kênh cũng chưa được dùng để
  chặn) — cần khi `c2-sdk` nhúng trên tên miền thật.
- `campaigns` (C4), `pre_chat_form` phía server đã sẵn config nhưng luồng UI thuộc C3, CSAT (C5).

## Gate đã chạy

1. `DB_DATABASE=yona_rw_test_c2 REDIS_DB=11 vendor/bin/pest` → **944/944** (2291 assertion), trong
   đó 78 test widget mới. DB test riêng đã tạo (kèm `pg_trgm`, `pgcrypto`) và xoá sau khi chạy.
2. `vendor/bin/pint --test` → passed (toàn repo).
3. `php artisan route:list --path=widget` → 23 route, khớp `namespace :widget` của bản gốc.
4. **Curl thật mô phỏng khách** (inbox Website `c2-widget-test` tạo tạm, đã xoá sau):
   `/config` (khách mới) → `/config` lần 2 (giữ đúng khách) → `GET /conversations` = `{}` →
   `POST /conversations` (conv 18, tin incoming, contact đổi tên/email theo pre-chat) →
   `POST /messages` → `GET /messages` (2 tin) → typing 200 / last_seen 200 / labels 204 /
   contact 200 / inbox_members 200 / events 204 → hội thoại hiện trong dashboard
   (`GET /api/v1/accounts/2/conversations?inbox_id=15`, `channel: Channel::WebWidget`) →
   agent trả lời → widget `GET /messages` thấy tin của John →
   `POST /broadcasting/auth` ký kênh của mình `200`, ký `private-account_2` `403` →
   **WebSocket thật**: khách subscribe `private-<pubsub_token>`, agent gửi tin, khách nhận
   `message.created` (`"Tin realtime cho khach"`, sender John).
5. Dọn dẹp: inbox 15 + kênh + hội thoại + tin + contact thử đã xoá; `~/www/pixel-diff/reset-fixture.sh`
   chạy xong → yona `{"hội thoại":[4],"tin":5}`, oracle `{"hội thoại":[1],"tin":5}`.
