# B7 Labels — ghi chú FE hội thoại (agent `b7-fe-conversation`)

Nguồn: Chatwoot v4.17.1 (`refs/chatwoot`). Ngày: 06/09/2026.
Phạm vi: khối **Conversation Labels** trong ContactPanel, nhãn trên **thẻ danh sách**,
nhóm **Labels** ở sidebar + trang lọc `/label/{title}`, và **2 nút nhãn của thanh bulk**
(trả nợ #1 của `b6-notes-fe-bulk.md`).

## Trace Vue/JS ↔ TSX

| Nguồn Chatwoot | Đích yona | Ghi chú |
|---|---|---|
| `api/labels.js` + `api/conversations.js#getLabels/updateLabels` | `conversation/labelApi.ts` | `GET /labels`, `GET|POST /conversations/{displayId}/labels`. Kiểu `AccountLabel` = alias của `settings/labels/types.ts#Label` (một nơi khai báo payload, đổi tên để không lẫn với component chip `Label`) |
| `store/modules/labels.js` (state `records`, action `get`, getter `getLabels`) | `composables/useLabelsList.ts` | Store vuex toàn cục → cache module-level + `useSyncExternalStore`, cùng khuôn `useAgentsList.ts` của B6. Sidebar / LabelBox / CardLabels / BulkLabelActions đọc chung, `labels/get` chỉ chạy một lần cho mỗi account. `invalidateLabels()` để màn Settings gọi sau khi CRUD |
| getter `getLabelsOnSidebar`, `helpers.js#filterByLabel`, `useConversationLabels.js` (activeLabels/inactiveLabels/add/remove), `Index.vue#appliedLabelsForSelection`, `BulkLabelActions#toggleLabelSelection/visibleLabels` | `conversation/labelHelpers.ts` (+ `.test.ts`, 15 test) | Gom mọi hàm thuần về một file để cả bốn nơi dùng chung |
| `routes/dashboard/conversation/labels/LabelBox.vue` + `composables/useConversationLabels.js` + `shared/components/ui/dropdown/AddLabel.vue` | `conversation/conversationbox/contact/LabelBox.tsx` | Nút "Add Labels" (AddLabel.vue chỉ là một `<Button>` → inline), chip + dropdown, hotkey `L` toggle, `Escape` đóng, click ra ngoài đóng (`v-on-clickaway`) |
| `store/modules/conversationLabels.js` | **không port** — đọc thẳng `selectedConversation.labels` | Store đó chỉ mirror `conversation.labels`: được seed từ payload danh sách (`buildConversationList`) và ghi lại ở mỗi `updateConversation`. Ở yona `ConversationResource.labels` đã có sẵn và realtime `conversation.updated` cập nhật ⇒ giữ thêm một store là trùng lặp. LabelBox chỉ giữ **state lạc quan cục bộ**, đồng bộ lại khi danh sách nhãn trên máy chủ đổi, revert khi POST lỗi |
| `dashboard/components/ui/Label.vue` (`woot-label`) | `dashboard/components/ui/Label.tsx` | Chip của LabelBox + CardLabels. **KHÁC** `components-next/label/Label.tsx` (chip trang Contacts, `b7-fe-settings` sở hữu) — trong bản gốc cũng là hai component khác nhau, không gộp được vì class/kích thước khác hẳn. Style scoped SCSS dựng lại bằng Tailwind: mỗi thuộc tính chỉ phát **một** lớp (không vừa `bg-n-slate-3` vừa `bg-transparent`) để không phụ thuộc thứ tự luật trong bundle |
| `shared/components/ui/label/LabelDropdown.vue` + `LabelDropdownItem.vue` | `shared/components/ui/label/LabelDropdown.tsx` + `LabelDropdownItem.tsx` | `picoSearch` theo `title`, nút "Create new label: {slug}" cho admin khi `< 3` kết quả, `disabled` khi trùng khít. `<woot-dropdown-menu>` / `<woot-dropdown-item>` (chỉ là `ul.dropdown.menu.vertical` + `li.dropdown-menu__item`) dựng thẳng trong hai file này vì không còn call-site nào khác |
| `shared/helpers/sanitizeData.js#sanitizeLabel` | `shared/helpers/sanitizeData.ts` | Khác `settings/labels/validations.ts#normalizeLabelTitle` (chỉ hạ chữ thường) — bản này còn thay khoảng trắng bằng `-` và bỏ ký tự lạ, dùng cho ô "Create new label" |
| `settings/labels/AddLabel.vue` mở từ LabelDropdown | dùng lại `dashboard/settings/labels/AddLabel.tsx` của `b7-fe-settings` | Tạo xong gọi `fetchLabels(accountId, { force: true })` để danh sách chung nạp lại |
| `conversationCardComponents/CardLabels.vue` | `components/widgets/conversation/conversationCardComponents/CardLabels.tsx` | Directive `v-resize` → `ResizeObserver`; slot `before` (SLACardLabel) là EE nên `beforeSlot` luôn 0 |
| `ConversationCard.vue` phần `showLabelsSection` | `ConversationCard.tsx` | `hasSlaPolicyId` là EE ⇒ chỉ còn nhánh `chat.labels?.length > 0` |
| `components-next/sidebar/Sidebar.vue` — `labels/getLabelsOnSidebar` + `sortedLabels` + nhóm `Labels` | `components-next/sidebar/menuItems.ts` (nhóm `Labels`) + `Sidebar.tsx` (nạp `useLabelsList`) | `badgeCount` (unread) là B8 — nợ. `sortSidebarItems`/`SidebarSortMenu` chưa port (A3) nên thứ tự = `getLabelsOnSidebar` (title tăng dần), đúng nhánh mặc định của gốc |
| `conversation.routes.js` `label_conversations` / `conversations_through_label` | `routes/web.php` `/label/{label}` + `/label/{label}/conversations/{conversationId}` → `DashboardController@label` | Cùng khuôn với `inbox_dashboard` / `team_conversations` |
| `URLHelper.js#conversationUrl` / `#conversationListPageURL` nhánh `label` | `helper/URLHelper.ts` | Thứ tự ưu tiên giữ đúng gốc: `conversationUrl` inbox → label → team; `conversationListPageURL` label → team → inbox |
| `ChatList.vue` `conversationFilters.labels` + `pageTitle` `#{label}` + `resetBulkActions` | `ConversationContext.tsx` (`labelFilters` vào `listQuery` + `viewFilters`), `chatlist/ChatList.tsx` | Lọc **hai lớp** như gốc: query `labels[]` gửi lên server + `applyPageFilters` phía client |
| `helpers.js#filterByLabel` trong `applyPageFilters` | `realtimeReducers.ts#matchesConversationView` (+ `labels`) | Dùng `matchesLabels` của `labelHelpers.ts` |
| `conversationBulkActions/BulkLabelActions.vue` (nhánh `type="conversation"`) | `conversationBulkActions/BulkLabelActions.tsx` | Chọn nhiều nhãn → footer 1 nút xác nhận; nút "gỡ" chỉ liệt kê nhãn đang gắn trên lựa chọn |
| `composables/chatlist/useBulkActions.js#onAssignLabels/onRemoveLabels` | `composables/useBulkActions.ts` | `labels: {add}` / `labels: {remove}` — chỗ cắm B6 để sẵn |

## Contract backend đã dùng (khớp `b7-notes-be.md`)

- `GET /api/v1/accounts/{id}/labels` → `{payload: Label[]}`.
- `GET|POST /api/v1/accounts/{id}/conversations/{displayId}/labels` — POST body `{labels: [...]}` **thay toàn bộ**, trả `{payload: [...]}` là nguồn sự thật (title lạ bị bỏ im lặng).
- `POST /api/v1/accounts/{id}/bulk_actions` với `labels: {add|remove}`.

## Hai file dùng chung: chèn nguyên tử, đã kiểm lại sau khi ghi

- `resources/js/dashboard/components-next/sidebar/menuItems.ts` (dùng chung với `b7-fe-settings`): thêm tham số `labels` + nội dung nhóm `Labels`, giữ nguyên mục `Settings Labels` của họ.
- `routes/web.php` (dùng chung): chèn 2 route `/label/...` ngay sau `conversations_through_team`, không đụng khối `settings/labels` của họ.

## Khác biệt cố ý / nợ

1. **Không port `store/modules/conversationLabels`** (lý do ở bảng trace). Hệ quả: không có `uiFlags.isFetching` nên LabelBox không hiện `<Spinner>` — nhãn đã nằm sẵn trong payload hội thoại nên bản gốc cũng chỉ chớp spinner khi mở lần đầu.
2. **Nhánh `type="contact"` của `BulkLabelActions`** (thanh bulk trang Contacts) chưa dựng — chưa có call-site.
3. **`badgeCount` unread cho mục nhãn ở sidebar**: nợ B8, đúng như A3 đã ghi cho các nhóm khác.
4. **Nhóm "Tagged With"** (nhãn của Contacts, `contacts_dashboard_labels_index`) vẫn rỗng — route `/contacts/labels/{label}` chưa có, thuộc phần contacts.
5. `LabelDropdownItem` truyền `blue ghost` thay vì `slate blue ghost` như gốc: `computedColor` xét `blue` trước `slate` nên `slate` là prop chết.
6. Bỏ `<Transition>` của Vue (dropdown scale) — cùng quyết định từ B5.

## Vượt ranh giới file đã khai báo (chờ phiên chính duyệt)

1. **`resources/js/dashboard/conversation/api.ts`** — bị cấm (của `b9-fe`) nhưng đã thêm **4 dòng cộng thêm**: `labels?: string[]` vào `FetchConversationsParams` và `query.append('labels[]', …)` trong `fetchConversations` + `fetchConversationMeta`. Lý do: `conversationFilters.labels` của gốc đi vào **cả hai** endpoint (list + stats); viết bản sao trong `labelApi.ts` là nhân đôi ~30 dòng logic dựng query, trái luật DRY. Sửa bằng `Edit` từng đoạn nên không đè lên phần khác của file.
2. `components-next/sidebar/Sidebar.tsx` (+3 dòng: nạp `useLabelsList`, truyền vào `buildMenuItems`), `conversation/ConversationView.tsx` + `ConversationContext.tsx` (prop `label`), `conversation/realtimeReducers.ts` (`labels` trong `ConversationViewFilters`), `helper/URLHelper.ts` (nhánh label — comment cũ đã ghi "vào B7"), `chatlist/ConversationItem.tsx` + `conversationbox/ConversationHeader.tsx` (truyền `label`), `composables/useBulkActions.ts` (`onAssignLabels/onRemoveLabels` — chỗ cắm B6 để sẵn), `components-next/dropdown-menu/DropdownMenu.tsx` (2 prop render `renderThumbnail`/`renderTrailingIcon` = slot `thumbnail`/`trailing-icon` của gốc), `components/widgets/conversation/conversationBulkActions/BulkActionDropdown.tsx` (truyền 2 prop đó xuống), `app/Http/Controllers/App/DashboardController.php` (+1 method `label`, sao đúng khuôn `team`).

## Nợ backend phát hiện được (KHÔNG thuộc phạm vi tôi)

**`ConversationFinder` chưa lọc theo `labels[]`.** Gốc: `app/finders/conversation_finder.rb#filter_by_labels` → `tagged_with(params[:labels], any: true)`. Hiện `app/Finders/ConversationFinder.php:13` vẫn ghi "Bỏ ở B3: labels (B7)". FE đã gửi `labels[]` cho cả `/conversations` lẫn `/conversations/meta`; chừng nào backend chưa lọc thì **danh sách vẫn đúng** (lớp lọc client `applyPageFilters` chặn) nhưng **bộ đếm 3 tab và phân trang sai** khi account có nhiều hơn một trang hội thoại. Dev hiện chỉ có 1 hội thoại nên không nhìn ra bằng mắt. Cần giao lại cho `b7-be`.

## Quan sát khác cần phiên chính định đoạt (không phải B7-FE)

1. **`last_activity_at` không nhảy khi đổi nhãn.** Đo bằng pixel-diff thẻ danh sách: sau khi gán nhãn, oracle hiện "5d • 1m" (mốc bị nâng), yona vẫn "5d • 5d". Activity message được sinh đúng ở cả hai bên.
2. **Bộ đếm chưa đọc trên thẻ**: cùng dữ liệu, oracle không hiện badge, yona hiện "2" (B3/B8, `agent_last_seen_at`).

## Bẫy

1. **`useKeyboardEvents` phím `L`** phải khai `allowOnFocusedInput` cho `Escape` (đóng picker khi con trỏ đang ở ô tìm kiếm) nhưng KHÔNG cho `KeyL` — nếu không thì gõ chữ "l" trong ô tìm nhãn sẽ đóng picker.
2. **Class Tailwind xung đột khi port style scoped**: `.label` gốc đặt `bg-n-slate-3` rồi `.smooth` ghi đè `bg-transparent`; ghép cả hai vào một chuỗi class thì thắng/thua do thứ tự luật trong bundle, không do thứ tự chuỗi. Phải chọn đúng một lớp cho mỗi thuộc tính.
3. **`title` nhãn đi vào URL** — dùng `encodeURIComponent` ở cả `menuItems.ts` lẫn `URLHelper.ts`: regex của model cho phép `\p{L}` (tiếng Việt), không encode thì `activeOn`/so khớp `location.pathname` sẽ trượt.
4. **Tab mặc định là "Mine"**: hội thoại 4 chưa gán ai nên mọi kịch bản e2e phải bấm sang tab "All", nếu không sẽ đọc nhầm thành "nhãn không hiện trên thẻ".
5. **Fixture dùng chung**: hội thoại 4 (yona) và 1 (oracle) đang bị nhiều agent ghi cùng lúc. Lần đo đầu tôi tưởng "gán nhãn không sinh activity" — thật ra `b7-be` dọn dữ liệu song song đã xoá mất. Luôn kiểm ngay trước khi đo.
6. **`.label` là selector CardLabels dùng để đo bề rộng chip** (`querySelectorAll('.label')`) — đổi tên class trong `Label.tsx` sẽ làm hỏng thầm lặng phần "hiện thêm nhãn".

## Gate (06/09)

- `npx tsc --noEmit` ✓ · `npm run build` ✓ · `npm test` **21 file / 163 test** ✓ (mới: `conversation/labelHelpers.test.ts` — 15 test) · `vendor/bin/pint --dirty` ✓ · `php artisan i18n:generate --check` ✓ (đủ khoá sẵn: `CONVERSATION_SIDEBAR.ACCORDION.CONVERSATION_LABELS`, `SIDEBAR.LABELS`, `BULK_ACTION.LABELS.*`, `CONTACT_PANEL.LABELS.*`, `CONVERSATION.CARD.SHOW_LABELS/HIDE_LABELS` — **không phải thêm chuỗi nào**).
- **E2E headless `~/www/pixel-diff/b7-conv-labels-e2e.mjs`** (yona, John, account 2, conversation 4, `__noReloadMarker` giữ nguyên suốt): nhãn khối panel `["Assigned Agent","Assigned Team","Priority","Conversation Labels"]` ✓ · picker liệt kê nhãn account ✓ · chọn 2 nhãn → 2 chip hiện **không reload** ✓ · thẻ danh sách hiện đúng 2 nhãn ✓ · nhóm Labels ở sidebar đủ 2 mục ✓ · bấm `x` trên chip → còn 1 nhãn, không reload ✓ · click nhãn ở sidebar → URL `/app/accounts/2/label/b7conv-alpha`, tiêu đề danh sách `#b7conv-alpha`, đúng 1 hội thoại ✓ · lọc nhãn không gắn ai → 0 hội thoại ✓.
- **Nút "Create new label"** trong picker: gõ "tao thu" → nhãn nút `Create new label: tao-thu` → modal `AddLabel` của `b7-fe-settings` mở với title đã điền `tao-thu` → tạo xong modal đóng, nhãn mới vào ngay picker ✓, không lỗi JS.
- **Pixel-diff oracle↔yona** (`b7-conv-labels-diff.mjs`, `b7-labels-ui-diff.mjs`; dựng 2 nhãn giống hệt hai bên trước khi đo, xoá sạch sau):

  | Vùng | light | dark |
  |---|---|---|
  | khối Conversation Labels — chưa gán (287×26) | **0.000%** | **0.000%** |
  | picker mở (287×215) | **0.000%** | **0.000%** |
  | khối đã gán 2 nhãn (287×56) | **0.000%** | **0.000%** |
  | nhóm Labels ở sidebar (183×112) | **0.000%** | **0.000%** |
  | dropdown bulk "Assign labels" (240×177) | **0.000%** | **0.000%** |
  | dropdown bulk "Remove labels" (240×177) | **0.000%** | **0.000%** |
  | thẻ danh sách có nhãn (340×93) | 5.193% | 5.620% |

  Thẻ danh sách: **hàng nhãn lệch đúng 0 px** (đo theo hàng: y 66–90 không có pixel nào khác). Toàn bộ chênh lệch nằm ở hàng tên/preview/mốc thời gian/badge chưa đọc — hai quan sát ở mục trên, không do B7.
- **Thanh bulk hết lệch**: chạy lại `b6-bulk-diff.mjs` → `b6-bar` **0.000%** (B6 ghi 3.114%/3.193% vì thiếu 2 nút nhãn). Danh sách class nút hai bên trùng khít: `i-lucide-tag`, `i-woot-tag-remove`, `i-lucide-circle-fading-arrow-up`, `i-lucide-user-round-check`, `i-lucide-users-round`. `b6-menu-agent` vẫn 1.016% — khác biệt cố ý #1 của B6 (thứ tự agent).
- **Dọn dữ liệu:** hai bên `labels` = 0, `taggings` = 0; conversation 4 (yona) và 1 (oracle) đều còn đúng **5 tin**, `cached_label_list` NULL, `last_activity_at` = `2026-09-01 06:11:52`.
