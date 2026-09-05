# B8 — Frontend: badge chưa đọc + mark read/unread + tabs (agent `b8-fe`)

Nguồn: Chatwoot v4.17.1 (`refs/chatwoot`). Ngày 06/09/2026. Hợp đồng backend: `b8-notes-be.md`.

## Trace Vue/JS ↔ TSX

| Nguồn Chatwoot | Đích | Ghi chú |
|---|---|---|
| `store/modules/conversations/actions/messageReadActions.js#markMessagesRead` | `conversation/ConversationContext.tsx#markMessagesRead` | Gọi `POST …/update_last_seen` rồi **4s sau** mới hạ `unread_count` (`setTimeout(…, 4000)` của gốc → hằng `MARK_READ_COMMIT_DELAY`). Nuốt lỗi như gốc. |
| `messageReadActions.js#markMessagesUnread` | `ConversationContext.tsx#markMessagesUnread` | Ghi lại ngay (không delay). Lỗi ném ra cho caller như `throwErrorMessage` gốc. |
| `store/modules/conversations/index.js` `UPDATE_MESSAGE_UNREAD_COUNT` | `conversation/unreadHelpers.ts#applyUnreadCount` | Ghi `agent_last_seen_at` + `unread_count` đúng conversation. |
| `api/inbox/conversation.js#markMessageRead / markMessagesUnread` | `conversation/api.ts#markMessagesRead / markMessagesUnread` | Đường dẫn giống gốc; **khác gốc: backend yona trả 204 rỗng** (xem “Khác biệt cố ý”). |
| `BUS_EVENTS.SCROLL_TO_MESSAGE` → `MessagesView.vue#onScrollToMessage` → `makeMessagesRead()` | 3 điểm gọi `markMessagesReadRef.current(...)` trong `ConversationContext.tsx` | Gốc phát bus ở 3 chỗ mà B3/B4 đã port thành effect: (1) `ConversationView.setActiveChat` sau khi nạp tin → nhánh `.then` của `fetchMessages`; (2) `ADD_MESSAGE` khi tin **thật sự nối** vào hội thoại đang mở (không phải thay tin pending) → `addMessage`; (3) `UPDATE_CONVERSATION` khi bản ghi đổi là hội thoại đang mở → `updateConversation`. |
| `MessagesView.vue` `unreadMessageCount` / `unreadMessageLabel` / `:first-unread-id` + `v-show` | `unreadHelpers.ts#unreadMessageLabelParts` / `#firstUnreadMessageId` + `conversationbox/MessagesView.tsx` | Markup pill giữ nguyên từ B3; phần tính tách ra hàm thuần để test. `>9` → `9+`; 1 tin → `CONVERSATION.UNREAD_MESSAGE`, nhiều tin → `…MESSAGES`. |
| `helper/conversationHelper.js#getUnreadMessages` | `unreadHelpers.ts#unreadMessages` | `created_at * 1000 > agent_last_seen_at * 1000`. |
| `store/modules/conversationStats.js` (3 debouncer + `getMetaDebounceKey`) | `ConversationContext.tsx` (`metaDebouncersRef`) + `unreadHelpers.ts#getMetaDebounceKey` | `debounce` của `@chatwoot/utils` (đã có sẵn trong repo): default 1000/max 5000, long 7500/max 20000, superLong 15000/max 30000; `all_count === 0` hoặc `> 2000` ⇒ superLong. Trước B8 `refetchListMeta` gọi thẳng, không debounce. |
| `components/ConversationItem.vue` (context menu chuột phải) + `components/ui/ContextMenu.vue` + `contextMenu/Index.vue` + `contextMenu/menuItem.vue` | `chatlist/ConversationItem.tsx` + `conversationCardComponents/ConversationContextMenu.tsx` | Chỉ port lát cắt B8: mục Mark as read / Mark as unread. `calculateContextMenuPosition` bám đúng công thức `PADDING = 16` của gốc; `focusout` (React `onBlur`, có bubble) đóng menu; `watch(source.id)` → effect đóng menu khi hàng đổi hội thoại. `markAsUnread` xong **điều hướng về danh sách** (`conversationListPageURL`) đúng như `redirectToConversationList()` của `ChatList.vue` — ở lại hội thoại thì nó bị đánh dấu đã đọc lại ngay. |
| `store/modules/conversationUnreadCounts.js` + nhánh `fetchConversationUnreadCounts` trong `sidebar/Sidebar.vue` | `components-next/sidebar/useConversationUnreadCounts.ts` + `Sidebar.tsx` + `menuItems.ts` | Một nguồn duy nhất: hook gọi `GET …/conversations/unread_counts` khi account bật cờ `conversation_unread_counts`, làm sạch số ≤ 0 (`normalizeCounts` gốc), nghe realtime `conversation.unread_count_changed` (payload rỗng → hỏi lại). `buildMenuItems` đổ `badgeCount` cho **All Conversations** (`allCount`), từng **team**, từng **inbox**, từng **nhãn**. |
| `ConversationCard.vue` `UnreadBadge` | `widgets/conversation/ConversationCard.tsx` | Đã port từ B3, không sửa. `unread_count` backend trần ở 10 ⇒ badge tối đa `9+`. |
| `ChatTypeTabs.vue` + `ChatList.vue` tabs/counters | `chatlist/ChatTypeTabs.tsx` + `ChatList.tsx` | Đã port từ B3; B8 chỉ đổi nhịp cập nhật `listMeta` (debounce). |
| `ConversationBasicFilter.vue` `chatSortOptions` | `chatlist/ConversationBasicFilter.tsx` | Đã đủ **10** lựa chọn gốc (kể cả `unread`) từ B3 — đối chiếu trực tiếp file gốc, không thiếu mục nào. |

