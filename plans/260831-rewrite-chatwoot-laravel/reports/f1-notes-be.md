# F1 — Kênh Email, ghi chú backend (agent `f1-be`)

## HỢP ĐỒNG API cho `f1-fe` (chốt, dùng ngay)

### Kênh mới
`channel[type] = 'email'` → `channel_type = 'Channel::Email'` (morph map giữ tên Ruby).
Helper FE `INBOX_TYPES.EMAIL` phải so với chuỗi `'Channel::Email'`.
**Không có endpoint riêng cho kênh email** — tất cả đi qua `/inboxes` như các kênh khác.

### Tạo inbox Email
`POST /api/v1/accounts/{accountId}/inboxes` (admin-only, 401 nếu agent)

```jsonc
{
  "name": "Support Email",            // bắt buộc
  "channel": {
    "type": "email",                  // bắt buộc
    "email": "care@acme.test"         // BẮT BUỘC — thiếu/sai định dạng = 422
  }
}
```
Mọi khóa `inbox_attributes` dùng chung (greeting_*, csat_survey_enabled, timezone,
sender_name_type, business_name…) vẫn nhận ở POST — xem `c1-notes-be.md`.

`forward_to_email` do server sinh: `<32 ký tự hex>@<domain>`, domain =
`accounts.domain` nếu có, không thì `MAILER_INBOUND_EMAIL_DOMAIN`.

### Sửa inbox Email
`PATCH /api/v1/accounts/{accountId}/inboxes/{inboxId}` — khối `channel` nhận đúng EDITABLE_ATTRS:

`email`, `imap_enabled`, `imap_login`, `imap_password`, `imap_address`, `imap_port`,
`imap_enable_ssl`, `imap_authentication`, `smtp_enabled`, `smtp_login`, `smtp_password`,
`smtp_address`, `smtp_port`, `smtp_domain`, `smtp_enable_starttls_auto`, `smtp_enable_ssl_tls`,
`smtp_openssl_verify_mode`, `smtp_authentication`, `provider`, `verified_for_sending`.

### `InboxResource` — khóa riêng của kênh Email
Chỉ có khi `channel_type === 'Channel::Email'`:

| Khóa | Ai thấy | Ghi chú |
|---|---|---|
| `email` | mọi member | địa chỉ inbox |
| `forwarding_enabled` | mọi member | `true` khi có `MAILER_INBOUND_EMAIL_DOMAIN` |
| `forward_to_email` | mọi member | **CHỈ xuất hiện khi `forwarding_enabled`** |
| `imap_login` `imap_password` `imap_address` `imap_port` `imap_enabled` `imap_enable_ssl` `imap_authentication` | admin | |
| `smtp_login` `smtp_password` `smtp_address` `smtp_port` `smtp_enabled` `smtp_domain` `smtp_enable_ssl_tls` `smtp_enable_starttls_auto` `smtp_openssl_verify_mode` `smtp_authentication` | admin | |
| `reauthorization_required` | admin | CHỈ khi provider google/microsoft/legacy-google |

Giá trị mặc định của inbox Email vừa tạo:
`imap_enabled=false`, `imap_address=''`, `imap_port=0`, `imap_login=''`, `imap_password=null`,
`imap_enable_ssl=true`, `imap_authentication='plain'`, `smtp_enabled=false`, `smtp_address=''`,
`smtp_port=0`, `smtp_login=''`, `smtp_password=null`, `smtp_domain=''`,
`smtp_enable_starttls_auto=true`, `smtp_authentication='login'`, `smtp_openssl_verify_mode='none'`,
`smtp_enable_ssl_tls=false`, `verified_for_sending=false`, `provider=null`.

`imap_authentication` chỉ nhận `plain | login | cram-md5` (giá trị người dùng chọn được ở bản gốc).

### Shape message của kênh Email

`POST /api/v1/accounts/{a}/conversations/{c}/messages` nhận THÊM (chỉ có tác dụng ở inbox email):

