# F2–F5 — Wizard tạo inbox 9 kênh ngoài + glue backend (agent `f2f5-fe`)

Nguồn đọc: `refs/chatwoot` @ **v4.17.1**. Hợp đồng backend: [f2f5-notes-be.md](f2f5-notes-be.md).
Cách wizard cắm kênh mới: [c1-notes-fe.md](c1-notes-fe.md).

## Bảng trace Vue ↔ TSX

| Nguồn Chatwoot | Đích Yona | Ghi chú |
|---|---|---|
| `settings/inbox/channels/Telegram.vue` | `settings/inboxes/channels/Telegram.tsx` | form chỉ có bot token; inbox **không** có ô tên (tên lấy từ bot) |
| `channels/Line.vue` | `channels/Line.tsx` | 4 trường bắt buộc |
| `channels/Sms.vue` | `channels/Sms.tsx` | ô chọn nhà cung cấp → Twilio / Bandwidth |
| `channels/BandwidthSms.vue` | `channels/BandwidthSms.tsx` | |
| `channels/Twilio.vue` | `channels/Twilio.tsx` + `twilio.scss` | dùng chung SMS/WhatsApp qua prop `type`; `<style scoped>` → `.scss` |
| `channels/Whatsapp.vue` | `channels/Whatsapp.tsx` | màn chọn nhà cung cấp + `?provider=` |
| `channels/CloudWhatsapp.vue` | `channels/CloudWhatsapp.tsx` | |
| `channels/360DialogWhatsapp.vue` | `channels/ThreeSixtyDialogWhatsapp.tsx` | tên file đổi vì TS không cho định danh bắt đầu bằng số |
| `channels/Facebook.vue` | `channels/Facebook.tsx` | SDK Meta + ComboBox chọn trang |
| `channels/Instagram.vue` | `channels/Instagram.tsx` | |
| `channels/Tiktok.vue` | `channels/Tiktok.tsx` | |
| `channels/Twitter.vue` | `channels/Twitter.tsx` + `twitter.scss` | |
| khối `<div class="flex-shrink-0 flex-grow-0"><label>…` lặp ở mọi form | `channels/ChannelFormField.tsx` (mới) | một nguồn duy nhất cho ô nhập + lỗi + help-text |
| `inboxes/createChannel` + `router.replace(settings_inboxes_add_agents)` | `channels/useCreateChannel.ts` (mới) | một nguồn duy nhất cho "tạo xong sang bước gán agent" |
| `composables/useFacebookPageConnect.js` | `composables/useFacebookPageConnect.ts` | |
| `helper/facebookScopes.js` + phần dùng chung của `channels/whatsapp/utils.js` | `helper/facebookSdk.ts` | nạp SDK + `FB.init` + scope; embedded signup không port |
| `shared/helpers/Validators.js` (`isPhoneE164`, `isPhoneE164OrEmpty`, `isNumber`) | `shared/helpers/Validators.ts` | thêm 3 hàm |
| `settings/inbox/FinishSetup.vue` | `settings/inboxes/FinishSetup.tsx` | thêm QR (WhatsApp/Messenger/Telegram), khối `callback_webhook_url` của Line/SMS/Twilio-WA/WhatsApp Cloud, và 5 nhánh `message` |
| `settings/inbox/ChannelList.vue` + `components/widgets/ChannelItem.vue` | `NewChannelList.tsx` + `components/widgets/ChannelItem.tsx` | CHỈ thêm entry: `ACTIVE_CHANNELS` + `whatsapp,sms,telegram,line` |
| `settings/inbox/ChannelFactory.vue` | `settings/inboxes/NewChannel.tsx` | thêm 8 dòng vào `CHANNEL_VIEWS` |
| `settings/inbox/Settings.vue#tabs` + `#canLocktoSingleConversation` | `settings/inboxes/Show.tsx` | tab Configuration theo kênh; khối "Conversation Routing" mở cho 9 kênh đúng bản gốc |
| `dashboard/assets/images/channels/facebook_login.png` | `public/assets/images/dashboard/channels/facebook_login.png` | |

### Glue backend (mục "Bổ sung đợt F (5)")

