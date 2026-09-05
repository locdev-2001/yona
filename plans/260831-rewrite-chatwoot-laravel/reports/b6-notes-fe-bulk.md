# B6 Assignment — ghi chú FE bulk actions (agent `b6-fe-bulk`)

Nguồn: Chatwoot v4.17.1 (`refs/chatwoot`). Ngày: 06/09/2026. Phạm vi: chọn nhiều hội thoại trong ChatList + thanh bulk actions (gán agent / gán team / đổi trạng thái) + phím tắt command bar nhóm Bulk Actions.

## Trace Vue/JS ↔ TSX

| Nguồn Chatwoot | Đích | Ghi chú |
|---|---|---|
| `store/modules/bulkActions.js` (state `selectedConversationIds` + `uiFlags.isUpdating`) + `composables/chatlist/useBulkActions.js` | `dashboard/composables/useBulkActions.ts` | Store vuex toàn cục nhưng chỉ ChatList dùng → state cục bộ trong ChatList. Hàm thuần tách riêng cho vitest: `addToSelection` / `removeFromSelection` / `selectionOfAll` / `isEveryConversationSelected` / `uniqueInboxIds` / `everySelectedHasStatus`. Giữ đúng hai bẫy của gốc: `ids` dedup bằng `Set`, còn `selectedInboxes` là mảng CÓ TRÙNG (mỗi conversation một phần tử) và bỏ chọn chỉ gỡ MỘT phần tử |
| `provide('selectConversation' / 'deSelectConversation' / 'isConversationSelected')` trong `ChatList.vue` | `BulkSelectionContext` + `useBulkSelection()` (cùng file trên) | React context thay provide/inject; `ConversationItem` đọc context, không phải prop-drilling |
| `api/bulkActions.js` (`ApiClient('bulk_actions', accountScoped)`) | `conversation/bulkApi.ts#processBulkAction` | `POST /api/v1/accounts/{id}/bulk_actions`, body `{type:'Conversation', ids:[displayId…], fields:{status\|assignee_id\|team_id}, snoozed_until, labels:{add,remove}}` — khớp contract `b6-notes-be.md`. `ids` = **display_id**. Trả `head :ok` (body rỗng) → nuốt `SyntaxError` như `conversation/api.ts` |
| `api/assignableAgents.js` + `assignable_agents_controller.rb` (`inject(:&)` member từng inbox, hợp với administrators) | `conversation/bulkApi.ts#fetchAssignableAgentsForInboxes` | Yona chưa có endpoint account-scoped `?inbox_ids[]=` → gọi `GET …/inboxes/{id}/assignable_agents` (có từ B1) cho từng inbox rồi lấy **giao theo id**. Administrator có mặt ở mọi inbox nên sống sót phép giao ⇒ cùng ngữ nghĩa gốc. Lọc `confirmed` dùng lại `filterVerifiedAgents` của `composables/useAgentsList.ts` (`b6-fe`) — không viết lại |
| `store/modules/teams.js` getter `teams/getTeams` | `conversation/bulkApi.ts#fetchTeams` (`GET …/teams`) | Prop Inertia `teams` là `getMyTeams` (member-only) — dùng nhầm sẽ giấu team; cùng kết luận với bẫy #1 của `b6-fe` |
| `conversationBulkActions/Index.vue` | `components/widgets/conversation/conversationBulkActions/Index.tsx` | Đủ: cảnh báo `ALL_CONVERSATIONS_SELECTED_ALERT`, checkbox chọn tất cả (`indeterminate` khi chưa chọn hết), nhãn `{n} selected` + `title`, nút Clear, 3 nút hành động, `CustomSnoozeModal` cho "Custom…"; listener `CMD_BULK_ACTION_SNOOZE/REOPEN/RESOLVE_CONVERSATION` |
| `BulkAgentActions.vue` | `conversationBulkActions/BulkAgentActions.tsx` | Nạp agent MỖI LẦN mở dropdown như gốc (`handleToggleDropdown`); mục "None" `value:'none'` → `{id:null}`; `isSelected` theo agent đang chọn; footer xác nhận chỉ hiện sau khi chọn |
| `BulkTeamActions.vue` | `conversationBulkActions/BulkTeamActions.tsx` | Mục "None" của team là `{id:0}` (khác agent `null`) — gốc gửi `team_id:0` để gỡ team |
| `BulkUpdateActions.vue` | `conversationBulkActions/BulkUpdateActions.tsx` | `showResolve/showReopen/showSnooze = !showResolvedAction/!showOpenAction/!showSnoozedAction`; "Snooze" KHÔNG gửi API mà mở command bar `{parent:'bulk_action_snooze_conversation'}` |
| slot `#footer` dùng chung của BulkAgent/BulkTeam | `conversationBulkActions/ConfirmationFooter.tsx` | Một chỗ duy nhất cho khối "Cancel / Yes" + câu xác nhận |
| `<I18nT :plural="n">` + slot `#n` / `#agentName` (bold) | `conversationBulkActions/confirmationLabel.tsx` | `t(key)` **không tham số** trả chuỗi thô (`t` chỉ pluralize/nội suy khi có params) → tự chọn nhánh `a \| b` rồi bọc mỗi `{param}` bằng `<strong class="text-n-slate-12">`. Pixel-diff khối này = 0.000% |
| khung chung nút + dropdown + click-outside của 3 file Bulk*.vue (`useToggle` + `vOnClickOutside`) | `conversationBulkActions/BulkActionDropdown.tsx` | Gom 1 chỗ (DRY); `v-tooltip` → attr `title` theo quy ước đã dùng từ B3 |
| `ChatList.vue` — `allConversationsSelected`, `uniqueInboxes`, `toggleSelectAll`, `allSelectedConversationsStatus`, `resetBulkActions` ở `updateAssigneeTab` / `onBasicFilterChange→resetAndFetchData` / `onApplyFilter` | `conversation/chatlist/ChatList.tsx` | Reset lựa chọn gom vào một `useEffect` theo `[assigneeTab, status, sortBy, inboxId, teamId]` (đúng các nhánh gốc gọi `resetBulkActions`) + `onApplyFilter` |
| `ConversationCard.vue` — `hovered`, `onSelectConversation`, slot `#overlay` của Avatar, class `selected` | `components/widgets/conversation/ConversationCard.tsx` | Checkbox phủ avatar khi `hovered \|\| selected`, `@click.stop` trên label, `watch(chat.id)` → `useEffect` reset hover. Gốc emit `props.inbox.id`; ở đây dùng `chat.inbox_id` (cùng giá trị, khỏi nới type `inbox`) |
| `composables/commands/useBulkActionsHotKeys.js` | `dashboard/composables/useBulkActionsHotKeys.ts` | Đăng ký nguồn `bulkActions` vào `commands/commandBarStore.ts`; chỉ có action khi đang chọn ≥1. Dùng lại `createSnoozeHandlers` của `helper/commandbar/actions.ts` (B5) — không copy |
| `i18n/locale/en/bulkActions.json` | `lang/en/bulk_action.php` | Copy nguyên khối `BULK_ACTION` (kể cả nhánh `LABELS` chờ B7 và `RESOLVE` chờ EE). `php artisan i18n:generate` đã chạy |