```jsonc
{
  "content": "Xin chào **anh**",
  "to_emails": "a@x.com, b@x.com",   // chuỗi ngăn cách dấu phẩy HOẶC mảng
  "cc_emails": "cc@x.com",
  "bcc_emails": "bcc@x.com",
  "email_html_content": "<p>…</p>"   // tùy chọn: HTML tự soạn, thay bản render markdown
}
```
Địa chỉ sai định dạng → **422** `{"error": "Invalid email address"}`.

`content_attributes` của tin **đi** (outgoing) sau khi tạo:
```jsonc
{
  "to_emails": ["a@x.com", "b@x.com"],
  "cc_emails": ["cc@x.com"],
  "bcc_emails": [],
  "email": {
    "html_content": { "full": "<p>…</p>", "reply": "<p>…</p>" },
    "text_content": { "full": "Xin chào **anh**", "reply": "Xin chào **anh**" }
  }
}
```
(`to_emails`/`cc_emails`/`bcc_emails` LUÔN có mặt ở inbox email, mảng rỗng khi không gửi.)

`content_attributes` của tin **đến** (`content_type = 'incoming_email'`, `message_type = 'incoming'`):
```jsonc
{
  "cc_email": [...], "bcc_email": [...],
  "email": {
    "bcc": [], "cc": [], "content_type": "multipart/alternative", "date": "...",
    "from": ["sony@chatwoot.com"], "headers": null|{...},
    "html_content": { "full": "...", "reply": "...", "quoted": "..." },
    "in_reply_to": "…@…", "message_id": "…@…", "multipart": true,
    "number_of_attachments": 2, "references": ["…"], "subject": "…",
    "text_content": { "full": "...", "reply": "...", "quoted": "..." },
    "to": ["care@example.com"], "auto_reply": false
  }
}
```
Thứ tự khóa trong `email` cố định đúng bản gốc (16 khóa, xem test).
`source_id` của tin đến = `Message-ID` (đã bỏ `<>`); của tin đi = Message-ID do SMTP trả về.

Hội thoại mở từ thư có `additional_attributes`:
`{ source: 'email', in_reply_to: …|null, auto_reply: bool, mail_subject: '…', initiated_at: { timestamp: '…' } }`.
FE hiển thị tiêu đề thư lấy từ `additional_attributes.mail_subject`.

### Cửa nhận thư đến
Bản gốc dùng ActionMailbox (`/rails/action_mailbox/…`) — nằm NGOÀI nhóm route theo account,
nên khối `// F1 email channel` trong `routes/web_api.php` để trống (chỉ có ghi chú).
Đường nhận đã port và chạy được là **IMAP** (`FetchImapEmailInboxesJob` cron mỗi phút).
Đường **forward_to_email** cần một endpoint ingress công khai (`POST /inbound_emails` nhận
raw RFC822 rồi gọi `ApplicationMailbox::route()`); **chưa dựng** — cần phiên chính cấp
route + cơ chế xác thực ingress. Lõi đã sẵn sàng: chỉ cần gọi
`ApplicationMailbox::route(MailPresenter::fromRaw($raw))`.

---

## Bảng trace Ruby ↔ PHP

