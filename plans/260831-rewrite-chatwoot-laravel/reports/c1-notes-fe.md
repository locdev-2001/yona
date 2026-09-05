# C1 — Ghi chú frontend (agent `c1-fe`)

Nguồn đọc: `refs/chatwoot` @ tag **v4.17.1**. Hợp đồng backend: [c1-notes-be.md](c1-notes-be.md).

> **Đính chính brief:** v4.17.1 **KHÔNG còn** `WidgetBuilder.vue` (grep `app/javascript` = 0 kết quả).
> Màn cấu hình widget đã gộp vào tab **Settings** của `settings/inbox/Settings.vue`: cột trái là
> accordion "Widget features", cột phải là khung xem trước `dashboard/modules/widget-preview/components/Widget.vue`
> (sticky, chỉ hiện khi `isAWebWidgetInbox`). Bản port bám đúng cấu trúc đó — không dựng route riêng.

## Bảng trace Vue ↔ React

| Nguồn Chatwoot | Đích Yona | Ghi chú |
|---|---|---|
| `settings/inbox/channels/Website.vue` | `settings/inboxes/channels/Website.tsx` | form bước 2; đăng ký vào `CHANNEL_VIEWS` của `NewChannel.tsx` (`website`) |
| `settings/inbox/ChannelList.vue` (thẻ Website) | `components/widgets/ChannelItem.tsx` | thêm `'website'` vào `ACTIVE_CHANNELS` — thẻ hết mờ, bấm được |
| `settings/inbox/FinishSetup.vue` (nhánh `web_widget_script`) | `settings/inboxes/FinishSetup.tsx` | fetch inbox để lấy `web_widget_script`; message đổi sang `FINISH.WEBSITE_SUCCESS`; **thêm div bọc `my-4 mx-auto max-w-[70%]`** mà bản gốc render vô điều kiện (kênh API cũng cần — đo lại màn Voilà kênh API: 0.030%) |
| `settings/inbox/Settings.vue` (nhánh web widget) | `settings/inboxes/Show.tsx` | tab `pre-chat-form` chèn giữa `csat` và `configuration` khi là web widget; `max-w-2xl` cột trái + cột phải preview; `inboxNameLabel/PlaceHolder` theo kênh; `canLocktoSingleConversation` **không** gồm web widget nên khối đó chỉ còn ở kênh API; khối Sender name chỉ hiện với web widget/email |
| `settings/inbox/components/SenderNameExamplePreview.vue` | `settings/inboxes/components/SenderNameExamplePreview.tsx` | mới port (B1 chưa cần) |
| `settings/inbox/settingsPage/ConfigurationPage.vue` (nhánh `isAWebWidgetInbox`) | `settings/inboxes/settingsPage/ConfigurationPage.tsx` | Allowed domains (TextArea + Update), Allow mobile webview, accordion Identity Validation (secret key + Require) |
| `modules/widget-preview/components/{Widget,WidgetHead,WidgetBody,WidgetFooter}.vue` | cùng đường dẫn dưới `resources/js/dashboard/modules/widget-preview/components/*.tsx` | giữ đúng cây gốc; `<style scoped>` của Widget.vue → `Widget.scss` (biến màu `.widget-wrapper` + `.dark .widget-wrapper`) |
| `components-next/colorpicker/ColorPicker.vue` | `components-next/colorpicker/ColorPicker.tsx` + `.scss` | vỏ nút pipette; **dùng lại `Chrome` đã port ở B7**, không viết picker thứ hai |
| `components-next/textarea/TextArea.vue` | `components-next/textarea/TextArea.tsx` | bỏ nhánh chữ ký (`allowSignature` không dùng ở đây) |
| `components/Code.vue` | `components/Code.tsx` | bổ sung `lang` / `enableCodePen` / `codepenTitle` + **highlight.js thật** (xem dưới) |
| `helper/URLHelper.js#sanitizeAllowedDomains` | `helper/URLHelper.ts` cùng tên | thêm test `URLHelper.test.ts` |
| `Settings.vue#toggleInput`, `createWebsiteChannel` payload, `LOCAL_STORAGE_KEYS.WIDGET_BUILDER` | `settings/inboxes/webWidgetHelpers.ts` | hàm thuần + test |
| `Widget.vue#widgetScript`, `#replyTimeText` | `modules/widget-preview/widgetScript.ts` | hàm thuần + test |

### Chi tiết đáng nhớ

