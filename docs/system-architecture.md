# Kiến trúc hệ thống Yona

Nguồn chuẩn cho các quyết định kiến trúc đang có hiệu lực. Đổi một quyết định ở
đây thì sửa file này cùng commit với code. Quyết định giao diện nằm ở
[ux-decisions.md](ux-decisions.md), triển khai production ở
[deployment.md](deployment.md).

> **Hiện trạng 19/10/2026:** Yona đổi hướng thành ứng dụng nhắn tin giữa bạn bè.
> Lõi mới nằm ở **mục 11 "Lõi nhắn tin giữa người dùng"**. Các phần mang nhãn
> **(đang gỡ)** thuộc bản CRM cũ (hộp thư theo kênh, widget, webhook, account):
> code còn chạy ngầm cho tới khi gỡ xong, không xây tính năng mới trên chúng và
> không lấy chúng làm khuôn cho chat. Mục 1, 2, 5, 7 (phần chung), 8 vẫn áp dụng
> cho cả lõi mới.

## 1. Stack

PHP 8.3+ / Laravel 13 · Inertia + React 19 (TypeScript), Tailwind + Radix ·
PostgreSQL (`pg_trgm`) · Redis (cache, queue, session) · Laravel Reverb
(WebSocket) · bridge Node cho Zalo cá nhân (`services/zalo-bridge`, zca-js;
**đang gỡ**, không thuộc sản phẩm nhắn tin bạn bè).

## 2. Phân lớp và ba mặt tiền route

- `app/Http/` và `app/Models/` ở gốc; nghiệp vụ nằm trong `app/Services`,
  `app/Jobs`, `app/Listeners`, `app/Builders`… chia theo **chức năng**, không có
  module "Integration" gom đồ bên ngoài.
- Ba mặt tiền cùng gọi một lõi, nên mọi tính năng mở ra API được mà không viết
  lại:
  - `routes/web.php`: trang Inertia (session).
  - `routes/web_api.php`: JSON cho giao diện dashboard (session + CSRF).
  - `routes/api.php`: API cho bên ngoài bằng token (Platform API, API tài
    khoản). `routes/api_public.php` là gốc URL thứ hai của mặt tiền này: widget,
    khảo sát CSAT, Help Center — không session, người gọi chứng minh bằng định
    danh khó đoán trên URL.
- `routes/channels.php`: quyền nghe kênh realtime (mục 4).

## 3. Kênh nhắn tin: lõi trung tính, đặc thù ở driver (đang gỡ)

> Toàn bộ mục này là hộp thư theo kênh của bản CRM. Chat bạn bè không đi qua
> kênh, driver hay `CapabilitySet`: xem mục 11.

- Mỗi kênh là một model `app/Models/Channel/*` (quan hệ đa hình với `inboxes`).
- Năng lực kênh khai **duy nhất** ở `app/Channels/CapabilitySet.php` qua
  interface `DeclaresCapabilities` (enum `Capability`); nền tảng hiển thị (logo,
  nhãn) khai qua `DeclaresPlatform`. Giao diện và lõi hỏi năng lực, không bao giờ
  rẽ nhánh theo `channel_type`.
- Trang cài đặt hộp thư cũng dựng theo năng lực: nhóm `settings_*` (điều hướng hội
  thoại, webhook, Client API, widget, form trước chat, tên người gửi, máy chủ thư)
  là phần cấu hình kênh có thật **và** lõi áp dụng. Tab và khối lấy từ
  `resources/js/dashboard/settings/inboxes/inboxSettingsTabs.ts`. Kênh khai
  `settings_single_conversation` phải tạo hội thoại qua `IncomingConversationResolver`
  hoặc `ConversationBuilder`; kênh có harness contract chạy thêm
  `SingleConversationContract`.
- Gửi tin: `SendReplyJob::CHANNEL_SERVICES`. Hành động khác (thu hồi, cảm xúc,
  thành viên nhóm, sticker): `app/Services/Channels/ChannelActionRegistry.php`.
- **Thêm kênh = thêm driver** (model + service + một dòng đăng ký), không sửa
  lõi.
- **Giao kèo kết nối** (`app/Channels/DeclaresConnection.php`): mỗi driver khai
  tĩnh `connection()` trả `ChannelConnection` — đúng MỘT `ConnectionMethod`
  (`qr`, `oauth_redirect`, `oauth_popup`, `token`, `form`), có khả dụng không
  (thiếu client id/secret của app nền tảng → đóng), thứ tự, mẫu điền sẵn
  (`preset`), link hướng dẫn và các lối vào con (`options`, vd nhà cung cấp
  email). `ChannelConnectionCatalog` gom từ morph map, nhiều driver chung một lối
  vào (WhatsApp Cloud + Twilio) thì mở khi một driver mở. Màn "Thêm kênh" (prop
  `channels`) và `GET /api/v1/accounts/{id}/channel_connections` đọc cùng nguồn;
  bước 2 của lối vào đã đóng chuyển về màn chọn. Lối vào con có thể ở trạng thái
  sắp ra mắt (`comingSoon()`, API trả `coming_soon: true`, không có `start_url`, route
  bắt đầu trả 404 cho hộp mới); Email hiện chỉ mở đăng nhập Google. Contract test
  `tests/Contracts/Channels/ChannelConnectionDeclarationTest.php` bắt driver quên
  khai hoặc khai lệch năng lực phiên (`session_qr`/`session_oauth`/`session_token`).
  SMS (Bandwidth, Twilio SMS) đóng có chủ đích; dữ liệu và hộp thư cũ giữ nguyên.
- **Kiểm thông tin đăng nhập khi lưu**: `InboxesController` dựng kênh (chưa lưu)
  rồi gọi `ChannelCredentialsCheck` — bảng tra driver → verifier
  (`VerifiesChannelCredentials`): Email thử IMAP/SMTP qua `MailServerProbe`
  (test thay bằng `tests/Support/FakeMailServerProbe.php`), Telegram gọi `getMe`,
  LINE gọi `v2/oauth/verify` (lấy luôn ID kênh). Sai thì 422 gắn ô `channel.*`.
- **Email nối bằng OAuth** (Google/Microsoft): lối con `oauth_redirect` của lối
  vào Email trỏ `EmailOAuthController` (`/app/accounts/{id}/email/oauth/{provider}`
  → nhà cung cấp → `/app/email/oauth/{provider}/callback`), tách khỏi đăng nhập
  Yona; `state` một lần dùng trong session mang account/hộp thư cần kết nối lại.
  Nhà cung cấp ở `app/Services/Email/OAuth` (thêm một lớp + một dòng sổ đăng ký);
  Gmail khoá bằng `services.google_mail.enabled`. Token trong `provider_config`
  (cast `EncryptedSecretsArray`: chỉ khoá bí mật bị mã hoá, cột vẫn là jsonb);
  `EmailOAuthTokenManager` làm mới trước khi dùng cho IMAP (webklex
  `authentication: oauth`) và SMTP (XOAUTH2). Refresh token hỏng →
  `promptReauthorization()`, API trả `reconnect_url`.
