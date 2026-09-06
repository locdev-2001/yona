# F1 — Kênh Email, ghi chú frontend (agent `f1-fe`)

Nguồn đọc: `refs/chatwoot` @ tag **v4.17.1**. Hợp đồng backend: [f1-notes-be.md](f1-notes-be.md).
Cách wizard kênh được cắm: [c1-notes-fe.md](c1-notes-fe.md).

## Bảng trace Vue ↔ React

| Nguồn Chatwoot | Đích Yona | Ghi chú |
|---|---|---|
| `settings/inbox/channels/Email.vue` + `emailChannels/ForwardToOption.vue` | `settings/inboxes/channels/Email.tsx` | một file: lưới nhà cung cấp + form "Other providers"; đăng ký `email` vào `CHANNEL_VIEWS` của `NewChannel.tsx` |
| `settings/inbox/ChannelList.vue` (thẻ Email) | `components/widgets/ChannelItem.tsx` | thêm `'email'` vào `ACTIVE_CHANNELS` |
| `emailChannels/EmailInboxFinish.vue` | `settings/inboxes/channels/EmailInboxFinish.tsx` | lời nhắn theo `forwarding_enabled`, khối `forward_to_email`, link sang tab Configuration |
| `settings/inbox/FinishSetup.vue` (nhánh `isAnEmailChannel && !provider`) | `settings/inboxes/FinishSetup.tsx` | `message` rỗng khi là kênh email — `EmailInboxFinish` tự viết lời nhắn |
| `settings/inbox/ImapSettings.vue` | `settings/inboxes/settingsPage/ImapSettings.tsx` | |
| `settings/inbox/SmtpSettings.vue` | `settings/inboxes/settingsPage/SmtpSettings.tsx` | |
| `settings/inbox/components/SingleSelectDropdown.vue` | `settings/inboxes/settingsPage/components/SingleSelectDropdown.tsx` | |
| `settings/inbox/components/InputRadioGroup.vue` | `settings/inboxes/settingsPage/components/InputRadioGroup.tsx` | `<style scoped>` đổi sang lớp Tailwind tương đương |
| `settingsPage/ConfigurationPage.vue` nhánh `isAnEmailChannel` | `settings/inboxes/settingsPage/ConfigurationPage.tsx` | khối "Forward to Email" + IMAP + SMTP (SMTP chỉ hiện khi `inbox.imap_enabled` đã LƯU) |
| `settings/inbox/Settings.vue` (`inboxName`, khối Sender name) | `settings/inboxes/Show.tsx` | tiêu đề `"{name} ({email})"`; khối Sender name mở cho `isAWebWidgetInbox \|\| isAnEmailChannel`, `isWebsiteChannel` nay truyền theo kênh |
| `components-next/message/bubbles/Email/Index.vue` | `components-next/message/bubbles/Email/Index.tsx` + `Index.scss` | |
| `components-next/message/bubbles/Email/EmailMeta.vue` | `components-next/message/bubbles/Email/EmailMeta.tsx` | |
| gói `vue-letter` (`<Letter>`) | `components-next/message/bubbles/Email/Letter.tsx` | gọi thẳng `lettersanitizer.sanitize` — xem "Khác biệt cố ý" 1 |
| `components-next/message/Message.vue` (`variant`, `componentToRender`) | `components-next/message/Message.tsx` | thêm nhánh `isEmailInbox` + `content_type = incoming_email` |
| `helper/emailQuoteExtractor.js` | `dashboard/helper/emailQuoteExtractor.ts` | port nguyên |
| `helper/quotedEmailHelper.js` | `dashboard/helper/quotedEmailHelper.ts` | port nguyên |
| `components/widgets/conversation/helpers/emailHeadHelper.js` | `components/widgets/conversation/helpers/emailHeadHelper.ts` | biểu thức email của `@vuelidate/validators` viết thẳng |
| `components/widgets/conversation/ReplyEmailHead.vue` | `components/widgets/conversation/ReplyEmailHead.tsx` + `.scss` | |
| `components/widgets/conversation/QuotedEmailPreview.vue` | `components/widgets/conversation/QuotedEmailPreview.tsx` | |
| `ReplyBox.vue` (nhánh email) | `conversation/conversationbox/ReplyBox.tsx` | channelType lấy theo inbox; cc/bcc/to; trích dẫn thư trước; `MESSAGE_MAX_LENGTH.EMAIL` |
| `WootWriter/ReplyBottomPanel.vue` (nút `i-ph-quotes`) | `conversation/conversationbox/ReplyBottomPanel.tsx` | thêm 3 prop `showQuotedReplyToggle`/`quotedReplyEnabled`/`onToggleQuotedReply` |
| `composables/useUISettings.js` (`slugifyChannel`, cờ signature/quoted reply) | `dashboard/composables/useUISettings.ts` | hai hàm sinh khóa `*_signature_enabled` / `*_quoted_reply_enabled` |
| `components-next/NewConversation/components/EmailOptions.vue` | `components-next/NewConversation/components/EmailOptions.tsx` | |
| `NewConversation/ComposeNewConversationForm.vue` (nhánh email) | `components-next/NewConversation/ComposeConversation.tsx` | subject bắt buộc, payload `additional_attributes[mail_subject]` + `message.cc_emails/bcc_emails` |

