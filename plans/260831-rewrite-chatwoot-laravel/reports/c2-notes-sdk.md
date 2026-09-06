# C2 — Ghi chú SDK nhúng (agent `c2-sdk`)

## GIAO THỨC postMessage (chốt — `c2-app` đọc mục này)

Mọi thông điệp hai chiều là **chuỗi** (không phải object), dạng
`chatwoot-widget:<JSON>` với JSON luôn có khóa `event`. Tiền tố nằm ở
`resources/js/sdk/constants/frameEvents.ts` (`FRAME_MESSAGE_PREFIX`) — **nguồn duy nhất**,
app trong iframe import từ đó, đừng chép lại chuỗi.

### SDK (trang chủ) → iframe

`IFrameHelper.sendMessage(key, value)` gửi `chatwoot-widget:{"event":key, ...value}`
tới `iframe.contentWindow` với targetOrigin `'*'`.

| event | payload |
|---|---|
| `config-set` | `locale, position, hideMessageBubble, showPopoutButton, widgetStyle, darkMode, showUnreadMessagesDialog, campaignsSnoozedTill, welcomeTitle, welcomeDescription, availableMessage, unavailableMessage, enableFileUpload, enableEmojiPicker, enableEndConversation` |
| `set-user` | `{identifier, user}` khi gọi `$chatwoot.setUser`; **trải phẳng `window.$chatwoot.user`** khi phát lại lúc `loaded` (đúng bản gốc, hai shape khác nhau) |
| `set-custom-attributes` | `{customAttributes}` |
| `delete-custom-attribute` | `{customAttribute}` |
| `set-conversation-custom-attributes` | `{customAttributes}` |
| `delete-conversation-custom-attribute` | `{customAttribute}` |
| `set-label` / `remove-label` | `{label}` |
| `set-locale` | `{locale}` |
| `set-color-scheme` | `{darkMode}` — đã lọc qua `getDarkMode` |
| `sdk-set-bubble-visibility` | `{hideMessageBubble}` |
| `toggle-open` | `{isOpen}` |
| `change-url` | `{referrerURL, referrerHost}` |
| `toggle-close-button` | `{isMobile}` — bắn lúc `loaded` và mỗi lần `resize` |
| `push-event` | `{eventName}` — hiện chỉ `webwidget.triggered` khi mở bong bóng |

### iframe → SDK

App trong iframe `parent.postMessage('chatwoot-widget:' + JSON.stringify({event, ...}), '*')`.
Tên `event` phải khớp đúng khóa trong `IFrameHelper.events`:

| event | payload | SDK làm gì |
|---|---|---|
| `loaded` | `{config:{authToken, channelConfig:{widgetColor}}}` | ghi cookie `cw_conversation`, gửi `config-set`, dựng bong bóng, bắn `chatwoot:ready` |
| `error` | `{errorType, data}` | bắn `chatwoot:error`; `errorType === 'SET_USER_ERROR'` thì xoá cookie `cw_user_<token>` |
| `onEvent` | `{eventIdentifier, data}` | bắn window event tên `eventIdentifier` (dùng cho `chatwoot:on-message`, `chatwoot:on-start-conversation`) |
| `setBubbleLabel` | `{label}` | đổi chữ bong bóng expanded (ưu tiên `launcherTitle` của trang chủ) |
| `setAuthCookie` | `{data:{widgetAuthToken}}` | ghi lại `cw_conversation` (dùng khi `set_user` cấp token mới) |
| `setCampaignReadOn` | — | ghi `cw_snooze_campaigns_till` hạn 1 giờ |
| `postback` | cả message | bắn `chatwoot:postback` |
| `toggleBubble` | — | mở/đóng |
| `popoutChatWindow` | `{baseUrl, websiteToken, locale}` | đóng widget rồi mở cửa sổ `/widget?...` |
| `closeWindow` | — | đóng + bỏ chế độ unread |
| `updateIframeHeight` | `{extraHeight, isFixedHeight}` | `height: <n>px !important` hoặc `100%` |
| `setUnreadMode` / `resetUnreadMode` | — | thêm/bỏ lớp `has-unread-view` trên `.woot-widget-holder` |
| `handleNotificationDot` | `{unreadMessageCount}` | chấm đỏ `unread-notification` trên bong bóng |
| `closeChat` | — | đóng |
| `playAudio` | — | gọi `window.playAudioAlert()` |

`onBubbleToggle` và `onLocationChange` cũng nằm trong bảng `events` nhưng chỉ SDK tự gọi.

### Cookie SDK ghi (tên + tuổi giữ nguyên bản gốc)