- **Kênh mất kết nối**: kênh dùng `Reauthorizable` (đếm lỗi trong Redis, quá
  ngưỡng hoặc lỗi xác thực thì `promptReauthorization()`); lõi đọc qua
  `Inbox::reauthorizationRequired()` (cần năng lực `session_reauth`). Email ghi
  thêm lần hỏng gần nhất để API trả `connection_error`. Riêng Email, lỗi mạng
  không bật cờ cấp quyền lại: `EmailSyncBackoff` tự thử lại với khoảng chờ tăng
  dần, tối đa 10 phút cộng jitter; chỉ lỗi xác thực yêu cầu kết nối lại. Job quét
  thành công hoặc lưu cấu hình đúng thì `reauthorized()` gỡ trạng thái lỗi.
  `ImapSyncCursor` lưu UIDVALIDITY, UID đã quét và UID cần thử lại trong
  `channel_email.imap_sync_state`; chỉ checkpoint sau khi xử lý từng thư. Mỗi
  lượt tối đa 500 UID, dành tối đa 100 chỗ cho thư lỗi, phần còn lại nhận thư
  mới. UIDVALIDITY đổi thì quét lại INBOX, chống trùng bằng Message-ID.
- **Cách kéo thư theo hộp**: `MailboxFetchers` chọn driver `MailboxFetcher` đầu tiên nhận
  hộp thư; IMAP (`FetchEmailService`) đứng cuối làm mặc định. Hộp nối Google OAuth dùng
  `GmailApiFetcher`: lần đầu hoặc khi `history.list` trả 404 thì lấy mốc `historyId` từ
  `profile` rồi nhập thư INBOX trong cửa sổ gần đây, các lượt sau chỉ hỏi `history.list`
  từ mốc đã lưu. Mốc và id thư cần thử lại nằm ở `imap_sync_state` (`driver: gmail_api`).
  HTTP 401 là lỗi xác thực; 429, 5xx, hết giờ là lỗi kết nối. Riêng bước tải từng thư,
  lỗi tạm thời không làm hỏng cả lượt: thư đó cùng thư chưa kịp tải trong 60 giây nằm lại
  `pending_ids` để lượt sau thử lại. Bộ lọc thư đã có, đã xoá
  hoặc tự gửi (`NewMailFilter`) dùng chung cho mọi driver. Gửi thư vẫn qua SMTP XOAUTH2.
- **Ảnh trong thư**: thân thư HTML hiện trong iframe sandbox, ảnh tải thẳng từ máy chủ của
  người gửi. Ảnh nào hỏng lúc khung tải xong (máy chủ ảnh đặt `Cross-Origin-Resource-Policy`)
  thì FE đổi sang `GET /api/v1/email_image?url=` (`RemoteEmailImage`): chỉ người đã đăng nhập,
  qua `SafeHttp` kể cả sau chuyển hướng, tối đa 5 MB, chỉ ảnh bitmap (không SVG), không lưu,
  trình duyệt tự cache 7 ngày.
- **Báo thư mới (push)**: `MailboxPushSubscriptions` là sổ đăng ký trung tính theo nhà
  cung cấp (`MailboxPushSubscriber`; hiện chỉ `GmailPushSubscriber` gọi `users.watch`),
  đăng ký bằng job khi nối OAuth (`SubscribeMailboxPushJob`), gia hạn hằng ngày
  (`RenewMailboxPushSubscriptionsJob`), huỷ (`stop`) khi xoá hộp; hạn lưu ở
  `provider_config.push`; lỗi đường này không tính là lỗi kết nối IMAP. Webhook
  `POST /webhooks/gmail/push` (giới hạn 120 lần/phút/IP) lọc claims rồi mới kiểm chữ ký
  OIDC của Pub/Sub (`GooglePubSubTokenVerifier`, tải lại khoá tối đa 1 lần/phút) và gọi
  `FetchImapEmailsJob::requestFetch`: báo dồn dập gộp một lượt, báo tới lúc đang quét thì
  quét xong xếp thêm một lượt cuối. Push chỉ là tín hiệu, đọc thư qua driver của hộp
  (Gmail API với hộp Google), quét mỗi phút giữ làm lưới an toàn.
- **Thư trả về và lỗi gửi Email**: thư báo trạng thái gửi (DSN: người gửi phong bì
  rỗng hoặc MAILER-DAEMON/postmaster, có phần `message/delivery-status`) khi đồng bộ IMAP
  không mở hội thoại. Chỉ người nhận `Action: failed` (hoặc `Status: 5.x.x`) mới là thư
  trả về; thư báo trì hoãn bỏ qua. `BounceReport` đọc Message-ID thư gốc CHỈ từ bản thư
  gốc đính kèm (`message/rfc822`, `text/rfc822-headers`), người nhận lỗi và
  `Diagnostic-Code` theo từng người; `EmailBounceHandler` chỉ đánh dấu tin đi gốc
  `failed` khi người nhận lỗi là khách của hội thoại (CC bị trả thư thì thôi), qua
  `ChannelMessageStatus` với `external_error {code: 'email_bounced', message}`. SMTP từ chối ngay khi gửi thì
  `SendOnEmailService` ghi `{code: 'email_send_failed', message}` mang lời máy chủ.
- **Người trực mở hội thoại mới**: hai năng lực. `conversation_outbound_start` =
  kênh tự suy địa chỉ từ hồ sơ liên hệ (`AddressesContacts::contactSourceId`, hiện
  chỉ Email); kênh nào cần chặn địa chỉ không gửi được thì implement thêm
  `ChecksContactAddress` (Email: `EmailAddressVerifier` kiểm cú pháp + MX/A qua
  `TimeLimitedMailDomainResolver` hạn chờ 2,5 giây, cache theo tên miền 1 giờ, tra lỗi
  thì cho qua và nhớ 60 giây; từ chối → `UndeliverableContactAddress` render 422).
  `ContactInboxBuilder(outbound: true)` (người trực mở hội thoại, tạo liên hệ kèm hộp,
  tạo contact_inbox) kiểm cả `source_id` truyền vào; `assertDeliverable()` gọi được trước
  transaction. Kênh khai `MatchesContactAddressCaseInsensitively` (Email) thì địa chỉ
  sẵn có của liên hệ được dùng lại dù khác hoa thường.
  `conversation_outbound_resume` = mở hội thoại mới trên `contact_inbox` khách đã có
  (Zalo, Telegram, Messenger, Instagram, LINE, SMS, Twilio, WhatsApp); hội thoại tự
  mở không mang thuộc tính định tuyến của hội thoại cũ nên driver phải tự suy người
  nhận từ `contact_inbox` (contract `ConversationOutboundResumeContract`).
  `ContactInboxBuilder` chọn đường theo năng lực, `ContactableInboxes` liệt kê hộp
  cho khung soạn (`GET contacts/{id}/contactable_inboxes`) kèm `display_address`
  (chỉ khi địa chỉ là email/số điện thoại của hồ sơ) và lý do không chọn được
  (`reauthorization_required`, `messaging_window_closed`, mã của
  `UndeliverableContactAddress` như `email_undeliverable`). Cửa sổ nhắn tin do driver
  tính (`LimitsMessagingWindow`; Meta dùng trait `CustomerServiceWindow`: 24 giờ từ tin
  đến cuối trên `contact_inbox`). Api và widget không khai cả hai nên không bao giờ
  hiện trong khung soạn.