| Nguồn Chatwoot | Đích Yona |
|---|---|
| `Channel::Telegram#ensure_valid_bot_token` + `#setup_telegram_webhook` | `App\Services\Channels\ChannelSetupService::setUpTelegram()` |
| `Twilio::WebhookSetupService` | `ChannelSetupService::setUpTwilio()` |
| `Whatsapp::WebhookSetupService#setup_webhook` + `FacebookApiClient#subscribe_phone_number_webhook` | `ChannelSetupService::setUpWhatsapp()` |
| `Channel::FacebookPage#subscribe` (`after_create_commit`) | `ChannelSetupService::subscribeFacebookPage()` |
| `Channel::Instagram#subscribe` (`after_create_commit`) | `ChannelSetupService::subscribeInstagram()` |
| `Inbox#callback_webhook_url` | `ChannelSetupService::callbackUrlFor()` (static, dùng lại cho `InboxResource`) |
| `Api::V1::InboxesHelper#inbox_name` | `Channelable::namesInboxItself()` + `Telegram::namesInboxItself()` + nhánh đặt tên trong `setUpTelegram()` |
| khối "Channel specific settings" của `_inbox.json.jbuilder` | `InboxResource::externalChannelAttributes()` |

Điểm gọi duy nhất: `InboxesController@store` (một dòng `app(ChannelSetupService::class)->register($inbox)`).
Luồng Facebook không đi qua `/inboxes` nên `CallbacksController@registerFacebookPage` gọi **cùng** service đó.

### Spec ↔ Pest / vitest

| Spec gốc | Test |
|---|---|
| callback `setup_telegram_webhook` / `subscribe` + hai `WebhookSetupService` | `tests/Feature/Channels/ChannelSetupServiceTest.php` (11 test, `Http::fake()`) |
| `shared/helpers/specs/ValidatorsHelper.spec.js` (phần E.164 + isNumber) | `resources/js/shared/helpers/Validators.test.ts` (6) |
| hành vi vuelidate của `Telegram.vue` / `Line.vue` / `Twilio.vue` | `resources/js/dashboard/settings/inboxes/channels/channelForms.test.tsx` (4) |

## Khác biệt cố ý

1. **Twilio và WhatsApp tạo qua `POST /inboxes`**, không qua `channels/twilio_channel` / `whatsapp` như bản gốc —
   backend F2–F5 đã chốt một cửa duy nhất (xem hợp đồng trong `f2f5-notes-be.md`). Không đổi giao diện.
2. **`GET /callbacks/facebook_pages`** (bản gốc `POST`) — theo route backend đã đăng ký.
3. **Không port các nhánh chỉ chạy trên Chatwoot Cloud**: banner giới hạn tạo inbox Meta
   (`isMetaInboxCreationDisabled`), banner Bắc Mỹ của TikTok, khối "Request embedded signup access",
   và toàn bộ **WhatsApp Embedded Signup** (`WhatsappEmbeddedSignup.vue` — cần `whatsappAppId` của Meta).
   Kèm theo: `components-next/banner/Banner.vue` chưa cần port vì không nhánh nào bật.
4. **Thẻ Facebook/Instagram vẫn mờ** như oracle: oracle chạy với `fbAppId`/`instagramAppId` rỗng.
   Form vẫn mở được bằng URL trực tiếp (`/settings/inboxes/new/facebook`) — đúng oracle.
   Thẻ TikTok không có ở cả hai bên (`tiktokAppId` rỗng).
5. **Instagram / TikTok / Twitter chỉ có UI**: nút "Continue with …" gọi
   `POST /instagram/authorization`, `POST /tiktok/authorization`, `GET /twitter/authorization` —
   ba endpoint này **chưa** được port ở backend, nên bấm sẽ hiện toast lỗi.
   Bản gốc không bắt lỗi ở Instagram/TikTok (promise reject lặng); bản port bắt lại và hiện toast
   để không kẹt spinner.
6. **`Whatsapp.tsx` đổi provider bằng `history.pushState`** thay vì router client-side của Vue —
   cùng hình dạng URL (`?provider=…`), nút Back của trình duyệt vẫn chạy.
