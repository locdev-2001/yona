# B11 — note frontend: popup `@`, mục Mentions, mention trong bong bóng

Agent `b11-fe-mentions`. Ngày 06/09/2026. Contract backend: [b11-notes-be.md](b11-notes-be.md).

## Cú pháp mention — FE sinh đúng thứ backend bóc

Không có `data-mention-id` ở bất kỳ đâu. Node `mention` của
`@chatwoot/prosemirror-schema` được `MessageMarkdownSerializer` đổi thành markdown
link tới scheme `mention://`, đúng regex `mention_service.rb`:

```
[@Samantha Prabhu](mention://user/12/Samantha%20Prabhu)
[@Sales Team](mention://team/3/Sales%20Team)
```

Tên đi qua `encodeURIComponent` (khoảng trắng thành `%20`) — đó là hành vi của
serializer gốc, KHÔNG sửa: regex backend `\(mention://user/(\d+)/(.+?)\)` chỉ đọc
id nên phần tên mã hoá hay không đều khớp. Đã kiểm bằng vitest chạy thẳng schema +
serializer thật (`mentionHelpers.test.ts`), và bằng bản ghi thật trong DB sau e2e:
`[@Samantha](mention://user/6/Samantha) kiểm tra giúp nhé`.

## Bảng trace Vue → React

| Chatwoot | Yona | Ghi chú |
|---|---|---|
| `WootWriter/Editor.vue` `createSuggestionPlugin` (một khuôn cho `@ / {{ # :`) | `WootWriter/Editor.tsx` `createSuggestionPlugin` | B10 đang hardcode riêng nhánh `/`; đợt này gom lại đúng khuôn gốc rồi thêm `@` |
| plugin `@` thứ hai (`isAllowed: isPrivate \|\| !enableCaptainTools`) | `isAllowed: () => true` | plugin `@` thứ nhất là công cụ Captain (EE, không port) nên `enableCaptainTools` luôn false ⇒ vế phải luôn đúng |
| `shouldShowUserMentions = showUserMentions && isPrivate` | cùng tên | popup CHỈ hiện ở Private Note — đã đo hai bên: chế độ Reply gõ `@` không mở popup ở cả oracle lẫn yona |
| `conversation/TagAgents.vue` | `WootWriter/TagAgents.tsx` | **khác đường dẫn**: để cạnh picker trong `WootWriter/` theo ranh giới file của đợt này (nợ dọn chung với ghi chú B10 khi tách `components-next/preview-picker/`) |
| `agents/getVerifiedAgents` + `teams/getTeams` | `mentionApi.useMentionableAgents` + `conversationbox/contact/useTeamsList` (dùng lại, không viết lại) | agent lấy từ `/agents` của account rồi lọc `confirmed` qua `filterVerifiedAgents` sẵn có |
| `matchesSearch` / `agentItems` / `teamItems` / `items` | `WootWriter/mentionHelpers.ts` | tách hàm thuần để test: lọc theo từ khoá sau `@`, gộp nhóm, đếm cho tab |
| `preview-picker/PreviewPicker.vue` slot `filters` + `leading` | `PreviewPicker.tsx` prop `renderFilters` / `renderLeading` | giữ nguyên `@mousedown.prevent` ở vùng filters (bấm tab không cướp focus ô tìm) |
| `CaretAnchoredPicker.vue` truyền slot xuống | `CaretAnchoredPicker.tsx` truyền prop xuống | |
| `editorHelper.js` `createNode('mention')` + `nodeCreators.mention` + `insertSpecialContent` | `Editor.tsx#insertMention` | `schema.nodes.mention.create({userId, userFullName, mentionType})` rồi `insertAtCursor(view, node, from, to)` |
| `conversation.routes.js` `conversation_mentions` / `conversation_through_mentions` | `routes/web.php` (2 route trong nhóm account) | cùng render `ConversationView`, chỉ khác prop `conversationType` |
| `ChatList.vue` `conversationFilters.conversationType` + `pageTitle` nhánh MENTION | `chatlist/ChatList.tsx` | tiêu đề `CHAT_LIST.MENTION_HEADING` |
| `ChatList.vue → ConversationList.vue → ConversationItem.vue` prop `conversation-type` | cùng chuỗi prop | thẻ trỏ `/mentions/conversations/{id}`; "Mark as unread" quay về `/mentions/conversations` |
| `URLHelper.js` `conversationUrl` / `conversationListPageURL` nhánh `conversationType` | `helper/URLHelper.ts` `CONVERSATION_TYPE_PATHS` | trả nợ ghi sẵn trong file từ B3 (bảng đủ cả participating/unattended cho nhóm sau) |
| `sidebar/Sidebar.vue` mục Mentions (`activeOn: conversation_through_mentions`) | `components-next/sidebar/menuItems.ts` | thêm `activeOn` để mục sáng cả ở URL chi tiết — đã đo khớp oracle |
| `actionCable.js` `conversation.mentioned` → `addMentions` → `UPDATE_CONVERSATION` | `mentionApi.useMentionConversations` + `useRealtimeEvent` | **chỉ cập nhật hội thoại đã có trong list**: mutation gốc cố tình KHÔNG push hội thoại lạ khi `conversationType` là mention/participating — đo hai bên đều không hiện thẻ mới cho tới khi tải lại |
| `markdownIt/link.js` mention plugin + `.is-private .prosemirror-mention-node` | `shared/helpers/MessageFormatter.ts` + `resources/scss/_editor.scss` + `components-next/message/bubbles/Base.tsx` | **đã có sẵn từ B3**; đợt này chỉ kiểm chứng bằng ảnh, không sửa |

