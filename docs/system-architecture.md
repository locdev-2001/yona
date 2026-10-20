# Kiến trúc hệ thống Yona

Nguồn chuẩn cho các quyết định kiến trúc đang có hiệu lực. Đổi một quyết định ở
đây thì sửa file này cùng commit với code. Quyết định giao diện nằm ở
[ux-decisions.md](ux-decisions.md), triển khai production ở
[deployment.md](deployment.md).

> **Hiện trạng 19/10/2026:** Yona là hộp thư cá nhân đa kênh. Mỗi người dùng có
> một account cá nhân (người đó làm quản trị) chứa hộp thư; Zalo cá nhân,
> Gmail/email và người dùng Yona khác đều là **kênh** của hộp thư đó. Chat giữa
> người dùng là kênh `Channel::Yona` (mục 11), không có lõi chat riêng. Phần chỉ
> dành cho đội ngũ doanh nghiệp (team, báo cáo, chiến dịch, automation, widget,
> Help Center) ẩn khỏi menu nhưng code và route còn chạy; không xây thêm trên
> chúng.

## 1. Stack

PHP 8.3+ / Laravel 13 · Inertia + React 19 (TypeScript), Tailwind + Radix ·
PostgreSQL (`pg_trgm`) · Redis (cache, queue, session) · Laravel Reverb
(WebSocket) · bridge Node cho Zalo cá nhân (`services/zalo-bridge`, zca-js, đăng nhập QR).

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

## 3. Kênh nhắn tin: lõi trung tính, đặc thù ở driver

> Mọi nguồn tin của hộp thư cá nhân (Zalo cá nhân, Gmail/email, người dùng Yona
> và các kênh khác) đi qua khung này. Kênh Yona là một driver như mọi driver
> khác: xem mục 11.

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
  hoặc `ConversationBuilder`.
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
  bắt đầu trả 404 cho hộp mới); Email hiện chỉ mở đăng nhập Google. Phương thức kết nối phải khớp năng lực
  phiên khai ở `CapabilitySet` (`session_qr`/`session_oauth`/`session_token`).
  SMS (Bandwidth, Twilio SMS) đóng có chủ đích; dữ liệu và hộp thư cũ giữ nguyên.
- **Kiểm thông tin đăng nhập khi lưu**: `InboxesController` dựng kênh (chưa lưu)
  rồi gọi `ChannelCredentialsCheck` — bảng tra driver → verifier
  (`VerifiesChannelCredentials`): Email thử IMAP/SMTP qua `MailServerProbe`,
  Telegram gọi `getMe`,
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
- **Năng lực là lời hứa:** kênh khai năng lực nào (`inbound_image/sticker/file/
  video/audio/location/contact_card/reply_to/forward`, `event_delivered/seen/
  reaction/recall`, `outbound_*`, `settings_single_conversation`) thì phải làm được
  đúng việc đó; repo không còn test tự động, nên kiểm bằng dùng thật trên giao
  diện khi thêm hoặc đổi kênh. **Thêm kênh = viết parser; thêm loại tin = thêm
  giá trị, không sửa kênh nào.**

### Tin nhắn có cấu trúc và hạ cấp theo kênh

Tin có cấu trúc là `content_type` + `content_attributes`, vẽ native từ payload.
Từ 19/10/2026 chỉ còn **một loại: thẻ chuyển khoản VietQR** (`bank_transfer`);
các loại thẻ sản phẩm, đặt mua, tra đơn, form, nút, trả lời nhanh, bài viết, mở
trang, chọn lịch và trang công khai `/m/{token}` đã gỡ (bảng `message_access_tokens`
còn nằm trong DB, không còn code dùng).

**Lõi (một nguồn cho mọi mặt tiền):**
- `app/Messaging/Structured/`: mỗi loại tin là một class `StructuredType`
  (`rules()`, `normalize()`, `plainText()`, `previewText()`, `choices()`),
  đăng ký ở `config/messaging.php` → `structured_types`.
  `StructuredTypeRegistry::prepare()` kiểm và chuẩn hoá lúc tạo tin (API trả 422
  kèm lý do); `read()` đọc lại payload đã lưu (`PayloadContext::$fromStorage`).
  Số tài khoản, mã VietQR của thẻ chuyển khoản dựng từ `PaymentAccount` lúc gửi và
  giữ nguyên bản chụp khi đọc lại.