| Tên | Nội dung | Hạn |
|---|---|---|
| `cw_conversation` | `auth_token` (JWT) app trả về ở `loaded` / `setAuthCookie` | 365 ngày |
| `cw_user_<websiteToken>` | hash FNV-1a 128-bit của dữ liệu `setUser` (chống gửi trùng) | 365 ngày |
| `cw_snooze_campaigns_till` | mốc thời gian tắt campaign | 1 giờ |

Tất cả `SameSite=Lax`, `path=/`, `domain` = `chatwootSettings.baseDomain` nếu trang chủ khai.
SDK còn đọc `cw_conversation` lúc dựng iframe và nối vào URL:
`{baseUrl}/widget?website_token=<token>&cw_conversation=<jwt>` — **app phải đọc tham số này**
để nhận lại phiên cũ (backend không đọc query, chỉ đọc header `X-Auth-Token`).

### Sự kiện bắn ra `window` của trang khách hàng

`chatwoot:ready`, `chatwoot:error`, `chatwoot:opened`, `chatwoot:closed`, `chatwoot:postback`,
cộng bất kỳ tên nào app gửi qua `onEvent` (`chatwoot:on-message`,
`chatwoot:on-start-conversation`).

---

## Cách chạy / thử

```bash
npm run build          # dựng CẢ hai bundle: dashboard + SDK
npm run build:sdk      # chỉ SDK → public/packs/js/sdk.js
```

Trang thử: `http://localhost:8000/widget-test.html` (tệp tĩnh `public/widget-test.html`).
Tham số truy vấn:

| tham số | ý nghĩa |
|---|---|
| `sdkBase` | nguồn `sdk.js` (mặc định origin trang). Đặt `http://localhost:3000` để chạy **SDK gốc của oracle** trên đúng trang này |
| `base` | `baseUrl` truyền vào `run()` (mặc định `sdkBase`) |
| `token` | `websiteToken` |
| `stub=1` | trang tự bắn `loaded` thay app trong iframe — dùng khi app chưa sẵn sàng |
| `color`, `label` | `widgetColor` / nhãn bong bóng cho chế độ stub |
| `position`, `type`, `widgetStyle`, `darkMode`, `launcherTitle`, `hideMessageBubble`, `locale` | đổ vào `window.chatwootSettings` |
| `panel=0` | ẩn khung log để chụp ảnh so sánh |

Trang expose `window.__sdkTest`: `stubLoaded()`, `stubBubbleLabel(label)`, `measure()`
(trả kích thước/toạ độ/màu/z-index của bong bóng, nút đóng, khung widget, iframe).
`c2-app` dùng thẳng trang này với `?stub=0` (bỏ `stub`) khi đã có route `/widget`.

## Bảng trace JS gốc ↔ TS mới

| Nguồn Chatwoot | Đích Yona | Ghi chú |
|---|---|---|
| `app/javascript/entrypoints/sdk.js` | `resources/js/sdk/index.ts` | điểm vào IIFE, đặt `window.chatwootSDK.run` |
| `app/javascript/sdk/IFrameHelper.js` | `resources/js/sdk/IFrameHelper.ts` | |
| `app/javascript/sdk/bubbleHelpers.js` | `resources/js/sdk/bubbleHelpers.ts` | |
| `app/javascript/sdk/cookieHelpers.js` | `resources/js/sdk/cookieHelpers.ts` | FNV-1a 128-bit giữ nguyên (vector chuẩn có test) |
| `app/javascript/sdk/DOMHelpers.js` | `resources/js/sdk/DOMHelpers.ts` | |
| `app/javascript/sdk/settingsHelper.js` | `resources/js/sdk/settingsHelper.ts` | |
| `app/javascript/sdk/constants.js` | `resources/js/sdk/constants/design.ts` | |
| `app/javascript/sdk/sdk.css` | `resources/js/sdk/sdk.css` | **chép nguyên, `diff` = 0** |
| `shared/constants/sharedFrameEvents.js` | `resources/js/sdk/constants/frameEvents.ts` | thêm `FRAME_MESSAGE_PREFIX` (gốc viết chuỗi thẳng ở 2 chỗ) |
| `widget/constants/sdkEvents.js` | `resources/js/sdk/constants/sdkEvents.ts` | |
| `widget/constants/errorTypes.js` | `resources/js/sdk/constants/errorTypes.ts` | |
| `shared/helpers/colorHelper.js` (`isWidgetColorLighter`) | `resources/js/sdk/helpers/colorHelper.ts` | chỉ port hàm SDK dùng |
| `shared/helpers/CustomEventHelper.js` | `resources/js/sdk/helpers/customEvent.ts` | |
| `shared/helpers/AudioNotificationHelper.js` | `resources/js/sdk/helpers/audioNotification.ts` | chỉ `initOnEvents` + `getAlertAudio` |
| `widget/helpers/popoutHelper.js` + `urlParamsHelper.js#buildPopoutURL` | `resources/js/sdk/helpers/popoutHelper.ts` | |
| gói `js-cookie` | `resources/js/sdk/helpers/cookies.ts` | bản tối giản, quy tắc mã hoá chép đúng `defaultConverter` v3 |
| `sdk/specs/cookieHelpers.spec.js` | `resources/js/sdk/cookieHelpers.test.ts` | giữ vector băm chuẩn |
| `sdk/specs/settingsHelpers.spec.js` | `resources/js/sdk/settingsHelper.test.ts` | |
| — (mới) | `IFrameHelper.test.ts`, `bubbleHelpers.test.ts`, `helpers/cookies.test.ts` | URL iframe, giao thức postMessage, cookie, lớp/vị trí bong bóng |
| `app/views/widget_tests/index.html.erb` | `public/widget-test.html` | thêm chế độ stub + `__sdkTest.measure()` |

