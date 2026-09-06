# G3 hardening — 11 mục nợ (agent `g3-hardening`, 06–07/09/2026)

Môi trường: DB test riêng `yona_rw_test_g3h` (drop khi xong), dev `yona_rw` chỉ chạy `php artisan migrate`.

## 1. `Conversation::webhookData()` lên model — macro `send_webhook_event` hết no-op

- **Chỗ sửa:**
  - `app/Models/Conversation.php` — thêm `webhookData()` (bản dựng payload thật, port
    `Conversations::EventDataPresenter#webhook_data`).
  - `app/Http/Resources/ConversationResource.php` — `webhookData()` chỉ còn chuyển tiếp về model
    (mọi listener/`MessageResource` gọi qua resource vẫn chạy, không phải sửa call-site).
  - `app/Services/Macros/ExecutionService.php` — bỏ `class_exists('App\Jobs\WebhookJob')` +
    `method_exists($conversation, 'webhookData')`, `use App\Jobs\WebhookJob` thẳng.
- **Lý do:** hai guard phòng hờ đó biến lỗi thiếu method thành im lặng; `Conversation` không có
  `webhookData()` nên action `send_webhook_event` của macro **không bao giờ** bắn webhook.
- **Test:** `tests/Feature/Services/Macros/ExecutionServiceTest.php` — 2 case mới:
  `send_webhook_event` dispatch `WebhookJob` đúng url + `event: macro.executed` + `account` + tin cuối;
  thiếu url thì không dispatch. Hồi quy: `tests/Feature/Listeners/WebhookListenerTest.php`,
  `tests/Feature/Http/Resources/**` xanh.
- **Ghi chú kiến trúc:** model gọi static của Resource là mẫu ĐÃ CÓ trong repo
  (`app/Models/ContactInbox.php` gọi `ContactResource::webhookData`), không mở tiền lệ mới.

## 2. `DropdownItem` — slot có tên vs default slot (mọi dropdown lệch oracle)

- **Chỗ sửa:**
  - `resources/js/dashboard/components-next/dropdown-menu/base/index.tsx` — `DropdownItem` thêm
    `iconSlot` / `labelSlot` (tương đương `<template #icon>` / `#label`); chỉ `children`
    (default slot) mới bỏ `gap-3 hover:bg-n-alpha-2 rounded-lg`, đúng `:class="{ ...: !$slots.default }"` của gốc.
  - `filter/inputs/SingleSelect.tsx`, `filter/inputs/MultiSelect.tsx` — chuyển sang `icon` +
    `iconSlot`/`labelSlot`, bỏ lớp bọc `justify-between/truncate` tự thêm (gốc không có).
  - `resources/js/shared/helpers/focusOnMount.ts` (mới) — tương đương directive `v-focus`;
    dùng ở `SingleSelect`/`MultiSelect`/`FilterSelect` thay cho `useEffect(() => ref.current?.focus())`.
- **Lý do:** (a) ba dropdown lọc dựng nội dung bằng `children` nên item mất `gap-3` + hover →
  icon dính chữ; (b) ô Search trong menu **không được focus**: menu do `DropdownContainer` render khi
  mở, component cha không re-render nên `useEffect` không chạy lại → oracle có viền focus, yona không.
  Ref callback focus ngay lúc phần tử gắn vào DOM, đúng ngữ nghĩa `v-focus`.
- **Test:** `resources/js/dashboard/components-next/dropdown-menu/base/DropdownItem.test.tsx` (4 case:
  giữ `gap-3` với prop icon/label, giữ với slot có tên, bỏ với default slot, focus ô search khi mở menu).
- **Pixel:** `d1-automation-ui.mjs actions-menu` **0,550%/0,547% → 0,031%/0,028%** (light/dark).
  Hồi quy dropdown B6: `b6-assign-diff.mjs agent-open` 0,000%/0,000%; `b6-bulk-diff.mjs`
  menu agent 0,013%, team 0,000%, status 0,000%.
- **Bẫy đã trả giá:** `b7-conv-labels-diff.mjs picker` báo **lệch kích thước** (215 vs 218) — KHÔNG phải
  hồi quy: yona có 2 nhãn fixture tiếng Việt ("Khách mới", "Khách sộp") mà oracle không có, danh sách
  trong picker dài thêm. Layout từng dòng khớp. Xem mục 11.