- `resources/js/shared/messaging/`: message kit dùng chung widget và hộp thư. Mỗi
  loại một file trong `types/` + một dòng trong `index.ts`. Mặt tiền quyết side
  effect qua `MessageHost`.
- **Thêm một loại tin:** một class PHP + một dòng config, một file TS + một dòng
  `index.ts`. Không sửa lõi, không thêm nhánh `content_type` ở adapter hay giao diện.

**Hạ cấp theo kênh** (`app/Messaging/Delivery/DeliveryPlanner`, nơi duy nhất quyết
định; `SendOn*Service` chỉ hỏi planner rồi gửi): kênh có renderer gốc
(`config/messaging.php` → `delivery_renderers`, hiện rỗng) gửi `native`; còn lại
gửi chữ thuần (`text`), lựa chọn (nếu loại tin có) thành danh sách đánh số
(`text_numbered`). Log `messaging.delivery.degraded`.

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

- Hộp thư cá nhân dùng chung khung realtime của hộp thư: tin kênh Yona đến hộp
  thư người nhận cũng phát như tin đến của mọi kênh.
- Laravel Reverb + Echo. Sự kiện đẩy qua `app/Events/RealtimeBroadcast.php`
  (`ShouldBroadcastNow`, kênh private).
- Mỗi người dùng nghe hai kênh: `account_{id}` (chung account) và kênh mang
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

## 6. Sự kiện nghiệp vụ

- Tên sự kiện là enum `app/Events/EventType.php` (`message.created`,
  `conversation.status_changed`…). Chuỗi đó vừa là tên client Echo nhận
  (`broadcastAs()`), vừa là tên sự kiện webhook gửi ra ngoài ⇒ là **contract
  công khai**, không đổi tên.
- Listener ở `app/Listeners/*` (realtime, webhook, automation, thông báo, báo
  cáo, CSAT…).

## 7. Dữ liệu

- `display_id` của hội thoại (và chiến dịch) tăng riêng theo từng account bằng
  trigger PostgreSQL + sequence per-account (`conv_dpid_seq_<account_id>`), tạo
  lúc thêm account.
- Cờ tính năng: cột jsonb `accounts.feature_flags`; danh mục cờ ở
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

## 9. Contract công khai: SDK nhúng và webhook

> SDK widget và webhook đã ẩn khỏi menu của hộp thư cá nhân nhưng code còn chạy.
> Nếu sau này gỡ, contract ngoài phải được xử lý có chủ đích (tắt hẳn hoặc trả
> lỗi rõ ràng), không xoá lặng lẽ.

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

> Kênh Yona dùng chung route gửi tin của hộp thư nên đi qua cùng lớp ký + mã hoá
> và giới hạn nhịp dưới đây; route mở hội thoại Yona mới
> (`POST /api/v1/accounts/{account}/yona/conversations`) chỉ có `throttle:60,1`.

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
  `resources/js/shared/requestSigning/vectors.json` dùng chung.
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

## 11. Kênh Yona: nhắn tin giữa người dùng trong hộp thư cá nhân

Người dùng Yona nhắn cho nhau qua một **kênh** của hộp thư, không qua lõi chat
riêng (lõi `Chat*`/`/chats` cũ đã gỡ). Mọi thứ ở mục 3 áp dụng nguyên vẹn: kênh
Yona khai năng lực, có service gửi, có hành động ra ngoài, và tin đến đi qua
đường vào chung.

### Hộp thư cá nhân

- **Mỗi người dùng một account**, người đó làm quản trị
  (`App\Services\Users\PersonalAccounts`: `ownedBy()`, `ensureFor()` tạo account
  qua `AccountBuilder` nếu chưa có). Không đổi tên bảng: account chính là hộp thư
  cá nhân.
- **Mỗi account đúng một hộp thư kênh Yona**
  (`App\Services\Yona\YonaInboxes::ensureFor()` / `ensureForAccount()`), tạo kèm
  bản ghi `channel_yona`. `ownerOf(Inbox)` trả người dùng quản trị của account,
  tức chủ hộp thư.
- **Đăng ký:** `App\Services\Users\PersonalSignUpService` (form và Google cùng một
  lối) tạo user rồi gọi `YonaInboxes::ensureFor()`. Người dùng cũ chưa có account
  được tạo khi mở `/app` (`App\Http\Controllers\App\DashboardController::index`).