## Khác biệt cố ý

1. **Không dùng `js-cookie`.** Bundle phải độc lập, chạy trên trang khách hàng bất kỳ; thêm một
   phụ thuộc npm chỉ để đọc/ghi 3 cookie là thừa. `helpers/cookies.ts` chép đúng quy tắc mã hoá
   tên/giá trị của js-cookie v3 nên cookie hai bên đọc lẫn nhau được (đã đối chiếu với oracle:
   chuỗi `document.cookie` giống hệt từng ký tự).
2. **Chuỗi `'chatwoot-widget:'` rút thành hằng `FRAME_MESSAGE_PREFIX`.** Bản gốc viết thẳng ở
   `sendMessage` và `initPostMessageCommunication`; gom lại để `c2-app` có một nguồn duy nhất.
3. **Chặn null cho TS strict.** `getAppFrame()`, `document.querySelector('.woot-widget-bubble')`,
   `#woot-widget--expanded__text`, `iframe` trong `reset()` — bản gốc gọi thẳng và sẽ ném lỗi khi
   phần tử chưa có; bản này thoát sớm/no-op. Đường chạy bình thường không đổi hành vi.
   Tương tự `addClasses/removeClasses/toggleClass` nhận `Element | null`.
4. **`onClickChatBubble` bọc handler** (`() => onBubbleClick()`) thay vì truyền thẳng
   `onBubbleClick` — gốc để MouseEvent rơi vào tham số `props`, `props.toggleValue` là `undefined`
   nên kết quả y hệt, chỉ khác là bản này không phụ thuộc vào chuyện đó.
5. **`getAlertAudio` viết lại bằng async/await.** Gốc trả promise resolve ngay rồi mới fetch trong
   nền, nên `.then()` gỡ listener chạy TRƯỚC khi có âm thanh; bản này gỡ listener SAU khi fetch
   xong (hoặc lỗi). Kết cục giống nhau, chỉ khác thời điểm. Chưa có tệp `/audio/widget/ding.mp3`
   trong repo nên nhánh này luôn rơi vào `catch` im lặng — **nợ nhỏ**, tiếng "ding" của widget chưa kêu.
6. **Cấu hình build riêng `vite.sdk.config.js`**, không đụng `vite.config.js` của dashboard.
   `publicDir: false` là **bắt buộc**: `outDir` nằm trong `public/` nên nếu để mặc định vite sẽ
   chép `public/` vào chính nó theo vòng lặp vô hạn (đã dính một lần, ăn 4,4 GB đĩa).
   `target: 'es2020'` vì `fnv1a128` dùng BigInt literal. CSS được nhúng thẳng vào JS
   (`sdk.css?inline`) nên bundle chỉ có đúng một tệp `sdk.js`.

## Việc cho người khác

- **`c2-app`**: route `/widget` chưa tồn tại → iframe hiện trang 404 của Laravel. SDK vẫn chạy đủ
  (bong bóng, mở/đóng, sự kiện) nhờ `?stub=1`; bỏ `stub` khi app sẵn sàng. Nhớ đọc query
  `cw_conversation` trên URL iframe và bắn `loaded` với đúng shape ở bảng trên, nếu không bong bóng
  sẽ **không** bao giờ hiện.
  (Đã kiểm: `resources/js/widget/helpers/iframe.ts` của c2-app import sẵn `FRAME_MESSAGE_PREFIX`
  từ `sdk/constants/frameEvents` — hợp đồng một nguồn đang chạy đúng, không có chuỗi chép lại.)