- **Bẫy đã trả giá:** harness login yona chết lặng (`waitForURL` timeout) vì bảng `user_sessions` chạm
  giới hạn 25 phiên của F8 — mỗi lần chạy pixel tạo phiên mới, không logout. Dọn:
  `DB::table('user_sessions')->where('user_agent','like','%Headless%')->delete()`.

## 3. `v-dompurify-html` — render HTML đã lọc thay vì in ra chữ

- **Chỗ sửa:**
  - `resources/js/shared/components/SanitizedHtml.tsx` (mới) — `<SanitizedHtml as="p" html=… />`,
    lọc bằng `DOMPurify.sanitize` (gói `dompurify` đã có sẵn trong `package.json`).
  - `resources/js/dashboard/settings/SettingsSubPageHeader.tsx` — `headerContent` qua `SanitizedHtml`.
  - `resources/js/dashboard/settings/inboxes/channels/{Instagram,Tiktok}.tsx` — `errorStateDescription`
    (chuỗi i18n `ERROR_..._UNAUTHORIZED_HELP` có thẻ `<a>`).
  - `resources/js/dashboard/components-next/emoji-icon-picker/EmojiIcon.tsx` — `value`.
- **Đã rà (`grep v-dompurify-html` trong `settings/**` + `components-next/**` của gốc):** các nơi còn lại
  hoặc đã dùng `DOMPurify.sanitize` sẵn (`SelectChannelWarning`, `SlackIntegrationHelpText`, `InboxCard`,
  `FormattedContent`, `Base`, `CampaignCard`, `ContactNoteItem`, `PortalLayoutContentSettings`,
  `PreviewPicker`), hoặc CHƯA PORT (`CsatExpandedRow`, `template-preview/*`, `InstagramStory`,
  `captain/*`, `Companies/*`, `copilot/*`, `BasePaywallModal`).
  `ModalHeader` KHÔNG đổi: bản gốc cũng nội suy chữ (`{{ headerContent }}`), không phải dompurify.
- **Khác biệt cố ý:** ~24 call-site đang gọi `DOMPurify.sanitize` trực tiếp giữ nguyên — đúng hành vi rồi,
  đổi hết chỉ tạo churn; `SanitizedHtml` là cửa dùng chung cho các chỗ mới và các chỗ vừa sửa.
- **Test:** `resources/js/shared/components/SanitizedHtml.test.tsx` (render markup, chặn
  `<script>`/`onerror`, và `SettingsSubPageHeader` in đậm được `<b>PS:</b>`).
- **Pixel:** `compare.mjs '/app/accounts/{id}/settings/inboxes/new/1/agents' --login` — bước Add Agents
  của wizard inbox: **0,030% light / 0,030% dark** (trước khi sửa, mô tả in ra nguyên chuỗi `<br> <b>PS:</b>`).

## 4. SSRF guard cho URL do người dùng nhập

- **Chỗ sửa:**
  - `app/Support/SafeHttp.php` (mới) + `app/Support/UnsafeUrlException.php` — cổng DUY NHẤT:
    scheme phải http/https, phân giải tên miền rồi kiểm mọi địa chỉ bằng
    `FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE` (chặn loopback, 10/172.16/192.168,
    link-local 169.254 gồm metadata cloud, IPv6 `::1`, các dải dành riêng).
  - `config/safe_http.php` — `ALLOW_PRIVATE_WEBHOOK_URLS` (tương đương
    `SAFE_FETCH_ALLOW_PRIVATE_NETWORK` của gốc). `.env` dev = `true` (harness gọi localhost),
    `.env.example` = `false`. `phpunit.xml` đặt `true` để test không phải hỏi DNS.
  - `app/Services/Webhooks/Trigger.php::performRequest()` — gọi `SafeHttp::assertPublicUrl()`.
    MỘT chỗ này phủ cả 3 loại webhook: account, inbox API, agent bot
    (`App\Jobs\AgentBots\WebhookJob` kế thừa `App\Jobs\WebhookJob` → `Trigger`). Ngoại lệ rơi vào
    `catch` sẵn có → `handleFailure` (log "Invalid webhook URL"), đúng đường của bản gốc.
  - `app/Jobs/Avatar/AvatarFromUrlJob.php` — avatar theo URL do người dùng nhập (gốc cũng đi SafeFetch).