## Khác biệt cố ý / nợ

1. **List mention có store riêng.** Bản gốc đổ hội thoại mention vào cùng store
   hội thoại; ở đây `useMentionConversations` giữ state riêng vì
   `ConversationContext.tsx` + `conversation/api.ts` thuộc quyền tính năng khác
   trong đợt này. Hệ quả: list mention không nhận các sự kiện realtime khác
   (`conversation.updated`, tin mới) — sự kiện `conversation.mentioned` thì có.
   **Đề xuất gộp lại**: đưa `conversationType` vào `ConversationProvider` (cùng
   dạng `inboxId`/`teamId`/`label`) và thêm tham số vào `fetchConversations`,
   rồi xoá `useMentionConversations`. Khi đó `ChatList` chỉ còn nhánh `pageTitle`.
2. **Badge chưa đọc của mục Mentions không có.** Gốc gắn
   `hasFilteredUnreadCounts ? mentionsUnreadCount : 0`, cờ
   `filtered_conversation_unread_counts` (FilteredCounter) TẮT ở oracle và
   `FilteredCounter` được B8 chốt không port — nên đúng bằng 0 ở cả hai bên.
   Không dựng badge giả.
3. **`onToggleUserMention` của `Editor.tsx` chưa có người dùng** — giữ đúng cặp
   với `onToggleCannedMenu` (B10) làm chỗ cắm cho guard phím tắt
   `isAValidEvent` của `ReplyBox.vue` (chưa port).
4. **Badge "My Inbox 1" của oracle** xuất hiện sau khi nhắc tên (notification
   `conversation_mention`) — yona chưa có model `Notification` (b11-be ghi: nhóm
   D2). Đây là toàn bộ phần lệch còn lại trên trang Mentions sau khi che vùng
   dùng chung (70/78 px).
5. Popup `@` vẫn nằm ở `WootWriter/` cùng `CaretAnchoredPicker`/`PreviewPicker`
   thay vì `components-next/preview-picker/**` — nợ dọn chung với B10.

## Gate

