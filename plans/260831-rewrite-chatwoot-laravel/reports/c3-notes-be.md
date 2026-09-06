# C3 — Ghi chú backend (agent `c3-be`)

## HỢP ĐỒNG (chốt — hai agent C3 phía FE đọc mục này)

### 1. `identifier_hash` — khách tự chứng minh danh tính

```
identifier_hash = HMAC_SHA256(key = channel.hmac_token, data = identifier)   // hex thường
```

- `hmac_token` sinh ở server, **chỉ administrator** đọc được qua `InboxResource.hmac_token`
  (`GET /api/v1/accounts/{id}/inboxes/{inboxId}`). Chữ ký phải tính **ở backend của khách hàng**,
  không bao giờ nhúng `hmac_token` vào trang web.
- So sánh ở server dùng `hash_equals` (an toàn theo thời gian) — không lộ thời gian khớp từng ký tự.

Ví dụ sinh phía khách hàng:

```js
require('crypto').createHmac('sha256', HMAC_TOKEN).update(identifier).digest('hex')
```

### 2. `PATCH /api/v1/widget/contact/set_user`

| | |
|---|---|
| Query | `?website_token=<token>` |
| Header | `X-Auth-Token: <JWT phiên>` |
| Body | `{identifier, identifier_hash, email?, name?, phone_number?, avatar_url?, custom_attributes?, additional_attributes?}` |
| 200 | `{id, has_email, has_name, has_phone_number}` + `widget_auth_token` **khi và chỉ khi** server cấp phiên mới |
| 401 | `{"error":"HMAC failed: Invalid Identifier Hash Provided"}` |

Hành vi theo từng ca:

| Ca | Kết quả |
|---|---|
| `identifier_hash` đúng | `hmac_verified = true` cho contact_inbox của phiên; hồ sơ được identify/gộp |
| `identifier_hash` sai | `401`, **không** ghi gì |
| `identifier_hash` thiếu, inbox `hmac_mandatory = true` | `401` |
| `identifier_hash` thiếu, inbox `hmac_mandatory = false` | `200`, KHÔNG đánh dấu `hmac_verified` |
| `identifier` khác `identifier` của hồ sơ đang mở | server cấp **ContactInbox mới** + `widget_auth_token` mới → SDK PHẢI thay `X-Auth-Token` bằng token đó |

`PATCH /api/v1/widget/contact` (không phải `set_user`) chỉ đòi chữ ký **khi body có `identifier`**.
Cập nhật pre-chat ẩn danh (name/email/phone/custom_attributes, không identifier) vẫn chạy bình
thường trên inbox `hmac_mandatory` — đây là đường mà form pre-chat dùng.

**Vì sao phải xác minh:** một bí danh trùng khiến hệ thống TỰ ĐỘNG gộp hồ sơ. Không có chữ ký thì
bất kỳ ai gõ đúng `identifier` của người khác cũng chiếm được hội thoại của họ.

### 3. Hội thoại nào khách nhìn thấy

- Phiên **chưa** `hmac_verified`: chỉ hội thoại của đúng contact_inbox hiện tại.
- Phiên **đã** `hmac_verified`: mọi hội thoại của cùng contact trên cùng inbox mà contact_inbox
  cũng `hmac_verified` → đây là "nối lại hội thoại cũ" khi khách đăng nhập trên thiết bị khác.

### 4. Tin bot email-collect (shape để FE render)

Khi inbox bật `enable_email_collect` (mặc định BẬT) và khách chưa có email, ngay sau **tin đầu tiên
của khách** server chèn 2 tin `message_type = 3 (template)`:

```jsonc
[
  { "content": "Give the team a way to reach you.", "content_type": "text",        "message_type": 3 },
  { "content": "Get notified by email",             "content_type": "input_email", "message_type": 3 }
]
```

Tin thứ hai là ô nhập email — `AgentMessage` phải có nhánh `content_type === 'input_email'`.
Gửi email đã nhập bằng đường đã có từ C2:

```
PATCH /api/v1/widget/messages/{id}   body: {"contact":{"email":"a@b.com"}}
```

Server ghi `content_attributes.submitted_email` (đã lowercase) rồi chạy `ContactIdentifyAction`
→ email trùng hồ sơ cũ thì **gộp**, mọi hội thoại cũ về chung một khách. Đã nhập rồi thì không
chèn lại (cổng `emailCollectWasSent`).

Điều kiện đầy đủ để chèn: hội thoại có ít nhất một tin `incoming`, không thuộc campaign,
`inbox.enable_email_collect`, kênh là `Channel::WebWidget`, `contact.email` rỗng, chưa từng có tin
`input_email` trong hội thoại.

