# F2–F5 — Kênh ngoài, ghi chú backend (agent `f2f5-be`)

## HỢP ĐỒNG cho `f2f5-fe` (chốt, dùng ngay)

### Bảng kênh mới
Mọi kênh vào hệ thống qua `POST /api/v1/accounts/{accountId}/inboxes` như Website/Email
(`InboxesController::CHANNEL_TYPES`), **trừ Facebook** — Facebook có luồng callback riêng.

| `channel[type]` gửi lên | `channel_type` trả về (so trong `INBOX_TYPES`) | `inbox_type` (nhãn) |
|---|---|---|
| `facebook` | `Channel::FacebookPage` | `Facebook` |
| `instagram` | `Channel::Instagram` | `Instagram` |
| `telegram` | `Channel::Telegram` | `Telegram` |
| `line` | `Channel::Line` | `LINE` |
| `sms` | `Channel::Sms` | `Sms` |
| `twilio` | `Channel::TwilioSms` | `Twilio SMS` (medium sms) / `Whatsapp` (medium whatsapp) |
| `whatsapp` | `Channel::Whatsapp` | `Whatsapp` |
| `tiktok` | `Channel::Tiktok` | `Tiktok` |
| `twitter_profile` | `Channel::TwitterProfile` | `Twitter` |

### Payload tạo inbox từng kênh (khối `channel`, ngoài `name` bắt buộc)

```jsonc
// Telegram
{"name":"Bot bán hàng","channel":{"type":"telegram","bot_token":"123456:AAH…"}}      // bot_token bắt buộc

// LINE
{"name":"LINE OA","channel":{"type":"line",
  "line_channel_id":"1657…","line_channel_secret":"…","line_channel_token":"…"}}      // cả 3 bắt buộc

// SMS (Bandwidth)
{"name":"SMS","channel":{"type":"sms","phone_number":"+15551234567",
  "provider_config":{"account_id":"…","api_key":"…","api_secret":"…","application_id":"…"}}}

// Twilio SMS / WhatsApp
{"name":"Twilio","channel":{"type":"twilio","account_sid":"AC…","auth_token":"…",
  "phone_number":"+1555…",            // HOẶC messaging_service_sid, không dùng cả hai
  "messaging_service_sid":null,"medium":"sms","api_key_sid":null}}

// WhatsApp Cloud / 360dialog
{"name":"WhatsApp","channel":{"type":"whatsapp","phone_number":"+1555…",
  "provider":"whatsapp_cloud",        // 'default' = 360dialog
  "provider_config":{"api_key":"…","phone_number_id":"…","business_account_id":"…"}}}

// Instagram (đăng nhập Instagram trực tiếp)
{"name":"IG shop","channel":{"type":"instagram","instagram_id":"178…",
  "access_token":"IGQ…","expires_at":"2026-12-31T00:00:00Z"}}

// TikTok
{"name":"TikTok","channel":{"type":"tiktok","business_id":"…","access_token":"…",
  "refresh_token":"…","expires_at":"…","refresh_token_expires_at":"…"}}

// Twitter (chỉ khung)
{"name":"X","channel":{"type":"twitter_profile","profile_id":"…",
  "twitter_access_token":"…","twitter_access_token_secret":"…"}}
```

Thiếu khóa bắt buộc = **422**, thông báo theo `channel.<khóa>` (mỗi kênh tự khai trong
`channelRules()`, controller chỉ ghép tiền tố — thêm kênh không sửa controller).

### Facebook Messenger — luồng callback (KHÔNG qua `/inboxes`)
```
GET  /api/v1/accounts/{a}/callbacks/facebook_pages?omniauth_token=<token ngắn hạn>
     → { data: { page_details: [ { id, name, access_token, exists: bool }, … ] } }
POST /api/v1/accounts/{a}/callbacks/register_facebook_page
     body: { page_id, user_access_token, page_access_token, inbox_name }
     → { data: <InboxResource> }   (tự dò instagram_business_account, tự đặt avatar trang)
POST /api/v1/accounts/{a}/callbacks/reauthorize_page/{inboxId}
     body: { omniauth_token }      → { data: <InboxResource> } | 422
```