- **Quyền vào:** `App\Http\Middleware\SetCurrentAccount` chỉ nhận account mà
  người dùng làm quản trị (`AccountUser::ROLE_ADMINISTRATOR`); dòng thành viên cũ
  ở account người khác vẫn trong DB nhưng trả 404. `userAccounts` chia sẻ cho
  giao diện cũng chỉ gồm các account đó.
- **`@username` bắt buộc:** middleware `EnsureUsername` gắn trên `/app`, `/chat`
  và nhóm `/app/accounts/{account}`; chưa có username thì về `/chat/welcome`. Tìm
  người theo username: `App\Services\Users\UserDirectory`
  (`GET /api/v1/users/search`); chuẩn hoá username: `App\Services\Users\Username`.

### Driver kênh

- **Model** `App\Models\Channel\Yona` (bảng `channel_yona`, `channel_type` của
  hộp thư là `Channel::Yona`). Khai `DeclaresCapabilities` (chữ, ảnh, video, âm
  thanh, file, sticker, trả lời trích dẫn, cảm xúc, thu hồi, chuyển tiếp đến, mở
  hội thoại chiều đi; định dạng Markdown), `DeclaresPlatform`, `AddressesContacts`.
  `connection()` khai `available(false)`: kênh có sẵn cho mọi hộp thư, không mở
  từ màn "Thêm kênh".
- **Định danh:** liên hệ của kênh là một người dùng Yona khác, `source_id` =
  `yona:{user_id}` (`Yona::contactSourceIdFor()`, `userIdFromSourceId()`). Tin
  được chuyển mang `source_id` = `yona-msg:{id}` ở **cả hai** hộp thư, nên trả lời,
  cảm xúc, thu hồi tra được tin tương ứng bên kia.
- **Gửi:** `SendReplyJob::CHANNEL_SERVICES['Channel::Yona']` →
  `App\Services\Yona\SendOnYonaService` (kế thừa `BaseSendOnChannelService`) →
  `YonaRelay::deliver()`.
- **Hành động ra ngoài:** `ChannelActionRegistry` đăng ký
  `App\Services\Yona\YonaOutboundActions` (cảm xúc, thu hồi; đang gõ chưa chuyển).

### Chuyển tin giữa hai hộp thư: `App\Services\Yona\YonaRelay`