### 5. Tin chào (greeting)

`inbox.greeting_enabled` + `greeting_message` khác rỗng + đây là tin ĐẦU TIÊN của khách
(hội thoại chưa có tin `outgoing` lẫn `template`) → chèn 1 tin `message_type = 3`, `content_type = text`.
Đứng **trước** cụm email-collect.

Nội dung greeting hỗ trợ biến `{{contact.name}}`, `{{contact.first_name}}`, `{{contact.email}}`,
`{{contact.custom_attribute.<khóa>}}`, `{{account.name}}`, `{{inbox.name}}`, `{{agent.name}}`,
`{{conversation.display_id}}`… (bộ biến ở `App\Support\MessageDrops`). Nội dung trong dấu ` `` `
không bị thay.

### 6. `pre_chat_form_options` — bộ mặc định giữ nguyên như C1

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

Đã đối chiếu lại với `channel/web_widget.rb#validate_pre_chat_options` — khớp từng khóa.
`PATCH .../inboxes/{id}` **không lọc khóa con** của `pre_chat_form_options`, nên FE gửi thêm
`placeholder`, `locale`, `values`, `regex_pattern`, `regex_cue`, `require_email` (đúng bộ
`EDITABLE_ATTRS` của bản gốc) đều được lưu nguyên vẹn. Gửi thiếu/rỗng `pre_chat_fields` thì server
ghi đè lại bộ mặc định trên.

Pre-chat submit dùng đường đã có từ C2, KHÔNG cần endpoint mới:

```
POST /api/v1/widget/conversations
{ "contact": {"name","email","phone_number","custom_attributes"},
  "message": {"content","timestamp","referer_url"},
  "custom_attributes": {...} }
```

Đã kiểm: khách điền email trùng hồ sơ cũ → gộp xong hội thoại mới vẫn gắn đúng hồ sơ SỐNG SÓT.
Khách điền email ở pre-chat thì cụm email-collect KHÔNG chèn (đúng bản gốc).

---

## Bảng trace Ruby ↔ PHP

| Nguồn Chatwoot | Đích Laravel | Ghi chú |
|---|---|---|
| `api/v1/widget/contacts_controller.rb` `set_user` + `validate_hmac` + `valid_hmac?` | `app/Http/Controllers/Widget/ContactsController.php` | **đã port ở C2**, phiên này chỉ kiểm chứng lại (xem "Đã có sẵn") |
| `ActiveSupport::SecurityUtils.secure_compare` | `hash_equals()` | |
| `contact_inbox.rb` `hmac_verified` | cột `contact_inboxes.hmac_verified` + `WidgetController::conversationsQuery()` | đã port ở C2 |
| `message_templates/hook_execution_service.rb` | `app/Services/MessageTemplates/HookExecutionService.php` | điểm gọi duy nhất: `Message::created` |
| `message_templates/template/email_collect.rb` | `app/Services/MessageTemplates/Template/EmailCollect.php` | |
| `message_templates/template/greeting.rb` | `app/Services/MessageTemplates/Template/Greeting.php` | |
| (khối `transaction` + `rescue` lặp ở từng template) | `Template/BaseTemplate.php` | gom lại: thêm mẫu mới = khai báo nội dung |
| `message.rb#execute_message_template_hooks` (`after_create_commit`) | `Message::booted()` → `static::created` | chèn đúng vị trí cũ, trước `updateContactActivity` |
| `message.rb#auto_reply_email?` | `Message::isAutoReplyEmail()` | chỉ còn nhánh `incoming_email` (kênh email = F1) |
| `concerns/liquidable.rb#process_liquid_in_content` | `Message::renderContentVariables()` (`static::creating`) | chỉ `outgoing`/`template`, đúng `liquid_processable_message?` |
| `Liquid::Template.parse(...).render(drops)` | `app/Support/LiquidTemplate.php` | CHỈ thay biến — xem Khác biệt #2 |
| `app/drops/{account,contact,conversation,inbox,user}_drop.rb` | `app/Support/MessageDrops.php` | |
| `config/locales/en.yml` `conversations.templates.*` | `lang/en/conversations.php` khối `templates` | thêm khóa, KHÔNG chạy `i18n:generate` |
| `spec/controllers/api/v1/widget/contacts_controller_spec.rb` | `tests/Feature/Widget/ContactsControllerTest.php` | đã đủ từ C2 (xem "Đã có sẵn") |
| `spec/services/message_templates/hook_execution_service_spec.rb` | `tests/Feature/Services/MessageTemplates/HookExecutionServiceTest.php` (10 test) | |
| `spec/services/message_templates/template/{email_collect,greeting}_spec.rb` | `tests/Feature/Services/MessageTemplates/TemplateTest.php` (4 test) | |
| — | `tests/Feature/Support/LiquidTemplateTest.php` (11 test) | |