| Nguồn Chatwoot | Đích Laravel | Ghi chú |
|---|---|---|
| `db/schema.rb` bảng `channel_email` | `database/migrations/2026_09_06_995000_create_channel_email_table.php` | đủ cột + unique `email`/`forward_to_email` |
| `app/models/channel/email.rb` | `app/Models/Channel/Email.php` | EDITABLE_ATTRS, `ensure_forward_to_email`, `microsoft?/google?/legacy_google?` |
| `app/models/concerns/reauthorizable.rb` | `app/Models/Channel/Concerns/Reauthorizable.php` | đếm lỗi + cờ trong Redis; mail cảnh báo admin chưa port |
| `Account#inbound_email_domain` / `#support_email` | `Account::inboundEmailDomain()` / `::supportEmail()` | ENV → `config/mail.php` |
| `Inbox#email?` | `Inbox::isEmail()` | |
| `Inbox#sanitized_name` / `#sanitized_business_name` / `apply_sanitization_rules` | `Inbox::sanitizedName()` / `::sanitizedBusinessName()` | dùng cho display name của From |
| `channel_type_from_params` / `allowed_channel_types` | `InboxesController::CHANNEL_TYPES` | thêm 1 dòng `'email' => Email::class` |
| `_inbox.json.jbuilder` khối `if resource.email?` | `InboxResource::emailChannelAttributes()` | |
| `app/helpers/email_helper.rb` + `EmailAddressParseable` | `app/Support/EmailAddress.php` | parse/format/normalize plus-addressing/validate |
| `app/builders/email/{base,from,reply_to,sender_name}_builder.rb` | `app/Builders/Email/*.php` | |
| `app/mailers/conversation_reply_mailer.rb` + `conversation_reply_mailer_helper.rb` | `app/Mail/ConversationReplyMail.php` | 4 action = 4 static factory, trả `null` đúng chỗ `return unless` |
| `app/mailers/references_header_builder.rb` | `app/Mail/Concerns/BuildsReferencesHeader.php` | |
| `set_delivery_method` + `oauth_smtp_settings` | `app/Services/Email/ChannelMailer.php` | ĐIỂM DUY NHẤT chọn SMTP của kênh |
| `app/views/layouts/mailer/base.liquid` | `resources/views/components/mail/layouts/base.blade.php` | |
| `app/views/mailers/conversation_reply_mailer/*.erb` | `resources/views/mail/conversation-reply/*.blade.php` | |
| `ChatwootMarkdownRenderer#render_message` | `app/Services/Email/MarkdownRenderer.php` | league/commonmark có sẵn |
| `app/services/email/send_on_email_service.rb` (+ `Base::SendOnChannelService`) | `app/Services/Email/SendOnEmailService.php` | |
| `app/services/messages/send_email_notification_service.rb` | `app/Services/Messages/SendEmailNotificationService.php` | kênh Website/API |
| `app/jobs/send_reply_job.rb` | `app/Jobs/SendReplyJob.php` | bảng CHANNEL_SERVICES — thêm kênh = 1 dòng |
| `app/jobs/conversation_reply_email_job.rb` | `app/Jobs/ConversationReplyEmailJob.php` | |
| `app/presenters/mail_presenter.rb` | `app/Services/Email/MailPresenter.php` | zbateson/mail-mime-parser |
| `app/presenters/html_parser.rb` | `app/Services/Email/HtmlParser.php` | soundasleep/html2text |
| `GlobalConfigService SKIP_INCOMING_BCC_PROCESSING` | `config('mail.skip_incoming_bcc_processing')` | danh sách account_id |
| gem `email_reply_trimmer` | `app/Services/Email/EmailReplyTrimmer.php` | bản rút gọn, xem "Khác biệt cố ý" |
| `app/mailboxes/mailbox_sanitizer.rb` | `app/Mailboxes/Concerns/MailboxSanitizer.php` | |
| `app/mailboxes/mailbox_helper.rb` + `mailbox_inline_attachment_helper.rb` | `app/Mailboxes/Concerns/MailboxHelper.php` | gồm cả ảnh inline theo cid |
| `app/mailboxes/incoming_email_validity_helper.rb` | `app/Mailboxes/Concerns/IncomingEmailValidity.php` | |
| `app/mailboxes/application_mailbox.rb` | `app/Mailboxes/ApplicationMailbox.php` | routing reply/default |
| `app/mailboxes/{reply,default}_mailbox.rb` | `app/Mailboxes/{ReplyMailbox,DefaultMailbox}.php` | |
| `app/mailboxes/imap/imap_mailbox.rb` | `app/Mailboxes/ImapMailbox.php` | |
| `app/finders/email_channel_finder.rb` | `app/Finders/EmailChannelFinder.php` | |
| `app/services/mailbox/conversation_finder.rb` + 4 strategy | `app/Services/Mailbox/ConversationFinder.php` + `Strategies/*` | đủ 4 chiến lược |
| `app/services/imap/{authentication,base_fetch_email_service,fetch_email_service}.rb` | `app/Services/Imap/FetchEmailService.php` | webklex/php-imap |
| `app/services/imap/deleted_message_tracker.rb` | `app/Services/Imap/DeletedMessageTracker.php` | |
| `app/jobs/inboxes/fetch_imap_email_inboxes_job.rb` | `app/Jobs/Inboxes/FetchImapEmailInboxesJob.php` | |
| `app/jobs/inboxes/fetch_imap_emails_job.rb` | `app/Jobs/Inboxes/FetchImapEmailsJob.php` | khóa `Cache::lock` thay MutexApplicationJob |
| `config/schedule.yml` `trigger_imap_email_inboxes_job` | `routes/console.php` | cron `*/1 * * * *` |
| `Messages::MessageBuilder#process_emails` / `#process_email_content` | `MessageBuilder::processEmails()` / `::processEmailContent()` | |
| `MessageFilterHelpers` (`conversation_transcriptable?`, `email_reply_summarizable?`) + `Message#email_notifiable_message?` | `Message::isConversationTranscriptable()`, `::isEmailReplySummarizable()`, `::isEmailNotifiableMessage()` | |
| `config/locales/en.yml` khối `conversations.reply` | `lang/en/conversations.php` khóa `reply` | |
| `spec/fixtures/files/*.eml` (40 tệp) | `tests/Fixtures/emails/*.eml` | chép nguyên |