- **Không đụng:** hook integrations (Slack/Dialogflow/OpenAI/Google Translate) gọi endpoint CỐ ĐỊNH
  của nhà cung cấp, URL không do người dùng nhập; `RemoteAttachmentDownloader` tải từ URL do API kênh
  trả về. Ghi lại để lần sau thêm driver mới có URL người dùng nhập thì gọi `SafeHttp::assertPublicUrl`.
- **Khác biệt cố ý:** bản gốc ghim IP đã phân giải vào kết nối (ssrf_filter) nên chống được DNS rebinding;
  bản này kiểm ở thời điểm phân giải rồi để Guzzle tự phân giải lại — vẫn chặn mọi URL nội bộ tĩnh,
  còn rebinding cần pin IP ở tầng cURL (ghi nợ, chưa cần cho hiện trạng).
- **Test:** `tests/Feature/Support/SafeHttpTest.php` (15 case: cho qua IP công khai; chặn loopback/
  private/link-local/metadata/IPv6; chặn scheme file/gopher/ftp; bật env thì bỏ qua; `WebhookJob`
  KHÔNG gửi gì tới `169.254.169.254` nhưng vẫn gửi tới IP công khai). `tests/Feature/Jobs` 95 xanh.

## 5. Bí mật kênh: mã hóa `bot_token` Telegram + cột băm để tra webhook

- **Chỗ sửa:**
  - `database/migrations/2026_09_07_100000_encrypt_channel_secrets.php` (mới) — thêm
    `channel_telegram.bot_token_hash` (sha256, unique), backfill hash + mã hóa `bot_token` cho bản ghi
    hiện có, BỎ unique cũ trên `bot_token` (bản mã có IV ngẫu nhiên → unique vô nghĩa); mã hóa luôn
    `channel_line.line_channel_secret/line_channel_token`. `down()` giải mã ngược lại.
  - `app/Models/Channel/Telegram.php` — `casts: bot_token => encrypted`, `booted()` tự cập nhật
    `bot_token_hash` khi token đổi, `hashBotToken()` + `findByBotToken()` là **chỗ tra duy nhất**.
  - `app/Jobs/Webhooks/TelegramEventsJob.php` — dùng `Telegram::findByBotToken()` thay `where('bot_token', …)`.
  - `app/Models/Channel/Line.php` — `casts` mã hóa hai bí mật LINE (bản gốc `encrypts` cả hai).
- **Rà kênh khác:** `line_channel_id` (khóa tra webhook LINE) và `phone_number` WhatsApp KHÔNG mật →
  để bản rõ, không cần băm. Các token mật còn lại (`FacebookPage`, `Instagram`, `Tiktok`, `TwilioSms`,
  `Whatsapp`, `TwitterProfile`, `Email` imap/smtp password) ĐÃ có cast `encrypted` từ trước.
  Chỉ Telegram tra kênh bằng token trong URL nên chỉ Telegram cần cột băm (bản gốc dùng
  deterministic encryption cho đúng việc này).
- **Test:** `tests/Feature/Channels/TelegramChannelTest.php` — case mới: DB lưu bản mã, `bot_token_hash`
  đúng sha256, `findByBotToken` tìm được / token sai trả null, và `POST /webhooks/telegram/{token}` vẫn
  tạo tin nhắn. `tests/Feature/Channels` 109 xanh (sửa 1 assert cũ query thẳng `bot_token`).
- **Dev:** `php artisan migrate` trên `yona_rw` chạy xong (`12.34ms`); bảng `channel_telegram` đang rỗng
  nên không có dữ liệu phải chuyển đổi.

## 6. SSO: gộp `/app/sso_login` về `/app/login?sso_auth_token=&email=`