- Zalo cá nhân là một driver như mọi kênh khác (`Channel::Zalo`), nói chuyện với
  bridge Node qua `app/Services/Zalo/ZaloBridgeClient.php`.
- Ghi âm ở ô soạn: bản ghi là đính kèm âm thanh mang `meta.is_voice_message`
  (`Attachment::isVoiceMessage()`). Kênh khai `outbound_voice` gửi nó thành tin
  thoại gốc (Zalo: bridge `send-voice.mjs` đổi sang m4a rồi `sendVoice`); kênh
  khác gửi như mọi tệp âm thanh (`outbound_audio`).

### Tin đến và sự kiện: một đường vào cho mọi kênh

`app/Messaging/Inbound/` là lõi trung tính; driver kênh chỉ bóc payload của nền
tảng thành giá trị của lõi, không dựng Message/Attachment/Conversation.

- **Giá trị kênh tạo (không I/O):** `InboundSender` (id ổn định trên kênh + hồ sơ),
  `InboundMessage` (chiều `InboundDirection`: khách gửi / tenant gửi từ app nền tảng
  / hoạt động; chữ; giờ nền tảng; sticker `StickerContent`; danh sách
  `InboundAttachment`; trích dẫn `ReplyReference`; chuyển tiếp `ForwardOrigin`;
  `attributes` là khoá `content_attributes` riêng của kênh đã có hợp đồng với giao
  diện; `conversationAttributes` gợi ý cho hội thoại mới). `InboundAttachment` mô tả
  một đính kèm theo đúng một cách: `download()` (lõi tải về; `urlIsPublic` quyết
  định fallback có giữ liên kết để tự tải lại không), `external()` (CDN công khai
  không hết hạn), `location()`, `contactCard()`, `fallback()`; loại theo
  `AttachmentKind`.
- **Lõi ghi:** `InboundMessageWriter::write(Inbox, InboundSender, InboundMessage)` là
  nơi DUY NHẤT: chống trùng theo inbox + `source_id` (tin dội lại tra thêm bí danh
  `external_source_ids`), liên hệ qua `ContactInboxWithContactBuilder`, hội thoại qua
  `IncomingConversationResolver`, Message với loại/trạng thái theo chiều, trích dẫn
  (`in_reply_to_external_id` + `in_reply_to_preview`; id nội bộ do
  `InReplyToMessageBuilder` suy khi lưu), `forwarded_from`, `external_echo`, đính kèm
  dựng trước khi lưu qua `InboundAttachmentFactory` (tải, suy loại theo MIME khi kênh
  chỉ nói "tệp", fallback), sticker qua `StickerMessage`. Mọi thứ trong một transaction.
- **Hai mốc giờ trên tin:** `messages.platform_sent_at` là giờ tin được gửi trên nền
  tảng (driver đặt từ `InboundMessage::$sentAt`; tin tạo trong Yona bằng `created_at`,
  cột không bao giờ rỗng). **Thứ tự tin trong hội thoại, phân trang (`MessageFinder`),
  tin đầu/cuối và giờ hiển thị ở bong bóng đều theo cột này** nên khớp với app của
  kênh kể cả khi webhook đến trễ. `created_at` là giờ Yona nhận: số chưa đọc
  (`agent_last_seen_at`), `last_activity_at`, mốc chờ, báo cáo theo đó, nên tin trễ
  vẫn được đếm là mới. Lô lịch sử Zalo (`backfill`) ghi cả hai bằng giờ nền tảng vì đó
  không phải hoạt động mới. Giao diện đọc qua `messageSentAt()`
  (`resources/js/dashboard/conversation/messageTime.ts`).
- **Sự kiện lên tin đã có:** `MessageEventService::apply(Inbox, InboundEvent)` với
  `ReactionEvent` (emoji rỗng = gỡ; `isSelf` = tenant thả từ app → ô agent),
  `RecallEvent` (kèm bia mộ chờ tin tới sau), `EditEvent`, `ReceiptEvent` (theo
  danh sách id hoặc theo mốc thời gian cho một người, uỷ quyền
  `MessageReceiptService`; chỉ nâng tin đi, không hạ). Tra tin theo `source_id` rồi bí
  danh.
- **Kênh đã đi đường này:** Messenger và Instagram (`app/Services/Meta/MessagingPayload`
  bóc một phần tử Messenger Platform, dùng chung), Telegram, WhatsApp, Line, SMS,
  Twilio, TikTok, kho sticker Yona. **Zalo** mới chuyển phần sự kiện
  (`RelayEventParser::events()`) và đính kèm (`InboundAttachmentFactory`); writer tin
  đến của Zalo còn giữ riêng vì luật backfill (không đổi trạng thái hội thoại), chờ
  echo khớp bí danh và đồng bộ hồ sơ nhóm — nợ có tên, chuyển sau.
- **Ép bằng contract** (`tests/Contracts/Channels`): kênh khai năng lực nào thì
  harness của nó phải qua contract đó: `inbound_image/sticker/file/video/audio/
  location/contact_card/reply_to/forward`, `event_delivered/seen/reaction/recall`,
  `outbound_*`, `settings_single_conversation`. Harness có cho Telegram, Zalo,
  Messenger. **Thêm kênh = viết parser + harness; thêm loại tin = thêm giá trị +
  contract, không sửa kênh nào.**

### Tin nhắn có cấu trúc và hạ cấp theo kênh

Tin đặc biệt (trả lời nhanh, nút, thẻ sản phẩm, yêu cầu đặt hàng, tra đơn, form,
mở trang, chuyển khoản…) là **payload có cấu trúc**: `content_type` +
`content_attributes`, vẽ native từ payload, không render tin bằng iframe.

