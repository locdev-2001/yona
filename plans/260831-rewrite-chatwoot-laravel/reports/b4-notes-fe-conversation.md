# B4 Realtime — ghi chú FE phần conversation (agent `b4-fe-conversation`)

Nguồn: Chatwoot v4.17.1 (`refs/chatwoot`). Ngày: 02/09/2026. Phạm vi: store `conversations` phần realtime + reconnect, typing UI, presence contact trong header/card/panel.

## Trace Vue/JS ↔ TSX

| Nguồn Chatwoot | Đích | Ghi chú |
|---|---|---|
| `helper/actionCable.js` `onMessageCreated` → `addMessage` + `updateConversationLastActivity` | `conversation/ConversationContext.tsx` `useRealtimeEvent('message.created')` → `addMessage` + `applyConversationLastActivity` | Payload phẳng `push_event_data` + `conversation{unread_count,last_activity_at}`; audio alert (`DashboardAudioNotificationHelper`) chưa port (B4 sidebar/notification) |
| `onMessageUpdated` → `updateMessage` (commit `ADD_MESSAGE`) | `useRealtimeEvent('message.updated', addMessage)` | Gốc dùng chung mutation ADD_MESSAGE → cùng hàm |
| `onConversationCreated` → `addConversation` (+ bus `fetch_conversation_stats` do connector emit) | `'conversation.created'` → `shouldAddConversationToList` + `applyConversationAdded` | Gốc chỉ kiểm inbox filter (`currentInbox`) + không ở view folder/mention/participating/unattended (chưa port các view này); lọc tab/status do getter (xem dưới) |
| `onStatusChange` / `onConversationUpdated` / `onAssigneeChanged` → `updateConversation` (+ bus stats do connector emit) | `'conversation.status_changed'` / `'conversation.updated'` / `'assignee.changed'` → `updateConversation` | Counts đi một đường duy nhất qua bus `fetch_conversation_stats` (fe-spine `ActionCableConnector` emit sau 5 event như gốc) |
| `onConversationRead` → `updateConversation` | `'conversation.read'` → `updateConversation` | |
| `onConversationContactChange` → `updateConversationContact` | `'conversation.contact_changed'` → `applyConversationContact` | Nhánh `contacts/SET_CONTACT_ITEM` (store contacts) thuộc `b4-fe-presence` |
| `onTypingOn/Off` + timer 30s, store `conversationTypingStatus` | `dashboard/realtime/store.ts` + `useTypingUsers` (fe-spine) | Tôi chỉ đọc list |
| `ChatList.vue` `useEmitter('fetch_conversation_stats')` → `conversationStats/get` | `useRealtimeEvent('fetch_conversation_stats', refetchListMeta)` | `api.ts#fetchConversationMeta` — cùng query với list (assignee_type/status/inbox/team) |
| `store/modules/conversations/index.js` `ADD_MESSAGE` + `helpers.js#findPendingMessageIndex` | `conversation/realtimeReducers.ts` `applyIncomingMessage` / `findPendingMessageIndex` / `applyMessageToConversation` | Gốc khớp `m.id === message.id \|\| m.id === echo_id` (id tạm = echo_id); bên ta pending có `id` âm + `echo_id` → khớp theo `echo_id`. Nối tin thì `chat.timestamp = created_at`, `unread_count` lấy từ `message.conversation`; `SET_CONVERSATION_CAN_REPLY` khi incoming gộp vào đây |
| `UPDATE_CONVERSATION` | `applyConversationUpdate` | Bỏ event có `updated_at` cũ hơn; giữ `messages`; chưa có → push (gốc chỉ chặn ở view mention/participating) |
| `UPDATE_CONVERSATION_LAST_ACTIVITY` | `applyConversationLastActivity` | |
| `ADD_CONVERSATION` | `applyConversationAdded` | idempotent |
| `SET_ALL_CONVERSATION` (nhánh reconnect) | `mergeFetchedConversations` | Conversation đang mở giữ `messages`; conversation khác thay nguyên |
| `getters.js` `getMineChats/getUnAssignedChats/getAllStatusChats` + `helpers.js#applyPageFilters` + `sortComparator` | `selectVisibleConversations` / `matchesConversationView` / `sortComparator` | **Quyết định:** giữ `allConversations` thô như state gốc, `conversations` (đưa ra context) = getter lọc theo tab/status/inbox/team + sort ở client. Nhờ vậy update realtime (đổi assignee/status) tự đưa card vào/ra list y gốc mà không phải xử lý từng case. Bỏ `applyRoleFilter` (custom role EE) và label filter (B7) |
| `actions.js#addMessage` `SET_CONVERSATION_CAN_REPLY` | gộp trong `applyMessageToConversation` | |
| `ReconnectService.js` `onDisconnect` → `setConversationLastMessageId`; `onReconnect` → `fetchConversations(updatedWithin = secondsSinceDisconnect + 15)` + `syncActiveConversationMessages(after)` | `registerReconnectHandlers({ setConversationLastMessageId, fetchConversationsOnReconnect, fetchConversationMessagesOnReconnect })` trong `ConversationContext` | fe-spine giữ `ReconnectService.ts` + emit `WEBSOCKET_RECONNECT_COMPLETED`; tôi không emit. Mốc tin cuối bỏ qua tin pending (id âm). `syncActiveConversationMessages` gốc trộn tin thiếu + sort `created_at`; `markMessagesRead` (B5) chưa port. `revalidateCaches`/filtered-or-saved views chưa port (B7/E1) |
| `api/inbox/conversation.js#get` `updated_within`; `toggleTyping`; `api/inbox/message.js#getPreviousMessages` `after` | `conversation/api.ts` `fetchConversations({updatedWithin})`, `toggleTyping`, `fetchMessages(before, after)` | `after` chỉ gửi khi khác `before` y gốc |
| `conversationTypingStatus.js#toggleTyping` (nuốt lỗi) | `ConversationContext#toggleTypingStatus` | `.catch(() => undefined)` |
| `ReplyBox.vue` `onTypingOn/onTypingOff/toggleTyping(status)` (`isPrivate` = chế độ note) | `conversationbox/ReplyBox.tsx` `toggleTyping` | |
| `WootWriter/Editor.vue` `TYPING_INDICATOR_IDLE_TIME = 4000`, `createTypingIndicator` từ `@chatwoot/utils`, `keyup → start`, `blur → stop`, bỏ qua khi `disabled`, emit `typingOn/typingOff` | `WootWriter/Editor.tsx` props `onTypingOn/onTypingOff`, `typingIndicatorRef` | Unmount editor cũng `stop()` (đổi conversation/mode → gửi `off` nếu đang on) |
| `MessagesView.vue` `typingUsersList/isAnyoneTyping/typingUserNames` + markup bubble (dòng ~537) `absolute flex items-center w-full h-0 -top-7` … `typing.gif` | `conversationbox/MessagesView.tsx` | Markup + class y gốc; ảnh `public/assets/images/dashboard/typing.gif` (copy nguyên từ `assets/images/typing.gif`) |
| `helper/commons.js#getTypingUsersText` | `helper/conversationHelper.ts#getTypingUsersText` | Trả `[key, params]` rồi `t()` (`lang/en/typing.php` có sẵn TYPING.ONE/TWO/MULTIPLE) |
| `ADD_MESSAGE` emit `BUS_EVENTS.SCROLL_TO_MESSAGE` khi tin nối vào conversation đang mở → `MessagesView.vue#onScrollToMessage` (không messageId) → `scrollToBottom` | `MessagesView.tsx` `useLayoutEffect` theo `lastMessageId` | Không cần bus: id tin cuối đổi ⇔ có tin nối vào cuối (prepend không đổi id cuối) |
| `ConversationHeader.vue` `:status="currentContact.availability_status"` (contact từ store `contacts` được `presence.update` cập nhật) | `ConversationHeader.tsx` `useContactAvailabilityStatus(contact.id, availability_status API)` | fe-spine: chưa nhận presence → giá trị API; đã nhận mà vắng map → offline (đúng `UPDATE_CONTACTS_PRESENCE`) |
| `ConversationCard.vue` `:status="currentContact.availability_status"` | `components/widgets/conversation/ConversationCard.tsx` | như trên |
| `contact/ContactInfo.vue` Avatar status | `conversationbox/contact/ContactInfo.tsx` | như trên |
| Assignee presence trong `ConversationHeader.vue` | — | Xác minh: header gốc KHÔNG hiện chấm presence assignee (chỉ contact). Không port |
| `components-next/Conversation/ConversationCard/*` | — | Bản gốc dùng ở Contacts (danh sách hội thoại của contact) — chưa có màn nào dùng ở B3/B4; không sửa |