## i18n

**Không thêm khóa nào.** Toàn bộ khóa email đã có sẵn trong `lang/en/{inbox_mgmt,email_header,chat_list,conversation,compose_new_conversation}.php`
(kiểm cơ học bằng script tra khóa lồng nhau — 50/51 khóa dùng tới đều tồn tại; khóa còn lại
`CONVERSATION.FOOTER.QUOTED_REPLY_TOGGLE` là do mình đoán sai, bản gốc dùng
`CONVERSATION.REPLYBOX.QUOTED_REPLY.{ENABLE,DISABLE}_TOOLTIP` — cũng đã có).
`php artisan i18n:generate --check` xanh, không phải sinh lại.

## Thư viện thêm vào

| Gói | Thay cho | Lý do |
|---|---|---|
| `lettersanitizer@1.0.8` | `vue-letter@0.2.2` | `vue-letter` chỉ là vỏ Vue quanh `lettersanitizer.sanitize`; `react-letter` (cùng tác giả) **không** nhận `allowedCssProperties` mà bubble email cần, nên gọi thẳng gói lõi. Version ghim đúng bản `pnpm-lock` của refs. |

## Khác biệt cố ý

1. **`Letter.tsx` tự viết thay `react-letter`** — `vue-letter` khai báo prop
   `preserveCssPriority` kiểu `Boolean`, nên khi call-site (bubble email) **không** truyền,
   Vue đưa xuống `false` chứ không phải mặc định `true` của `sanitize`. Bản port truyền
   `preserveCssPriority: false` để HTML sinh ra trùng oracle. `sanitize` được `useMemo` theo
   `html/text` vì nó sinh id ngẫu nhiên `msg_XXXX` mỗi lần gọi (Vue gọi một lần lúc setup).
2. **Bubble email KHÔNG có `TranslationToggle`** — cùng nhánh đã bỏ ở bubble Text (B3);
   `useTranslations` chưa port. Ba biến `renderOriginal`/`translationKeySuffix`/`messageContent`
   của bản gốc rút gọn theo.
3. **Nhánh Microsoft/Google của wizard chỉ hiện trên bản cài tên "Chatwoot"** — đúng getter
   `globalConfig/isAChatwootInstance`: `installationName !== 'Chatwoot'` thì lọc còn nhà cung cấp
   đang bật. Yona (`APP_NAME=Yona`) → chỉ còn thẻ **Other Providers**; oracle (Chatwoot) → 3 thẻ.
   Đây là lý do pixel-diff toàn trang của màn chọn nhà cung cấp không so được — xem mục Pixel.
   Luồng OAuth (`Google.vue`/`Microsoft.vue`/`OAuthChannel.vue`) **nợ F6** cùng backend OAuth.
4. **`InboxReconnectionRequired` chưa port** — banner này chỉ dựng trong `channels/{google,
   microsoft,instagram,tiktok}/Reauthorize.vue`, mà `reauthorization_required` (theo hợp đồng
   backend) chỉ xuất hiện với provider google/microsoft/legacy-google. Không có đường tới nó ở
   nhánh "Other providers" → đi cùng F6.
5. **ReplyBox nạp bản đầy đủ của inbox email qua `GET /inboxes/{id}`** — store `inboxes` của bản
   gốc giữ nguyên `InboxResource` cho mọi inbox; Yona chia sẻ qua Inertia bản rút gọn
   (`id/name/channel_type`). Chỉ kênh email mới gọi thêm, vì `getRecipients` cần `email` +
   `forward_to_email`. (Muốn bỏ hẳn request này thì mở rộng `SetCurrentAccount` — file dùng chung,
   để phiên chính quyết.)