### Cột kênh FE cần đọc / hiển thị
`InboxResource` đã có sẵn `phone_number` và `messaging_service_sid` trong `SHARED_CHANNEL_KEYS`
(hiện `null` với kênh không có). **Chưa** thêm khóa riêng nào cho F2–F5 — nếu màn cấu hình cần
(`bot_name` của Telegram, `provider`/`provider_config` của WhatsApp, `tweets_enabled` của Twitter,
`instagram_id`…) thì báo lại, tôi thêm vào resource (đó là file dùng chung).

### Callback URL phải hiển thị cho người dùng đi khai báo bên nhà cung cấp
`APP_URL` = gốc; FE chỉ hiển thị, KHÔNG tự ghép logic ngoài bảng này.

| Kênh | URL |
|---|---|
| Telegram | `{APP_URL}/webhooks/telegram/{bot_token}` (Yona tự đăng ký khi tạo kênh — chỉ để tra cứu) |
| LINE | `{APP_URL}/webhooks/line/{line_channel_id}` |
| SMS (Bandwidth) | `{APP_URL}/webhooks/sms/{phone_number}` |
| WhatsApp | `{APP_URL}/webhooks/whatsapp/{phone_number}` (GET verify + POST events), verify token = `provider_config.webhook_verify_token` (server tự sinh cho `whatsapp_cloud`) |
| Instagram | `{APP_URL}/webhooks/instagram` |
| TikTok | `{APP_URL}/webhooks/tiktok` |
| Facebook Messenger | `{APP_URL}/bot` (verify token = `FB_VERIFY_TOKEN`) |
| Twilio (inbound) | `{APP_URL}/twilio/callback` |
| Twilio (trạng thái giao) | `{APP_URL}/twilio/delivery_status` |
| Twitter (CRC) | `{APP_URL}/webhooks/twitter` |

---

## Founder test tay với tài khoản thật

Webhook phải là URL **công khai HTTPS**: chạy `cloudflared tunnel --url http://localhost:8000`
(hoặc ngrok), rồi đặt `APP_URL` = domain tunnel và `php artisan config:clear`.

| Kênh | Biến `.env` | Các bước |
|---|---|---|
| Telegram | (không cần) | BotFather → `/newbot` lấy token → tạo inbox Telegram với token đó. Yona chưa tự gọi `setWebhook` khi tạo kênh (xem "Chưa port"), nên tự gọi: `curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=<APP_URL>/webhooks/telegram/<TOKEN>"` → nhắn cho bot |
| Facebook Messenger | `FB_APP_ID`, `FB_APP_SECRET`, `FB_VERIFY_TOKEN` | Meta App → Messenger → Webhooks: callback `<APP_URL>/bot`, verify token = `FB_VERIFY_TOKEN`, tick `messages`,`message_echoes`,`standby`. Lấy page token (Graph API Explorer) → `POST /callbacks/register_facebook_page` |
| Instagram | `INSTAGRAM_APP_SECRET`, `INSTAGRAM_VERIFY_TOKEN` (hoặc `IG_VERIFY_TOKEN`), `INSTAGRAM_API_VERSION` | Meta App → Instagram → Webhooks: `<APP_URL>/webhooks/instagram`, field `messages`. Tạo inbox với `instagram_id` + `access_token` từ Instagram Login |
| WhatsApp Cloud | `WHATSAPP_APP_SECRET`, `WHATSAPP_CLOUD_BASE_URL` | Meta App → WhatsApp → Configuration: callback `<APP_URL>/webhooks/whatsapp/<phone_number>`, verify token = `provider_config.webhook_verify_token` của kênh, subscribe field `messages` |
| Twilio SMS/WhatsApp | (không cần) | Console → số điện thoại → "A message comes in" = `<APP_URL>/twilio/callback`. Chữ ký kiểm bằng `auth_token` của kênh |
| SMS Bandwidth | (không cần) | Bandwidth Dashboard → Application → Inbound callback `<APP_URL>/webhooks/sms/<phone_number>` |
| LINE | (không cần) | LINE Developers → Messaging API → Webhook URL `<APP_URL>/webhooks/line/<line_channel_id>` |
| TikTok | `TIKTOK_APP_SECRET`, `TIKTOK_API_VERSION` | TikTok Business → Webhook `<APP_URL>/webhooks/tiktok`, sự kiện `im_receive_msg`,`im_send_msg` |
| Twitter | `TWITTER_CONSUMER_KEY/SECRET`, `TWITTER_ENVIRONMENT` | Chỉ CRC trả lời được; nhận/gửi DM chưa port |

