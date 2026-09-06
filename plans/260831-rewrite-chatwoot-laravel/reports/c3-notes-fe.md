# C3 — Ghi chú frontend (agent `c3-fe`)

Nguồn đọc: `refs/chatwoot` @ tag **v4.17.1**. Hợp đồng backend: [c3-notes-be.md](c3-notes-be.md).
Nền đã có: [c1-notes-fe.md](c1-notes-fe.md) (thanh tab), [c2-notes-app.md](c2-notes-app.md) (app widget),
[c2-notes-sdk.md](c2-notes-sdk.md) (giao thức postMessage).

## Bảng trace Vue ↔ React

| Nguồn Chatwoot (`app/javascript/`) | Đích Yona (`resources/js/`) | Ghi chú |
|---|---|---|
| `dashboard/routes/dashboard/settings/inbox/PreChatForm/Settings.vue` | `dashboard/settings/inboxes/PreChatForm/Settings.tsx` | bật/tắt + editor thông điệp + bảng trường + nút Update |
| `dashboard/.../PreChatForm/PreChatFields.vue` | `dashboard/settings/inboxes/PreChatForm/PreChatFields.tsx` | `vuedraggable` → HTML5 drag-and-drop thuần (xem Khác biệt #2) |
| `dashboard/helper/preChat.js` | `dashboard/helper/preChat.ts` | hàm thuần + test port từ `specs/preChat.spec.js` |
| `settings/inbox/Settings.vue` (`v-if="selectedTabKey === 'pre-chat-form'"`) | `dashboard/settings/inboxes/Show.tsx` | panel bọc `<div>` không class — y bản gốc, `mx-6` nằm trong Settings.tsx |
| `widget/views/PreChatForm.vue` | `widget/views/PreChatForm.tsx` | chỗ cắm của C2 thay bằng form thật |
| `widget/components/PreChat/Form.vue` | `widget/components/PreChat/Form.tsx` | **FormKit dựng tay** — xem Khác biệt #1 |
| `widget/components/Form/PhoneInput.vue` | `widget/components/Form/PhoneInput.tsx` | dropdown quốc gia + mã vùng; dùng `shared/components/PhoneInput/helper` đã có |
| `widget/components/template/EmailInput.vue` | `widget/components/template/EmailInput.tsx` | bong bóng bot `input_email` |
| `widget/components/AgentMessageBubble.vue` (nhánh `isTemplateEmail`) | `widget/components/AgentMessage.tsx` | thêm nhánh `content_type === 'input_email'` |
| `widget/mixins/configMixin.js#preChatFormOptions` | đọc thẳng `channelConfig.preChatFormOptions` | store C2 đã map sẵn |
| `widget/api/endPoints.js#createConversation` + `store/modules/conversation/actions.js#createConversation` | `widget/api/widget.ts` + `widget/store/widgetStore.ts` | tin đầu đi kèm ngay trong `POST /conversations` |
| `shared/helpers/Validators.js` (3 hàm) | `shared/helpers/Validators.ts` | chỉ port hàm form tiền chat dùng |
| phần thuần của `Form.vue` (`getValidation`, `filteredPreChatFields`, `getValue`, `findFieldType`) | `widget/helpers/preChatHelpers.ts` | có test |

## Khác biệt cố ý

1. **FormKit không có bản React → dựng tay đúng cây DOM nó sinh.** Đã dump DOM oracle
   (`form.formkit-form` → `div.formkit-outer[data-family][data-type]` → `div.formkit-wrapper` →
   `label.formkit-label` + `div.formkit-inner` → input, và `ul.formkit-messages > li.formkit-message`
   khi lỗi) rồi dựng lại từng lớp; CSS lấy nguyên `<style>` của `Form.vue` sang `resources/scss/widget.scss`.
   Luật kiểm tra port thành `preChatHelpers.ts`:
   - thứ tự luật giữ nguyên (`optional` gặp giá trị rỗng thì bỏ qua phần còn lại; luật hỏng đầu tiên
     quyết định thông báo) — đúng cách FormKit dừng ở rule chặn đầu tiên;
   - `email` dùng regex của luật `email` FormKit; `startsWithPlus`/`isValidPhoneNumber` lấy từ
     `shared/helpers/Validators`;
   - hiện lỗi khi **blur** hoặc sau khi bấm gửi — `validation-visibility` mặc định của FormKit.
   **Không port**: `div.formkit-actions` (nút submit ẩn), thuộc tính `data-empty`/`data-complete`/
   `data-submitted` (không có CSS bám vào), và thuộc tính rơi vãi `has-error-in-phone-input="false"`
   mà Vue gắn nhầm lên mọi input (không hợp lệ, không ảnh hưởng pixel).
2. **Kéo thả bảng trường dùng HTML5 drag-and-drop của trình duyệt**, không thêm thư viện
   (`vuedraggable`/Sortable chưa được port và repo không có gói tương đương). Đã đo: kéo hàng 1
   xuống vị trí 3 → hai bên cho **cùng một thứ tự**, lưu và F5 đều giữ (`c3-drag.mjs`).
   Khác biệt DOM duy nhất: oracle gắn `data-draggable="true"` lên `<tr>`, bản port gắn `draggable`.
3. **Ô "Message" khai luật thẳng trong template bản gốc** (`validation="required"`), không đi qua
   `getValidation`. Bản port truyền `MESSAGE_FIELD_RULES` vào `firstFailingRule` thay vì nhét ca đặc
   biệt vào bảng luật chung. *(Bẫy: bỏ sót chỗ này thì submit rỗng chỉ hiện 1 lỗi thay vì 2.)*
4. **`appConfig/getIsUpdatingRoute` không port.** Cờ này chỉ khoá nút trong lúc `vue-router`
   chuyển route (chống bấm hai lần khi mạng chậm); hash router của C2 đổi route đồng bộ nên không
   có khoảng thời gian đó. Nút vẫn khoá theo `uiFlags.isCreating`.
5. **Nhánh campaign chưa port (C4)**: `hasActiveCampaign` luôn false → luôn hiện ô Message và luôn
   đi nhánh tạo hội thoại mới. Chỗ cắm nằm trong `views/PreChatForm.tsx`.
6. **Trường tuỳ biến chưa có nguồn dữ liệu**: `attributes/getAttributes` (định nghĩa thuộc tính
   tuỳ biến) chưa có endpoint ở bản port nên `Settings.tsx` truyền `customAttributes: []`. Toàn bộ
   đường xử lý (`getCustomFields`, luật `matches`, kiểu `select`/`checkbox`/`url`/`date`,
   `contact_attribute` vs `conversation_attribute`) **đã port và có test**, chỉ chờ endpoint.
7. **`Home.vue#startConversation` chỉ xét `preChatFormEnabled`**, KHÔNG dùng `shouldShowPreChatForm`.
   Bản C2 đang dùng nhầm cái sau; đã sửa lại đúng bản gốc — form bật mà không trường nào bật thì
   vẫn vào màn form (chỉ còn ô Message).

## Thay đổi ngoài `settings/inboxes/**` + `widget/**` (cần biết khi review)

| File | Thay đổi | Vì sao bắt buộc |
|---|---|---|
| `resources/js/shared/helpers/Validators.ts` | **mới** — `isPhoneNumberValidWithDialCode`, `startsWithPlus`, `getRegexp` | đúng nhà của chúng ở bản gốc (`shared/helpers/Validators.js`); dashboard lẫn widget đều sẽ dùng lại |
| `resources/js/dashboard/helper/preChat.ts` (+ `.test.ts`) | **mới** | đúng nhà bản gốc (`dashboard/helper/preChat.js`) |
| `resources/js/shared/components/Spinner.tsx` | thêm prop `className` (mặc định `''`) | hai call-site của C3 truyền `class="p-0"` / `class="mx-2"` như bản gốc; thay đổi cộng thêm, không đổi hành vi cũ |
| `resources/js/widget/types.ts` | `PreChatField` thêm `placeholder`/`regex_pattern`/`regex_cue` | trường sinh từ thuộc tính tuỳ biến có các khoá này |
| `resources/scss/widget.scss` | `.formkit-*` + `.email-input-group` | chép nguyên `<style>` của `PreChat/Form.vue` (không scoped ở bản gốc) và `<style scoped>` của `template/EmailInput.vue` |
| `public/assets/images/chatwoot_bot.png` | copy từ `refs/chatwoot/public/assets/images/` | **nợ C2** — thiếu file này avatar bot rơi về chữ cái đầu, lệch **0.114%** ở màn email-collect; copy xong về 0.000%. Đã `cmp` với ảnh oracle đang phục vụ: trùng byte |

Không thêm khoá i18n nào — `INBOX_MGMT.PRE_CHAT_FORM.*`, `INBOX_MGMT.SETTINGS_POPUP.UPDATE_PRE_CHAT_FORM_SETTINGS`,
`WIDGET.PRE_CHAT_FORM.*`, `WIDGET.EMAIL_PLACEHOLDER`, `WIDGET.START_CONVERSATION` đã có sẵn từ B1/C2.
`php artisan i18n:generate --check` xanh.

## `setUser` + `identifier_hash` trong SDK — ĐÃ CÓ ĐỦ, KHÔNG SỬA GÌ

Kiểm cơ học `resources/js/sdk/`:

- `sdk/index.ts#setUser` khớp từng dòng với `entrypoints/sdk.js#setUser` (kiểm kiểu identifier,
  `hasUserKeys`, so hash cookie để bỏ lần gửi trùng, `set-user` qua postMessage, ghi
  `cw_user_<websiteToken>`);
- `sdk/cookieHelpers.ts` có `identifier_hash` trong `ALLOWED_USER_ATTRIBUTES` — hash cookie đổi khi
  chữ ký đổi, nên đổi chữ ký là gửi lại;
- `widget/store/widgetStore.ts#setContactUser` chuyển tiếp `identifier_hash` xuống
  `PATCH /contact/set_user`, nhận `widget_auth_token` thì thay `X-Auth-Token` + bắn `setAuthCookie`
  cho SDK, rồi nạp lại hội thoại.

E2E thật (`~/www/pixel-diff/c3-setuser-e2e.mjs`, trang `public/widget-test.html`, HMAC tính bằng
`crypto.createHmac('sha256', hmac_token)`):

| Ca | Kết quả |
|---|---|
| chữ ký đúng | `PATCH /contact/set_user` **200** → `GET /contact` nạp lại; DB: `contact_inboxes.hmac_verified = true`, contact có `identifier` + name + email |
| chữ ký sai | **401**, không ghi gì (SDK nhận `SET_USER_ERROR`, xoá cookie `cw_user_*`) |
| lỗi console | 0 |

## Gate

| Gate | Kết quả |
|---|---|
| `npx tsc --noEmit` | xanh |
| `npm run build` | xanh (dashboard 5,0s + SDK 1,5s) |
| `npm test` | **362/362** (45 file) — thêm **29 test** ở 2 file mới |
| `php artisan i18n:generate --check` | xanh |

### Vitest mới

- `dashboard/helper/preChat.test.ts` (6) — port `specs/preChat.spec.js`: `getPreChatFields`,
  `getFormattedPreChatFields` (khoá i18n là `EMAIL_ADDRESS` chứ không phải `emailAddress` nên nhãn
  luôn rơi về `item.label` — port đúng cả nhánh tra được), `getCustomFields` (kèm regex, kèm ca
  thuộc tính đã có mặt).
- `widget/helpers/preChatHelpers.test.ts` (23) — port `PreChat/specs/Form.spec.js` cho
  `validationRulesFor`, cộng `firstFailingRule` (thứ tự luật, `optional` bỏ qua khi rỗng, regex bỏ cờ
  `g` để lần gõ sau không lệch), `filterPreChatFields`, `valueForField`, `buildPreChatSubmission`.

## Pixel-diff so oracle

Fixture: inbox Website **cùng tên `c3-website`** hai bên (oracle id 5 / yona id 19), cùng
`website_url`/`widget_color`/`welcome_title`/`welcome_tagline`, cùng `pre_chat_form_options`.
**Đã xoá sạch sau khi đo** (inbox + kênh + hội thoại + tin + contact_inbox + liên hệ chỉ thuộc
inbox đó), `reset-fixture.sh` chạy xong: yona `{"hội thoại":[4],"tin":5}`, oracle `{"hội thoại":[1],"tin":5}`.

### Widget (400×620, `node c3-widget-diff.mjs <oracleToken> <yonaToken> <màn>`)

| Màn | Light | Dark |
|---|---|---|
| Form tiền chat (3 trường + Message + nút) | **0.000%** | **0.000%** |
| Form tiền chat — submit rỗng (2 dòng lỗi) `c3-widget-diff2.mjs` | **0.000%** | **0.000%** |
| Form tiền chat — email sai định dạng (`prechat-error`) | **0.000%** | **0.000%** |
| Bong bóng bot email-collect (2 tin bot + ô nhập email) | **0.000%** | **0.000%** |

### Dashboard (1280×800, `node c3-dash-diff.mjs <oracleInboxId> <yonaInboxId>`)

| Màn | Light | Dark |
|---|---|---|
| Tab Pre Chat Form — bật (editor + bảng 3 trường + Update) | 0.030% | 0.030% |
| Tab Pre Chat Form — tắt (chỉ khối công tắc + Update) | 0.030% | 0.030% |

0.030% = **nền nhiễu quen thuộc** của mọi màn Settings (logo sidebar SVG inline, bút chì ô search,
avatar John) — đã ghi ở c1-fe. Ảnh diff xác nhận không có điểm đỏ nào trong vùng nội dung.

**Hồi quy**: `conversations-ui.mjs all` → 0.030%/0.030% (đúng baseline).

### Kiểm chứng tương đương dữ liệu lưu

Bấm "Update Pre Chat Form Settings" ở **cả hai bên** rồi so `pre_chat_form_options` đã lưu:
**trùng từng khoá, từng giá trị, cùng thứ tự** — kể cả khoá `placeholder` mà cả hai bên đều **tự
thêm vào** khi lưu (giá trị = `name` của trường, do `getPlaceHolder` rơi về `item.name`).
Đây là điểm dễ tưởng là lệch: DB mặc định KHÔNG có `placeholder`, chỉ có sau lần Update đầu tiên.

## Audit nút (gate 4)

| Màn | Oracle | Yona |
|---|---|---|
| `settings/inboxes/{id}/pre-chat-form` | Back OK · công tắc "Enable pre chat form" OK(Δ-109) · 3 công tắc trường DEAD · Update DEAD | y hệt (Δ-108) + **9 nút ProseMirror thừa** |
| Widget — màn form tiền chat | 2 nút: Back OK · Start Conversation OK | y hệt, trùng toạ độ và kích thước |
| Widget — màn có bong bóng email-collect | 8 nút; nút mũi tên gửi email 42×40 **disabled khi rỗng và khi email sai, bật khi hợp lệ** | y hệt 8 nút, cùng toạ độ (trừ nút reply-hover lệch 8px vì độ dài chữ tin nhắn thử khác nhau) và cùng trạng thái disabled |

*"DEAD" trùng oracle*: công tắc trường và nút Update chỉ đổi state/gọi PATCH, không đổi số phần tử DOM.
**9 nút ProseMirror thừa** = finding #2 của c1-fe (oracle render `.ProseMirror-menuitem` bằng `<div>`,
yona bằng `<button>`) — có từ B3/B10, dính mọi màn dùng `Editor`, **không phải hồi quy của C3**.