### Spec ↔ Pest

| RSpec | Pest |
|---|---|
| `spec/models/channel/email_spec.rb` (+ reauthorizable shared) | `tests/Feature/Models/Channel/EmailTest.php` (10) |
| `spec/presenters/mail_presenter_spec.rb` | `tests/Feature/Services/Email/MailPresenterTest.php` (9) |
| `spec/mailboxes/{application_mailbox,reply_mailbox,mailbox_helper}_spec.rb` | `tests/Feature/Mailboxes/ReplyMailboxTest.php` (8) |
| `spec/mailboxes/imap/imap_mailbox_spec.rb` | `tests/Feature/Mailboxes/ImapMailboxTest.php` (5) |
| `spec/mailers/conversation_reply_mailer_spec.rb` + `spec/services/email/send_on_email_service_spec.rb` + `spec/jobs/conversation_reply_email_job_spec.rb` | `tests/Feature/Mail/ConversationReplyMailTest.php` (17) |
| `spec/jobs/inboxes/*_spec.rb` + `spec/services/imap/*` | `tests/Feature/Jobs/Inboxes/FetchImapEmailsJobTest.php` (6) |
| khối email của `inboxes_controller_spec.rb` | `tests/Feature/WebApi/InboxesEmailChannelTest.php` (5) |

## Thư viện thêm vào composer (và lý do)

| Gói | Thay cho | Lý do |
|---|---|---|
| `zbateson/mail-mime-parser` | gem `mail` | parse RFC822 thuần PHP, không phụ thuộc `ext-imap`; là ĐƯỜNG PARSE DUY NHẤT (IMAP lẫn fixture `.eml` đều qua `MailPresenter::fromRaw`) |
| `webklex/php-imap` | `net/imap` | client IMAP thuần PHP (không cần `ext-imap`), có query builder `whereSince` khớp lệnh `SEARCH SINCE` của bản gốc |
| `soundasleep/html2text` | gem `html2text` | `HtmlParser::parseReply` cần đúng phép đổi HTML→text sau khi thay `<blockquote>` |

Markdown→HTML dùng `league/commonmark` đã có sẵn (qua `Str::markdown`), không thêm gói.

