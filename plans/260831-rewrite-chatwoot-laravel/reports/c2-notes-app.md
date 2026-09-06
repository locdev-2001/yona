# C2 — Ghi chú app widget (agent `c2-app`)

## Trang widget

| | |
|---|---|
| URL | `GET /widget?website_token=<token>[&cw_conversation=<jwt>][&locale=xx]` |
| Route | `routes/web.php` — closure trả `view('widget')`, KHÔNG middleware auth, KHÔNG Inertia |
| View | `resources/views/widget.blade.php` (port `app/views/widgets/show.html.erb`) |
| Entry | `resources/js/widget/main.tsx` + `resources/scss/widget.scss` (thêm 2 dòng `input` vào `vite.config.js`) |
| Điều hướng | hash router tự viết (`resources/js/widget/router.ts`): `#/` home · `#/messages` · `#/prechat-form` (chỗ cắm C3) · `#/unread-messages` |

**Khác bản gốc ở chỗ dựng cấu hình:** Rails render sẵn `window.chatwootWebChannel` vào HTML;
ở đây blade không nhúng gì, app tự gọi `POST /api/v1/widget/config` rồi map snake_case →
camelCase đúng bộ khóa cũ (`main.tsx#toChannelConfig`) nên mọi call-site giữ nguyên tên khóa.
`cw_conversation` trên URL (SDK gắn vào) được nạp làm `X-Auth-Token` TRƯỚC `/config` để nhận
lại đúng khách cũ.

## Cây mã

```
resources/js/widget/
  main.tsx              bootstrap: token → /config → store → Echo → render
  App.tsx               vỏ + TOÀN BỘ giao thức postMessage với SDK
  router.ts             hash router + useWidgetRoute
  i18n.ts               t() gắn tiền tố namespace WIDGET
  types.ts              kiểu theo đúng phản hồi API widget
  api/{client,widget}.ts        fetch + X-Auth-Token + website_token (thay axios)
  store/{widgetStore,hooks}.ts  1 external store thay 9 module Vuex
  realtime/{echo,WidgetConnector}.ts
  helpers/{constants,utils,iframe,urlParams,colorHelper,messageHelpers,availabilityHelpers}.ts
  components/  ChatHeader ChatFooter ChatInputWrap ConversationWrap AgentMessage UserMessage
               bubbles(Image/Video/File) Availability TeamAvailability HeaderActions Banner
               Branding EmojiPicker ReplyToChip MessageReplyButton icons
  views/       Home Messages UnreadMessages PreChatForm(chỗ cắm C3) ViewWithHeader
```

## Bảng trace Vue ↔ React