## Xác minh gốc (đừng đoán lại)

- **`update_last_seen` KHÔNG gắn với window focus.** `grep focus|visibilitychange` trong `MessagesView.vue` + `ConversationView.vue` = 0 kết quả. Đường duy nhất là bus `SCROLL_TO_MESSAGE` (3 chỗ ở trên). Không port listener focus nào.
- **`.message--unread` / `.message--read` là selector chết trong v4.17.1** — `grep` toàn `app/javascript` chỉ ra đúng 2 dòng `querySelectorAll` trong `MessagesView.vue`, không component nào gắn class đó. Vì vậy `calculateScrollTop(scrollHeight, parentHeight, [])` = `scrollHeight - 0 - parentHeight/2`, luôn lớn hơn `scrollHeight - clientHeight` ⇒ trình duyệt kẹp về đáy. Nói cách khác **cả nhánh “cuộn tới tin chưa đọc đầu tiên” lẫn nhánh mặc định đều cuộn xuống đáy**; `panel.scrollTop = panel.scrollHeight` mà B3 đang dùng là tương đương. Đo thực tế xác nhận: pill hiện đúng cùng toạ độ hai bên (ảnh `shots/b8-pill-{oracle,yona}.png`).
- **`conversation.read` KHÔNG phải sự kiện agent đọc.** `app/models/conversation.rb:388` phát `CONVERSATION_READ` theo `saved_change_to_contact_last_seen_at?` — tức contact (widget) đọc. Không đụng tới cụm B8.
- **`sort_by=unread` không có trong `SORT_OPTIONS` phía client** (`store/modules/conversations/helpers.js:110`) → getter rơi về `last_activity_at_desc`. `realtimeReducers.ts#SORT_OPTIONS` cũng vậy ⇒ khớp. Thứ tự “chưa đọc nhiều nhất” chỉ do server trả (b8-be), rồi bị getter sort lại — **đây là hành vi gốc, không phải lỗi**.
- **Badge unread ở sidebar bị khoá sau cờ tắt.** `config/features.yml` (oracle): `conversation_unread_counts` và `unread_count_for_filters` đều `enabled: false`, `chatwoot_internal: true`. Kiểm trên oracle đang chạy: `Account.find(1).feature_enabled?('conversation_unread_counts') => false`. Vì vậy **oracle không hiện badge nào ở sidebar** — cụm này đã port nhưng gate đúng cờ, mặc định im lặng (kể cả không gọi API).
- **Badge “My Inbox” (mục `Inbox` đầu sidebar) KHÔNG thuộc B8**: `Sidebar.vue` lấy `getterKeys.count = 'notifications/getUnreadCount'` — đó là thông báo (D5), không phải hội thoại chưa đọc.
- `MoreActions.vue` (⋮ trên header hội thoại) **không có** mục Mark as read/unread — chỉ context menu trên card mới có.