## Đã có sẵn từ C2 — phiên này chỉ kiểm chứng, KHÔNG sửa

Việc số 1 của C3 (`set_user` + HMAC) đã được `c2-be` port đủ. Đối chiếu từng ca của
`contacts_controller_spec.rb` với `tests/Feature/Widget/ContactsControllerTest.php`:

| Ca trong spec Ruby | Test Pest tương ứng | |
|---|---|---|
| set_user, hash đúng | `marks the current session verified when the hash is valid` | ✓ |
| set_user, hash sai / rỗng / thiếu (3 ca) | `rejects a missing or invalid identifier hash` (dataset 3 ca) | ✓ |
| set_user, identifier khác → contact mới + `widget_auth_token` + `hmac_verified` | `returns a new contact and a fresh widget token for a different identifier` | ✓ |
| PATCH contact có identifier trên inbox `hmac_mandatory`, 4 ca từ chối | `rejects an identifier without a valid hash` (dataset 3 ca — Ruby tách rỗng/null thành 2 ca trên cùng một nhánh mã) | ✓ |
| PATCH contact, hash đúng | `accepts a valid identifier hash` | ✓ |
| PATCH contact ẩn danh (không identifier) trên inbox `hmac_mandatory` | `allows an anonymous prechat update without an identifier hash` | ✓ |
| hội thoại thấy được sau khi xác minh | `sees conversations from every verified session of the same contact` | ✓ |

Không tìm thấy lỗ hổng nào cần vá — `hash_equals` đã đúng, `shouldVerifyHmac` khớp
`should_verify_hmac?` từng dòng, `hmac_verified` ghi đúng contact_inbox (kể cả nhánh cấp phiên mới).

## Khác biệt cố ý

1. **Chặn đệ quy bằng cờ theo hội thoại thay vì dựa vào commit.** Bản gốc chạy hook ở
   `after_create_commit`: cả cụm tin mẫu đã nằm trong DB khi hook của chúng chạy nên mọi cổng
   (`firstMessageFromContact`, `emailCollectWasSent`) tự đóng. `Model::created` của Laravel bắn
   NGAY khi tin đầu vừa lưu, nên tin "Give the team a way to reach you." sẽ thấy trạng thái
   "chưa gửi email-collect" và sinh vô hạn. Không dùng được `DB::afterCommit` vì test chạy
   `RefreshDatabase` (transaction không bao giờ commit). → `HookExecutionService` giữ mảng
   `$conversationsBeingTemplated` (khóa theo `conversation_id`) trong lúc sinh tin mẫu.
   Kết quả quan sát được y hệt bản gốc.
2. **`LiquidTemplate` chỉ thay biến `{{ a.b }}`**, chưa có filter (`| upcase`) hay tag
   (`{% if %}`), và chưa port nhánh template WhatsApp của `Liquidable`. Đủ cho greeting +
   canned response; khi cần Liquid thật thì đổi ruột lớp này, call-site không đổi.
   Bộ biến thiếu `inbox.avatar_url`, `inbox.email` (kênh email — F1) và
   `conversation.recent_messages` (cần bộ render nội dung của Captain — EE).
3. **`processed_message_content` giữ nội dung THÔ (chưa thay biến).** Đúng bản gốc: Rails chạy
   `before_save :ensure_processed_message_content` trước `before_create :process_liquid_in_content`;
   Laravel chạy `saving` trước `creating` nên thứ tự trùng khớp. Đừng "sửa cho đều".
4. **Chưa port `OutOfOffice`.** Cổng `inbox.out_of_office?` cần Business Hours (`working_hours`)
   mà nhóm B chưa port; `/config` của widget hiện luôn trả `working_hours: []`. Thêm sau =
   1 lớp `Template/OutOfOffice.php` + 1 nhánh trong `triggerTemplates()`.
5. **Chưa port `CsatSurvey`** — bản gốc KHÔNG gọi nó từ hook này mà từ `CsatSurveyService` lúc
   hội thoại được giải quyết. Thuộc C5; khung `Template/BaseTemplate.php` đã sẵn, C5 chỉ cần
   khai `content_type = input_csat` + `content_attributes.display_type`.
   Khóa i18n `conversations.templates.csat_input_message_body` đã thêm sẵn.
6. **Bỏ cổng `conversation.tweet?`** ở greeting/email-collect — kênh Twitter chưa port.
7. **Test `GET /api/v1/widget/messages` đổi từ 2 sang 4 tin.** Đây là đưa về ĐÚNG spec Ruby
   (`# 2 messages created + 2 messages by the email hook`); trước đó yona thiếu hook nên đếm 2.
   Hai test khác trong cùng file đổi `messages()->reorder(...)->first()` thành
   `messages()->incoming()->reorder(...)->first()` vì "tin cuối" nay là tin mẫu.