**Lõi (một nguồn cho mọi mặt tiền):**
- `app/Messaging/Structured/`: mỗi loại tin là một class `StructuredType`
  (`rules()`, `normalize()`, `plainText()`, `previewText()`, `choices()`,
  `needsPublicPage()`), đăng ký ở `config/messaging.php` → `structured_types`.
  `StructuredTypeRegistry::prepare()` kiểm và chuẩn hoá lúc tạo tin (API trả 422
  kèm lý do); `read()` đọc lại payload đã lưu (`PayloadContext::$fromStorage`).
  Máy chủ không tin dữ liệu client khai: giá, tên, ảnh của yêu cầu đặt hàng lấy từ
  thẻ gốc; số tài khoản, mã VietQR của thẻ chuyển khoản dựng từ `PaymentAccount`
  lúc gửi và giữ nguyên bản chụp khi đọc lại.
- `SubmissionService`: ghi câu trả lời của khách (`submitted_values`) có khoá
  dòng, chống trả lời hai lần.
- `resources/js/shared/messaging/`: message kit dùng chung widget, hộp thư và
  trang công khai. Mỗi loại một file trong `types/` + một dòng trong `index.ts`.
  Mặt tiền quyết side effect qua `MessageHost` (widget: gửi, mở sheet; hộp thư:
  chỉ xem).
- **Thêm một loại tin:** một class PHP + một dòng config, một file TS + một dòng
  `index.ts`. Không sửa lõi, không thêm nhánh `content_type` ở adapter hay giao diện.

**Hạ cấp theo kênh** (`app/Messaging/Delivery/DeliveryPlanner`, nơi duy nhất quyết
định; `SendOn*Service` chỉ hỏi planner rồi gửi):
1. `native`: kênh có renderer gốc (`config/messaging.php` → `delivery_renderers`,
   khoá theo class kênh: Facebook quick reply/template, Telegram inline keyboard,
   LINE Flex). Lựa chọn quay về qua `ChoiceCallbackService`, kiểm đúng hộp thư và
   đúng người nhận của tin.
2. `image_text`: kênh nhận ảnh nhưng không có dạng gốc (Zalo cá nhân): ảnh thẻ vẽ
   bằng satori + resvg ở bridge (`POST /render/card`, cache theo mã băm payload
   trên disk `public`, lỗi thì bỏ ảnh), kèm bản chữ.
3. `text_numbered` / `text`: chữ thuần, lựa chọn thành danh sách đánh số, kèm link
   trang công khai khi loại tin cần.
- Mức đã gửi ghi ở `content_attributes.delivery`; hộp thư hiện ghi chú khi khách
  nhận bản kém hơn dạng gốc. Log `messaging.delivery.degraded`.
- Khách gõ số (`ChoiceReplyResolver`, listener `message.created`): chỉ map khi
  tin gốc đã tới khách dạng danh sách số, trong 24 giờ, chưa trả lời; số lạ hoặc
  chữ tự do đi thẳng tới nhân viên. Tin khách mang `choice_of` để hộp thư hiện
  "Trả lời cho…".

**Trang công khai theo token** (`/m/{token}`, SPA `resources/js/flows/`):
- `PublicFlowService` phát token 32 byte (DB chỉ lưu sha256), hạn 14 ngày; trang
  chọn lịch/form khoá token sau khi gửi. Token sai, hết hạn, đã dùng đều 404 như nhau.
- Widget xin link qua `POST /api/v1/widget/messages/{id}/flow` rồi mở trong sheet
  iframe; trang báo kết quả bằng `postMessage` tiền tố `yona-flow:`, widget chỉ
  nhận từ chính origin. Kênh khác nhận cùng link trong bản chữ.
- `frame-ancestors` giống hệt widget (kênh website chưa khai domain thì không gửi
  header), trang gắn `noindex`. Gửi form có hạn mức theo token và IP.

### Sticker và kho sticker Yona

Tin sticker là `content_type: sticker` với payload ở `content_attributes.sticker`;
nó **không** phải `StructuredType` (không đăng ký ở `config/messaging.php`), vì
ra kênh ngoài là sticker gốc của nền tảng hoặc một ảnh, không cần hạ cấp.

- **Một hình dạng cho mọi kênh:** `app/Messaging/Stickers/StickerMessage::apply()`
  là nơi duy nhất ghi ba trường của tin sticker (`content_type`, `content` rỗng,
  `content_attributes.sticker`) và đúng một đính kèm ảnh. Driver kênh chỉ bóc payload
  của mình thành `StickerContent` (id, pack_id, url, animated, emoji + `extra` riêng
  của kênh để danh mục gửi lại được) rồi gọi `apply`; ảnh trên CDN công khai đi
  bằng `external_url`, ảnh có token/hết hạn (Telegram, WhatsApp, Messenger) kênh tải
  về rồi đưa vào `apply`. Kho Yona (`StickerMessageBuilder`) cũng đi đường này.
  Kênh khai `inbound_sticker` bị `InboundStickerContract` ép đúng hình dạng; thêm
  kênh mới = viết `sticker(): ?StickerContent` trong driver, không sửa lõi.

- **Danh mục ghép:** `app/Services/Channels/Stickers/StickerLibrary.php` là lõi
  trung tính, ghép `YonaStickerCatalog` (`app/Services/Stickers/`, kho của chính
  Yona) với danh mục của nền tảng tra qua `ChannelActionRegistry` (ví dụ
  `app/Services/Zalo/ZaloStickerCatalog.php`), cùng contract `StickerCatalog`.
  Mã kho Yona mang tiền tố `yona:` và định tuyến theo tiền tố. Sticker nền tảng
  cần năng lực `outbound_sticker`; sticker Yona chỉ cần `outbound_image` vì ra
  ngoài là ảnh PNG tĩnh (`outboundCapabilityFor()`). Kênh khai
  `outbound_custom_sticker` (Zalo) nhận sticker Yona dạng sticker tự tạo của nền
  tảng qua URL công khai của disk `stickers` (bridge `custom-sticker.mjs`), nên hiện
  gọn như sticker gốc và ảnh động vẫn chạy.
- **Ai thấy gì:** một nguồn là `Sticker::visibleTo($account)`: sticker `ready`
  trong bộ đã xuất bản, của kho nền tảng (`account_id` null) và kho riêng của
  chính account.