## Khác biệt cố ý

1. **`imap_password` / `smtp_password` để `nullable` (bản gốc default `''`)** — hai cột dùng cast
   `encrypted` của Laravel; chuỗi rỗng không phải payload mã hóa hợp lệ nên default `''` làm
   `DecryptException` ngay lúc đọc. Kiểu cột đổi sang `text` vì bản mã hóa dài hơn 255 ký tự.
2. **`EmailReplyTrimmer` là bản rút gọn** — gem gốc là một máy trạng thái vài trăm dòng.
   Bản port cắt tại header trích dẫn phổ biến (`On … wrote:`, `--- Original Message ---`,
   `From:`, `Vào … đã viết:`), bỏ dòng bắt đầu bằng `>`, và cắt ở `-- ` (chữ ký).
   Chỉ ảnh hưởng khóa `quoted` — `reply` (thứ hiển thị trên UI) không dùng trimmer.
3. **`rtrim` nội dung tin đến** — dòng trống trước boundary MIME thuộc về boundary; gem `mail`
   bỏ nó, zbateson giữ. Không rtrim thì `content` của thư fixture lệch bản gốc (spec bắt đúng chỗ này).
4. **`branded_email_layout` / `EmailTemplate` (template thư lưu trong DB) chưa port** — kèm
   feature flag `branded_email_templates`; `choose_layout` chỉ còn hai nhánh có/không layout.
   Khóa `branded_email_layout` KHÔNG có trong `InboxResource`.
5. **OAuth Google/Microsoft (`Imap::{Google,Microsoft}FetchEmailService`, `provider_config`
   refresh token) nợ F6** — `ChannelMailer` đã có nhánh SMTP OAuth (đọc
   `provider_config.access_token`), nhưng chưa có luồng lấy/làm mới token.
   `Imap::Authentication` gộp vào `FetchEmailService::authenticationType()` vì webklex tự lo
   cơ chế `CRAM-MD5`/`LOGIN`/`PLAIN`.
6. **`Reauthorizable` không gửi mail cảnh báo admin** — `AdministratorNotifications::
   ChannelNotificationsMailer#email_disconnect` chưa port (cụm mailer quản trị).
7. **Không có `MAX_MESSAGES_PER_SYNC` theo lô header** — webklex trả cả header lẫn body trong
   một `->limit(500)`, nên vòng lặp hai bước (fetch header rồi fetch body theo seq) của bản gốc
   thu về một vòng. Trần 500 thư/lần quét giữ nguyên.
8. **Khóa quét IMAP dùng `Cache::lock`** thay `MutexApplicationJob` + `Redis::Alfred`; cùng ý
   nghĩa (khóa theo inbox, TTL 5 phút).
9. **`Redis::Alfred::CONVERSATION_MAILER_KEY` và bộ đếm `increment_email_sent_count`**: khóa
   chống trùng đã port; bộ đếm thư/tài khoản (rate limit `within_email_rate_limit?`) chưa port
   — thuộc cụm hạn mức, và lệnh founder 25/07 là KHÔNG dựng lại gate.
10. **`SendReplyJob` mới dựng ở F1** (bản trước ghi "cắt sang D4"): `Message::sendReply()` nay
    chạy lại đúng bản gốc và bảng `CHANNEL_SERVICES` chỉ có 3 dòng (Email, WebWidget, Api).
    Thêm kênh mới = thêm một dòng, KHÔNG sửa `Message`.
11. **Header `To` hỏng vẫn đi tiếp** — bản gốc kiểm `mail.to.class == Mail::AddressContainer`
    và bỏ thư khi gem trả String. zbateson vẫn bóc được địa chỉ hợp lệ từ
    `To: <a@b.com>a@b.com`, nên `ApplicationMailbox::validToAddress()` chỉ còn chặn trường hợp
    có header `To` mà không parse ra địa chỉ nào.