- **Chỗ sửa:**
  - `app/Models/Concerns/SsoAuthenticatable.php::generateSsoLink()` — link trỏ `/app/login?...`
    (đúng `generate_sso_link` / `generate_sso_link_with_impersonation` của gốc).
  - `app/Http/Controllers/Auth/SessionsController.php` — `create()` truyền prop `email` + `ssoAuthToken`;
    `store()` rẽ nhánh `sso_auth_token` (`authenticateWithSsoToken`): token dùng MỘT lần
    (`invalidateSsoAuthToken`), phiên impersonation bỏ qua giới hạn 25 phiên như bản gốc.
  - `resources/js/v3/views/login/Index.tsx` — `useEffect` tự POST khi có `ssoAuthToken`
    (tương đương `created() { if (this.ssoAuthToken) this.submitLogin(); }`).
  - XOÁ `app/Http/Controllers/Auth/SsoSessionsController.php` + route `/app/sso_login` trong `routes/web.php`.
- **Lý do:** hai cửa đăng nhập song song = hai chỗ phải nhớ áp giới hạn phiên/MFA/theo dõi phiên;
  bản gốc chỉ có một cửa.
- **Test:** `tests/Feature/Platform/UsersControllerTest.php` — link trả về `/app/login?`,
  GET trang login trả prop `ssoAuthToken`/`email`, POST đăng nhập được, POST lần hai bị từ chối
  (token một lần). `tests/Feature/Auth` + `tests/Feature/SuperAdmin` (impersonate) 63 xanh.

## 7. `Reauthorizable` lên `app/Models/Concerns/`

- `git mv app/Models/Channel/Concerns/Reauthorizable.php app/Models/Concerns/Reauthorizable.php`,
  đổi namespace + `use` ở 5 kênh (`Instagram`, `Whatsapp`, `Tiktok`, `FacebookPage`, `Email`) và
  `app/Models/Integrations/Hook.php`. Lý do: trait không thuộc riêng kênh (Hook cũng dùng) —
  bản gốc để ở `app/models/concerns/reauthorizable.rb`.
- **Test:** `tests/Feature/Models` + `tests/Feature/Integrations` 437 xanh.

## 8. `isUrlInvalid` — một bản theo đúng regex `url` của vuelidate

- **Chỗ sửa:**
  - `resources/js/shared/helpers/Validators.ts` — thêm `URL_REGEX` (chép nguyên văn từ
    `@vuelidate/validators@2.0.4` `dist/raw.cjs`), `isUrl()`, `isUrlInvalid(value, minLength = 0)`.
  - Xoá 3 bản `isUrlInvalid` cục bộ ở `settings/integrations/Webhooks/WebhookForm.tsx`,
    `settings/integrations/DashboardApps/DashboardAppModal.tsx`,
    `settings/agentBots/components/AgentBotModal.tsx`; `WebhookForm` truyền `minLength = 7`
    đúng `validations: { url: { required, minLength: minLength(7), url } }` của gốc.
- **Khác biệt hành vi (cố ý, bám gốc):** regex vuelidate TỪ CHỐI `localhost` và dải IP nội bộ
  (10/127/169.254/192.168/172.16-31) — bản cũ `new URL()` cho qua. Trùng hướng với guard SSRF ở mục 4.
  Người dùng dev muốn trỏ webhook về localhost phải dùng tên miền/tunnel như trên Chatwoot.
- **Test:** `resources/js/shared/helpers/urlValidator.test.ts` (17 case: so `source`+`flags` với bản
  vuelidate, so kết quả trên 13 mẫu, chuỗi rỗng, minLength của form webhook, localhost/IP nội bộ).

## 10. Lỗi console `reading 'focus'` từ ninja-keys — KHÔNG tái hiện được

- **Đã thử** (`~/www/pixel-diff/g3h-cmdbar-focus.mjs`, chạy cả oracle :3000 lẫn yona :8000, John):
  Ctrl+K rồi Escape ×5 (xác nhận modal có mở thật), `bar.open(); bar.close()` trong CÙNG một frame ×5,
  mở rồi Enter chọn action, mở rồi điều hướng sang trang khác ngay ×3.
  Kết quả: **0 lỗi console ở CẢ HAI bên** (kể cả lỗi khác).
- **Phân tích nguồn:** `@chatwoot/ninja-keys` **1.2.3** — cùng phiên bản trên `package.json` của yona và
  của `refs/chatwoot`. `ninja-header.js` `focusSearch() { requestAnimationFrame(() => this._inputRef.value.focus()) }`
  không kiểm tra null; nếu `_inputRef` rỗng khi rAF chạy thì lỗi xảy ra Y HỆT trên Chatwoot gốc.