- **Ai được quản lý kho nào:** một nguồn là `StickerLibraryAccess`
  (`app/Services/Stickers/`), dùng ở trang cài đặt và API dashboard.
  Kho riêng: mọi thành viên account (quản trị viên lẫn nhân viên). Kho nền tảng:
  chỉ người có quyền hệ thống. Quyền hệ thống
  = email user trong `YONA_SYSTEM_ADMIN_EMAILS`, đọc DUY NHẤT ở
  `App\Support\SystemAccess`. Trang Cài đặt → Kho sticker mở cho mọi thành
  viên; tab kho nền tảng chỉ hiện với người có quyền hệ thống, API kho nền tảng
  trả 403 cho người khác (`EnsureStickerLibraryAccess`).
  Kho nền tảng trong dashboard ở `/api/v1/platform_sticker_library/sticker_packs…`;
  console Super Admin giữ nguyên `/admin/api/sticker_packs…`. Hai mặt tiền
  này dùng chung action `ServesStickerLibrary` (chỉ khác `libraryOwner()`), kho
  riêng dùng `CustomStickerPacksController`. Không có MCP hay REST bằng token cho
  kho sticker (đã gỡ 28/09/2026).
- **Payload lưu đường dẫn, URL dựng lúc đọc:** tin chỉ giữ đường dẫn trên disk
  `stickers` (`config/filesystems.php`), không giữ URL; `MessageResource` gọi
  `StickerLibrary::forReader()` dựng `image_url` (WebP 64×64, có thể động), `url`
  (PNG tĩnh), `source: yona`. Tin cũ mang payload Lottie (`animation_path`,
  `poster_path`) vẫn đọc được: `image_url` = `url` = PNG tĩnh. Đổi tên miền hay chuyển disk sang R2 thì tin cũ vẫn đúng.
- **Tệp mượn:** đính kèm của tin sticker trỏ thẳng tệp trên disk `stickers`, không
  sao chép. `Attachment::ownsStoredFile()` trả false cho disk thuộc
  `config('yona.attachment_borrowed_disks')`, nên xoá, thu hồi hay chuyển tiếp tin
  không đụng tệp kho. Xoá tệp kho chỉ ở `StickerFileJanitor`, khi không còn sticker
  hay đính kèm nào trỏ tới hash đó.
- **Pipeline upload (sticker từ ảnh):** người dùng tải PNG, JPG, WebP, GIF hoặc
  WebP động kèm tham số chỉnh `edit` (cắt, xoá nền, dung sai, đũa thần, cọ; kiểm ở
  `StickerEdit`). `StickerUploadService` kiểm loại tệp thật, lưu ảnh gốc, tạo
  sticker `processing`; `RenderStickerJob` (hàng đợi riêng `stickers`, một
  process) gọi `StickerRenderer`. Bản cài đặt `NodeStickerRenderer` chạy
  `services/sticker-renderer` (sharp) trong tiến trình con có cắt thời gian và
  `prlimit --data` (`config/yona.php` → `stickers`): cắt, xoá nền không AI, trim,
  co về `image_size` (mặc định 64×64). Tệp theo hash ảnh gốc + `edit`
  (`StickerFileLayout`): `<2 ký tự>/<hash>/original.<đuôi>`, `sticker.webp`,
  `static.png`. Hỏng bước nào thì sticker `failed` kèm mã. `stickers:rerender`
  dựng lại từ ảnh gốc khi đổi cỡ.
- **Nhãn và từ khoá:** `StickerTags` (`app/Services/Stickers/`) là nguồn duy nhất
  của giới hạn và cách chuẩn hoá (chữ thường, bỏ rỗng/trùng, tối đa 20 từ × 40 ký
  tự). Sửa qua `StickerLibraryManager::updateSticker()`; route
  `PATCH …/sticker_packs/{packId}/stickers/{stickerId}` ở mọi mặt tiền quản lý
  kho; upload nhận thêm `keywords[]`.
- **Gợi ý khi gõ:** dashboard gọi `GET /api/v1/accounts/{account}/conversations/{id}/stickers/suggestions?q=`
  → `StickerLibrary::suggest()` → `YonaStickerCatalog::suggest()`: chỉ kho Yona (không
  hỏi bridge), cùng gate năng lực và `Sticker::visibleTo()` như bảng chọn, khớp nhãn
  hoặc một từ khoá bằng/bắt đầu bằng `q` qua hàm SQL `search_fold` (không dấu,
  không phân biệt hoa thường, không cần extension), khớp trọn đứng trước, tối đa
  8; `q` dưới 2 ký tự hay hộp thư không dùng được kho thì rỗng. Widget không gọi
  API: `stickers` trong `/widget/config` mang sẵn `keywords` để lọc tại chỗ.
- **Xoá nền không AI, một lõi:** `services/sticker-renderer/src/image/background-mask.mjs`
  (ESM thuần) loang màu 8 hướng từ mép ảnh theo khoảng cách màu Lab, áp đũa thần
  và cọ, khử màu nền ở viền để nền trong suốt tuyệt đối, không quầng. Trình chỉnh
  ở trình duyệt dùng đúng file này để xem trước; renderer dùng nó cho bản cuối và
  mọi khung ảnh động.
- **Hiển thị:** sticker Yona là `<img>` từ `image_url` (WebP động tự chạy), cạnh
  `display_size` (Inertia `stickerDisplaySize`, widget `sticker_display_size`).

## 4. Realtime

- Chat bạn bè chỉ dùng kênh `pubsub_token` của từng người dùng, sự kiện `chat.*`
  (mục 11). Kênh `account_{id}` và kênh của khách widget dưới đây là của bản CRM
  (**đang gỡ**).
- Laravel Reverb + Echo. Sự kiện đẩy qua `app/Events/RealtimeBroadcast.php`
  (`ShouldBroadcastNow`, kênh private).
- Mỗi nhân viên nghe hai kênh: `account_{id}` (chung account) và kênh mang
  chính `pubsub_token` của mình. Khách widget nghe `pubsub_token` của
  `contact_inboxes`. Pattern `{pubsubToken}` phải đăng ký **cuối cùng** trong
  `routes/channels.php`.
- Trạng thái trực tuyến theo nhịp (`OnlineStatusTracker`), cửa sổ cấu hình ở
  `config/yona.php` (`presence_duration`, `contact_presence_duration`).

## 5. Hàng đợi và lịch

- Redis + Horizon. Thứ tự tier là **một nguồn**: `config/queue_tiers.php`
  (critical > high > medium > default > mailers > low > scheduled_jobs >
  purgable). Horizon, `Makefile` và `deploy.sh` cùng đọc file này.
- Việc định kỳ chạy bằng Laravel scheduler (`routes/console.php`).

## 6. Sự kiện nghiệp vụ (đang gỡ)

> `EventType` và listener dưới đây phục vụ hộp thư CRM (webhook, automation,
> báo cáo). Chat bạn bè không phát `EventType`; sự kiện của nó là hằng trong
> `ChatBroadcaster` (mục 11).

- Tên sự kiện là enum `app/Events/EventType.php` (`message.created`,
  `conversation.status_changed`…). Chuỗi đó vừa là tên client Echo nhận
  (`broadcastAs()`), vừa là tên sự kiện webhook gửi ra ngoài ⇒ là **contract
  công khai**, không đổi tên.
