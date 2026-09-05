# C1 — Ghi chú backend (agent `c1-be`)

## HỢP ĐỒNG API cho `c1-fe` (chốt, dùng ngay)

### Kênh mới
`channel[type] = 'web_widget'` → `channel_type = 'Channel::WebWidget'` (morph map giữ tên Ruby).
Helper FE `INBOX_TYPES.WEB` phải so với chuỗi `'Channel::WebWidget'`.

### Tạo inbox Website
`POST /api/v1/accounts/{accountId}/inboxes` (admin-only, 401 nếu agent)

```jsonc
{
  "name": "test",                      // bắt buộc
  "greeting_enabled": true,            // tùy chọn (đã nhận ở POST, không chỉ PATCH)
  "greeting_message": "Hello there",   // tùy chọn
  "channel": {
    "type": "web_widget",              // bắt buộc
    "website_url": "test.com",         // BẮT BUỘC — thiếu = 422
    "widget_color": "#009CE0",         // tùy chọn, gửi thì không được rỗng
    "welcome_title": "Hi there",       // tùy chọn, cho phép ''
    "welcome_tagline": "We help"       // tùy chọn, cho phép ''
  }
}
```
Các khóa inbox khác cũng nhận ở POST y như PATCH: `enable_email_collect`, `csat_survey_enabled`,
`enable_auto_assignment`, `auto_assignment_config`, `working_hours_enabled`, `out_of_office_message`,
`timezone`, `allow_messages_after_resolved`, `lock_to_single_conversation`,
`sender_name_type` (`'friendly'|'professional'`), `business_name`.

### Sửa inbox Website
`PATCH /api/v1/accounts/{accountId}/inboxes/{inboxId}` — khối `channel` nhận đúng EDITABLE_ATTRS:

`website_url`, `widget_color`, `welcome_title`, `welcome_tagline`, `reply_time`,
`pre_chat_form_enabled`, `pre_chat_form_options`, `continuity_via_email`, `hmac_mandatory`,
`allowed_domains`, `selected_feature_flags`.

- `reply_time`: chuỗi `'in_a_few_minutes' | 'in_a_few_hours' | 'in_a_day'` (DB lưu 0/1/2).
- `selected_feature_flags`: mảng chuỗi trong
  `['attachments','emoji_picker','end_conversation','use_inbox_avatar_for_bot','allow_mobile_webview']`.
  Gửi `['']` (đúng như `buildInboxData` của Chatwoot khi danh sách rỗng) hoặc `null` = tắt hết. Tên lạ bị bỏ qua.
- Không có action riêng cho feature flags — vẫn là PATCH inbox như Chatwoot.

### `InboxResource` — khóa riêng của kênh Website
Có ở MỌI inbox (kênh khác = `null`, giống `channel.try(:x)` của jbuilder):
`allowed_domains`, `widget_color`, `website_url`, `hmac_mandatory`, `welcome_title`, `welcome_tagline`,
`web_widget_script`, `website_token`, `selected_feature_flags`, `reply_time`.

Chỉ có khi `channel_type === 'Channel::WebWidget'`:
`pre_chat_form_enabled`, `pre_chat_form_options`, `continuity_via_email`, và `hmac_token` (CHỈ administrator).

Mặc định của inbox Website vừa tạo:
`widget_color = '#1f93ff'`, `reply_time = 'in_a_few_minutes'`, `continuity_via_email = true`,
`allowed_domains = ''`, `hmac_mandatory = false`, `pre_chat_form_enabled = false`,
`selected_feature_flags = ['attachments','emoji_picker','end_conversation']`,
`pre_chat_form_options` = mặc định 3 field (xem dưới).

### `web_widget_script` (đoạn nhúng cho bước Voilà / tab Configuration)
Chuỗi server sinh sẵn, FE chỉ hiển thị trong `<woot-code>` — KHÔNG ghép ở FE.
Bắt đầu bằng `\n    <script>` và kết thúc bằng `    </script>\n    ` (giữ nguyên thụt lề Chatwoot):

```
    <script>
      (function(d,t) {
        var BASE_URL="http://localhost:8000";
        var g=d.createElement(t),s=d.getElementsByTagName(t)[0];
        g.src=BASE_URL+"/packs/js/sdk.js";
        g.async = true;
        s.parentNode.insertBefore(g,s);
        g.onload=function(){
          window.chatwootSDK.run({
            websiteToken: '<website_token>',
            baseUrl: BASE_URL
          })
        }
      })(document,"script");
    </script>
```
`BASE_URL` = `config('app.url')` (thay `ENV FRONTEND_URL`). Oracle in `http://localhost:3000` → khi
pixel-diff phải crop né dòng BASE_URL và dòng websiteToken.

### `pre_chat_form_options` mặc định (C3 dùng lại)
```json
{
  "pre_chat_message": "Share your queries or comments here.",
  "pre_chat_fields": [
    {"field_type":"standard","label":"Email Id","name":"emailAddress","type":"email","required":true,"enabled":false},
    {"field_type":"standard","label":"Full name","name":"fullName","type":"text","required":false,"enabled":false},
    {"field_type":"standard","label":"Phone number","name":"phoneNumber","type":"text","required":false,"enabled":false}
  ]
}
```
Gửi `pre_chat_form_options` mà thiếu/rỗng `pre_chat_fields` → server ghi đè lại bộ mặc định trên
(đúng `before_validation :validate_pre_chat_options`).