---

## Bảng trace Ruby ↔ PHP

| Nguồn Chatwoot | Đích Laravel |
|---|---|
| `db/schema.rb` 9 bảng `channel_*` | `database/migrations/2026_09_06_997000_create_external_channel_tables.php` |
| `app/models/channel/{facebook_page,instagram,telegram,line,sms,twilio_sms,whatsapp,tiktok,twitter_profile}.rb` | `app/Models/Channel/{FacebookPage,Instagram,Telegram,Line,Sms,TwilioSms,Whatsapp,Tiktok,TwitterProfile}.php` |
| morph `Channel::*` | `AppServiceProvider::boot()` (9 dòng) |
| `channel_type_from_params` | `InboxesController::CHANNEL_TYPES` (9 dòng) |
| `Base::SendOnChannelService` | `app/Services/Channels/BaseSendOnChannelService.php` |
| khối `set_conversation` lặp trong mọi incoming service | `app/Services/Channels/IncomingConversationResolver.php` |
| `message.external_error` (store_accessor trên `content_attributes`) | `app/Services/Channels/ChannelMessageStatus.php` |
| gem `Down` (tải tệp từ URL nhà cung cấp) | `app/Services/Channels/RemoteAttachmentDownloader.php` (+ `Attachment::storeContents`) |
| `Telegram::{IncomingMessageService,ParamHelpers,SendOnTelegramService,SendAttachmentsService}` + HTTParty trong model | `app/Services/Telegram/{IncomingMessageService,ParamHelpers,SendOnTelegramService,TelegramClient}.php` |
| `Line::{IncomingMessageService,SendOnLineService}` + gem line-bot-sdk | `app/Services/Line/{IncomingMessageService,SendOnLineService,LineClient}.php` |
| `Sms::{IncomingMessageService,DeliveryStatusService,SendOnSmsService}` + HTTParty trong model | `app/Services/Sms/{IncomingMessageService,DeliveryStatusService,SendOnSmsService,BandwidthClient}.php` |
| `Twilio::{IncomingMessageService,DeliveryStatusService,SendOnTwilioService}` + gem twilio-ruby | `app/Services/Twilio/{IncomingMessageService,DeliveryStatusService,SendOnTwilioService,TwilioClient}.php` |
| `Whatsapp::IncomingMessageBaseService` + `IncomingMessageWhatsappCloudService` + helpers | `app/Services/Whatsapp/IncomingMessageService.php` (một lõi, `processedParams()` gánh khác biệt) |
| `Whatsapp::Providers::{BaseService,WhatsappCloudService,Whatsapp360DialogService}` | `app/Services/Whatsapp/Providers/{WhatsappProvider,BaseWhatsappService,WhatsappCloudService,Whatsapp360DialogService}.php` |
| `Whatsapp::SendOnWhatsappService` | `app/Services/Whatsapp/SendOnWhatsappService.php` |
| `Tiktok::{MessageService,MessagingHelpers,SendOnTiktokService,Client}` | `app/Services/Tiktok/{MessageService,SendOnTiktokService,TiktokClient}.php` |
| `Integrations::Facebook::{MessageParser,MessageCreator}` (lib/) | `app/Services/Facebook/{MessageParser,MessageCreator}.php` |
| `Facebook::SendOnFacebookService` + gem koala/facebook-messenger | `app/Services/Facebook/{SendOnFacebookService,FacebookGraphClient}.php` |
| `Instagram::{WebhooksBaseService,BaseMessageText,MessageText,BaseSendService,SendOnInstagramService}` | `app/Services/Instagram/{MessageTextService,InstagramProfileFetcher,SendOnInstagramService}.php` |
| `Messages::Messenger::MessageBuilder` | `app/Builders/Messages/Messenger/BaseMessageBuilder.php` |
| `Messages::Facebook::MessageBuilder` | `app/Builders/Messages/Facebook/MessageBuilder.php` |
| `Messages::Instagram::{BaseMessageBuilder,MessageBuilder,Messenger::MessageBuilder}` | `app/Builders/Messages/Instagram/MessageBuilder.php` (gộp; nguồn hồ sơ do `InstagramProfileFetcher` gánh) |
| `app/jobs/webhooks/*_events_job.rb` | `app/Jobs/Webhooks/{Telegram,Line,Sms,Twilio,TwilioDeliveryStatus,Whatsapp,Tiktok,Facebook,Instagram}*Job.php` |
| `app/controllers/webhooks/*_controller.rb` + `MetaTokenVerifyConcern` + `Facebook::Messenger::Server` mount `/bot` | `app/Http/Controllers/Api/Webhooks/**` (+ `Concerns/VerifiesMetaSignature`) |
| `api/v1/webhooks_controller.rb#twitter_crc` | `Api/Webhooks/TwitterController.php` |
| `api/v1/accounts/callbacks_controller.rb` | `app/Http/Controllers/WebApi/CallbacksController.php` |
| `config/routes.rb` cuối file | khối `// F2-F5 …` trong `routes/api.php`; callbacks trong `routes/web_api.php` |
| `SendReplyJob` bảng dịch vụ | `app/Jobs/SendReplyJob::CHANNEL_SERVICES` (+8 dòng) |
| `GlobalConfigService` các khóa kênh | `config/services.php` (`facebook`, `instagram`, `whatsapp_cloud`, `tiktok`, `twitter`) |
| `spec/factories/channel/*` | `database/factories/Channel/*Factory.php` + state trong `InboxFactory` |