7. **`ThreeSixtyDialogWhatsapp` không có lối vào từ giao diện** (đúng bản gốc: màn chọn nhà cung cấp
   chỉ có WhatsApp Cloud và Twilio; nhánh `?provider=360dialog` là di sản). Vẫn port để không mất mã.
8. **Tên inbox Telegram**: bản gốc validate token ngay lúc tạo (getMe) và **chặn** nếu sai.
   Ở đây lỗi nhà cung cấp KHÔNG chặn tạo inbox (yêu cầu của đợt này), nên khi getMe hỏng inbox
   lấy tên dự phòng `Telegram` thay vì `bot_name`.
9. **`ChannelFormField` bỏ lớp `<span>` bọc nhãn** mà vài form gốc có (`CloudWhatsapp.vue`) —
   span rỗng thuộc tính, không đổi bố cục (đã đo 0.030%).

## Sửa/bổ sung ngoài vùng kênh (cần biết khi review)

| File | Thay đổi | Vì sao bắt buộc |
|---|---|---|
| `app/Http/Controllers/WebApi/InboxesController.php` | (a) một lời gọi `ChannelSetupService`; (b) `creatableAttributes()` = hợp của `channelRules()` và `EDITABLE_ATTRS`; (c) `name` không bắt buộc với kênh tự đặt tên | (b) là **bug thật**: `EDITABLE_ATTRS` của `TwilioSms` chỉ có `account_sid`/`auth_token` nên tạo inbox Twilio mất `phone_number`/`medium`/`messaging_service_sid`; Facebook/Instagram/Tiktok **không khai** `EDITABLE_ATTRS` nên `$channelClass::EDITABLE_ATTRS` sẽ fatal |
| `app/Models/Channel/TwilioSms.php` | `setMediumAttribute()` | Hợp đồng backend nhận `medium: 'sms'\|'whatsapp'` nhưng cột là số; `(int) 'sms'` = `(int) 'whatsapp'` = 0 → mọi kênh Twilio WhatsApp bị lưu thành SMS |
| `app/Models/Channel/Concerns/Channelable.php` + `Channel/Telegram.php` | `namesInboxItself()` | `Api::V1::InboxesHelper#inbox_name`: form Telegram của bản gốc không có ô tên |
| `app/Http/Controllers/WebApi/CallbacksController.php` | gọi `ChannelSetupService` sau khi tạo trang FB | `after_create_commit :subscribe` của model gốc |
| `app/Http/Middleware/HandleInertiaRequests.php` + `resources/js/types/index.ts` | share `fbAppId`, `fbApiVersion` | tương đương `window.chatwootConfig.fbAppId`; luồng Facebook cần app id để `FB.init` |
| `resources/js/dashboard/settings/inboxes/Show.tsx` | `tabKeysFor(channelType, provider)` + `canLockToSingleConversation` | Telegram ở oracle **không** có tab Configuration nhưng **có** khối "Conversation Routing"; bản port ngược lại cả hai (pixel 1.87%) |
| `resources/js/dashboard/settings/inboxes/types.ts` | thêm khoá kênh ngoài | shape mới của `InboxResource` |

## Bẫy đã trả giá

1. **Khoảng trắng JSX sau `<input type="checkbox"/>`.** Vue để `<input/>\n{{ text }}` sinh một dấu cách,
   JSX bỏ whitespace có xuống dòng → nhãn hai công tắc của form Twilio dịch trái 1 ký tự, pixel **0.246%**.
   Phải viết `/>{' '}`. (Cùng họ với bẫy `</span>{' '}` của D4.)
2. **Khối QR của Telegram dùng `gap-4`, WhatsApp/Messenger dùng `gap-3`.** Gom thành một component
   dùng chung với `gap-3` cho cả ba làm màn Voilà lệch **0.928%** (mọi thứ dưới ảnh QR dịch lên 4px).
   Ảnh QR trùng tuyệt đối (`imgSrcLen` 2826 hai bên) — đừng nghi thư viện QR, hãy đo `getBoundingClientRect`.
3. **`name` bắt buộc chặn form Telegram.** Form gốc không có ô tên; POST không kèm `name` → 422 và
   nút "Create Telegram Channel" đứng im, không toast. Đọc `Api::V1::InboxesHelper#inbox_name` mới ra.