- **Kết luận:** khác biệt cố ý — **giống gốc**, không sửa. Lớp bọc `CommandBar.tsx` không tự gọi
  `focusSearch`, nên có thêm guard cũng không chặn được đường gọi bên trong thư viện. Nếu founder gặp lại,
  cần kịch bản tái hiện cụ thể (kèm ảnh console) rồi mở lại mục này.

## 11. Fixture dev lệch oracle — chỉ ghi chú, KHÔNG xoá

- `inbox 25 "Yona"` (web widget của C1–C5) và hội thoại 58/109 là dữ liệu widget do founder tạo — GIỮ.
- Hai nhãn tiếng Việt "Khách mới"/"Khách sộp" chỉ có ở yona; oracle 0 nhãn. Hệ quả đã gặp:
  `b7-conv-labels-diff.mjs picker` báo lệch kích thước (215 vs 218) vì picker liệt kê thêm nhãn.
- Agent: oracle có John + Samantha, yona chỉ John → `b6-bulk-diff.mjs` menu agent cao hơn ở oracle
  (0,013% sau khi cắt theo hộp; danh sách in ra ở log cho thấy rõ).
- **Cách so nguyên màn khi fixture lệch:** cắt theo bounding box của khối cần đo (mẫu `b6-assign-diff.mjs`,
  `b7-conv-labels-diff.mjs`) hoặc `mask-diff.mjs` để che cột trái/danh sách; đừng so cả viewport.
  Trong script tự viết: `page.evaluate` đặt `visibility: hidden` cho vùng ngẫu nhiên trước khi chụp
  (mẫu mới trong `f8-mfa-ui.mjs`: QR + lưới mã dự phòng).

## 9. Oracle bật `ACTIVE_RECORD_ENCRYPTION_*` để so 4 màn MFA

- **Chỗ sửa (ngoài repo yona):** `~/www/chatwoot-oracle/.env` — thêm
  `ACTIVE_RECORD_ENCRYPTION_PRIMARY_KEY` / `_DETERMINISTIC_KEY` / `_KEY_DERIVATION_SALT`
  (bản sao lưu `.env.bak-g3h`). Tạo lại CHỈ hai container oracle:
  `podman rm -f oracle-rails oracle-sidekiq && ~/www/chatwoot-oracle/oracle.sh up`
  (postgres/redis + volume giữ nguyên). `curl localhost:3000` = **200**.
- **Harness `~/www/pixel-diff/f8-mfa-ui.mjs` — viết tiếp (trước đây 4 cảnh GATED chỉ chụp lại màn "2FA tắt"
  nên 0,030% là kết quả GIẢ):**
  - Tài khoản riêng `mfa-f8@acme.inc` (mật khẩu `Password1!`) tạo trong CHÍNH account của john ở mỗi bên,
    **xoá ngay sau mỗi lần chụp** — john không bị bật 2FA ở cả hai bên (helper `resetJohnMfa` cũ đã bỏ).
  - Tự sinh mã TOTP (RFC 6238, HMAC-SHA1) từ secret hiện ở khối "Enter code manually" → đi hết wizard:
    QR → mã dự phòng → hoàn tất → đăng xuất → đăng nhập lại để dừng ở bước OTP.
  - Che vùng ngẫu nhiên trước khi chụp: `img[alt="MFA QR Code"]` và `span.font-mono` (lưới mã dự phòng) —
    hai selector này GIỐNG HỆT nhau ở cả Vue gốc lẫn bản React nên che được cả hai bên.
- **Kết quả pixel (light / dark, ngưỡng 0,1%; nền nhiễu của cặp màn này là 0,030%):**
  | cảnh | light | dark |
  |---|---|---|
  | `mfa-setup` | 0,030% | 0,030% |
  | `mfa-backup` | 0,030% | 0,030% |
  | `mfa-on` | 0,035% | 0,035% |
  | `login-otp` | 0,000% | 0,000% |
  Sau khi chụp: `mfa-f8@acme.inc` đã bị xoá ở CẢ hai bên, `john@acme.inc` KHÔNG bật 2FA (đã kiểm lại).