- `deliver(Message)`: tìm hộp thư Yona của người nhận (`counterpartInbox()` đọc
  `user_id` từ `source_id` của liên hệ), dựng `InboundMessage` (chữ, sticker, đính
  kèm dạng URL ngoài, trả lời trích dẫn theo `source_id` tin gốc) rồi ghi qua
  `InboundMessageWriter::write()`, tức đường vào chung của mọi kênh (mục 3, "Tin
  đến và sự kiện"). Người gửi xuất hiện bên kia là `InboundSender` mang tên, ảnh và
  `@username`. Sau đó gán `source_id` cho tin gốc.
- `react()` / `recall()`: phát `ReactionEvent` / `RecallEvent` vào hộp thư bên kia
  qua `MessageEventService::apply()`.
- `openWith(Account, User)`: mở (hoặc lấy lại) hội thoại với một người dùng trong
  hộp thư Yona của mình, qua `ContactInboxWithContactBuilder` +
  `IncomingConversationResolver::resolve()`.

### Route

| Route | Ghi chú |
|---|---|
| `POST /api/v1/accounts/{account}/yona/conversations` (`user_id`) | `App\Http\Controllers\WebApi\YonaConversationsController`: mở hội thoại với người dùng đó, trả `display_id`; từ chối nhắn cho chính mình (throttle 60/phút) |
| `GET /api/v1/users/search?q=` · `GET /api/v1/usernames/availability?username=` | Tìm người, kiểm username còn trống (throttle 60/phút) |
| `GET/POST /chat/welcome` · `GET /chat/profile` | Chọn username · hồ sơ (`resources/js/chat/Profile.tsx`) |
| `GET /chat` | Chuyển về `/app` |

Còn lại (danh sách hội thoại, gửi tin, cảm xúc, thu hồi, đính kèm) dùng route
hộp thư sẵn có. Giao diện mở hội thoại mới:
`resources/js/dashboard/conversation/people/NewYonaChatDialog.tsx`.

### Nhóm giữa người dùng Yona (luồng dùng chung)

- **Lưu:** mỗi nhóm có một account ẩn (`yona_groups.account_id`, không ai làm quản
  trị nên `SetCurrentAccount` không mở được) với hộp thư Yona và **một hội thoại gốc**
  (`yona_groups.conversation_id`) giữ mọi tin của nhóm. Mỗi thành viên có một dòng
  hội thoại trong hộp thư Yona của mình (`yona_group_members.conversation_id`,
  `conversations.thread_conversation_id` trỏ về gốc). Liên hệ đại diện nhóm có
  `source_id` = `yona-group:{id}` ở mọi account; `Yona::userIdFromSourceId` chỉ nhận
  tiền tố `yona:` nên không nhầm nhóm thành người.
- **Luật đọc ở một chỗ:** `App\Models\Concerns\SharesThread` (trait của
  `Conversation`). `visibleMessages()` = tin của dòng mình (ghi chú riêng, hoạt động)
  UNION ALL tin của hội thoại gốc tới `left_at`; `messagesNewestFirst`,
  `unreadMessages`, `lastNonActivityMessage`, `MessageFinder` đều đi qua đây.
  `presentMessage()` → `Message::seenFrom()` dựng bản trình bày mang hội thoại,
  account, hộp thư của dòng người xem, và tin người khác gửi thành `incoming`. Bản
  trình bày không lưu được (`presentedIn`).
- **Chưa đọc:** `Conversation::unreadMessagesCountSql()` là SQL duy nhất; với dòng nhóm
  đếm tin gửi đi của người khác trong hội thoại gốc sau `agent_last_seen_at` của dòng
  đó. `preloadUnreadIncomingMessagesCounts` dùng lại chính SQL này.
- **Ghi:** `MessageBuilder` gọi `messageTargetFor()`: tin riêng tư ở lại dòng mình, tin
  gửi đi vào hội thoại gốc; người đã rời bị từ chối. Tin mới đẩy `last_activity_at`
  của gốc và mọi dòng thành viên trong một câu UPDATE (`Message::setConversationActivity`).
- **Realtime:** `ActionCableListener` phát như thường cho hội thoại gốc rồi đẩy
  `SharedThreadBroadcastJob` (queue `critical`): mỗi thành viên còn trong nhóm nhận
  `message.created/updated` với payload theo dòng của họ. Tin mới (không phải hoạt động)
  của người khác mở lại dòng đã đóng/tạm ẩn của thành viên qua
  `Conversation::reopenForNewMessage()` (cùng luật tin đến 1-1), phát
  `conversation.status_changed`; dòng của người gửi giữ nguyên.
- **Tìm kiếm:** scope `Conversation::threadViewsOf()` (trong `SharesThread`) cho dòng nhóm
  của account người tìm; mỗi dòng thành một `App\Search\ThreadWindow` (hội thoại gốc +
  mốc `left_at`) gửi xuống engine qua `SearchQuery::$threadWindows`. Engine chỉ cộng
  thêm `conversation_id = gốc [AND created_at <= left_at]` vào phạm vi account/hộp thư
  (pgsql: `ThreadWindow::orWhereVisible`, Meilisearch: filter OR, không đổi chỉ mục).
  `SearchService` map kết quả về dòng của người tìm (`presentMessage`), ô tìm danh sách
  gộp ghi chú riêng và tin chung về một dòng.
- **Account ẩn ở Super Admin:** `Account::scopePersonal()` / `Account::wherePersonal()`
  loại account có trong `yona_groups.account_id` khỏi mọi chỉ số, danh sách account,
  tìm kiếm admin. Mở account ẩn theo id (`/admin/accounts/{id}`) vẫn được để điều tra.
- **Nghiệp vụ:** `App\Services\Groups\GroupService` (tạo, thêm, rời, đưa ra, vai trò,
  đổi tên, link mời) + `GroupPermissions` (thành viên, quản trị, ai thu hồi được tin
  chung). Lỗi trả `GroupActionRejected` → `{error, code}`. Mỗi thay đổi thành viên để
  lại tin hoạt động trong hội thoại gốc, rồi (sau commit) báo `conversation.updated` tới
  dòng nhóm của mọi thành viên để tên, số thành viên, vai trò đổi ngay; đổi tên đi qua
  model `Contact` nên mọi hộp thư nhận `contact.updated`. Trần `YonaGroup::MAX_MEMBERS` = 500. Link mời
  dùng chung trait `InviteToken` với `AccountInviteLink`.
- **Danh bạ nhóm:** `YonaGroupMembers` đăng ký ở `ChannelActionRegistry::GROUP_MEMBER_DRIVERS`.

| Route | Ghi chú |
|---|---|
| `POST /api/v1/accounts/{account}/yona/groups` (`name`, `user_ids[]`) | Tạo nhóm; trả nhóm theo góc nhìn người tạo, `conversation_id` là dòng của họ |
| `GET/PATCH /api/v1/accounts/{account}/yona/groups/{id}` | Xem kèm thành viên · đổi tên (quản trị) |
| `POST /…/yona/groups/{id}/members` · `PATCH/DELETE /…/members/{userId}` | Thêm bạn bè · đổi vai trò · đưa ra (xoá chính mình = rời) |
| `GET/POST /…/yona/groups/{id}/invite_links` · `DELETE /…/invite_links/{linkId}` | Link mời (quản trị); token chỉ trả lúc tạo; tạo link mới thu hồi mọi link cũ (mỗi nhóm một link đang dùng) |
| `GET /api/v1/group_invites/{token}` · `POST /api/v1/group_invites/{token}/accept` | Xem trước · tham gia bằng link |
| `GET /g/{token}` · `POST /g/{token}` | Trang mở link mời (`Chat\GroupInvitesController`, trang `v3/views/groups/invite/Index`): ai cũng xem được; khách được giữ `url.intended` để đăng nhập/đăng ký xong quay lại; tham gia xong tải lại trọn trang vào hội thoại nhóm |
| `GET /api/v1/users/search?scope=friends` | Tìm trong bạn bè, ô tìm trống trả luôn danh sách bạn bè (chọn người thêm vào nhóm) |

**Giao diện:** payload hội thoại có `group` (`YonaGroupResource::summaryFor`: id, tên,
`avatar_url`, `avatar_seed`, `avatar_members` tối đa 3 người, số thành viên, `my_role`, null khi
đã rời; danh sách nạp sẵn `threadMembership.group.avatarMembers` + `.avatar` theo lô). Ảnh nhóm:
NULL = ghép ảnh thành viên (`Avatar` chế độ `stack` → `shared/avatar/AvatarStack`); quản trị tự
tạo hình khối bằng `shared/avatar/AvatarEditor` (trong `AvatarPickerDialog`), lưu tên dựng hình
`avatar_seed` + các trục đã ghim `avatar_traits` (jsonb, kiểm hình dạng ở `App\Support\GeneratedAvatarConfig`,
danh sách trục ở `shared/avatar/avatarEditorAxes.ts`, khớp bản blobatar đang cài) qua `PATCH
/…/yona/groups/{id}` (`GroupService::changeAvatar`, `null` để quay về ảnh ghép), hoặc tải ảnh từ
máy qua `POST /…/yona/groups/{id}/avatar` (`GroupService::uploadAvatar`). Ảnh tải lên lưu như
avatar người dùng: `YonaGroup` dùng `Avatarable` (bảng `attachments`, morph `YonaGroup`, disk
`public`), trình duyệt cắt vuông giữa và thu về 512px (`shared/avatar/squareAvatarImage`) trước
khi gửi; có ảnh thì ảnh thắng hình khối, chọn lại hình khối thì gỡ ảnh. Mỗi lần đổi đều ghi tin
hoạt động và làm mới dòng nhóm của mọi thành viên. Cột `yona_groups.avatar_path` bỏ trống. Một
chỗ quyết định: `conversationAvatar` (trả `src`, `seed`, `stack`). Tin nhóm của người khác mang
`content_attributes.sender` (`external_id`, `name`, `avatar`, `avatar_seed`) như tin nhóm
mọi kênh, nên bong bóng, trích dẫn, cảm xúc, dòng xem trước dùng chung đường hiển thị
nhóm sẵn có. Tạo nhóm và thêm bạn dùng `shared/people/PickPeopleDialog` (bọc
`PeoplePicker`, chế độ `friendsOnly`); panel phải của dòng nhóm là
`conversationbox/group/GroupInfo` thay cho khối hồ sơ người. Dòng nhóm đã rời:
`canReply()` false, chỉ còn ghi chú riêng.

### Chưa có

- **Mô tả nhóm, giải tán nhóm:** chưa có. Ảnh tải lên chỉ cắt vuông giữa tự động, chưa có khung cắt kéo tay.
- **Quay về link mời sau khi đăng ký mới:** `url.intended` giữ qua đăng nhập và màn chọn
  `@username`, nhưng đăng ký bằng email phải xác minh email trước nên có thể mất mốc này.
- **Tìm theo tên người gửi trong nhóm Yona:** tìm theo người gửi thật
  (`GROUP_SENDER_NAME_SQL`) chỉ áp cho nhóm của kênh ngoài; tin nhóm Yona tìm theo nội
  dung và tệp. Đếm tin vào/ra ở chỉ số Super Admin vẫn tính tin chung của nhóm (một bản).
- **Gọi 1-1 có đổ chuông, meeting:** chưa có (mục 12 đã chừa chỗ). Phòng thoại nhóm đã có.
- **Tin chờ và chặn cho người lạ** trên kênh Yona: chưa có; ai biết username đều
  mở được hội thoại.
- **Đang gõ, đã xem** giữa hai hộp thư Yona: `YonaOutboundActions::typing()` rỗng,
  kênh không khai năng lực tương ứng.
- **Sửa tin** trên kênh Yona: kênh không khai năng lực sửa.

## 12. Cuộc gọi: lõi trung tính, module dùng lõi, nhà cung cấp media là driver

Ba tầng, mỗi tầng chỉ biết tầng ngay dưới:

1. **Module dùng lõi** (theo chức năng): phòng thoại nhóm ở `App\Services\Groups\Calls`
   (`GroupRooms` + `GroupRoomPolicy`); gọi 1-1 và meeting sẽ là module anh em. Module tự
   tạo dòng `calls` của mình và khai luật của loại đó.
2. **Lõi `App\Services\Calls`**: không biết nhóm, 1-1, meeting hay nhà cung cấp nào.
   `CallService` (cấp phép, mở phòng, cấp vé, điều hành), `CallPresenceRecorder` (ghi vào/ra
   từ sự kiện phòng), sổ loại cuộc gọi `Kinds\CallKinds`.
3. **Driver media** `App\Services\Calls\Media\LiveKit` sau các contract `Media\*`.

```
GroupRooms (module nhóm) ─► CallService ─► CallKinds ─► CallPolicy / CallTrail của module
                                │                        (config/calls.php `kinds`)
                                └─► MediaRooms · MediaTickets · MediaModeration ◄─ LiveKitDriver
POST /webhooks/media/{provider} ─► MediaDrivers ─► MediaWebhooks ─► RoomEvent ─► CallPresenceRecorder
                                                                                 └─► CallTrail
```

- **Loại cuộc gọi = một dòng sổ:** `config/calls.php` `kinds` map `calls.kind` →
  `policy` (`Kinds\CallPolicy`: trần người, `admit`, ai điều hành), `trail`
  (`Kinds\CallTrail`, tuỳ chọn: phòng bắt đầu/kết thúc thì để lại tin hệ thống hay lịch
  sử) và `presence` (`Kinds\CallPresenceObserver`, tuỳ chọn: người vào/ra, bật/tắt chia sẻ
  màn hình thì module tự đẩy cập nhật). Lõi không có `if` theo loại. Thêm loại = một module
  + một mục sổ.
- **Phòng nhóm (module `App\Services\Groups\Calls`):** `GroupRoomPolicy` (≤25, quản trị
  nhóm điều hành), `GroupRoomTrail` (tin "X đã mở phòng thoại" khi người đầu tiên vào, tin
  "Phòng thoại đã kết thúc · thời lượng · số người" khi phòng đóng; phòng không ai vào thì
  không ghi; viết theo ngôn ngữ account của nhóm vì sự kiện đến từ webhook; đi qua
  `GroupService::postNotice`, `content_attributes.call`), `GroupRoomPresence` → job
  `BroadcastGroupVoiceRoomJob` (duy nhất theo nhóm tới khi chạy, trễ 2 giây để gom; đẩy
  `voice_room.updated` tới từng thành viên với `account_id`/`conversation_id` của dòng họ).
  `GroupRoomSummaries` dựng ảnh chụp `voice_room` (người đang ngồi, ai chia sẻ màn hình, mở
  từ lúc nào) kèm `as_of`, cache theo nhóm (dòng nhóm của mọi thành viên dùng chung một lần
  tính) và xoá khi trong phòng có thay đổi; gắn vào `group` trong payload hội thoại
  (`voice_room`, `voice_room_as_of`) và vào sự kiện `voice_room.updated` (mỗi thành viên một
  `ActionCableBroadcastJob`).
- **Phòng bắt đầu = người đầu tiên vào**, không phải lúc nhà cung cấp mở phòng trống.
- **Đối soát khi mất webhook:** `ReconcileCallsJob` (mỗi phút, chỉ khi đã cấu hình) →
  `Calls\CallReconciler` so người đang ngồi trong DB với người đang kết nối ở nhà cung cấp và
  đưa chỗ lệch qua `CallPresenceRecorder` như sự kiện thường: thiếu dòng thì ghi vào, dòng thừa
  (quá 30 giây) thì ghi rời, phòng trống quá 90 giây thì ghi kết thúc.
- **Ai đang chia sẻ màn hình:** `Calls\ScreenShares` giữ trong cache từ sự kiện
  `TrackPublished/Unpublished` nguồn `screen` (schema không lưu trạng thái nguồn phát).
- **Phòng đầy:** `CallService::join` đếm người đang ngồi, đủ trần thì từ chối trước khi cấp
  vé (`CallActionRejected` `ROOM_FULL`, 409); nhà cung cấp vẫn chặn ở `maxParticipants`.
- **Bật/tắt theo cấu hình:** `MediaDriver::isConfigured()`; `MediaDrivers::defaultIsConfigured()`
  ra `globalConfig.callsEnabled` (HandleInertiaRequests), thiếu thì giao diện ẩn mọi nút gọi.
- **Vé mang thông tin hiển thị:** `TicketRequest::$attributes` (ảnh đại diện), driver LiveKit
  ghi vào claim `attributes`.
- **Người vào phòng trung tính:** `CallAttendee` = định danh + tên hiển thị + `User` nếu có.
  `ParticipantIdentity` là `user:{id}` hoặc `guest:{key}` (khách không tài khoản), lõi tự
  dựng và tự đọc. Điều hành nhắm vào định danh, nên đưa được cả khách ra.
- **Cấp phép là bước riêng:** `CallService::admit` hỏi chính sách, trả `Admission` được vào
  (kèm `ParticipantPermissions`) hoặc chờ duyệt (phòng chờ); bị từ chối thì chính sách ném
  lỗi. Chờ duyệt thì `CallJoin` không có vé (`awaiting_approval`). Module gọi `admit` trước
  khi tạo dòng `calls` để người không có quyền không mở được phòng.
- **Thoại, video, chia sẻ màn hình là quyền phát nguồn** (`Media\MediaSource`: microphone,
  camera, screen, screen_audio), không phải ba hệ thống. Chính sách quyết định ai phát gì.
- **Chọn nhà cung cấp:** `config/calls.php` (`provider` = `MEDIA_PROVIDER`, `drivers`).
  `AppServiceProvider` gắn `MediaRooms`/`MediaTickets`/`MediaModeration` vào driver đang
  chọn. Thêm nhà cung cấp = một driver cài `MediaDriver` + một dòng `drivers`.
- **Một dòng `calls` = một đời phòng.** Tên phòng phía nhà cung cấp là `calls.uuid`.
  `GroupRooms` dùng phòng nhóm đang mở hoặc tạo dòng mới (index một phòng mở mỗi nhóm chặn
  hai dòng khi hai người mở cùng lúc). `CallService::join` gọi `MediaRooms::open` (gọi lại an
  toàn, phòng phía nhà cung cấp lỡ đóng thì tự mở lại) rồi cấp vé 1 giờ. Phòng chưa ai vào
  đóng sau 60 giây, người cuối rời thì đóng sau 20 giây; lần vào sau mở dòng mới. "Phòng
  luôn mở" là khái niệm giao diện, không phải một phòng media sống mãi.
- **Ai đang trong phòng chỉ ghi từ sự kiện phòng**, không từ client: `CallPresenceRecorder`
  ghi `call_participants`, `started_at`, `ended_at`, `peak_participants`, khoá dòng `calls`,
  chịu được sự kiện gửi lại/lệch thứ tự; người đầu tiên vào cũng đánh dấu phòng đã bắt đầu
  (sự kiện bắt đầu có thể mất). Sau commit gọi `CallTrail` của loại. Khách chưa lưu được vì
  `call_participants.user_id` bắt buộc.
- **Vé không mang quyền điều hành:** không kênh dữ liệu (chat trong phòng đi qua hội thoại),
  không quyền quản trị phòng; tắt mic/đưa ra chỉ đi từ máy chủ qua `CallService::mute`/`remove`.
- **Driver LiveKit:** token HS256 ký bằng `firebase/php-jwt` (`iss` = API key, `sub` =
  identity, `name`, grant `video` có `room`, `roomJoin`, `canPublish`, `canPublishSources`,
  `canSubscribe`, `canPublishData`). API phòng qua Twirp JSON
  `POST {LIVEKIT_URL→http}/twirp/livekit.RoomService/{Method}` với token ngắn hạn mang
  `roomCreate` hoặc `roomAdmin`; tắt mic = tìm track theo nguồn rồi `MutePublishedTrack`.
  Webhook: header `Authorization` là JWT ký bằng API secret, claim `sha256` =
  base64(sha256(thân thô)); thân là protojson. Sai chữ ký → 401, nhà cung cấp lạ → 404.
- **Local:** `make livekit` (hoặc `make up`, launch.json `livekit`) chạy
  `services/livekit/dev.sh`: cổng `LIVEKIT_PORT` (8613), RTC TCP 7881, UDP 50000–50100, key
  và địa chỉ webhook (`APP_URL/webhooks/media/livekit`) đọc từ `.env`. `room.auto_create: false`:
  phòng chỉ mở qua `CreateRoom` (trần người, hẹn giờ đóng), vé cũ không dựng lại được phòng đã
  đóng; production phải đặt giống vậy.

| Route | Ghi chú |
|---|---|
| `GET /api/v1/accounts/{account}/yona/groups/{id}/call` | Phòng đang mở của nhóm (`voice_room`, null khi không ai ngồi) |
| `POST /api/v1/accounts/{account}/yona/groups/{id}/call` (`media`: audio\|video) | Vào phòng thoại nhóm (mở nếu chưa có); trả `call`, `ticket` (`server_url`, `token`, `expires_at`; null khi chờ duyệt), `awaiting_approval`; đầy thì 409 |
| `POST /…/yona/groups/{id}/call/participants/{userId}/mute` · `DELETE /…/call/participants/{userId}` | Quản trị nhóm tắt mic · mời ra khỏi phòng |
| `POST /webhooks/media/{provider}` | Sự kiện phòng từ nhà cung cấp, không session; driver tự kiểm chữ ký |

**Giao diện cuộc gọi (hai tầng):**
- `resources/js/dashboard/calls/`: giao diện trung tính, không biết LiveKit. Kiểu hiển thị
  `types.ts`, phiên gọi qua `useCallSession()` (`callSession.ts`), phòng đang mở của từng
  nhóm qua `useOpenRoom()` (`voiceRooms.ts`, nhận `voice_room.updated` từ realtime, mỗi thẻ
  chỉ đọc nhóm của mình). Thành phần: `VoicePanel` (đáy thanh bên), `CallBar` (điện thoại),
  `CallStage` + `CallTile` + `CallControls` + `DevicePicker` (màn phòng), `CallMiniPlayer`,
  `OpenRoomIndicator` + `OpenRoomPeople` (thẻ danh sách), `GroupRoomButton` (mũ khung chat),
  `CallActivityJoin` (nút dưới tin mở phòng).
- `resources/js/calls/`: **chỗ duy nhất import LiveKit** (`livekit-client`,
  `@livekit/components-react`, khoá phiên bản). `CallSessionProvider` gắn ở gốc app qua
  `children` của Inertia `App` (`resources/js/app.tsx`), nên chuyển trang không rớt phòng;
  `LiveKitSession` tải lười (chunk riêng) chỉ khi vào phòng, dịch người trong phòng sang kiểu
  trung tính, phát âm thanh phòng (`RoomAudioRenderer`, tắt âm thanh phòng = `muted`), nhận
  lệnh bật/tắt mic, camera, màn hình, đổi thiết bị qua `MediaSessionHandle` (`mediaSession.ts`).