- **Orchestrator**: `public/packs/js/sdk.js` là **sản phẩm build**. `public/build` đang được
  `.gitignore` bỏ qua, `public/packs` thì chưa → cần quyết định thêm `/public/packs` vào
  `.gitignore` (khuyến nghị, cho đồng bộ với dashboard) hay commit tệp dựng. Mình không sửa
  `.gitignore` vì ngoài phạm vi tệp được giao.
- **`c2-be`**: nhúng cross-origin thật (trang khách hàng ≠ `app.url`) vẫn cần CORS cho
  `/api/v1/widget/*` — nợ này c2-be đã ghi, SDK không giải quyết được.

## Gate đã chạy

1. `npx tsc --noEmit` → **0 lỗi trong `resources/js/sdk/**`**. Lần chạy cuối toàn repo còn đúng
   một lỗi ở `resources/js/widget/components/HeaderActions.tsx` (`buildPopoutURL` chưa export từ
   `widget/helpers/urlParams`) — cây `resources/js/widget/` là của `c2-app` và đang làm dở, không
   thuộc phạm vi mình. Lần chạy trước khi thư mục đó xuất hiện: toàn repo sạch.
2. `npm test` → **305/305** (41 tệp), trong đó **45 test SDK mới** ở 5 tệp.
3. `npm run build` → dashboard build xong (`public/build/manifest.json` **689 khóa, giống hệt trước
   khi sửa**) rồi tới SDK build (`public/packs/js/sdk.js`, 20,76 kB / 6,64 kB gzip).
   Không có tệp lạ lọt vào `public/build`.
4. `curl http://localhost:8000/packs/js/sdk.js` → 200, đúng đường mà `WebWidget::web_widget_script`
   sinh ra (`BASE_URL + "/packs/js/sdk.js"`).
5. **Playwright headless — so trực tiếp với SDK gốc của oracle**
   (`~/www/pixel-diff/c2-sdk-e2e.mjs`). Cùng một trang `widget-test.html` ở `:8000`, cùng
   `base=http://localhost:8000`, chỉ đổi `sdkBase` giữa `:8000` (bản port) và `:3000` (oracle) —
   nên khác biệt duy nhất là mã SDK.

   | biến thể | pixel đóng | pixel mở | số đo DOM trùng |
   |---|---|---|---|
   | standard bên phải | 0 | 0 | ✓ |
   | standard bên trái | 0 | 0 | ✓ |
   | widgetStyle=flat | 0 | 0 | ✓ |
   | type=expanded_bubble | 0 | 0 | ✓ |
   | màu sáng `#ffffff` (nhánh `bubble-color--lighter`) | 0 | 0 | ✓ |
   | di động 375×812 | 0 | 0 | ✓ |

   Số đo so khớp gồm class, toạ độ, kích thước, `background`, `border-radius`, `visibility`,
   `z-index` của `.woot--bubble-holder`, bong bóng chat, nút đóng, `.woot-widget-holder`, iframe —
   ở cả ba trạng thái đóng → mở → đóng lại. Ảnh: `~/www/pixel-diff/shots/c2-sdk-*.png`.

6. **So bề mặt API và giao thức với oracle** (cùng kịch bản, cùng trang):
   - danh sách khoá `window.$chatwoot`: **giống hệt**;
   - toàn bộ trạng thái `$chatwoot` sau `setUser`: **giống hệt**;
   - 17 thông điệp postMessage sinh ra khi gọi lần lượt `setUser`, `setCustomAttributes`,
     `deleteCustomAttribute`, `setConversationCustomAttributes`,
     `deleteConversationCustomAttribute`, `setLabel`, `removeLabel`, `setLocale`, `setColorScheme`,
     `toggleBubbleVisibility('hide'|'show')`, `toggle('open'|'close')`: **giống hệt từng ký tự**,
     trừ đúng một thông điệp `change-url` mang URL của chính trang thử (khác nhau vì tham số
     `sdkBase` khác — không phải khác biệt của SDK);
   - `document.cookie` sau kịch bản: **giống hệt**, gồm cả hash `cw_user_widget-test-token=
     a1bca097e10a346af89083a2a3cc5536` → xác nhận FNV-1a 128-bit trùng khớp.
7. Chụp toàn trang khi mở: khung widget 400×636, bo góc 16px, đổ bóng đúng
   (`shots/c2-sdk-fullpage-open.png`); bên trong là trang 404 vì `/widget` chưa có — đúng như
   phần "Việc cho người khác".