4. **Giới hạn phiên đăng nhập (F8) làm hỏng phép đo.** Mỗi lần playwright đăng nhập tạo một
   `user_sessions`; tới 25 phiên thì trang login đổi thành "Active session limit reached" và mọi
   script pixel/audit timeout ở `waitForURL`. Dọn bằng
   `psql -d yona_rw -c "DELETE FROM user_sessions WHERE user_id IN (SELECT id FROM users WHERE email='john@acme.inc')"`.
   **Đây là nguyên nhân số một của "timeout ở bước đăng nhập", không phải code.**
5. **`php artisan tinker --execute` nuốt dấu `\` của namespace** (PARSE ERROR `T_NS_SEPARATOR`) và
   `php artisan tinker <file>` thì in lại cả mã nguồn rồi treo. Seed fixture bằng `yona-api.mjs` + `psql`.
6. **Oracle không cho tạo inbox Telegram bằng token giả** (`before_validation` gọi getMe thật).
   Seed phải dùng `channel.save(validate: false)` trong `rails runner` — xem `f2f5-seed-telegram.sh`.
7. **`bot_token`/`line_channel_id` có unique index**: một lần e2e hỏng giữa chừng để lại bản ghi kênh
   (dù inbox đã xoá) và chặn lần chạy sau bằng 500. Script e2e tự `cleanFixture()` trước khi chạy.
8. **`audit-buttons.mjs` chết khi trang điều hướng thật.** Yona mở form kênh bằng `window.location`
   (oracle dùng router client-side) nên `page.evaluate` sau cú nhấp gặp "Execution context was destroyed".
   Dùng bản `f2f5-audit-channels.mjs` (đợi `domcontentloaded` rồi thử lại).
9. **`Line::IncomingMessageService` bỏ qua event khi không lấy được hồ sơ người dùng**, mà
   `/v2/bot/profile` cần channel token THẬT — không thể dựng hội thoại LINE trong e2e offline.

## Kết quả gate

| Gate | Kết quả |
|---|---|
| `npx tsc --noEmit` | xanh |
| `npm run build` | xanh |
| `npx vitest run` | **685/685** (86 file) — thêm 10 test ở 2 file mới |
| Pest toàn suite trên `yona_rw_test_f25fe` | **2056/2056** (5027 assertion, 257s) — DB đã `dropdb` |
| `vendor/bin/pint <danh sách file của tôi>` | passed |

### Pixel-diff (1280×800, light + dark, ngưỡng 0.1%) — `~/www/pixel-diff/f2f5-channels-ui.mjs`

| Cảnh | Light | Dark |
|---|---|---|
| `channels` — lưới chọn kênh | 0.034% | 0.035% |
| `telegram` | 0.032% | 0.033% |
| `line` | 0.032% | 0.033% |
| `sms` (Twilio) | 0.032% | 0.033% |
| `sms-bandwidth` | 0.032% | 0.033% |
| `whatsapp` — chọn nhà cung cấp | 0.032% | 0.033% |
| `whatsapp-cloud` | 0.032% | 0.033% |
| `whatsapp-twilio` | 0.032% | 0.033% |
| `facebook` | 0.032% | 0.033% |
| `instagram` | 0.032% | 0.033% |
| `tiktok` | 0.032% | 0.033% |
| `twitter` | 0.032% | 0.033% |
| `telegram-finish` — màn Voilà | 0.032% | 0.033% |
| `telegram-settings` — tab Settings của inbox Telegram | 0.032% | 0.033% |

0.032–0.035% = nhiễu nền quen thuộc (logo sidebar SVG + avatar John + bút chì ô search).

Hồi quy sau khi sửa `Show.tsx`: `settings/inboxes/1` 0.037%/0.037%;
`settings/inboxes/1/configuration` **0.006%/0.006%** (che `hmac_token`/`secret` bằng `mask-diff.mjs`,
chưa che là 0.196% — đúng baseline C1).

Fixture hai màn `telegram-*`: `f2f5-seed-telegram.sh up|down` (inbox `f2f5-telegram`, bot giả,
`bot_name=yona_pixel_bot` đặt tay hai bên để QR trùng). **Đã `down` sau khi đo.**

### Audit nút — `~/www/pixel-diff/f2f5-audit-channels.mjs`

Màn `/settings/inboxes/new`, **8 nút của oracle khớp từng nút, từng toạ độ**:
Back, Website, WhatsApp, SMS, Email, API, Telegram, Line → cùng URL đích (khác mỗi account id).
Không nút DEAD nào thuộc F2–F5.

### E2E trình duyệt — `~/www/pixel-diff/f2f5-channels-e2e.mjs` (**16/16 đạt**, dữ liệu tự dọn)

- **Telegram**: lưới kênh → form → nhập token giả → `POST /inboxes` 200 (ChannelSetupService gọi
  `getMe`/`deleteWebhook`/`setWebhook`, Telegram trả 401 → **ghi log, không chặn tạo**:
  `[CHANNEL SETUP] Telegram setWebhook thất bại cho inbox 53: {"ok":false,"error_code":401,…}`)
  → gán agent John → màn Voilà → `POST /webhooks/telegram/<token>` fixture `telegram_text.json` → 200
  → hội thoại "Test message" hiện trong dashboard kèm huy hiệu `i-woot-telegram` → xoá inbox qua
  modal gõ tên, danh sách sạch sau F5.
- **LINE**: cùng luồng; màn Voilà hiện đúng `…/webhooks/line/<line_channel_id>`;
  webhook có chữ ký HMAC đúng → 200, chữ ký sai → 200 (đúng bản gốc) và không tạo gì.
  **Chưa kiểm được hội thoại LINE trên trình duyệt** — xem "Nợ / cần founder" mục 1.

## Nợ / cần phiên chính + founder biết

1. **LINE chưa có e2e dựng hội thoại thật.** `Line::IncomingMessageService` chỉ tạo liên hệ khi
   `GET /v2/bot/profile/{userId}` trả về hồ sơ, mà endpoint đó cần channel token THẬT của LINE.
   Đường dựng hội thoại từ payload LINE đang được `tests/Feature/Channels/LineChannelTest.php` phủ
   bằng `Http::fake`. Muốn e2e thật thì cần một tài khoản LINE Developers.
2. **Thẻ kênh "Zalo" do phiên khác thêm vào `NewChannelList`/`ChannelItem`** nằm ở hàng 4 của lưới —
   ngoài khung 800px nên không ảnh hưởng pixel-diff, nhưng `f2f5-audit-channels.mjs` báo thẻ đó
   **DEAD** (bấm không phản ứng). Oracle không có thẻ này. Ngoài phạm vi F2–F5.
3. **Instagram / TikTok / Twitter cần backend `*/authorization`** (sinh URL OAuth) mới bấm được.
4. **WhatsApp Embedded Signup** chưa port (cả FE lẫn BE) — cần `whatsappAppId` + `whatsappConfigurationId`.
5. **Facebook cần `FB_APP_ID` + `FB_APP_SECRET` thật** để chạy hết luồng; hiện dừng đúng ở bước gọi
   `GET /callbacks/facebook_pages` (backend trả danh sách rỗng khi token không hợp lệ).
6. Các bước webhook chưa port của WhatsApp (đăng ký số, PIN, `calls`) — xem
   `f2f5-notes-be.md` mục "Chưa port"; `ChannelSetupService::setUpWhatsapp()` mới làm
   `subscribed_apps` + `override_callback_uri`.

## Lệnh chạy lại

```bash
# pixel toàn bộ (bỏ hai cảnh telegram-*)
cd ~/www/pixel-diff && node f2f5-channels-ui.mjs

# hai cảnh cần fixture
eval "$(bash f2f5-seed-telegram.sh up)" && \
  ORACLE_INBOX=$ORACLE_INBOX YONA_INBOX=$YONA_INBOX node f2f5-channels-ui.mjs telegram-finish telegram-settings
bash f2f5-seed-telegram.sh down

node f2f5-audit-channels.mjs http://localhost:3000
node f2f5-audit-channels.mjs http://localhost:8000
node f2f5-channels-e2e.mjs

# nếu script treo ở bước đăng nhập:
psql -h 127.0.0.1 -U postgres -d yona_rw \
  -c "DELETE FROM user_sessions WHERE user_id IN (SELECT id FROM users WHERE email='john@acme.inc')"
```