## E2E trình duyệt (`~/www/pixel-diff/c3-prechat-e2e.mjs <inboxId> <websiteToken>`)

Chạy trên yona, headless, **tất cả đạt, 0 lỗi console**:

1. Tab Pre Chat Form: 3 hàng đúng `keys` (`emailAddress`/`fullName`/`phoneNumber`), `types`
   (`email`/`text`/`text`), 7 cột tiêu đề (`'', '', Key, Type, Required, Label, Placeholder`).
2. Sửa nhãn `emailAddress` + tắt `phoneNumber` → Update → **F5 vẫn giữ**.
3. Widget: form hiện đúng nhãn vừa sửa, **không còn trường điện thoại**, thông điệp trước chat đúng.
4. Gửi khi trống → `["Required", "Message too short"]`. Nhập email sai → `["Please enter a valid email
   address", "Message too short"]`.
5. Điền đủ → hội thoại tạo, chuyển sang `#/messages`, tin đầu là nội dung khách gõ; **không** có
   bong bóng email-collect (khách đã có email). Dashboard đọc lại: contact đúng name + email.
6. Tắt trường email ở dashboard → khách mới gửi form → **2 tin bot** ("Give the team a way to reach
   you." + "Get notified by email") + ô nhập email; nút gửi khoá khi rỗng/sai, mở khi hợp lệ; gửi
   xong ô nhập biến mất và email hiện thành bong bóng của khách; contact có email.
7. Bật lại trường email → trạng thái về như cũ.

Kéo thả (`c3-drag.mjs`) chạy **cả hai bên**, cùng kết quả: `[email,full,phone]` → kéo hàng 1 xuống
vị trí 3 → `[full,phone,email]`, lưu + F5 vẫn giữ.

## Bẫy đã trả giá

1. **Tạo inbox Website bằng tinker phải đặt `channel_type = 'Channel::WebWidget'`** (chuỗi kiểu Rails),
   không phải FQCN PHP — sai thì `ResolveWidgetChannel` không tìm ra kênh và `/api/v1/widget/config`
   trả **404 im lặng**, widget hiện trắng vì bọc `invisible`.
2. **Trình duyệt tự chặn submit khi `input[type=email]` có giá trị sai** → sự kiện `submit` không bắn.
   Cả oracle lẫn bản port đều vướng, nên khi đo lỗi "email sai" thì chỉ có 1 dòng lỗi (do blur), còn
   muốn thấy đủ lỗi phải bấm gửi khi form **trống**.
3. **`emailAddress` mặc định `required: true`** — không tắt trường này thì không bao giờ gửi được form
   mà khách vẫn chưa có email, tức không dựng được ca email-collect.
4. **Khoá `placeholder` chỉ xuất hiện sau lần Update đầu tiên** (xem mục Kiểm chứng tương đương).
   So DB hai bên trước/sau Update phải cùng trạng thái, không thì tưởng là lệch.
5. `getPreChatFields` phải nhận `preChatFormOptions` **của inbox**, không phải `pre_chat_fields` trần
   — bản gốc `setDefaults` đọc `pre_chat_message` từ cùng object đó.
6. Sau khi khách nhập email vào bong bóng bot, **tên liên hệ bị ghi đè bằng phần trước `@`** của email.
   Đã kiểm chứng oracle làm y hệt (`c3-collect-oracle.mjs`) — **không phải lỗi của bản port**.

## Nợ / việc cho người khác

1. **Trường tuỳ biến trong form tiền chat** chờ endpoint định nghĩa thuộc tính tuỳ biến
   (`/api/v1/accounts/{id}/custom_attribute_definitions`). Khi có, chỉ cần đổi
   `customAttributes: []` trong `PreChatForm/Settings.tsx` — phần render + validate đã sẵn.
2. **Nhánh campaign (C4)** trong `views/PreChatForm.tsx` và `components/PreChat/Form.tsx`
   (`activeCampaignId`, `PRE_CHAT_FORM.CAMPAIGN_HEADER`, ẩn ô Message).
3. **Thông báo lỗi luật `url`/`date`** dùng chuỗi chung `PRE_CHAT_FORM.REGEX_ERROR` thay vì chuỗi
   mặc định của FormKit — hai luật này chỉ tới được qua trường tuỳ biến (chưa có nguồn dữ liệu),
   sẽ đối chiếu lại cùng nợ #1.
4. **9 nút ProseMirror thừa** (finding c1-fe #2) vẫn còn, thuộc `Editor` dùng chung.

## Finding ngoài phạm vi C3 (báo phiên chính)

1. **Trôi fixture liên hệ**: yona có contact `Robert Nguyen <theghostz2612@gmail.com>` (tạo 02/09)
   mà oracle không có → `Contact::count()` lệch 2 vs 1. Không do phiên này (đã kiểm mốc tạo), nhưng
   sẽ làm lệch mọi phép đo màn Contacts.