### Spec ↔ Pest

| Spec gốc | Pest |
|---|---|
| `spec/services/telegram/incoming_message_service_spec.rb`, `spec/controllers/webhooks/telegram_controller_spec.rb` | `tests/Feature/Channels/TelegramChannelTest.php` (9) |
| `spec/services/line/**`, `spec/controllers/webhooks/line_controller_spec.rb` | `tests/Feature/Channels/LineChannelTest.php` (3) |
| `spec/services/sms/**`, `spec/controllers/webhooks/sms_controller_spec.rb` | `tests/Feature/Channels/SmsChannelTest.php` (3) |
| `spec/services/twilio/**` | `tests/Feature/Channels/TwilioChannelTest.php` (3) |
| `spec/services/whatsapp/incoming_message_whatsapp_cloud_service_spec.rb`, `spec/controllers/webhooks/whatsapp_controller_spec.rb` | `tests/Feature/Channels/WhatsappChannelTest.php` (8) |
| `spec/services/tiktok/**`, `spec/controllers/webhooks/tiktok_controller_spec.rb` | `tests/Feature/Channels/TiktokChannelTest.php` (4) |
| `spec/builders/messages/facebook/message_builder_spec.rb`, `spec/jobs/webhooks/facebook_events_job_spec.rb` | `tests/Feature/Channels/FacebookChannelTest.php` (5) |
| `spec/services/instagram/message_text_spec.rb`, `spec/controllers/webhooks/instagram_controller_spec.rb` | `tests/Feature/Channels/InstagramChannelTest.php` (5) |
| `spec/controllers/api/v1/accounts/callbacks_controller_spec.rb` | `tests/Feature/Channels/FacebookCallbacksTest.php` (4) |
| `spec/controllers/api/v1/webhooks_controller_spec.rb` (twitter_crc) | `tests/Feature/Channels/TwitterChannelTest.php` (3) |
| — (kiểm khung, không có spec gốc) | `tests/Feature/Channels/ChannelRegistryTest.php` (18: morph + CHANNEL_SERVICES cho cả 9 kênh) |

Fixture payload webhook: `tests/Fixtures/channels/*.json` (11 tệp).

---