## Khác biệt cố ý

- **Backend trả 204 rỗng** cho `update_last_seen` và `unread` (gốc render `partials/conversation`). Hệ quả:
  - `markMessagesRead` tự đặt mốc `agent_last_seen_at = Math.floor(Date.now()/1000)` — bằng `DateTime.now.utc` server vừa ghi. Khi backend **throttle** (không còn tin chưa đọc + mốc < 1 giờ) giá trị local mới hơn DB, nhưng lúc đó `unread_count` đã là 0 nên không có gì hiển thị lệch; F5 lấy lại giá trị thật.
  - `markMessagesUnread` phải `GET …/conversations/{id}` một lần sau 204 để lấy `agent_last_seen_at` + `unread_count` mới (gốc đọc thẳng trong body). Thao tác hiếm nên chấp nhận thêm 1 request.
- **Context menu card chỉ có mục đọc/chưa đọc.** Bỏ `<hr>` phân cách cuối khối (gốc có vì còn khối phía sau) — để lại sẽ thành gạch ngang lơ lửng.
- **Không khoá cuộn** (`useScrollLock` trên `contextMenuElementTarget`): provider đó do `MessagesView` cung cấp cho context menu *tin nhắn*; ở `ChatList` gốc `inject` cũng trả `null` nên gốc cũng không khoá.
- `ConversationContextMenu.tsx` đặt tạm trong `conversationCardComponents/` (ranh giới file của B8). Khi B10 port đủ menu nên tách phần khung ra `components/ui/ContextMenu.tsx` như gốc.

## Nợ (ghi rõ cho nhóm sau)

- **B10 — context menu card đầy đủ**: status/snooze, priority, label, agent, team, Open in new tab, Copy link, Delete (admin). Khung + mục đọc/chưa đọc đã sẵn, chỉ cần thêm section vào `ConversationContextMenu.tsx`. (Kế hoạch `plan.md:24` đã ghi context menu card là nợ B10.)
- **Badge unread sidebar cho Mentions / Participating / Unattended / Folders**: gốc gate sau cờ thứ hai `unread_count_for_filters`; backend b8-be chưa trả các số này. Các view đó cũng chưa có route (B11/E1).
- **`SidebarSortMenu.vue`** (sắp xếp nhóm sidebar theo `unread_count` / tên) chưa port — không liên quan menu sắp xếp của danh sách hội thoại (đã đủ).
- `ConversationCardExpanded` + `components-next/Conversation/ConversationCard/*` (badge unread bản expanded và trong màn Contacts) chưa có màn nào dùng — giữ nguyên.
- Tham số `conversation_type` (unattended/mention/participating) backend đã mở nhưng FE chưa có route/tab — B11/E1.

## Gate

- `npx tsc --noEmit` xanh · `npm run build` xanh · `npm test` **27 file / 208 test** xanh (chạy chung với b10-fe; phần B8 thêm `conversation/unreadHelpers.test.ts` 10 test + `components-next/sidebar/useConversationUnreadCounts.test.ts` 4 test) · `php artisan i18n:generate --check` = “Bundle i18n khớp lang/”.
- **i18n: không cần khóa mới.** `CONVERSATION.UNREAD_MESSAGE(S)` (`lang/en/conversation.php:38-39`), `CONVERSATION.CARD_CONTEXT_MENU.MARK_AS_READ/MARK_AS_UNREAD` (`:230-231`), `CHAT_LIST.UNREAD_COUNT_OVERFLOW` (`lang/en/chat_list.php:151`) đều có sẵn.

### E2E trình duyệt (headless, harness `~/www/pixel-diff`)

`node b8-unread-e2e.mjs` — John/account 2/conversation 4, chạy sau `reset-fixture.sh`:

```
0. bộ đếm tab = ["Mine 0","Unassigned 1","All 1"]
1. badge trên card (tab All) = "1"
2. pill ngay khi mở = "1 Unread Message"
3. pill sau 5s = ""            ← markMessagesRead + delay 4s
   badge card khi đang mở = ""
4. context menu = "Mark as unread"
   URL sau khi đánh dấu chưa đọc = /app/accounts/2/dashboard   ← redirect như gốc
5. badge sau "Mark as unread" = "1"
6. badge sau F5 = "1"          ← bền vững qua reload
```