- Listener ở `app/Listeners/*` (realtime, webhook, automation, thông báo, báo
  cáo, CSAT…).

## 7. Dữ liệu

- (Đang gỡ) `display_id` của hội thoại (và chiến dịch) tăng riêng theo từng account bằng
  trigger PostgreSQL + sequence per-account (`conv_dpid_seq_<account_id>`), tạo
  lúc thêm account.
- (Đang gỡ) Cờ tính năng: cột jsonb `accounts.feature_flags`; danh mục cờ ở
  `config/features.php`.
- Tệp: bảng `attachments` + Laravel filesystem. URL tệp dạng
  `/attachments/{id}/{chữ ký}/{tên tệp gốc}` (giao diện đọc tên hiển thị từ đoạn
  cuối URL — xem `deployment.md` mục 7 về nginx).
- Tìm kiếm: `pg_trgm` + hàm SQL `search_fold` (bỏ dấu, không phân biệt hoa
  thường), không dùng máy tìm kiếm ngoài. Xếp hạng theo độ khớp ở
  `app/Support/SearchTerm.php`.
- Mọi cột thời gian là `timestamp(6)` (migration khai `timestamps(6)` /
  `timestamp('x', 6)`, cấm `timestamps()` trần). Ghi micro-giây qua
  `App\Database\PostgresConnection`, đăng ký một lần bằng
  `Connection::resolverFor('pgsql')` trong `AppServiceProvider` — nhiều tin
  cùng giây vẫn giữ đúng thứ tự.
- Không bao giờ `migrate:fresh/refresh/wipe`; migration chỉ cộng thêm.

## 8. i18n một nguồn

- Mọi chuỗi giao diện sống trong `lang/{locale}/<namespace>.php`. Placeholder
  dạng `{name}`; `App\Translation\Translator` dạy `__()` hiểu `{name}` bên cạnh
  `:name` (`:name` không phân định biên, vd `{size}MB`).
- Frontend không giữ JSON riêng: `php artisan i18n:generate` sinh
  `resources/js/i18n/generated/{locale}.ts` (commit kèm; `--check` chạy trong
  gate) cho helper `t()`. Thêm ngôn ngữ = thêm `lang/<locale>/`.
- Quy ước: tên sản phẩm trong chuỗi viết bằng placeholder tên cài đặt
  `{installationName}`, điền lúc chạy từ cấu hình cài đặt — không viết cứng tên
  sản phẩm vào bản dịch.

## 9. Contract công khai: SDK nhúng và webhook (đang gỡ)

> SDK widget và webhook thuộc bản CRM. Khi gỡ, contract ngoài vẫn phải được xử
> lý có chủ đích (tắt hẳn hoặc trả lỗi rõ ràng), không xoá lặng lẽ.

Website khách đã dán mã nhúng và hệ thống khách đã nhận webhook: mọi tên đã phát
ra ngoài là **contract**. Đổi tên thì tên mới là chính, tên đời trước giữ làm
**alias vô thời hạn** — không "dọn" alias khi chưa có số liệu cho thấy không ai
dùng.

| Tên chính | Cách giữ tên đời trước |
|---|---|
| `window.yonaSDK.run({ websiteToken, baseUrl })` | cùng một object, gán lúc nạp script |
| `window.yonaSettings` | đọc cả tên đời trước, tên mới đè |
| `window.$yona` | cùng một object, gán trong `run()` |
| sự kiện `yona:ready`, `yona:error`, `yona:opened`, `yona:closed`, `yona:on-message`, `yona:on-start-conversation`, `yona:postback` | SDK bắn cả hai tên, cùng `detail`, tên mới trước |
| postMessage `yona-widget:<json>` | hai phía nhận cả tiền tố đời trước; SDK mới gửi `sdk_protocol=2` trên URL iframe để iframe biết nói tiền tố nào (SDK cũ đang mở trên tab khách vẫn chạy) |
| id iframe `yona_live_chat_widget` | không alias được id |
| app nhúng dashboard gửi `yona-dashboard-app:fetch-info` | `DashboardApp/frameProtocol.ts` nhận cả tên đời trước |
| header webhook `X-Yona-Delivery`, `X-Yona-Timestamp`, `X-Yona-Signature` (`sha256=` HMAC của `"{timestamp}.{body}"`) | gửi song song bộ header tiền tố đời trước, cùng giá trị |

- Tên đời trước phía frontend gom **một chỗ**: `resources/js/shared/legacyContracts.ts`;
  phía máy chủ: hằng tiền tố header trong `app/Services/Webhooks/Trigger.php`.
- Lớp CSS `woot-*`, `#cw-widget-holder`, cookie `cw_*` cũng là contract với
  website khách — giữ nguyên.

## 10. Ký + mã hoá request nhắn tin và giới hạn nhịp

> Phạm vi ký + mã hoá dưới đây là route của hộp thư CRM và widget (**đang gỡ**).
> Route chat bạn bè (`/api/v1/chats…`) hiện **không** ký/mã hoá, chỉ có
> `throttle` theo route (mục 11). Muốn đưa chat vào lớp ký thì gắn
> `VerifySignedRequest` ở `routes/web_api.php`, không viết lớp thứ hai.

Mục tiêu là **chống lạm dụng API** (dựng request bằng tay, dán lại cURL, replay,
script gọi hàng loạt), **không** phải E2EE: máy chủ vẫn đọc nội dung, khoá nằm
trong JS nên chỉ làm khó; lớp chặn thật là giới hạn nhịp.

- **Phạm vi ký + mã hoá** (route gắn `VerifySignedRequest:<bề mặt>` trong
  `routes/web_api.php` và `routes/api.php`): dashboard — tải/gửi/xoá tin, gửi lại,
  cảm xúc, chuyển tiếp + danh sách đích, đánh dấu chuyển khoản, dịch, tìm tin trong
  hội thoại; widget — tải/gửi/sửa/thu hồi tin, tạo hội thoại, cảm xúc, link trang
  công khai. Request Application API (header `api_access_token`) trên cùng route
  được miễn ký, chỉ bị giới hạn nhịp. Platform API: chỉ giới hạn nhịp.
- **Một middleware** `app/Http/Middleware/VerifySignedRequest.php` giải mã + kiểm
  chữ ký + nonce rồi chạy lại TrimStrings/ConvertEmptyStringsToNull; lõi nhắn tin
  nhận request thường. Hợp đồng ở `app/Http/RequestSigning/SignedRequestProtocol.php`
  và bản TS `resources/js/shared/requestSigning/protocol.ts`, khớp nhau bằng
  `vectors.json` dùng chung (test cả hai phía).