12. **`Attachment::storeContents()` mới** — đường lưu tệp từ chuỗi bytes (tệp đính kèm bóc từ
    thư), song song `storeUpload()` cho tệp người dùng tải lên.

## Bẫy đã trả giá

1. **`Mail::fake()` KHÔNG chặn `Mail::build($settings)->send()`** — inbox có SMTP riêng đi qua
   mailer dựng tại chỗ, nên test khẳng định `Mail::assertSent` phải để `smtp_enabled = false`.
   Test cấu hình SMTP kiểm `ChannelMailer::smtpSettingsFor()` riêng, không đi qua Mail::fake.
2. **Biến `$message` trong Blade thư bị Laravel chiếm** (`Illuminate\Mail\Message`) — view của
   `email_reply` phải nhận biến tên khác (`$emailMessage`), không thì `Undefined property`.
3. **`Reply-To` mặc định KHÔNG phải địa chỉ inbox**: `imap_enabled = false` → bản gốc trả
   `reply+<uuid>@<inbound_domain>`. Chỉ khi bật IMAP thì Reply-To mới là `channel.email`.
   Đừng "sửa" cho hợp trực giác — đó là hành vi gốc.
4. **Redis không bị reset giữa các lần chạy Pest** — `RefreshDatabase` reset sequence nên id
   inbox lặp lại, khóa Redis của lần chạy trước còn sống làm test cờ/tracker đỏ giả.
   Test phải tự dọn (`reauthorized()`) hoặc dùng id ngẫu nhiên.
5. **`SendReplyJob` chạy đồng bộ trong test** (`QUEUE_CONNECTION=sync`): tạo tin ở inbox email
   là ĐÃ gửi thư. Test `assertNothingSent` phải `Mail::fake()` SAU khi tạo tin.
6. **Message-ID phải bỏ `<>`** trước khi lưu `source_id`, không thì chiến lược
   In-Reply-To/References không khớp lại được (bản gốc cũng lưu dạng trần).

## Kết quả gate

- **Pest toàn suite** trên `yona_rw_test_f1`: **1706 test / 1704 pass**, 2 lỗi là
  `SQLSTATE[40P01] Deadlock detected` khi `migrate`/`drop table` — do phiên song song
  (`f8`) dùng chung máy Postgres, KHÔNG phải lỗi code: chạy lại riêng
  `tests/Feature/Actions/ContactMergeActionTest.php` → 6/6 xanh.
  Test F1 mới: 61 test (10 model + 9 presenter + 11 reply mailbox + 5 imap mailbox
  + 17 mailer/send + 6 job IMAP + 5 inbox API).
  DB test đã `dropdb yona_rw_test_f1` sau khi chạy.
- `vendor/bin/pint <danh sách file F1>` — passed.
- `php artisan migrate` trên `yona_rw` — đã chạy (batch 25); cột
  `imap_password`/`smtp_password` đã `ALTER … DROP DEFAULT/DROP NOT NULL` cho khớp migration.

## File đã thêm/sửa

