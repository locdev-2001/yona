# B11 — note đợt dọn cuối frontend (agent `b11-fe-finish`)

Ngày 06/09/2026. Ba việc: nối 3 endpoint vừa port (notes / contact conversations /
attachments), gộp danh sách Mentions về một nguồn, đo lại toàn cụm panel.

## 1. Nối 3 endpoint

| Việc | Trước | Sau |
|---|---|---|
| Ghi chú liên hệ | chỉ đường đọc, không có nút | nút "+ Add contact note" + modal soạn + lưu + xóa + phím tắt `$mod+Enter` |
| Attachments | gom từ tin đã nạp trong khung chat | `GET /conversations/{id}/attachments`, giữ ở `ConversationContext` |
| Previous Conversations | endpoint 404 → luôn rỗng | `GET /contacts/{id}/conversations`, thẻ hiện đúng |

### Bảng trace bổ sung

| Chatwoot v4.17.1 | Yona | Ghi chú |
|---|---|---|
| `conversation/contact/ContactNotes.vue` (đủ nút + modal) | `conversationbox/contact/ContactNotes.tsx` | state cục bộ thay store `contactNotes`; `ADD_CONTACT_NOTE` nối cuối danh sách đúng như mutation gốc (dù danh sách nạp về là mới-nhất-trước) |
| `components-next/Editor/Editor.vue` | `components-next/Editor/Editor.tsx` (**file mới**) | vỏ viền + nhãn + bộ đếm `n / 200` + dòng thông báo quanh `WootWriter/Editor`; `<style scoped>` trải vào `resources/scss/_editor.scss` (`.editor-wrapper`) |
| `components/Modal.vue` (class fallthrough) | `components/Modal.tsx` thêm prop `className` | modal ghi chú cần `!items-start [&>div]:!top-12 [&>div]:sticky` như gốc |
| store `conversations` state `attachments` + getter `getSelectedChatAttachments{,Loaded}` | `ConversationContext` state `attachments` / `attachmentsLoaded` | nạp theo **hội thoại** (đúng `MessagesView.vue#fetchAllAttachmentsFromCurrentChat`), không theo accordion |
| `ConversationApi.getAllAttachments` + action `fetchAllAttachments` | `conversation/api.ts#fetchConversationAttachments` | không truyền `page` — bản gốc cũng chỉ lấy trang đầu (15 tệp mới nhất); lỗi vẫn set `loaded` để thoát spinner |
| mutation `ADD_CONVERSATION_ATTACHMENTS` | `realtimeReducers.ts#appendMessageAttachments` | chỉ nhận tin `status = sent`, chống trùng theo `id` |
| `contacts/{id}/conversations` | `conversationbox/contact/ContactConversations.tsx` | thêm `conversationType` vào `conversationUrl` như `buildConversationUrl` của gốc |

### Khác biệt cố ý

1. **Nguồn góp tệp mới.** Bản gốc góp tệp từ hai chỗ: phản hồi của lần gửi
   (`sendMessage`) và tin **incoming** qua realtime. Ở yona đường gửi kèm tệp
   (`ReplyBox#sendReplyWithAttachments`) không giữ phản hồi — tin mình gửi quay lại
   qua realtime `message.created` — nên chỉ cắm một chỗ ở handler realtime, không
   lọc `message_type`. Kết quả quan sát được giống hệt (đo ở e2e phần 2).
2. **`DELETE_CONVERSATION_ATTACHMENTS` không port**: yona chưa có xóa tin nhắn,
   không có sự kiện nào kích hoạt mutation đó.
3. Modal ghi chú giữ nguyên bộ đếm `0 / 200` và hạn mức 200 ký tự của bản gốc
   (mặc định `maxLength`/`showCharacterCount` của `components-next/Editor`).

### Nợ đã trả (từ `b11-notes-fe-panel.md`)