- **Khoá phiên**: `POST /api/v1/request_signing_key` (dashboard) và
  `POST /api/v1/widget/request_signing_key` (widget) cấp khoá AES + HMAC ngẫu
  nhiên, lưu cache có hạn (`SigningKeyStore`), gắn với người gọi (user/bot, hoặc
  inbox + source_id trong JWT khách). Đăng nhập/đăng xuất thu hồi mọi khoá cũ của
  user. Phản hồi kèm giờ máy chủ và danh sách route phải ký lấy từ bảng route —
  client không giữ danh sách riêng.
- **Chữ ký**: HMAC-SHA256 trên `v1\nMETHOD\nURI(kèm query)\ntimestamp\nnonce\nsha256(thân)`,
  header `X-Sig-Key-Id`, `X-Sig-Timestamp`, `X-Sig-Nonce`, `X-Sig`. Lệch giờ quá
  `max_clock_skew_seconds`, khoá lạ/hết hạn → 428 (client xin khoá mới và gửi lại
  một lần); sai chữ ký, thân sửa, thân chưa mã hoá → 400; nonce dùng lại → 409.
- **Mã hoá**: thân JSON thành `{"_encrypted": base64(iv‖ciphertext‖tag)}` (AES-256-GCM).
  Multipart: trường chữ gom thành một trường `_encrypted`, `_method` để trơn (router
  đọc trước middleware), **tệp không mã hoá**, chỉ băm SHA-256 vào chữ ký.
  **Phản hồi không mã hoá**: tin mới vẫn đến trình duyệt qua Reverb dạng trơn, mã
  hoá phản hồi không che thêm được gì. Sự kiện Reverb chưa ký/mã hoá (đợt sau; lưu ý
  giới hạn 10 KB/sự kiện).
- **Client**: mỗi bề mặt một điểm — `RequestSigner` trong
  `resources/js/dashboard/helper/apiClient.ts` và `resources/js/widget/api/client.ts`
  (đường tải tệp XHR dùng chung signer). Chưa có khoá thì không chặn request: xin
  khoá ở nền, route cần ký nhận 428 rồi tự gửi lại; widget xin khoá sẵn ngay khi
  có phiên khách.
- **Giới hạn nhịp** (`app/Http/RateLimiting/MessagingRateLimiters.php`): đọc/ghi
  theo user/bot + account (dashboard, Application API), theo khách + trần chung
  mỗi hộp thư (widget), theo token (Platform API); **không theo IP**. Vượt → 429 +
  log `request_throttled`. Throttle bị framework xếp chạy trước middleware không
  nằm trong danh sách ưu tiên, nên khoá của widget/Platform API đọc thẳng từ token.
- **Cấu hình một chỗ**: `config/request_protection.php`. `REQUEST_SIGNING_ENABLED=false`
  là rollback tức thì không cần deploy mã (chạy `php artisan config:cache` lại).

## 11. Lõi nhắn tin giữa người dùng

Lõi của sản phẩm từ 19/10/2026: hội thoại giữa các `users` ngang hàng, không
`account`, không `inbox`, không `contact`. Mô tả dưới đây khớp code trên `main`
ngày 19/10/2026; phần chưa có code ghi rõ ở cuối mục.

### Dữ liệu: dùng chung bảng, model riêng

- **`App\Models\Chat`** trên bảng `conversations`. Hàng có cột `kind` khác rỗng là
  chat giữa người dùng (`KIND_DIRECT = 1`, `KIND_GROUP = 2`); `account_id`/`inbox_id`
  để rỗng. Global scope `kind not null` giữ hàng CRM ngoài mọi truy vấn chat;
  có `SoftDeletes`. Cột riêng: `title`, `description`, `created_by`, `direct_key`
  (unique), `last_message_id`, `last_activity_at`, `member_count`, `settings` (jsonb).
- **`App\Models\ChatMember`** trên bảng `conversation_members` (unique
  `conversation_id + user_id`): `role` (`ROLE_MEMBER`/`ROLE_ADMIN`/`ROLE_OWNER`),
  `status` (`STATUS_ACTIVE`/`STATUS_PENDING` = Tin chờ/`STATUS_LEFT`/`STATUS_REMOVED`),
  `last_read_message_id`, `muted_until`, `archived_at`, `pinned_at`, `invited_by`.
  Trạng thái riêng của từng người (đã đọc, tắt thông báo, ghim) nằm ở đây, không ở hội thoại.
- **`App\Models\ChatMessage`** trên bảng `messages` (chia partition theo tháng,
  chung với tin hộp thư). Người gửi luôn là `User` (`sender_type = 'User'`); tin
  hệ thống không có người gửi (`TYPE_SYSTEM`). Trả lời, thu hồi, cảm xúc đi trong
  `content_attributes` (`in_reply_to`, `deleted`…), không có bảng riêng. Chống gửi
  trùng bằng `client_id` (client gửi `echo_id`).
- Lý do không dùng `Conversation`/`Message`: hai model đó mang hook của hộp thư
  (gán người, webhook, automation, báo cáo) vốn giả định có account/inbox/contact
  và hỏng khi chúng rỗng.
- Bảng phụ: `user_blocks` (`UserBlock`), `abuse_reports` (`AbuseReport`,
  `REPORTABLE` = `user` / `chat` / `message`), `conversation_invite_links` (đã
  migrate, chưa có code dùng). Người dùng có `username` và các trường hồ sơ
  (migration `add_profile_fields_to_users_table`).

### Nghiệp vụ: `app/Services/Chat/`

Mỗi class một trách nhiệm; controller chỉ validate rồi gọi xuống đây.