## Bẫy / lưu ý

- **Pending message id âm:** `findPendingMessageIndex` gốc khớp `m.id === echo_id` vì gốc gán `id = tempMessageId`; TSX gán `id` âm + `echo_id` nên phải khớp qua `echo_id`. Cả đường HTTP trả về và đường socket `message.created` đi chung `addMessage` → không nhân đôi bất kể thứ tự đến.
- **Nạp lại trang 1 khi đổi filter** không xóa sạch `allConversations` nữa mà giữ lại conversation đang mở (gốc: `selectedChat` luôn nằm trong `allConversations`, getter chỉ ẩn khỏi list). Nếu xóa sạch thì ConversationBox nháy về EmptyState.
- **Conversation mở từ URL không nằm trong list** → `fetchConversation` rồi `applyConversationUpdate` đưa vào `allConversations` (gốc `getConversation` commit `UPDATE_CONVERSATION`), không còn state `selectedConversation` riêng.
- **`updated_within` không phân trang** (backend `b4-be-typing`): dùng đúng cho reconnect, không dùng cho list thường.
- **Typing khi editor bị destroy:** `typingIndicator.stop()` trong cleanup → gửi `off` cho conversation cũ trước khi chuyển; handler ReplyBox dùng `conversationId` hiện tại của closure (callbacksRef cập nhật mỗi render nên vẫn là id đúng tại thời điểm blur).
- **Vitest cảnh báo sourcemap `@chatwoot/prosemirror-schema/dist/index.es.js.map`** thiếu — có từ B3, không phải do B4.