1. **`web_widget_script` chèn cấu hình bong bóng ở FE**: `script.substring(0,13) + t('…SCRIPT_SETTINGS', {options}) + script.substring(13)`.
   13 ký tự đầu = `"\n    <script>"` — khớp đúng chuỗi backend sinh. Test `widgetScript.test.ts` khoá số 13 này.
2. **Tuỳ chọn bong bóng (position/type/launcherTitle) KHÔNG lưu DB** — đúng như gốc, chỉ nằm ở
   `localStorage['widgetBubble_{inboxId}']`, ghi khi bấm Update. Đo pixel phải set localStorage trước khi load.
3. **`selected_feature_flags` khi rỗng**: nhánh multipart (có avatar) phải `append('channel[selected_feature_flags][]','')`
   như `buildInboxData` gốc; thiếu nó server hiểu "không đổi" thay vì "tắt hết". Nhánh JSON gửi `[]` là đủ.
   4 checkbox chỉ đụng 4 cờ widget — `allow_mobile_webview` (tab Configuration) đi kèm trong mảng, không bị xoá.
4. **`continuity_via_email`** chỉ hiện khi account bật `inbound_emails` (mặc định bật cả hai bên);
   payload gửi `isInboundEmailEnabled && continuityViaEmail` y bản gốc. Nhánh `isOnChatwootCloud`
   (`ENABLE_CONTINUITY_VIA_EMAIL_DISABLED_TEXT` + `hide-toggle`) không port — self-hosted không vào nhánh đó.
5. **Lỗi có sẵn của bản gốc được port nguyên**: `WidgetHead.vue` kiểm `config.welcomeTagLine` (chữ L hoa)
   trong khi object config chỉ có `welcomeTagline` → vế đó luôn false, tức màn "default screen" chỉ bật
   khi có Welcome Heading. Giữ nguyên để trùng hành vi oracle.
6. **`ResizableTextArea` tự focus trong `mounted()`** khi chưa có nội dung → bật Chat mode là ô nhập của
   khung xem trước hiện viền focus ngay. Thiếu chi tiết này thì pixel lệch **0.172%** (viền xanh ô nhập +
   ring focus còn kẹt trên công tắc). Bản port tách `WidgetChatInput` để mount là focus.

## Thay đổi ngoài `settings/inboxes/**` (cần biết khi review)

| File | Thay đổi | Vì sao bắt buộc |
|---|---|---|
| `components/Code.tsx` | thêm `lang`/`enableCodePen`/`codepenTitle`; render bằng `hljs.highlightAuto()` + `dangerouslySetInnerHTML`, class `hljs {ngôn ngữ dò được}` | B1 ghi nợ "form CodePen vào C1"; đoạn nhúng nhiều dòng có tô màu ở oracle nên không tô là lệch pixel. Dựng đúng cách `@highlightjs/vue-plugin@2.1.0` làm: `autodetect` mặc định **true** nên gốc luôn gọi `highlightAuto`, class là `hljs <lang dò được>` |
| `package.json` / `pnpm-lock.yaml` | `+ highlight.js 11.10.0` | **ghim đúng version oracle** (`pnpm-lock` của refs = 11.10.0); `import 'highlight.js/styles/default.css'` trong Code.tsx cho các class mà `_base.scss` không phủ (`hljs-keyword`, `hljs-attr`…). Chunk `Code` tăng lên ~148 kB (lazy, chỉ tải khi mở màn có woot-code) |
| `components/widgets/ColorPicker.tsx` | `Chrome` đổi thành **export** + nhận prop `wrapperClass` (mặc định `colorpicker--chrome`) | hai bản gốc là `<style scoped>` nên `.colorpicker--chrome.vc-chrome` không đè nhau; bản React phải phân biệt bằng lớp (`colorpicker-next--chrome`). Không đổi DOM/hành vi bản widgets |
| `components/widgets/ChannelItem.tsx` | `ACTIVE_CHANNELS = ['api','website']` | mở thẻ kênh Website |
| `helper/URLHelper.ts` | thêm `sanitizeAllowedDomains` | đúng nhà của nó ở bản gốc; C2/C3 dùng lại |
| `shared/components/GreetingsEditor.tsx` | thêm prop `className` | `Website.vue` truyền `class="w-full"` |
| `resources/js/i18n/generated/en.ts` | chạy lại `php artisan i18n:generate` | bundle đang lệch vì `lang/en/errors.php` **của c1-be** chưa sinh; sau khi chạy `--check` xanh. **Không thêm khoá i18n nào** — `INBOX_MGMT.ADD.WEBSITE_CHANNEL.*`, `SETTINGS_POPUP.*`, `WIDGET_BUILDER.*`, `FEATURES.*`, `TABS.PRE_CHAT_FORM`, `COMPONENTS.CODE.CODEPEN` đã có sẵn từ B1 (kiểm cơ học bằng script tra khoá lồng nhau) |
| `public/assets/images/dashboard/bubble-logo.svg` | copy từ `dashboard/assets/images/bubble-logo.svg` | logo trong bong bóng widget |