## Nợ / việc cho người khác

- **`yona-i18n`: `lang/en/conversations.php` có thêm khối `templates`** (3 khóa) →
  `php artisan i18n:generate --check` sẽ BÁO LỆCH tới khi chạy `php artisan i18n:generate`.
  Mình không chạy theo phân vai. (Nợ `lang/en/errors.php` của C2 nếu chưa trả thì gộp luôn một lượt.)
- **`continuity_via_email` mới port được nửa "gộp hồ sơ", chưa port nửa "gửi email".**
  Trong Chatwoot cờ này chỉ gác đúng một chỗ: `Messages::SendEmailNotificationService`
  (`inbox.channel.continuity_via_email` → `ConversationReplyEmailJob`) — tức là agent trả lời thì
  khách nhận email và **trả lời ngược lại bằng email**. Cả `ConversationReplyEmailJob`, mailer,
  `Redis::Alfred` khoá chống trùng lẫn `account.within_email_rate_limit?` đều thuộc F1 (kênh email)
  và chưa có trong repo → chưa dựng, KHÔNG dựng giả. Phần "nối lại hội thoại cũ" mà C3 cần thì đã
  chạy đủ: gộp theo email (`ContactIdentifyAction` + `ContactMergeAction`) và
  `hmac_verified` mở rộng tầm nhìn hội thoại (mục 3 phần hợp đồng).
- **FE widget (`resources/js/widget/**`)**: `AgentMessage.tsx` còn thiếu nhánh
  `content_type = input_email` (và `form`/`cards`/`input_select`) — nợ `c2-app` đã ghi, thuộc hai
  agent C3 phía FE. Backend đã sinh đủ dữ liệu.
- **Rate limit `prevent_message_flooding`**: cụm email-collect cộng thêm 2 tin/hội thoại vào bộ
  đếm `conversation_message_per_minute`. Chưa thấy va chạm ở test lẫn curl, nhưng nếu C4 (campaign)
  bắn nhiều tin liên tiếp thì để ý chỗ này.

## Gate đã chạy

1. `DB_DATABASE=yona_rw_test_c3 REDIS_DB=10 vendor/bin/pest` → **969/969** (2332 assertion),
   trong đó 25 test mới. DB test riêng đã tạo (kèm `pg_trgm`, `pgcrypto`) và xoá sau khi chạy.
2. `vendor/bin/pint --test` → passed (toàn repo).
3. **Curl thật mô phỏng khách** (inbox Website `c3-hmac-test` tạo tạm trên `yona_rw`,
   `hmac_mandatory = true`, greeting `Hi {{contact.name}}, welcome to {{account.name}}.`):
   - `POST /config` → phiên khách mới → `POST /messages` "xin chao" →
     `GET /messages` trả **4 tin** đúng thứ tự:
     `0 text | xin chao` · `3 text | Hi Dark-math-223, welcome to Yona.` ·
     `3 text | Give the team a way to reach you.` · `3 input_email | Get notified by email`
     (biến `{{contact.name}}` / `{{account.name}}` đã thay đúng).
   - `PATCH /contact/set_user` hash SAI → `401 {"error":"HMAC failed: Invalid Identifier Hash Provided"}`
   - `PATCH /contact/set_user` THIẾU hash trên inbox `hmac_mandatory` → `401` cùng thông điệp
   - `PATCH /contact/set_user` hash ĐÚNG → `200 {"id":52,"has_email":true,...}`;
     DB: contact_inbox của phiên đó `hmac_verified = t`, phiên ẩn danh còn lại `f`.
   - `PATCH /messages/{id}` (tin `input_email`) với email trùng hồ sơ `user-42` → `200`,
     `content_attributes.submitted_email` được ghi, hồ sơ ẩn danh bị **gộp** và hội thoại cũ
     chuyển sang hồ sơ sống sót. (Phản hồi trả về bản ghi contact CŨ đã bị xoá — đúng bản gốc,
     `messages_controller.rb#update` cũng bỏ qua giá trị trả về của `ContactIdentifyAction`.)
4. Dọn dẹp: inbox 18 + kênh + hội thoại + tin + 2 contact thử đã xoá;
   `~/www/pixel-diff/reset-fixture.sh` chạy xong → yona `{"hội thoại":[4],"tin":5}`,
   oracle `{"hội thoại":[1],"tin":5}`. DB `yona_rw_test_c3` đã `DROP`.
