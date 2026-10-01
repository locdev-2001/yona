# Kiến trúc hệ thống Yona

Nguồn chuẩn cho các quyết định kiến trúc đang có hiệu lực. Đổi một quyết định ở
đây thì sửa file này cùng commit với code. Quyết định giao diện nằm ở
[ux-decisions.md](ux-decisions.md), triển khai production ở
[deployment.md](deployment.md).

## 1. Stack

PHP 8.3+ / Laravel 13 · Inertia + React 19 (TypeScript), Tailwind + Radix ·
PostgreSQL (`pg_trgm`) · Redis (cache, queue, session) · Laravel Reverb
(WebSocket) · bridge Node cho Zalo cá nhân (`services/zalo-bridge`, zca-js).

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
  bước 2 của lối vào đã đóng chuyển về màn chọn. Contract test
  `tests/Contracts/Channels/ChannelConnectionDeclarationTest.php` bắt driver quên
  khai hoặc khai lệch năng lực phiên (`session_qr`/`session_oauth`/`session_token`).
  SMS (Bandwidth, Twilio SMS) đóng có chủ đích; dữ liệu và hộp thư cũ giữ nguyên.
- **Kiểm thông tin đăng nhập khi lưu**: `InboxesController` dựng kênh (chưa lưu)
  rồi gọi `ChannelCredentialsCheck` — bảng tra driver → verifier
  (`VerifiesChannelCredentials`): Email thử IMAP/SMTP qua `MailServerProbe`
  (test thay bằng `tests/Support/FakeMailServerProbe.php`), Telegram gọi `getMe`,
  LINE gọi `v2/oauth/verify` (lấy luôn ID kênh). Sai thì 422 gắn ô `channel.*`.
- **Kênh mất kết nối**: kênh dùng `Reauthorizable` (đếm lỗi trong Redis, quá
  ngưỡng hoặc lỗi xác thực thì `promptReauthorization()`); lõi đọc qua
  `Inbox::reauthorizationRequired()` (cần năng lực `session_reauth`). Email ghi
  thêm lần hỏng gần nhất để API trả `connection_error`; job quét thư thành công
  hoặc lưu lại cấu hình đúng thì `reauthorized()` gỡ cờ.
- Zalo cá nhân là một driver như mọi kênh khác (`Channel::Zalo`), nói chuyện với
  bridge Node qua `app/Services/Zalo/ZaloBridgeClient.php`.
- Ghi âm ở ô soạn: bản ghi là đính kèm âm thanh mang `meta.is_voice_message`
  (`Attachment::isVoiceMessage()`). Kênh khai `outbound_voice` gửi nó thành tin
  thoại gốc (Zalo: bridge `send-voice.mjs` đổi sang m4a rồi `sendVoice`); kênh
  khác gửi như mọi tệp âm thanh (`outbound_audio`).

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
  chính account. Cờ `custom_stickers` không ẩn nội dung, chỉ góp vào luật "ai được
  quản lý" dưới đây.
- **Ai được quản lý kho nào:** một nguồn là `StickerLibraryAccess`
  (`app/Services/Stickers/`), dùng ở trang cài đặt và API dashboard.
  Kho riêng: quản trị viên account, và account bật cờ `custom_stickers` hoặc người
  đó có quyền hệ thống. Kho nền tảng: chỉ người có quyền hệ thống. Quyền hệ thống
  = email user trong `YONA_SYSTEM_ADMIN_EMAILS`, đọc DUY NHẤT ở
  `App\Support\SystemAccess`. Trang Cài đặt → Kho sticker mở cho mọi quản trị
  viên; phần chưa đủ quyền hiện khoá, API trả 403 (`EnsureStickerLibraryAccess`).
  Kho nền tảng trong dashboard ở `/api/v1/platform_sticker_library/sticker_packs…`;
  console Super Admin giữ nguyên `/super_admin/api/sticker_packs…`. Hai mặt tiền
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
- Test: request tới route được bảo vệ trong Pest tự ký qua `Tests\Support\SignsProtectedRequests`
  (dùng trong `TestCase`); cần request trơn thì `withoutRequestSigning()`. Vitest mặc
  định tắt ký (`import.meta.env.MODE === 'test'`).