| Nguồn Chatwoot (`app/javascript/`) | Đích Yona (`resources/js/widget/`) | Ghi chú |
|---|---|---|
| `entrypoints/widget.js` + `widget/App.vue` (mounted) | `main.tsx` | createApp/mount → createRoot; cấu hình lấy từ `/config` |
| `widget/App.vue` (template + registerListeners/registerUnreadEvents) | `App.tsx` | switch postMessage giữ nguyên tên event |
| `widget/router.js` | `router.ts` | vue-router hash → `location.hash` + `useSyncExternalStore` kiểu hook |
| `widget/components/layouts/ViewWithHeader.vue` | `views/ViewWithHeader.tsx` | opacity theo scroll, back button, Branding |
| `widget/components/ChatHeader.vue` + `ChatHeaderExpanded.vue` | `components/ChatHeader.tsx` | 2 export trong 1 file |
| `widget/components/HeaderActions.vue` | `components/HeaderActions.tsx` | popout dùng `sdk/helpers/popoutHelper` |
| `widget/components/Banner.vue` | `components/Banner.tsx` + `widgetStore.showBanner` | hẹn giờ 3s nằm trong store |
| `shared/components/Branding.vue` + `useBranding` | `components/Branding.tsx` | `global_config` lấy từ `/config` |
| `widget/components/TeamAvailability.vue` | `components/TeamAvailability.tsx` | |
| `widget/components/Availability/*` + `composables/useAvailability.js` | `components/Availability.tsx` (`useInboxAvailability`) | gộp Container + Text + GroupedAvatars |
| `widget/helpers/availabilityHelpers.js` | `helpers/availabilityHelpers.ts` | **`utcToZonedTime` (date-fns-tz) → `Intl`** — xem Khác biệt #1 |
| `widget/components/ChatFooter.vue` + `FooterReplyTo.vue` | `components/ChatFooter.tsx` | transcript + cooldown 15s |
| `widget/components/ChatInputWrap.vue` + `ChatAttachment.vue` + `ChatSendButton.vue` + `shared/components/ResizableTextArea.vue` | `components/ChatInputWrap.tsx` | gộp 4 file; typing indicator dùng `createTypingIndicator` như dashboard |
| `shared/components/emoji/EmojiPicker.vue` | `components/EmojiPicker.tsx` | dùng lại `shared/components/emoji/pickerHelper` của dashboard; bỏ `virtua` |
| `widget/components/ConversationWrap.vue` + `ChatMessage.vue` + `AgentTypingBubble.vue` + `shared/components/DateSeparator.vue` | `components/ConversationWrap.tsx` | gộp: cuộn đáy, tải tin cũ khi `scrollTop<100`, dải ngày, bong bóng typing |
| `widget/components/AgentMessage.vue` + `AgentMessageBubble.vue` | `components/AgentMessage.tsx` | nhánh bot (cards/form/CSAT…) chưa port — xem Nợ |
| `widget/components/UserMessage.vue` + `UserMessageBubble.vue` + `DragWrapper.vue` | `components/UserMessage.tsx` | vuốt-để-trả-lời gộp bằng touch handler |
| `widget/components/{Image,Video,File}Bubble.vue` | `components/bubbles.tsx` | |
| `widget/components/{ReplyToChip,MessageReplyButton}.vue` | 2 file cùng tên `.tsx` | |
| `widget/views/{Home,Messages,UnreadMessages}.vue` + `UnreadMessage(List).vue` | `views/{Home,Messages,UnreadMessages}.tsx` | UnreadMessages gộp cả list + item |
| `widget/store/modules/{conversation,message,agent,appConfig,contacts,events,conversationAttributes,conversationLabels}` | `store/widgetStore.ts` | 9 module Vuex → 1 external store (`useSyncExternalStore`), cùng lối `dashboard/realtime/store.ts` |
| `widget/store/modules/conversation/helpers.js` + `getters.js` | `helpers/messageHelpers.ts` | phần thuần, có test |
| `widget/api/*` + `helpers/axios.js` | `api/{widget,client}.ts` | fetch thay axios, `credentials: 'omit'` |
| `widget/helpers/utils.js` (IFrameHelper) + `IframeEventHelper.js` | `helpers/iframe.ts` | tiền tố lấy từ `sdk/constants/frameEvents.ts` |
| `widget/helpers/actionCable.js` + `shared/helpers/BaseActionCableConnector.js` | `realtime/WidgetConnector.ts` + `realtime/echo.ts` | ActionCable → Echo/Reverb, `perform('update_presence')` → `POST /api/v1/widget/presence` (60s) |
| `widget/i18n/locale/en.json` | `lang/en/widget.php` → `resources/js/i18n/generated/en.ts` | namespace `WIDGET` — xem Khác biệt #2 |
| `widget/assets/scss/woot.scss` + `views/_conversation.scss` | `resources/scss/widget.scss` | bảng biến màu dùng chung `_next-colors.scss`, không chép lại |
| `shared/assets/fonts/widget_fonts.scss` | `resources/scss/_widget-fonts.scss` | Inter **tĩnh** (dashboard dùng InterVariable) |

## Khác biệt cố ý

1. **Giờ làm việc quy đổi bằng `Intl` thay `date-fns-tz`.** Repo không có `date-fns-tz`;
   `getDateInTimezone` nhận cả offset `+07:00` lẫn tên IANA. Có test riêng. (Backend hiện luôn
   trả `working_hours: []` + `working_hours_enabled: false` — Business Hours chưa port.)