### i18n
`lang/en/inbox_mgmt.php` đã có sẵn nguyên khối `INBOX_MGMT.ADD.WEBSITE_CHANNEL.*` và
`INBOX_MGMT.SETTINGS_POPUP.*` từ B1 — `c1-fe` không cần thêm khóa mới cho phần này.

---

## Bảng trace Ruby ↔ PHP

| Nguồn Chatwoot | Đích Laravel | Ghi chú |
|---|---|---|
| `db/schema.rb` bảng `channel_web_widgets` | `database/migrations/2026_09_06_800000_create_channel_web_widgets_table.php` | đủ cột + unique `website_token` / `hmac_token` |
| `app/models/channel/web_widget.rb` | `app/Models/Channel/WebWidget.php` | EDITABLE_ATTRS, name(), pre-chat default, web_widget_script |
| `Channelable` (concern) | `app/Models/Channel/Concerns/Channelable.php` | account/inbox + `generateToken()` — `Channel\Api` dùng chung (gỡ bản chép) |
| `has_secure_token :website_token, :hmac_token` | hook `creating` trong `WebWidget` | `Str::random(24)` như `Channel\Api` |
| `FlagShihTzu has_flags` (cột `feature_flags`) | `App\Support\FlagBitmask` + accessor `selected_feature_flags` | mọi phép bit nằm trong `FlagBitmask`; model chỉ nói bằng tên cờ |
| `enum reply_time` | `app/Models/Channel/ReplyTime.php` + accessor `reply_time` | DB int, API chuỗi snake_case |
| `validate_pre_chat_options` | hook `saving` trong `WebWidget` | `before_validation` chạy cả create lẫn update |
| `channel_type_from_params` / `allowed_channel_types` | `InboxesController::CHANNEL_TYPES` | thêm 1 dòng `'web_widget' => WebWidget::class` |
| `permitted_params` (inbox_attributes) | `InboxesController::INBOX_ATTRIBUTE_RULES` + `inboxAttributesFrom()` | POST và PATCH dùng chung một bộ |
| validate `website_url`/`widget_color` presence (model) | `WebWidget::channelRules()` | mỗi kênh tự khai luật; controller chỉ ghép tiền tố `channel.` |
| `update_channel_feature_flags` | `selected_feature_flags` nằm trong EDITABLE_ATTRS | mutator xử lý luôn, không cần nhánh riêng trong controller |
| `_inbox.json.jbuilder` khối WebWidget | `InboxResource::SHARED_CHANNEL_KEYS` + `webWidgetAttributes()` | `channel.try(:x)` port thành `$channel?->getAttribute($key)` |
| morph `Channel::WebWidget` | `AppServiceProvider::boot()` | |
| `spec/models/channel/web_widget_spec.rb` | `tests/Feature/Models/Channel/WebWidgetTest.php` (20 test) | + bitmask, token, reply_time, script |
| web_widget block trong `inboxes_controller_spec.rb` | `tests/Feature/WebApi/InboxesControllerTest.php` (+10 test) | create/show/update/feature flags/hmac |
| `spec/factories/channel/channel_widget.rb` | `database/factories/Channel/WebWidgetFactory.php` + state `InboxFactory::webWidget()` | |

## Khác biệt cố ý

1. `BASE_URL` của đoạn nhúng = `config('app.url')` thay cho `ENV['FRONTEND_URL']`.
2. Factory `:inbox` vẫn mặc định kênh **api** (gốc mặc định web_widget). Đổi mặc định sẽ kéo theo
   toàn bộ test B2–B11 nên giữ nguyên; dùng `Inbox::factory()->webWidget()` khi cần kênh Website.
3. Cột có default trong Postgres được nhắc lại ở `protected $attributes` của `Inbox` và `WebWidget`
   — Eloquent không đọc default của DB nên nếu không nhắc, phản hồi của POST trả `null` ở
   `allow_messages_after_resolved`, `widget_color`, `reply_time`… trong khi ActiveRecord trả đúng
   giá trị mặc định (RSpec `creates the webwidget inbox that allow messages after conversation is resolved`
   bắt đúng chỗ này).
4. POST inbox trước đây chỉ nhận `name` + `channel`; nay nhận đủ `inbox_attributes` như bản gốc
   (wizard Website gửi `greeting_enabled`/`greeting_message` ngay ở bước tạo).
5. `portal_id` và `csat_config` (định dạng `format_csat_config`) chưa port — portals thuộc nhóm D,
   CSAT thuộc C5.
6. Cột boolean/`reply_time` để NOT NULL kèm default (bản gốc để nullable) — cùng lối đã dùng cho
   `channel_api` ở B1; accessor `reply_time` cần giá trị không null.
7. `create_contact_inbox` của model gốc chưa port — thuộc C2 (widget app + SDK).