## Khác biệt cố ý

1. **HTTP ra ngoài qua `Http` facade**, không dùng gem tương đương (koala, facebook-messenger,
   twilio-ruby, line-bot-sdk, HTTParty, Down). Mỗi kênh có một lớp `*Client` là cửa duy nhất.
2. **Endpoint `/bot` tự viết** thay cho `Facebook::Messenger::Server` mount từ gem: cùng hợp đồng
   (GET verify token, POST bung `entry[].messaging[]`), nhưng verify signature dùng app secret toàn
   cục — bản gốc còn tra app secret theo từng page (chỉ dùng trên bản EE/cloud).
3. **Lõi model không nói chuyện HTTP.** Chatwoot để `send_message`/`setup_telegram_webhook`/
   `subscribe` ngay trong model kênh; ở đây chúng nằm trong service/client (`docs/code-standards.md` §0).
   Hệ quả: **tạo kênh Telegram KHÔNG tự gọi `setWebhook`**, tạo kênh Instagram/Facebook KHÔNG tự
   `subscribe` — phiên chính quyết định đặt các bước đó ở đâu (gợi ý: một `ChannelSetupService` gọi
   từ `InboxesController@store`, cùng chỗ cho mọi kênh).
4. **`bot_token` của Telegram lưu bản rõ** (bản gốc mã hóa deterministic). Lý do: webhook tra kênh
   theo token trong URL; Laravel không có `encrypts … deterministic:`. Đây là **rủi ro cần phiên chính
   quyết**: hoặc chấp nhận, hoặc thêm cột `bot_token_hash` (SHA-256) làm khóa tra và mã hóa cột gốc.
   Các bí mật còn lại (`page_access_token`, `access_token`, `auth_token`, `twitter_*`,
   `business_management_token`) đều dùng cast `encrypted`.
5. **Không có khóa Redis (mutex) chống đua** như `MutexApplicationJob` của bản gốc. Chống trùng WhatsApp
   dựa vào `source_id` đã tồn tại; các kênh khác dựa vào unique index của `contact_inboxes`. Nếu về sau
   thấy hội thoại trùng khi nhận album ảnh, dựng lại lớp khóa (một chỗ: `IncomingConversationResolver`).
6. **`external_error` ghi vào `content_attributes`** — đúng bản gốc (store_accessor), không phải cột.
7. **Gộp hai builder Instagram** (`MessageBuilder` + `Messenger::MessageBuilder`) thành một: khác biệt
   thật sự chỉ là nguồn lấy hồ sơ người dùng, đã tách sang `InstagramProfileFetcher`.
   Kèm theo: hội thoại Instagram-qua-Facebook **không** gắn `additional_attributes.type =
   'instagram_direct_message'` như bản gốc — nếu FE cần lọc theo khóa đó thì báo lại.
8. **Twitter chỉ dựng khung** theo đúng yêu cầu: model + migration + CRC. Nhận/gửi DM chưa port
   (gem Twitty, Account Activity API).
9. Twilio dùng REST API thẳng (`/Accounts/{sid}/Messages.json`), chữ ký `X-Twilio-Signature` được
   kiểm ngay ở controller (bản gốc dựa vào middleware của gem).

## Chưa port (cố ý, ngoài phạm vi đợt này — ghi để không tưởng là đã có)

- WhatsApp: đồng bộ message template, embedded signup, health check, voice calling, CSAT template,
  BSUID/coexistence, `WebhookSetupService`/`TeardownService`, chuẩn hóa số điện thoại.
- Twilio: content template (CSAT), `TemplateProcessorService`, `MediaDownloadService` với retry.
- Telegram: gửi tài liệu bằng multipart (đang gửi bằng URL — Telegram chỉ nhận GIF/PDF/ZIP qua URL),
  `UpdateMessageService` (sửa tin), sticker set.
- Instagram/Messenger: lấy liên kết story (`story_mention`/`ig_story`/`ig_post`), `TestEventService`,
  `ReadStatusService`, `DeliveryStatus` (watermark), `RefreshOauthTokenService`.