- Nợ #1 nút "Add contact note" — xong.
- Nợ #2 endpoint attachments — xong.
- Nợ #3 endpoint contact conversations — xong.
- Nợ #4 ba dòng 404 trong console — **hết hẳn** (đo bên dưới).
- Khác biệt #6: `NON_FILE_TYPES` dời về `components-next/message/constants.ts`,
  `formatDuration` dời về `shared/helpers/timeHelper.ts` (có test riêng);
  `sharedAttachments.ts` chỉ còn phần thuần của SharedFiles/Media/Files và bỏ hàm
  dự phòng `attachmentsFromMessages` (không còn ai dùng).

### Nợ còn lại

- `custom_attribute_definitions` (E1) — panel note #5.
- Realtime `contact.merged` — panel note #6.
- Menu chuột phải trong Previous Conversations (`open-new-tab` / `copy-link`).
- Thông báo in-app `conversation_mention` (D2, backend chưa có model `Notification`).

## 2. Gộp danh sách Mentions về một nguồn

Xóa hẳn `useMentionConversations` (store thứ hai) và nhánh rẽ chọn nguồn trong
`ChatList`. Nay chỉ còn một đường:

| Chatwoot | Yona |
|---|---|
| `wootConstants.CONVERSATION_TYPE` | `conversation/constants.ts#CONVERSATION_TYPE` (rời khỏi `mentionApi.ts`) |
| prop route `conversationType` của `ChatList.vue` | prop `ConversationView` → `ConversationProvider` (cùng dạng `inboxId`/`teamId`/`label`) |
| `conversationFilters.conversationType` | `api.ts` — một hàm `buildConversationQuery` dùng chung cho `fetchConversations` + `fetchConversationMeta` (trước đó hai hàm dựng query trùng nhau) |
| mutation `UPDATE_CONVERSATION` (không push hội thoại lạ khi mention/participating) | `applyConversationUpdate(list, incoming, conversationType)` |
| action `addConversation` (bỏ qua ở màn folders/mentions/participating/unattended) | `shouldAddConversationToList(conversation, inboxId, conversationType)` |
| action `addMentions` | `useRealtimeEvent('conversation.mentioned')` trong `ConversationContext`, chỉ chạy khi `conversationType === 'mention'` |

Hệ quả: danh sách mention nay nhận **mọi** sự kiện realtime của list chính
(`conversation.updated`, `assignee.changed`, tin mới, bộ đếm…), không chỉ
`conversation.mentioned`. `mentionApi.ts` chỉ còn `useMentionableAgents` cho popup `@`.

## 3. Đo đạc

Panel (`b11-panel-diff.mjs`, sau `b11-mention-clean.sh`):

| Accordion | light | dark |
|---|---|---|
| Conversation Information | **0.000%** | **0.000%** |
| Contact Attributes | **0.000%** | **0.000%** |
| Contact Notes | **0.000%** (trước: 2.226%) | **0.000%** (trước: 2.293%) |
| Attachments | **0.000%** | **0.000%** |
| Previous Conversations | **0.000%** | **0.000%** |
| Conversation participants | **0.000%** | **0.000%** |

Modal ghi chú (harness mới `b11-note-modal-diff.mjs`):

| Ảnh | light | dark |
|---|---|---|
| modal rỗng (cả trang 1280×900) | 0.035% | 0.027% |
| modal đã gõ nội dung | 0.035% | 0.027% |
| thân accordion khi có 1 ghi chú (cột panel 320px) | **0.000%** | **0.000%** |

Toàn bộ chênh của hai ảnh cả-trang nằm gọn trong ô 22×22 px ở góc trái trên
(logo tài khoản trên sidebar) — vùng dùng chung, không thuộc B11; đã đo bằng cách
quét hộp bao các điểm lệch: `{minx:9, maxx:30, miny:7, maxy:28}`.

Mentions sau khi gộp nguồn (`b11-mention-diff.mjs`):