2. **i18n widget nằm dưới namespace `WIDGET`** (`lang/en/widget.php`), call-site gọi
   `t('CHAT_PLACEHOLDER')` qua `widget/i18n.ts` nên tên khóa giữ đúng bản gốc. Lý do: bundle
   widget của Chatwoot để chuỗi ở gốc, mà nhiều khóa trùng tên nhưng KHÁC nội dung với dashboard
   (`THUMBNAIL.AUTHOR.NOT_AVAILABLE`, `COMPONENTS.FILE_BUBBLE`, `EMAIL_TRANSCRIPT`, `EMOJI`…) —
   gộp thẳng sẽ đè lên chuỗi dashboard.
3. **Không ép font Inter cho `body` widget.** Bản gốc chỉ khai báo `@font-face`; chữ chạy bằng
   font hệ thống của Tailwind. Ép Inter (như dashboard) làm lệch pixel với oracle ~2.7%.
4. **Ô nhập tự focus khi mount** (`ResizableTextArea.mounted` gốc focus khi ô rỗng) — thiếu bước
   này khung nhập không có viền màu widget và pixel-diff lệch 1.1%.
5. **Đính kèm đi thẳng trong multipart của `POST /messages`**, không qua ActiveStorage
   `DirectUpload` 2 bước (backend đã gộp — c2-notes-be §DirectUploads).
6. **`set-user` bỏ qua shape trải phẳng.** SDK phát lại `window.$chatwoot.user` lúc `loaded`
   theo shape phẳng, KHÔNG kèm identifier; bản gốc nuốt lỗi trong `try`. Ở đây chỉ gọi API khi
   có cả `identifier` lẫn `user`.
7. **Nhánh React Native WebView không port** (`RNHelper`) — app RN ngoài phạm vi nhóm C.
8. **Store là external store module-level, không Vuex.** Component đọc qua `useWidgetState(selector)`;
   selector phải trả giá trị ổn định (primitive hoặc nhánh state), gom bằng `useMemo` khi cần mảng.
9. **`resources/js/i18n/generated/en.ts` bị sửa** — hệ quả bắt buộc của `php artisan i18n:generate`
   sau khi thêm `lang/en/widget.php` (file sinh, cấm sửa tay).

## Phụ thuộc sang `resources/js/sdk/**` (chỉ đọc, không sửa)

`constants/frameEvents.ts` (tiền tố + `SDK_SET_BUBBLE_VISIBILITY`), `constants/sdkEvents.ts`
(`chatwoot:on-message`, `chatwoot:on-start-conversation`), `helpers/popoutHelper.ts`,
`helpers/colorHelper.ts`. Đây là nguồn chuỗi duy nhất của giao thức — không chép lại.

## Nợ / việc cho người khác

- **Bong bóng bot chưa port**: `content_type` `cards` / `input_select` / `form` / `input_email` /
  `article` / `integrations` / `input_csat`. `AgentMessage.tsx` mới có nhánh text + đính kèm
  (đúng nhánh mặc định bản gốc). → C3 (pre-chat), C5 (CSAT), nhóm D (help center).
- **`views/PreChatForm.tsx` mới là chỗ cắm** — hiện tự chuyển về `#/messages`. C3 dựng form thật.
- **Campaign (C4)**: route `#/campaigns`, `campaignsSnoozedTill`, `setCampaignReadOn`,
  `execute-campaign` chưa port; `UNREAD_OR_CAMPAIGN_ROUTES` trong `App.tsx` là chỗ cắm.
- **Help center (nhóm D)**: `ArticleContainer` trong `Home.vue` chưa port.
- **`/assets/images/chatwoot_bot.png` chưa có trong `public/`** (agent_bot chưa port); `Avatar`
  tự rơi về chữ cái đầu khi ảnh lỗi.
- **Backend — message templates chưa port**: inbox bật `enable_email_collect` thì oracle chèn tin
  bot "Give the team a way to reach you" + ô nhập email ngay sau tin đầu của khách; yona không có.
  Đây là khác biệt DUY NHẤT phát hiện được khi pixel-diff khung chat (tắt cờ ở oracle → 0.000%).
  Nguồn: `app/services/message_templates/hook_execution_service.rb`.
- **CORS/`allowed_domains`** vẫn theo nợ đã ghi ở c2-notes-be (widget test chạy cùng origin).

## Gate đã chạy

1. `npx tsc --noEmit` · `npm run build` · `npm test` → **43 file / 333 test xanh** (thêm 28 test
   widget: `helpers/messageHelpers.test.ts`, `helpers/availabilityHelpers.test.ts`).