## Gate

| Gate | Kết quả |
|---|---|
| `npx tsc --noEmit` | xanh |
| `npm run build` | xanh (4.1s) |
| `npm test` | **260/260** (36 file) — thêm 19 test mới ở 3 file |
| `php artisan i18n:generate --check` | xanh (sau khi sinh lại vì `errors.php` của c1-be) |

### Vitest mới

- `settings/inboxes/webWidgetHelpers.test.ts` (11) — payload tạo kênh, `toggleFeatureFlag` (không sửa mảng gốc, dùng chung cho cờ webview), đọc/ghi `widgetBubble_{id}` kể cả khi giá trị hỏng/thiếu trường.
- `modules/widget-preview/widgetScript.test.ts` (5) — chèn `window.chatwootSettings` đúng offset 13, giữ nguyên phần còn lại, rỗng → `''`; ánh xạ 3 mức `reply_time` + fallback.
- `helper/URLHelper.test.ts` (4) — `sanitizeAllowedDomains`.

## Pixel-diff (1280×800, light + dark, ngưỡng 0.1%)

Fixture: tạo inbox Website **cùng tên `c1-website`** hai bên (oracle id 2 / yona id 13), cùng
`website_url`/`widget_color`/`welcome_title`/`welcome_tagline`; **đã xóa sạch sau khi đo**, hai bên còn
đúng inbox `api-test` id=1. Chạy `reset-fixture.sh` trước mỗi lượt.

| Màn | Light | Dark | Ghi chú |
|---|---|---|---|
| Thẻ kênh Website trong lưới (crop 514,99 221×181) | **0.000%** | **0.000%** | toàn trang lưới vẫn 0.51% = khác biệt chủ đích B1 (kênh chưa port để mờ) |
| Form tạo `new/website` | 0.046% | 0.047% | |
| Màn Voilà `new/{id}/finish` | 0.006% | 0.006% | che 2 vùng ngẫu nhiên: cổng BASE_URL (3000/8000) + `websiteToken`. Chưa che: 0.092%/0.085% |
| Tab Settings (widget builder) | 0.030% | 0.030% | = nền nhiễu quen thuộc (logo sidebar/avatar) |
| Tab Settings — Chat mode | 0.030% | 0.030% | |
| Tab Settings — tab Script | 0.095% | 0.092% | phần lệch chỉ là BASE_URL + websiteToken; dòng `window.chatwootSettings` trùng tuyệt đối |
| Tab Settings — picker màu mở | 0.046% | 0.047% | |
| Tab Settings — bong bóng thu gọn (`expanded_bubble` + launcher title) | 0.030% | 0.030% | |
| Tab Configuration | 0.006% | 0.006% | che ô `hmac_token`. Chưa che: 0.100%/0.102% |

**Hồi quy B1 (kênh API) sau khi đổi `Code.tsx` + `Show.tsx`:**
`settings/inboxes/1` 0.037%/0.037% · `settings/inboxes/1/configuration` **0.006%/0.006%** (che 2 token) ·
`settings/inboxes/list` 0.067%/0.064% · `new/1/finish` 0.030%/0.030% · hội thoại 0.060%/0.113% (đúng baseline B3).

Vùng che khai báo trong `~/www/pixel-diff/mask-diff.mjs` (thêm `SETTINGS_MASKS` + 3 slug của C1/B1).

## Audit nút (gate 4)

`audit-buttons.mjs` chạy hai bên trên 3 màn — **kết quả trùng từng nút, từng toạ độ**:

| Màn | Oracle | Yona |
|---|---|---|
| `settings/inboxes/{id}` | Back OK · "Configure your business name" OK(Δ2) · Preview DEAD · Script OK(Δ14) · switch OK(Δ5) · "Start Conversation" DEAD | y hệt (Script Δ15, switch Δ5) |
| `settings/inboxes/new/{id}/finish` | Back OK · Copy DEAD · More settings → · Take me there → | y hệt |
| `settings/inboxes/{id}/configuration` | Back OK · Update OK(Δ3) · switch OK(Δ3) · Copy DEAD | y hệt (Δ2) |

*"DEAD" ở đây trùng oracle*: Preview là tab đang active, Copy ghi clipboard, "Start Conversation" là nút
trang trí trong khung xem trước — cả ba bên oracle cũng không đổi DOM.