1. **Pest 806/806** (1882 assertion) · **vitest 237/237** (32 file, trong đó
   `mentionHelpers.test.ts` 9 test) · `npx tsc --noEmit` sạch phần của mình ·
   `npm run build` · `pint routes/web.php` · `php artisan i18n:generate` không
   sinh diff (mọi khoá `CONVERSATION.MENTION.*`, `CONVERSATION.PICKER.MENTION.*`,
   `CHAT_LIST.MENTION_HEADING`, `SIDEBAR.MENTIONED_CONVERSATIONS` đã có sẵn).
2. Trace: file này.
3. **Pixel-diff** (`~/www/pixel-diff/b11-mention-diff.mjs`, dọn bằng
   `b11-mention-clean.sh` trước mỗi lần đo):

   | Màn | light | dark |
   |---|---|---|
   | popup `@` (riêng khung 697×274) | **0.000%** | **0.000%** |
   | cả trang lúc mở popup `@` (che vùng chung) | 0.006% | 0.006% |
   | cả trang sau khi gửi ghi chú có mention | 0.006% | 0.006% |
   | trang Mentions (tab All) | 0.007% | 0.008% |

   Popup còn khớp cả ở bố cục *stacked* (khi panel contact mở, popup 377×360):
   đo được cùng hộp ở hai bên trong `b11-picker-probe.mjs`.
4. **Audit nút**: `audit-buttons.mjs … /mentions/conversations` — 3/3 nút phản
   ứng giống oracle (lọc, sắp xếp, đổi bố cục). Ba tab lọc trong popup (`All`,
   `Agents n`, `Teams n`) đối chiếu bằng `b11-picker-probe.mjs`: nhãn, số đếm,
   kết quả lọc, mũi tên trái/phải, Escape, Backspace — **trùng từng dòng**.
5. **E2e** (`b11-mention-e2e.mjs`, chạy cả hai bên): John mở hội thoại → Private
   Note → gõ `@` → popup liệt kê 2 agent + 1 team → chọn Samantha → editor có
   node mention, nội dung `@Samantha ` → gửi → bong bóng ghi chú riêng hiện
   `@Samantha` in đậm đúng style → đăng nhập Samantha → `Mentions` (tab All) có
   thẻ "Trang Nguyen" với trích `@Samantha kiểm tra giúp nhé` → bấm thẻ →
   `/app/accounts/2/mentions/conversations/4`, mục Mentions trên sidebar sáng.
   Realtime: `b11-mention-realtime.mjs` cho thấy hai bên đều KHÔNG thêm thẻ mới
   vào list đang mở (đúng mutation gốc).

## Bẫy đã trả giá

1. **`ui_settings` là trạng thái dùng chung giữa các phiên đo.** Nút
   `arrow-right-to-line` (đổi bố cục) và panel contact đều ghi vào `ui_settings`
   của người đăng nhập; `audit-buttons.mjs` bấm hết nút nên làm bẩn. Một lần đo
   lệch 0.604% chỉ vì Samantha bị kẹt bố cục `expanded`. `b11-mention-clean.sh`
   reset `ui_settings` của cả John (qua `reset-fixture.sh`) lẫn Samantha, và
   được gọi ngay trước mỗi lần chụp.
2. **`reset-fixture.sh` không xoá `mentions`/`conversation_participants`** — phải
   xoá thêm, nếu không lần đo sau đã có sẵn thẻ trong tab Mentions.
3. Nút chuyển chế độ soạn thảo là MỘT `<button>` chứa cả chữ "Reply" và "Private
   Note" (`textContent` = `ReplyPrivate Note`), nên `button:has-text("Reply")`
   thực chất bấm cùng nút với `has-text("Private Note")` → tưởng nhầm popup `@`
   hiện cả ở chế độ Reply. Kiểm điều kiện `isPrivate` phải đo ở trạng thái mặc
   định, không bấm gì.
4. `[data-popover-content]` không đủ để bắt popup (trang còn popover khác) —
   dùng `[data-popover-content]:has([role="listbox"])`.