- TikTok: upload ảnh multipart, `TokenService` (làm mới token), `ReadStatusService`, `capabilities`.
- SMS/Twilio: campaign one-off (`OneoffSmsCampaignService`).
- Kênh 360dialog: `validate_provider_config` khi tạo kênh (bản gốc chặn credential sai ngay lúc tạo).

## Bẫy đã trả giá

1. **`message.external_error` KHÔNG phải cột** — là store_accessor trên `content_attributes`.
   Viết `update(['external_error' => …])` bị Eloquent bỏ im lặng; test đỏ mà không có lỗi nào.
   Đã gom về `ChannelMessageStatus`.
2. **`Http::fake()` gọi lần hai KHÔNG thay thế lần đầu** — stub cũ vẫn thắng nếu khớp trước.
   Test dùng `beforeEach` fake rồi fake lại trong test sẽ nhận response cũ. Cách dùng: một hàm
   `fake…Api(array $overrides)` với `[...$defaults, ...$overrides]` (trùng key thì overrides đè,
   vị trí giữ theo lần khai đầu — quan trọng vì catch-all `'host/*'` phải đứng cuối).
3. **Hàng đợi trong test là `sync`**: tạo một Message outgoing là `SendReplyJob` chạy NGAY.
   Nên khi khẳng định "gửi ra ngoài", `Http::assertSent` đã có bản ghi trước cả khi gọi service tay.
4. `Response` của controller: `response()->json(...)` trả `JsonResponse`, không khớp kiểu trả về
   `Illuminate\Http\Response` — dùng `Symfony\...\Response` khi một action trả cả hai dạng.
5. `InboxResource::__construct` cần **hai** tham số (`$inbox, $administrator`).
6. Bandwidth gửi payload là **mảng JSON ở gốc** (`params['_json']` bên Rails) — Laravel phải đọc
   `$request->json()->all()` rồi lấy phần tử đầu.

## Kết quả gate

- `php artisan migrate` trên `yona_rw`: **DONE** (`2026_09_06_997000_create_external_channel_tables`).
- Pest DB riêng `yona_rw_test_f25`: **1981 test, 1980 pass**. Test của tôi (10 tệp,
  `tests/Feature/Channels/**`) xanh 100% (65 test). Một fail duy nhất là
  `tests/Feature/Builders/MessageBuilderTest.php › creates a message with attachments`
  (Storage fake không tìm thấy tệp) — **chạy riêng thì xanh**, không thuộc vùng F2–F5,
  nghi là nhiễu giữa các tệp test hoặc do agent song song đang sửa file. DB test đã `dropdb`.
- `vendor/bin/pint` theo danh sách file của tôi: **passed**.
- **E2E giả lập chạy thật trên `yona_rw`** (server localhost:8000), đã dọn sạch sau khi đo:
  - Telegram: `curl -X POST /webhooks/telegram/<token>` với fixture → `200`, hiện đúng
    liên hệ `Sojan Jose`, tin `Test message`, `source_id=1128` trong inbox 34.
  - Messenger: `curl -X POST /bot` kèm `X-Hub-Signature-256` hợp lệ → `200`, hiện liên hệ
    `John Doe` (token giả nên Graph trả rỗng → rơi về tên mặc định của bản gốc), tin
    `Xin chào từ Messenger`, `source_id=mid.facebook.1` trong inbox 35.
  - Agent trả lời: tạo tin outgoing rồi chạy `SendReplyJob` → đúng driver, ghi lỗi thật của nhà
    cung cấp vào `content_attributes.external_error`:
    Telegram `404, Not Found`, Messenger `190 - Invalid OAuth access token` (token giả).
  - Ghi chú môi trường: đã thêm `FB_APP_SECRET=e2e-fb-secret` vào `.env` local để đo (`.env` không
    commit) — founder đổi thành app secret thật khi test tài khoản thật.

## Route cần phiên chính biết

Đã tự thêm trong hai khối được giao (`routes/api.php` webhooks, `routes/web_api.php` callbacks).
Không cần thêm route nào khác. `route('twilio.delivery_status')` là tên route dùng cho
`StatusCallback` gửi lên Twilio.