## E2E trình duyệt

`~/www/pixel-diff/c1-website-e2e.mjs` (headless, chạy trên yona) — **23/23 kiểm tra đạt**:
lưới kênh → form (nút tạo khoá/mở đúng, picker màu mở) → Add agents → Voilà (script có `chatwootSDK.run`
+ `websiteToken`, có tô màu, có nút Copy) → tab bar có Pre Chat Form → preview cập nhật tức thì theo lời
chào và theo màu picker → Chat mode → tab Script chèn `window.chatwootSettings` + nút CodePen → bỏ cờ
`emoji_picker` + đổi reply time → **F5 vẫn giữ** → tab Configuration: allowed domains được chuẩn hoá
(`ACME.inc\nshop.acme.inc\nacme.inc` → `acme.inc,shop.acme.inc`) và giữ sau F5, công tắc mobile webview
giữ sau F5, khối HMAC hiện → xóa inbox qua modal gõ tên, danh sách sạch sau F5.

`~/www/pixel-diff/c1-widget-ui.mjs --inbox <oracleId>:<yonaId>` chụp + chấm 4 trạng thái tương tác hai bên.

## Khác biệt cố ý / nợ

1. **Tab `Pre Chat Form`** hiện trên thanh tab (đúng oracle) nhưng nội dung trống — thuộc **C3**.
   Business Hours / CSAT / Bot Configuration vẫn trống như B1.
2. **Help Center select** chỉ có option None; `portal_id` vẫn gửi trong payload (server bỏ qua) — portals nhóm D.
3. **`GreetingsEditor` là textarea**, chưa phải richtext ProseMirror — nợ có từ A4/B1, không thuộc C1.
4. **Form tạo gửi JSON**, bản gốc gửi multipart (`buildInboxData`). Backend nhận cả hai; chọn JSON vì
   validate `boolean` của Laravel không nhận chuỗi `'true'`. Nhánh có avatar của màn Settings vẫn dùng
   multipart với `'1'/'0'` như B1.
5. **`channel-type="Context::InboxSettings"`** truyền cho `Editor` ở bản gốc chưa có tương ứng trong
   `Editor.tsx` (ảnh hưởng giới hạn ký tự/đính kèm của editor lõi, không đổi hiển thị).
6. **Logo trong dòng "Powered by …"** dùng `globalConfig.logo`; bản gốc dùng `globalConfig.logoThumbnail`
   (chưa share trong `HandleInertiaRequests`). Ảnh 10×10px, không làm rớt ngưỡng.
7. **Nhánh Chatwoot Cloud** của `continuity_via_email` (xem mục 4 phần trên) không port.

## Finding ngoài phạm vi C1 (báo phiên chính)

1. **`components-next/switch/Switch.tsx` thiếu `<span class="sr-only">{t('SWITCH.TOGGLE')}</span>`** của
   `Switch.vue`. Không đổi pixel (sr-only) nhưng audit nút thấy oracle có text "Toggle switch" còn yona
   rỗng. Sửa 1 dòng, nhưng component dùng chung nhiều màn nên để phiên chính quyết.
2. **Thanh công cụ ProseMirror của `WootWriter/Editor`**: oracle có **5** `.ProseMirror-menuitem` con là
   `<div>`, yona có **9** con là `<button>`. Hiển thị trùng nhau (form tạo đo 0.046%) nhưng audit nút đếm
   thêm 9 nút "DEAD" ở yona. Có từ B3/B10, mọi màn dùng `Editor` đều dính.
3. **Trôi fixture đã sửa**: inbox `api-test` bên **yona** có avatar đã tải lên (oracle không) làm màn
   `settings/inboxes/1` lệch 0.314%. Đã gọi `DELETE …/inboxes/1/avatar`, về 0.037%. Ai upload thì không rõ
   — cần để ý sau các lượt audit nút.

## Bẫy mới

1. `TabBar` của khung xem trước: `getByRole('button', {name:'Script'})` chứ đừng `hasText: /^Script$/` —
   template gốc render `{{ label }} {{ count ? … }}` nên text có khoảng trắng đuôi.
2. Đo trạng thái bong bóng phải **set `localStorage['widgetBubble_{id}']` bằng `addInitScript` trước khi
   load** ở CẢ HAI bên, không thì oracle/yona ở hai cấu hình khác nhau.
3. Đo pixel màn có `woot-code` luôn phải che `websiteToken` / `hmac_token` / cổng `BASE_URL` — ba chuỗi
   này khác nhau theo bản chất.