## Gate

- `npx tsc --noEmit` xanh, `npm run build` xanh, `npm test` 9 file / 34 test xanh (thêm `conversation/realtimeReducers.test.ts`: trùng id không nhân đôi, pending → bản server, conversation không khớp tab/status không hiện, update cũ bị bỏ, merge reconnect giữ messages, typing text 1/2/nhiều).
- E2E playwright headless (harness `~/www/pixel-diff`, Reverb :8080 + queue worker do phiên chính bật), script tại scratchpad phiên (`realtime-e2e.mjs`, `typing-e2e.mjs`):
  - **Tin inbound hiện không reload:** John mở `/app/accounts/2/conversations/4`, đặt `window.__noReloadMarker`, `POST /api/v1/accounts/2/conversations/4/messages` (`api_access_token`, `message_type: incoming`) → tin xuất hiện trong `.conversation-panel` trong <8s, marker vẫn còn (không reload), panel cuộn tới đáy; ở tab All card trong list đổi preview sang nội dung tin mới (`cardHasMarker: 1`). Ở tab Mine (conversation chưa gán) card không hiện — đúng getter gốc.
  - **Typing John/Sam:** Sam (member inbox 1) gõ trong editor → request `toggle_typing_status {typing_status:'on', is_private:false}`; John thấy bubble "Samantha is typing" + `typing.gif`; Sam ngừng gõ 4s → request `off` → bubble biến mất. Screenshot `typing.png` trong scratchpad.
  - Bẫy môi trường gặp phải: queue worker chạy với env `BROADCAST_CONNECTION=log` (kế thừa từ shell) → `ActionCableBroadcastJob` ghi laravel.log thay vì đẩy Reverb; typing đi đồng bộ nên vẫn qua. Phải restart worker với env sạch. Kiểm bằng `tr '\0' '\n' < /proc/<pid>/environ | grep BROADCAST`.
  - Dọn dẹp: đã xóa các tin test `rt-e2e-*` trong conversation 4 qua tinker, giữ nguyên 5 tin gốc.