6. **`ReplyEmailHead` không giữ bản sao nội bộ** — bản gốc giữ `ccEmailsVal…` và chỉ `emit` lúc
   blur; ở đây state nằm ở `ReplyBox` (nguồn duy nhất), blur chỉ bật cờ "đã chạm" để hiện lỗi.
   Hành vi hiển thị và payload không đổi.
7. **`ComposeConversation` phần email chỉ gợi ý email của chính contact đang chọn** — màn compose
   của Yona (C-group) đã rút về trường hợp "mở từ ContactPanel", chưa có tìm contact
   (`searchCcEmails`/`searchBccEmails` + `TagInput` dropdown kết quả tìm). Ô Subject/Cc/Bcc,
   nút Bcc và payload thì đủ.
8. **`SettingsSubPageHeader` nhận thêm prop `className`** — `Email.vue` truyền `class="max-w-4xl"`
   cho `PageHeader`; component dùng chung nên chỉ nối thêm chuỗi class.

## Bẫy đã trả giá

1. **`vue-letter` mặc định `preserveCssPriority = false`** (xem trên) — bê nguyên mặc định của
   `lettersanitizer` (`true`) sẽ giữ `!important` trong style thư, HTML đầu ra khác oracle.
2. **`content_attributes` của Yona là snake_case** — bản gốc camel hóa toàn bộ trong store nên
   `EmailMeta.vue` đọc `ccEmails`/`email.textContent`. Bản port đọc `cc_emails`/`email.text_content`.
   Chú ý tin **đến** dùng `cc_email`/`bcc_email` (số ít) — bản gốc cũng không đọc chúng, nên
   nhánh này phải rơi về `email.cc`/`email.bcc`; đọc nhầm sang số ít là lệch hành vi.
3. **Thứ tự nhánh `variant` trong `Message.vue`**: `private` → email → `content_type` email →
   FAILED. Đặt FAILED trước email (như bản B3 đang có) thì tin email gửi hỏng ra bubble đỏ thay vì
   bubble email viền đỏ.
4. **IMAP cổng thường vẫn bị ép SSL** — `imap_enable_ssl` mặc định `true`; quên tắt khi trỏ vào
   GreenMail cổng 3143 thì `webklex/php-imap` báo `SSL routines::wrong version number` và job kết
   thúc êm (không có hội thoại nào). Bẫy này cũng đúng với hộp thư thật cổng 143.
5. **Khối SMTP chỉ hiện khi `inbox.imap_enabled` đã LƯU** (`v-if` đọc prop inbox, không đọc state
   của form IMAP) — kịch bản test phải bấm Update ở IMAP rồi mới thấy SMTP.
6. **Hội thoại từ thư đến chưa gán ai** → không nằm trong tab mặc định "Mine" của dashboard;
   kịch bản e2e phải mở thư mục "All Conversations".
7. **`page.goto(..., { waitUntil: 'networkidle' })` treo** trên các trang có websocket Reverb —
   dùng `domcontentloaded` + chờ tường minh.

## Gate

| Gate | Kết quả |
|---|---|
| `npx tsc --noEmit` | xanh (file F1); còn 1 lỗi ở `resources/js/superadmin/resource/Form.tsx` — vùng của `f7`, không sửa hộ |
| `npm test` (vitest) | **PLACEHOLDER** |
| `npm run build` | xanh |
| `php artisan i18n:generate --check` | xanh |
| pixel-diff | **PLACEHOLDER** |
| audit nút | **PLACEHOLDER** |
| e2e GreenMail | **PLACEHOLDER** |

## Hướng dẫn founder test tay với Gmail thật (app password)

1. Bật xác thực 2 bước cho tài khoản Google, rồi tạo **App password** ở
   <https://myaccount.google.com/apppasswords> (chọn "Mail" / "Other"). Chuỗi 16 ký tự sinh ra
   chính là mật khẩu điền vào Yona — KHÔNG dùng mật khẩu đăng nhập Google.
2. Trong Gmail: Settings → **Forwarding and POP/IMAP** → bật **IMAP access**.
3. Yona → Settings → Inboxes → **Add Inbox** → thẻ **Email** → **Other Providers**:
   - Channel Name: tên hiển thị tuỳ ý (ví dụ "Hỗ trợ Yona")
   - Email: đúng địa chỉ Gmail sẽ nhận thư khách
   → Create → chọn agent → Voilà.