| Class | Trách nhiệm |
|---|---|
| `DirectChats` | Mở (hoặc lấy lại) hội thoại 1-1. Mỗi cặp đúng một hội thoại qua `Chat::directKey()` (`min:max` của hai user id); hai bên mở cùng lúc thì bên thua bắt lỗi unique và lấy hội thoại bên kia vừa tạo. Người mở `ACTIVE`, người nhận `PENDING` (Tin chờ). Từ chối nhắn cho chính mình và khi có chặn giữa hai người |
| `ChatMessageSender` | **Đường gửi tin duy nhất**: kiểm thành viên, kiểm chặn (1-1), chống trùng theo `client_id`, ghi tin + cập nhật `last_message_id`/`last_activity_at` + đánh dấu người gửi đã đọc trong một transaction. Người gửi đang `PENDING` thì chuyển `ACTIVE` (trả lời = chấp nhận). Sau đó phát `chat.message.created` và gửi `ChatMessageNotification` cho thành viên `ACTIVE` không tắt thông báo. `sendText()` là lối vào cho tin chữ (kèm `in_reply_to` nếu tin gốc thuộc hội thoại); loại tin khác sẽ đi qua `send()` |
| `ChatMemberships` | Trạng thái của một người trong hội thoại: chấp nhận Tin chờ, xoá khỏi danh sách của mình (`STATUS_LEFT`, không báo người kia), đánh dấu đã đọc, đang gõ, đếm chưa đọc (trần 100). `membership()` là chỗ duy nhất kiểm "có phải thành viên" |
| `ChatInbox` | Danh sách hội thoại theo tab `all` (ACTIVE) / `requests` (PENDING, chỉ hội thoại đã có tin), phân trang theo `last_activity_at` (25/trang); trang tin cũ → mới (30/trang, theo `platform_sent_at`, `id`) |
| `UserBlocks` | Chặn/bỏ chặn. Khai một chiều, `isBlockedBetween()` kiểm hai chiều |
| `AbuseReports` | Ghi báo cáo vi phạm; Super Admin `resolve()` |
| `ChatBroadcaster` | **Nơi duy nhất phát realtime của chat** (xem dưới) |
| `ChatPresenter` | Dựng JSON cho giao diện, giữ khuôn payload hội thoại/tin của hộp thư để `ConversationView` dùng lại. Tin không phụ thuộc người xem; trạng thái `read` tính từ `last_read_message_id` của người kia (chỉ 1-1). Có `preview()` cho thông báo đẩy |

Tìm người theo username nằm ở `app/Services/Users/UserDirectory.php` (khớp tiền
tố username hoặc tên không dấu qua `search_fold`, bỏ chính mình và người chưa có
username); chuẩn hoá và kiểm trống username ở `app/Services/Users/Username.php`.
Đăng ký đi qua `app/Services/Users/PersonalSignUpService.php` (form và Google
cùng một lối, chỉ tạo user).

### Route

Trang Inertia (`routes/web.php`, sau `auth`):

| Route | Ghi chú |
|---|---|
| `GET /app` | Chuyển về `/chat` |
| `GET/POST /chat/welcome` | Chọn username; middleware `EnsureUsername` đẩy người chưa có username về đây |
| `GET /chat`, `GET /chat/c/{chat}` | Màn chat (render `dashboard/conversation/ConversationView`), sau `EnsureUsername` |
| `GET /chat/profile` | Hồ sơ (`resources/js/chat/Profile.tsx`) |

JSON (`routes/web_api.php`, nhóm `auth.api_token` + `auth`, tiền tố `/api/v1`;
session của giao diện hoặc header `api_access_token`):

| Route | Ghi chú |
|---|---|
| `GET /users/search?q=` | Tìm người (throttle 60/phút) |
| `GET /usernames/availability?username=` | Kiểm username còn trống (throttle 60/phút) |
| `GET /chats?tab=all\|requests&before=` | Danh sách hội thoại |
| `POST /chats/direct` (`user_id`) | Mở hội thoại 1-1 (throttle 60/phút) |
| `GET /chats/{chat}` · `DELETE /chats/{chat}` | Xem · xoá khỏi danh sách của mình |
| `POST /chats/{chat}/accept` · `/read` · `/typing` | Chấp nhận Tin chờ · đã đọc · đang gõ (typing throttle 120/phút) |
| `GET /chats/{chat}/messages?before=` | Trang tin |
| `POST /chats/{chat}/messages` (`content`, `echo_id`, `in_reply_to`) | Gửi tin chữ (throttle 120/phút) |
| `POST /blocks` · `DELETE /blocks/{user}` | Chặn · bỏ chặn |
| `POST /abuse_reports` | Báo cáo vi phạm (throttle 20/phút) |
| `POST/DELETE /notification_subscriptions` | Đăng ký Web Push của trình duyệt |

Phía giao diện, một chỗ duy nhất gọi các API này:
`resources/js/dashboard/conversation/api.ts`.

### Realtime

- `ChatBroadcaster` phát qua `App\Events\RealtimeBroadcast` tới kênh private mang
  **`pubsub_token` của từng người dùng** (`routes/channels.php`, pattern
  `{pubsubToken}`). `toMembers()` gửi cho thành viên `ACTIVE` và `PENDING` (có thể
  trừ người gây ra sự kiện); `toUser()` gửi cho một người. Mọi người nghe đi chung
  một lượt POST tới Reverb. Reverb trục trặc chỉ ghi log: tin đã lưu thì người
  nhận vẫn thấy khi tải lại.
- Sự kiện (hằng trong `ChatBroadcaster`, payload luôn có `chat_id`):

| Sự kiện | Khi nào | Payload thêm |
|---|---|---|
| `chat.message.created` | Có tin mới | `message` (khuôn `ChatPresenter::message`) |
| `chat.updated` | Chấp nhận Tin chờ, xoá khỏi danh sách (chỉ gửi cho chính người đó) | `removed` khi xoá |
| `chat.read` | Một người đọc tới tin nào | `user_id`, `message_id` |
| `chat.typing` | Đang gõ / thôi gõ (không gửi cho chính người gõ) | `user`, `typing` |
| `chat.message.updated` | Mới khai hằng, chưa có chỗ phát (dành cho sửa/thu hồi/cảm xúc) | |

- Phía giao diện nghe ở `resources/js/dashboard/realtime/ActionCableConnector.ts`
  và xử lý trong `resources/js/dashboard/conversation/ConversationContext.tsx`.

### Thông báo đẩy

`App\Notifications\ChatMessageNotification` qua kênh
`App\Notifications\Channels\WebPushChannel` (dùng lại `WebPushGateway` + khoá VAPID
+ `public/sw.js` sẵn có). Chỉ gửi khi người nhận có đăng ký đẩy; đăng ký đã chết
thì xoá. Payload: tên người gửi, xem trước 120 ký tự, `tag = chat-{id}`, URL
`/chat/c/{id}`.

### Chưa có code (đang dựng)

- **Nhóm:** mới có hằng `Chat::KIND_GROUP`, vai trò trong `ChatMember` và bảng
  `conversation_invite_links`; chưa có service, route hay giao diện tạo nhóm, mời,
  đổi quyền, rời, giải tán.
- **Tin không phải chữ:** `POST .../messages` chỉ nhận `content`; presenter trả
  `attachments: []`. Ảnh/file, sticker, thẻ chuyển khoản VietQR, cảm xúc, sửa,
  thu hồi chưa có đường ghi. Khi thêm: đi qua `ChatMessageSender::send()` và phát
  `chat.message.updated` qua `ChatBroadcaster`, không mở đường thứ hai.
- **Đã xem trong nhóm**, ghim, lưu trữ, tắt thông báo theo hội thoại: cột đã có
  ở `conversation_members`, chưa có route.
- **Ký + mã hoá request** cho route chat (mục 10).
