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
- Gửi tin: `SendReplyJob::CHANNEL_SERVICES`. Hành động khác (thu hồi, cảm xúc,
  thành viên nhóm, sticker): `app/Services/Channels/ChannelActionRegistry.php`.
- **Thêm kênh = thêm driver** (model + service + một dòng đăng ký), không sửa
  lõi.
- Zalo cá nhân là một driver như mọi kênh khác (`Channel::Zalo`), nói chuyện với
  bridge Node qua `app/Services/Zalo/ZaloBridgeClient.php`.

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
  ngoài là ảnh PNG tĩnh (`outboundCapabilityFor()`). Động (Lottie) chỉ phát trong
  dashboard và widget.
- **Ai thấy gì:** một nguồn là `Sticker::visibleTo($account)`: sticker `ready`
  trong bộ đã xuất bản, của kho chung (`account_id` null) và thêm kho riêng của
  account khi cờ `custom_stickers` bật. Cờ tắt thì trang và API kho riêng trả 404
  (`EnsureAccountFeatureEnabled`).
- **Payload lưu đường dẫn, URL dựng lúc đọc:** tin chỉ giữ đường dẫn trên disk
  `stickers` (`config/filesystems.php`), không giữ URL; `MessageResource` gọi
  `StickerLibrary::forReader()` dựng `url` (PNG), `poster_url`, `animation_url`,
  `source: yona`. Đổi tên miền hay chuyển disk sang R2 thì tin cũ vẫn đúng.
- **Tệp mượn:** đính kèm của tin sticker trỏ thẳng tệp trên disk `stickers`, không
  sao chép. `Attachment::ownsStoredFile()` trả false cho disk thuộc
  `config('yona.attachment_borrowed_disks')`, nên xoá, thu hồi hay chuyển tiếp tin
  không đụng tệp kho. Xoá tệp kho chỉ ở `StickerFileJanitor`, khi không còn sticker
  hay đính kèm nào trỏ tới hash đó.
- **Pipeline upload:** `StickerUploadService` kiểm và thu gọn Lottie/TGS
  (`LottieDocumentValidator`, `LottieMinifier`), tạo sticker `processing`, rồi
  `RenderStickerJob` (hàng đợi `low`) gọi `StickerRenderer`. Bản cài đặt
  `NodeStickerRenderer` chạy `services/sticker-renderer` (ThorVG wasm) trong tiến
  trình con có cắt thời gian và `prlimit --data` (`config/yona.php` → `stickers`).
  Tệp ghi theo hash nội dung: `<2 ký tự>/<hash>/anim.json`, `poster.webp`,
  `static.png`. Hỏng bước nào thì sticker `failed` kèm mã.
- **Trình phát:** `resources/js/shared/sticker/StickerPlayer.tsx` dùng chung cho
  dashboard và widget: hiện poster ngay, chỉ nạp ThorVG (chunk riêng, wasm tự host
  qua `thorvgLoader.ts`) khi sticker vào khung nhìn, ra khỏi khung thì dừng; mọi
  lỗi giữ poster. Plugin Vite `thorvgBuildPlugin.ts` gỡ đường tải wasm dự phòng từ
  CDN ngoài khỏi bundle.

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