4. Vào inbox vừa tạo → tab **Configuration**:
   - **IMAP**: bật, Address `imap.gmail.com`, Port `993`, Login = địa chỉ Gmail,
     Password = app password, để **Enable SSL** BẬT, Auth mechanism `plain` → Update.
   - **SMTP** (chỉ hiện sau khi lưu IMAP): bật, Address `smtp.gmail.com`, Port `587`,
     Login/Password như trên, Domain `gmail.com`, Encryption **STARTTLS**,
     OpenSSL verify mode `none`, Auth mechanism `login` → Update.
5. Máy chủ cần một worker hàng đợi và bộ lập lịch đang chạy:
   `php artisan queue:work` + `php artisan schedule:work` (cron `*/1` kéo thư IMAP).
   Muốn kéo ngay: `php artisan tinker --execute='(new App\Jobs\Inboxes\FetchImapEmailInboxesJob)->handle();'`
6. Gửi một thư từ hộp thư khác tới địa chỉ Gmail đó → trong ≤1 phút hội thoại mới hiện ở
   **All Conversations** (thư chưa gán ai nên không nằm trong tab "Mine").
7. Trả lời trên UI: ô soạn có thêm dòng **Cc** (và nút **Add Bcc**), nút hình dấu ngoặc kép ở
   thanh dưới bật/tắt trích dẫn thư trước. Thư đi qua SMTP của chính kênh; khách trả lời tiếp
   sẽ nối vào đúng hội thoại đó (khớp `In-Reply-To`/`References`).
8. Nếu thư không về: kiểm `storage/logs/laravel.log`. Lỗi
   `SSL routines::wrong version number` = sai cặp cổng/SSL; `AUTHENTICATIONFAILED` = app password
   sai hoặc IMAP chưa bật trong Gmail.

## File đã thêm/sửa

Thêm: `resources/js/dashboard/settings/inboxes/channels/{Email,EmailInboxFinish}.tsx`,
`resources/js/dashboard/settings/inboxes/settingsPage/{ImapSettings,SmtpSettings}.tsx`,
`resources/js/dashboard/settings/inboxes/settingsPage/components/{SingleSelectDropdown,InputRadioGroup}.tsx`,
`resources/js/dashboard/components-next/message/bubbles/Email/{Index.tsx,Index.scss,EmailMeta.tsx,Letter.tsx}`,
`resources/js/dashboard/helper/{emailQuoteExtractor.ts,emailQuoteExtractor.test.ts,quotedEmailHelper.ts,quotedEmailHelper.test.ts}`,
`resources/js/dashboard/components/widgets/conversation/{ReplyEmailHead.tsx,ReplyEmailHead.scss,QuotedEmailPreview.tsx,helpers/emailHeadHelper.ts}`,
`resources/js/dashboard/components-next/NewConversation/components/EmailOptions.tsx`,
`~/www/pixel-diff/{f1-email-e2e.mjs,f1-email-ui.mjs,f1-email-fixture-oracle.rb,f1-email-fixture-yona.php,f1-email-fixture.json}`.

Sửa: `NewChannel.tsx` (1 dòng map kênh), `ChannelItem.tsx` (1 dòng `ACTIVE_CHANNELS`),
`FinishSetup.tsx` (nhánh email), `Show.tsx` (tiêu đề + khối Sender name), `types.ts` (khóa kênh email),
`settingsPage/ConfigurationPage.tsx` (nhánh email), `SettingsSubPageHeader.tsx` (prop `className`),
`components-next/message/{Message.tsx,constants.ts}`, `conversation/conversationbox/{ReplyBox.tsx,ReplyBottomPanel.tsx}`,
`conversation/{api.ts,ConversationContext.tsx,constants.ts}` (cc/bcc/to + `MESSAGE_MAX_LENGTH.EMAIL`),
`composables/useUISettings.ts` (slugifyChannel + 2 hàm khóa cờ),
`components-next/NewConversation/ComposeConversation.tsx`, `types/chatwoot-prosemirror-schema.d.ts`
(khai báo `sanitizeTextForRender` + `getRecipients` của `@chatwoot/utils`),
`package.json`/`pnpm-lock.yaml` (+ `lettersanitizer`).