2. `php artisan i18n:generate --check` → khớp · `vendor/bin/pint --test` → passed.
3. **E2E trình duyệt** (playwright headless, `~/www/pixel-diff/c2-widget-e2e.mjs <token>`), inbox
   Website `c2-app-test` tạo tạm:
   khách mở `/widget` → thấy lời chào + trạng thái đội ngũ + nút Start Conversation →
   gửi tin → tin hiện trong dashboard (đăng nhập `john@acme.inc`) → agent trả lời →
   **widget nhận không tải lại** (`receivedWithoutReload: true`) → agent gõ → widget hiện bong
   bóng typing → **0 lỗi console**.
4. **Đính kèm** (`c2-widget-attachment.mjs`): chọn tệp → bong bóng ảnh tạm (blob) → server trả về
   → `src` đổi thành `/attachments/<id>/<tên tệp>`; bản ghi `attachments` có trong DB.
5. **SDK nhúng thật** (`c2-widget-sdk-e2e.mjs`, trang `public/widget-test.html` của `c2-sdk`):
   bấm bong bóng → iframe mở → `$chatwoot.hasLoaded = true`, cookie `cw_conversation` được ghi
   (tức SDK nhận `loaded` của app), window event `chatwoot:opened`,
   `chatwoot:on-start-conversation`, `chatwoot:on-message` đều bắn; gửi tin trong iframe chạy.
6. **Pixel-diff so oracle** (`c2-widget-diff.mjs`, `c2-widget-chat-diff.mjs`, khung 400x620):
   | màn | light | dark |
   |---|---|---|
   | home (lời chào + thẻ trạng thái + branding) | **0.000%** | **0.000%** |
   | messages (header thu gọn + ô nhập) | **0.000%** | **0.000%** |
   | chat có tin (bong bóng khách + bong bóng agent + avatar + dải ngày) | **0.000%** | **0.000%** |
   Với inbox oracle để mặc định `enable_email_collect = true` thì lệch 1.85%/1.99% — toàn bộ do
   tin bot email-collect của oracle (nợ backend ở trên), không phải lệch giao diện.
7. **Audit nút** (`c2-widget-buttons.mjs`): home 1 nút, messages 3 nút — hai bên khớp từng vị trí,
   kích thước, icon và trạng thái phản ứng (nút đính kèm "DEAD" ở CẢ HAI bên vì chỉ mở hộp thoại
   chọn tệp của trình duyệt).
8. **Dọn dẹp**: inbox/kênh/hội thoại/tin/đính kèm/liên hệ thử đã xoá ở cả yona lẫn oracle
   (`widgets = 0` hai bên), `~/www/pixel-diff/reset-fixture.sh` chạy xong →
   yona `{"hội thoại":[4],"tin":5}`, oracle `{"hội thoại":[1],"tin":5}`.

## Bẫy đã trả giá

1. **Gọi API trước khi `/config` xong = 404 im lặng.** Bản gốc có token sẵn lúc mount; ở đây phải
   chờ `channelConfig` rồi mới `fetchOldConversations`/gửi `loaded`.
2. **`<input type="file" class="hidden">` vẫn hiện** vì rule `input:not(.reset-base)` trong
   `widget.scss` (`@apply ... block`) nằm ngoài `@layer utilities` nên thắng `.hidden`. Phải thêm
   `reset-base`.
3. **Ép font Inter cho body** làm lệch 2.7% — oracle để font hệ thống (xem Khác biệt #3).
4. **Không tự focus ô nhập khi mount** → mất viền focus màu widget, lệch 1.1%.
5. **Bong bóng đính kèm tạm dùng `blob:`** — script kiểm thử phải đợi `src` đổi sang URL thật,
   không thì kết luận sai là "chưa gửi được".
6. **`enable_email_collect` mặc định bật ở oracle** chèn tin bot vào giữa hội thoại — phải tắt khi
   pixel-diff, nếu không tưởng là lỗi layout.
7. **Gửi tin từ dashboard trong playwright**: gõ ProseMirror rồi `Enter` KHÔNG gửi; phải bấm
   `button[type="submit"]:has-text("Send")`.