- **Bẫy đã trả giá:** toast "Two-factor authentication has been enabled successfully" tắt theo lịch riêng
  mỗi bên → cảnh `mfa-on` lệch 1,2–1,4%; phải `page.reload()` rồi mới chụp trạng thái tĩnh.
- **Bẫy đã trả giá:** `Account.first` không phải account của john ở yona (john ở account 2) → user test rơi
  vào account khác, wizard không mở được. Phải lấy `User.find_by(email: 'john@acme.inc').accounts.first`.

### Ghi chú hồi quy pixel không phải lỗi của đợt này
- `b6-bulk-diff.mjs` cảnh `b6-bar` 0,205%: oracle cắt chữ thành "1 select…" vì có thêm 2 nút nhãn;
  khác biệt đã ghi ở `b6-notes-fe-bulk.md` (lúc đó 3,114%, giảm còn 0,205% sau khi B7 gắn nút nhãn).
  Ba dropdown của thanh bulk (agent/team/status) 0,013% / 0,000% / 0,000%.

## Kết quả gate cuối đợt

| Gate | Kết quả |
|---|---|
| Pest toàn suite (`DB_DATABASE=yona_rw_test_g3h`) | **2075 pass / 5065 assertion**, 251s — đã `dropdb` sau khi chạy |
| `vendor/bin/pint` (danh sách file của đợt) | sạch (1 file được tự sửa: `app/Models/Conversation.php`) |
| `npx tsc --noEmit` | sạch |
| `npx vitest run` | **709 pass / 89 file** |
| `npm run build` | OK |
| `php artisan i18n:generate --check` | "Bundle i18n khớp lang/" (đợt này KHÔNG thêm khoá i18n mới) |
| `php artisan migrate` trên `yona_rw` | 1 migration mới chạy xong |
| Pixel hồi quy | `d1-automation-ui actions-menu` 0,031/0,028% · `b6-assign agent-open` 0,000% · `b6-bulk` menu 0,013/0,000/0,000% · wizard Add Agents 0,030% · 4 màn MFA ≤0,035% |

## Bảng 11 mục

| # | Mục | Sửa? | Ghi chú |
|---|---|---|---|
| 1 | `Conversation::webhookData()` + gỡ guard macro | **Có** | Model là nguồn duy nhất, Resource chuyển tiếp; Pest khoá dispatch `WebhookJob` |
| 2 | `DropdownItem` slot + focus ô Search | **Có** | `iconSlot/labelSlot` + `focusOnMount`; 0,550% → 0,031% |
| 3 | `SettingsSubPageHeader` + dompurify | **Có** | `SanitizedHtml` dùng chung; thêm Instagram/Tiktok/EmojiIcon |
| 4 | SSRF guard | **Có** | `App\Support\SafeHttp` ở `Webhooks\Trigger` (phủ cả agent bot) + `AvatarFromUrlJob` |
| 5 | Mã hoá `bot_token` Telegram + cột băm | **Có** | Kèm mã hoá 2 bí mật LINE; migration đã chạy trên `yona_rw` |
| 6 | Gộp SSO về `/app/login` | **Có** | Xoá `SsoSessionsController` + route `/app/sso_login` |
| 7 | Chuyển `Reauthorizable` | **Có** | `app/Models/Concerns/`, cập nhật 6 chỗ dùng |
| 8 | `isUrlInvalid` dùng chung | **Có** | Regex `url` của vuelidate nguyên văn; localhost nay bị từ chối (bám gốc) |
| 9 | Oracle `ACTIVE_RECORD_ENCRYPTION_*` | **Có** | Tạo lại 2 container oracle; viết tiếp harness để 4 cảnh MFA so được thật |
| 10 | Lỗi console `focus` của ninja-keys | **Không** | Không tái hiện được ở cả hai bên; cùng thư viện 1.2.3 → khác biệt cố ý, giống gốc |
| 11 | Fixture dev lệch oracle | **Không (cố ý)** | Giữ inbox 25 "Yona" + hội thoại 58/109 + 2 nhãn tiếng Việt; ghi cách cắt hộp/mask khi đo |