Hai file dùng chung được **thêm prop, không đổi hành vi cũ**: `components-next/dropdown-menu/DropdownMenu.tsx` (+`footer?: ReactNode`, tương đương `$slots.footer` của bản gốc) và `components-next/checkbox/Checkbox.tsx` (+`className`, tương đương class kế thừa lên root div của `Checkbox.vue`).

## Khác biệt cố ý / nợ

1. **`BulkLabelActions` chưa port (nợ B7).** Yona chưa có API nhãn (`routes/web_api.php` không có `labels`), nên dựng 2 nút nhãn sẽ là placeholder không bấm được — trái lệnh founder 02/09. Chỗ cắm đã sẵn: `bulkApi.ts` nhận `labels:{add,remove}`, backend đã nhận key này. **Hệ quả pixel:** thanh bulk của yona thiếu 2 nút nhãn bên phải ⇒ ô chữ "1 selected" rộng hơn oracle (oracle cắt thành "1 select…"). Kích thước và vị trí thanh giống hệt (324×44 tại cùng toạ độ), 3 nút còn lại nằm đúng vị trí 3 nút phải nhất của oracle.
2. **Nhánh required attributes khi resolve** (`useConversationRequiredAttributes`, khóa `BULK_ACTION.RESOLVE.*`) là EE — bỏ, giống quyết định của B5. Chuỗi vẫn có trong `lang/en/bulk_action.php` để B-sau dùng lại.
3. **`<Transition>` của Vue** (thanh bulk trượt lên, dropdown scale) không port — đúng cách các dropdown đã port ở B5; trạng thái tĩnh khớp pixel.
4. **Không refetch sau khi chạy bulk** — bản gốc cũng không: `bulkActions/process` chỉ POST rồi xoá lựa chọn, danh sách cập nhật nhờ realtime `assignee.changed` / `conversation.updated` (đã có từ B4). E2E xác nhận list tự đổi.

## Bẫy