| Màn | light | dark |
|---|---|---|
| popup `@` (khung 697×274) | **0.000%** | **0.000%** |
| cả trang lúc mở popup | 0.033% | 0.033% |
| cả trang sau khi gửi ghi chú có mention | 0.054% | 0.067% |
| trang Mentions (tab All) | 0.030% | 0.031% |

`b11-mention-realtime.mjs`: hai bên đều KHÔNG thêm thẻ mới vào list đang mở — giữ
đúng hành vi gốc sau khi gộp.

Audit nút (`b11-panel-buttons.mjs`): hai bên nay cùng liệt kê 3 nút; "Add contact
note" phản ứng như nhau (oracle Δel=67/Δvis=55/Δtext=39 · yona Δel=66/Δvis=55/Δtext=39).
Nút ⚙ vẫn báo DEAD ở oracle — hạn chế harness đã ghi ở note panel.

## 4. E2E trình duyệt (yona)

`b11-finish-e2e.mjs`:
- mở đủ 6 accordion → **không còn dòng 404 nào**; chỉ còn 409 của `POST /app/login`
  (Inertia đòi tải lại khi bản build đổi), không phải lỗi panel.
- thêm ghi chú → hiện ngay → F5 vẫn còn (kèm "John wrote") → xóa → câu rỗng quay lại.

`b11-finish-e2e2.mjs` (tạo tạm hội thoại thứ hai cho cùng liên hệ):
- Previous Conversations hiện 1 thẻ (hội thoại tạm), 0 lỗi API.
- Attachments: câu rỗng → gửi ảnh từ ReplyBox → tệp hiện **không cần tải lại**
  (đường realtime) → F5 vẫn còn (đường endpoint).

`b11-note-hotkey.mjs`: `Ctrl+Enter` trong modal lưu ghi chú và đóng modal — giống
oracle từng bước.

`b11-mention-e2e.mjs` (yona): trang Mentions vẫn chạy đúng sau khi gộp nguồn —
popup `@` 2 agent + 1 team, gửi ghi chú, đăng nhập Samantha, thẻ "Trang Nguyen"
trong tab Mentions, bấm thẻ → `/app/accounts/2/mentions/conversations/4`.

## 5. Gate

`npx tsc --noEmit` sạch · `npm run build` xanh · `npm test` **241/241** (33 file;
thêm test cho `appendMessageAttachments`, hai chốt chặn theo `conversationType`,
`formatDuration`; bỏ 2 test của hàm dự phòng đã xóa) · `php artisan i18n:generate
--check` không sinh diff (mọi khóa `CONTACTS_LAYOUT.SIDEBAR.NOTES.*` đã có sẵn).

## 6. Dọn dữ liệu đo

Script mới `b11-notes-clean.sh` (xóa `notes` hai bên rồi gọi `reset-fixture.sh`).
Trạng thái cuối phiên, đã kiểm bằng truy vấn:
- yona: hội thoại `[4]`, 5 tin, notes 0, mentions 0, participants 0, đính kèm tin
  nhắn 0, `ui_settings` John đúng 7 khóa chuẩn.
- oracle: hội thoại `[1]`, 5 tin, notes 0, mentions 0, participants 0.

## 7. Bẫy đã trả giá

1. **`ui_settings` giữ trạng thái accordion giữa các lần chạy harness.** Harness
   mở accordion bằng cách *bấm tiêu đề*, nên chạy lần hai trên trạng thái đang mở
   sẽ **đóng** nó (lần đo đầu ra "Previous Conversations: 0 thẻ" và timeout khi tìm
   nút Add note). Phải chạy `reset-fixture.sh` / `b11-notes-clean.sh` ngay trước mỗi
   lần đo.
2. Hai bản ghi `attachments` sẵn có trong DB dev là **avatar** (`attachable_type`
   = `User`/`Inbox`), không phải tệp tin nhắn — endpoint lọc `Message` nên vẫn trả
   rỗng; đừng nhầm là fixture bẩn.