Thêm: `app/Models/Channel/Email.php`, `app/Models/Channel/Concerns/Reauthorizable.php`,
`app/Support/EmailAddress.php`, `app/Builders/Email/{BaseBuilder,FromBuilder,ReplyToBuilder,SenderNameBuilder}.php`,
`app/Mail/{ConversationReplyMail.php,Concerns/BuildsReferencesHeader.php}`,
`app/Mailboxes/{ApplicationMailbox,DefaultMailbox,ReplyMailbox,ImapMailbox}.php` +
`app/Mailboxes/Concerns/{MailboxHelper,MailboxSanitizer,IncomingEmailValidity}.php`,
`app/Services/Email/{MailPresenter,HtmlParser,EmailReplyTrimmer,MarkdownRenderer,ChannelMailer,SendOnEmailService}.php`,
`app/Services/Imap/{FetchEmailService,DeletedMessageTracker}.php`,
`app/Services/Mailbox/{ConversationFinder.php,Strategies/*}`,
`app/Services/Messages/SendEmailNotificationService.php`,
`app/Finders/EmailChannelFinder.php`,
`app/Jobs/{SendReplyJob,ConversationReplyEmailJob}.php`, `app/Jobs/Inboxes/{FetchImapEmailInboxesJob,FetchImapEmailsJob}.php`,
`resources/views/components/mail/layouts/base.blade.php`, `resources/views/mail/conversation-reply/*.blade.php`,
`database/migrations/2026_09_06_995000_create_channel_email_table.php`,
`database/factories/Channel/EmailFactory.php`, `tests/Fixtures/emails/*.eml` (40),
`tests/Feature/{Models/Channel/EmailTest,Services/Email/MailPresenterTest,Mailboxes/ReplyMailboxTest,Mailboxes/ImapMailboxTest,Mail/ConversationReplyMailTest,Jobs/Inboxes/FetchImapEmailsJobTest,WebApi/InboxesEmailChannelTest}.php`.

Sửa (file dùng chung — thay đổi tối thiểu):
`app/Models/{Message,Inbox,Account,Attachment}.php`, `app/Builders/Messages/MessageBuilder.php`,
`app/Http/Controllers/WebApi/InboxesController.php` (1 dòng CHANNEL_TYPES),
`app/Http/Resources/InboxResource.php` (1 khối `emailChannelAttributes`),
`app/Providers/AppServiceProvider.php` (1 dòng morph map),
`database/factories/InboxFactory.php` (state `email()`), `routes/console.php` (1 cron),
`routes/web_api.php` (khối F1, chỉ ghi chú), `config/mail.php`, `.env.example`,
`lang/en/conversations.php` (khóa `reply`), `phpunit.xml` (`MAIL_HOST=""`),
`composer.json`/`composer.lock` (3 gói).

## Founder test tay với hộp thư thật

Đường IMAP (đã chạy được, không cần thêm route):

1. `.env`:
   ```
   MAILER_INBOUND_EMAIL_DOMAIN=      # để trống nếu chưa có domain nhận thư
   MAILER_SENDER_EMAIL="Yona <accounts@yona.vn>"
   MAIL_MAILER=smtp
   MAIL_HOST=… MAIL_PORT=587 MAIL_USERNAME=… MAIL_PASSWORD=…
   SMTP_OPEN_TIMEOUT=15
   SMTP_READ_TIMEOUT=30
   ```
2. Tạo inbox Email trên UI (hoặc `POST /inboxes` với `channel.type = 'email'`).
3. PATCH inbox điền IMAP thật, ví dụ Gmail app-password:
   `imap_enabled=true, imap_address=imap.gmail.com, imap_port=993, imap_enable_ssl=true,
   imap_login=<mail>, imap_password=<app password>, imap_authentication=plain`
   và SMTP: `smtp_enabled=true, smtp_address=smtp.gmail.com, smtp_port=587,
   smtp_enable_starttls_auto=true, smtp_login=<mail>, smtp_password=<app password>`.
4. Chạy `php artisan schedule:work` (hoặc gọi tay
   `php artisan tinker --execute='(new App\Jobs\Inboxes\FetchImapEmailInboxesJob)->handle();'`)
   và một worker `php artisan queue:work`.
5. Gửi thư từ hộp thư khác tới địa chỉ inbox → hội thoại mới hiện trên UI trong ≤1 phút.
6. Trả lời trên UI → thư đi qua SMTP của chính kênh; trả lời tiếp từ hộp thư khách sẽ nối
   vào ĐÚNG hội thoại đó (qua `In-Reply-To`/`References`).

Không có hộp thư thật thì dùng Mailpit (`mailpit` mặc định SMTP 1025 / IMAP không có) —
Mailpit KHÔNG có IMAP nên chỉ kiểm được chiều gửi; chiều nhận cần server IMAP thật
(hoặc `docker run greenmail/standalone`).