1. **`selectedInboxes` phải giữ phần tử trùng.** Gốc cố ý push một `inboxId` cho mỗi conversation và khi bỏ chọn chỉ `splice` MỘT phần tử; gộp `Set` sớm sẽ làm mất inbox khi bỏ chọn 1 trong 2 conversation cùng inbox. `uniqueInboxIds` chỉ áp lúc hiển thị/gọi API.
2. **`ids` gửi lên là `display_id`, không phải khoá chính** (`BulkActionsJob` tra `where display_id: ids`). Payload dashboard trả `id` = display_id nên `chat.id` là đúng — đừng "sửa" thành khoá chính.
3. **`t(key)` không tham số = chuỗi thô** (không pluralize, không nội suy) — đây là chỗ bám để dựng lại `I18nT` có `<strong>`; nếu truyền `params` thì mất mốc để tách.
4. **Thứ tự agent trong dropdown không xác định.** `Inbox::assignableAgents()` (`app/Models/Inbox.php:191`) không có `ORDER BY` ⇒ Postgres trả thứ tự tuỳ ý. Đo được: lần chạy light oracle = `None, John, Samantha` còn yona = `None, Samantha, John` (diff 0.675%), lần chạy dark hai bên trùng (0.000%). Rails cũng không sort nên **không phải lệch logic**, nhưng làm pixel-diff dao động. Đề xuất cho phiên chính: thêm `->orderBy('id')` vào `Inbox::assignableAgents()` (backend, ngoài ranh giới agent này).
5. **Tab trong ChatList là `<a>`, không phải `<button>`** — script playwright bám `button` sẽ treo.
6. **Toast sống 2.5s** (`v3/components/SnackBar/Container.tsx`) — đọc toast phải ngay sau hành động, trước khi chờ realtime.
7. **`ninja-keys` id trùng nhau giữa nhóm conversation và nhóm bulk** (`until_tomorrow`…) — gốc cũng vậy (cả hai composable cùng đổ vào một mảng `hotKeys`); phân biệt bằng `parent`. Đừng "sửa" bằng cách đổi id.

## Gate

- `npx tsc --noEmit` ✓ · `npm run build` ✓ · `npm test` **16 file / 89 test** ✓ (mới: `composables/useBulkActions.test.ts`, 7 test).
- **E2E headless** (`~/www/pixel-diff/b6-bulk-e2e.mjs`, yona John/account 2, tab All, không reload — `__noReloadMarker` giữ nguyên):
  chọn 1 card → thanh hiện `1 selected` ✓ → chọn thêm → `2 selected`, 2 card có class `selected` ✓ → checkbox chọn tất cả → `3 selected`, 3 card ✓ → `Clear` → thanh biến mất, 0 card ✓ → chọn lại 2 → mở dropdown agent (`None / Samantha / John`) ✓ → chọn Samantha → footer `Are you sure you want to assign 2 conversations to Samantha?` ✓ → `Yes` → `POST /bulk_actions {"type":"Conversation","ids":[5,6],"fields":{"assignee_id":6}}` → 200 ✓ → toast `Conversations assigned successfully.` ✓ → thanh biến mất + bỏ chọn ✓ → realtime đẩy tên `Samantha` lên đúng 2 card ✓ → đổi tab → lựa chọn bị xoá ✓.
- **E2E phần 2** (`b6-bulk-e2e2.mjs`): dropdown team (`None / support`) → footer `…assign 2 conversations to support?` → `POST {…"fields":{"team_id":2}}` 200 → toast `Teams assigned successfully.` ✓; dropdown đổi trạng thái chỉ hiện `Resolve / Snooze` (ẩn Reopen vì cả 2 đang `open` — đúng `showOpenAction`) ✓; `Snooze` mở command bar nhánh `bulk_action_snooze_conversation` với 6 lựa chọn + placeholder snooze ✓; `Resolve` → `POST {…"fields":{"status":"resolved"},"snoozed_until":null}` 200 → toast `Conversation status updated successfully.` → 2 card rời khỏi bộ lọc Open ✓.
- **Pixel-diff oracle↔yona** (`b6-bulk-diff.mjs`, `b6-bulk-footer-diff.mjs`; light + dark, 1400×900, 1 conversation được chọn):
  | Vùng | light | dark |
  |---|---|---|
  | dropdown Assign agent | 0.000% | 0.000% |
  | dropdown Assign team | 0.000% | 0.000% |
  | dropdown Change status | 0.000% | 0.000% |
  | footer xác nhận agent | 0.675% (chỉ do thứ tự agent — bẫy #4) | 0.000% |
  | footer xác nhận team | 0.000% | 0.000% |
  | thanh bulk (200px trái) | 3.114% | 3.193% |
  Thanh bulk lệch **hoàn toàn do nợ #1** (oracle còn 2 nút nhãn nên cắt chữ thành "1 select…"); khung thanh 324×44 và toạ độ trùng khít hai bên.
- **Dọn dữ liệu:** đã tạo tạm conversation display 5 và 6 (API token John, inbox 1, contact 3, `source_id` `b6bulk-tmp-1/2`) và **xoá sạch** (messages + conversations + contact_inboxes). Đã trả conversation 4 về nguyên trạng: chỉ 5 tin id 3–7, `assignee_id`/`team_id`/`priority`/`snoozed_until` = null, `status` = 0, `last_activity_at` = `2026-09-01 06:11:52.355`; `contact_inboxes` còn id 1–4 như trước.
  ⚠️ Trong lúc chạy, conversation 4 có lúc mang `assignee_id`/`team_id` do e2e của `b6-fe` chạy song song — mốc trên là trạng thái **sau khi tôi dọn**; phiên chính nên kiểm lại trước khi founder test.