`node b8-tabcount-e2e.mjs` — bộ đếm tab đổi realtime, không reload:

```
trước:  ["Mine 0","Unassigned 1","All 1"]
gán cho John → ["Mine 1","Unassigned 0","All 1"]   (không reload: true)
gỡ gán     → ["Mine 0","Unassigned 1","All 1"]     (không reload: true)
```

`node b8-sidebar-badge.mjs` — badge sidebar theo cờ:

- bật `conversation_unread_counts` trên account 2 → 2 request `200 /conversations/unread_counts`, badge `[{"All Conversations":1},{"api-test":1}]`.
- tắt cờ (trạng thái mặc định, **đã trả về sau khi đo**) → **không có request nào**, không badge — khớp oracle.

### Pixel-diff

Trước mỗi lần đo chạy `~/www/pixel-diff/reset-fixture.sh` (bản mới đã reset cả `agent_last_seen_at`/`assignee_last_seen_at` về NULL ⇒ **hai bên cùng 2 tin chưa đọc**).

| Màn | light | dark |
|---|---|---|
| `/dashboard` (sidebar, tab Mine) | 0.030% ĐẠT | 0.030% ĐẠT |
| tab **All** — thẻ danh sách có badge “2” (`node conversations-ui.mjs all`) | 0.030% ĐẠT | 0.030% ĐẠT |
| hội thoại có pill “2 Unread Messages” (`node b8-unread-diff.mjs`, reset trước mỗi scheme) | 0.060% | 0.113% |
| ↑ sau `mask-diff` (mask B3: logo, `#display_id`, placeholder, bút chì) | **0.006% ĐẠT** | **0.006% ĐẠT** |

**BỎ MASK ĐƯỢC — cho phiên chính:** vùng `[835, 160, 150, 34]` (`// pill "N Unread Messages" — mark-as-read thuộc B8`) trong `CONVERSATION_MASKS` của `~/www/pixel-diff/mask-diff.mjs` **xóa được**. Đo đối chứng có/không vùng che cho ra **đúng cùng con số** (light 61 px, dark 63 px) ⇒ pill hai bên trùng khít. Ảnh phóng to đối chiếu: `shots/b8-pill-oracle.png` vs `shots/b8-pill-yona.png`; thẻ danh sách: `shots/b8-card-oracle.png` vs `shots/b8-card-yona.png`. Badge trên card chưa từng nằm trong mask nên không có gì phải gỡ. Hai mask còn lại (`#display_id`, placeholder ProseMirror) vẫn là nợ B3, giữ nguyên.

### Audit nút (`audit-buttons.mjs … /conversations/{4|1}`)

15 nút hai bên khớp từng dòng; khác biệt duy nhất còn lại là `i-ph-microphone` (ghi âm — nợ B9). `#display_id`, `i-lucide-maximize-2`, `i-ph-paperclip` báo DEAD **ở cả hai bên** (clipboard / đổi style / dialog hệ điều hành — audit không nhận ra).

## Bẫy đã trả giá

- **`audit-buttons.mjs` bấm Resolve ở cả hai bên** ⇒ conversation rời tab Open, bộ đếm về `Mine 0 / Unassigned 0 / All 0` và mọi phép đo sau đó sai. Luôn `reset-fixture.sh` **sau** khi audit.
- **Chụp pixel pill phải reset trước MỖI scheme.** `compare.mjs` chạy light rồi dark trong một tiến trình; lần light đã mở hội thoại ⇒ dark còn 0 tin chưa đọc, không còn pill để đo. `b8-unread-diff.mjs` gọi `reset-fixture.sh` trước từng scheme.
- **Không gọi hàm có tác dụng phụ bên trong updater của `setState`** (React StrictMode gọi updater 2 lần). Cờ “tin có nối vào cuối không” tính trước bằng `messagesRef` rồi mới `setMessages`.
- Card của conversation 4 **không nằm ở tab Mine** (chưa gán assignee) — script e2e phải bấm tab All (`.conversations-list-wrap ul li a` thứ 3) trước khi tìm `.conversation`.
- `POST /app/login` trả **409** một lần trong e2e sau khi `npm run build` (Inertia asset version đổi, client tự tải lại) — nhiễu đã biết, không phải lỗi B8.
