# B5 Vòng đời conversation — ghi chú FE priority (agent `b5-fe-priority`)

Nguồn: Chatwoot v4.17.1 (`refs/chatwoot`). Ngày: 06/09/2026. Phạm vi: dropdown **priority** trong accordion "Conversation Actions" của ContactPanel + cắm thân accordion (đang rỗng từ B3).

## Trace Vue ↔ TSX

| Nguồn Chatwoot | Đích yona | Ghi chú |
|---|---|---|
| `routes/dashboard/conversation/ConversationAction.vue` — CHỈ khối priority (`priorityOptions`, `assignedPriority` get/set, `onClickAssignPriority`) | `conversation/conversationbox/contact/ConversationAction.tsx` + `contact/priorityOptions.ts` | Logic thuần (dựng 5 option, ánh xạ priority→option, bấm-lại-để-gỡ) tách sang `priorityOptions.ts` cho vitest. Khối assignee/team (B6) + labels `LabelBox` (B7) **chưa dựng** — giữ đúng thứ tự gốc để chèn vào sau, không dựng placeholder giả |
| `routes/dashboard/conversation/ContactDetailsItem.vue` | `conversation/conversationbox/contact/ContactDetailsItem.tsx` | y gốc (`value` rỗng → không render khối dưới) |
| `shared/components/ui/MultiselectDropdown.vue` | `resources/js/shared/components/ui/MultiselectDropdown.tsx` | `OnClickOutside` (vueuse) → listener `mousedown` (cùng cách `ResolveAction.tsx` đã port); `useToggle` → `useState`; `@keyup.esc` → `onKeyUp` trên div bọc |
| `shared/components/ui/MultiselectDropdownItems.vue` | `resources/js/shared/components/ui/MultiselectDropdownItems.tsx` | SCSS scoped (`.dropdown-wrap`, `.search-input`) inline thành class Tailwind y `@apply` gốc; `mounted → focusInput()` = `useEffect` focus |
| `routes/dashboard/conversation/ContactPanel.vue` nhánh `conversation_actions` | `conversationbox/ContactPanel.tsx` — thêm `body?: ReactNode` vào `SidebarSection`, section `conversation_actions` mang `<ConversationAction />` | `AccordionItem` chuyển từ self-closing sang có children; các section khác vẫn `body` undefined (thân rỗng như B3) |
| `shared/constants/messages.js#CONVERSATION_PRIORITY` | literal `'urgent' \| 'high' \| 'medium' \| 'low'` kiểu `ConversationPriority` (`conversation/types.ts`) | `shared/constants/messages.ts` ngoài phạm vi sửa; kiểu union đã là nguồn chuẩn |
| i18n `CONVERSATION.PRIORITY.*`, `CONVERSATION_SIDEBAR.ACCORDION.CONVERSATION_ACTIONS` | `lang/en/conversation.php`, `lang/en/conversation_sidebar.php` | **Đã có sẵn đủ khóa** — không thêm khóa nào, không cần chạy `i18n:generate` |

## Vị trí file (lệch cây gốc — cố ý)

- `ConversationAction.tsx` + `ContactDetailsItem.tsx` đặt trong `conversationbox/contact/` (gốc là anh em của `ContactPanel.vue`, tức `conversationbox/`) — theo đúng ranh giới file được giao cho agent này.
- `MultiselectDropdown(.Items).tsx` đặt tại `resources/js/shared/components/ui/` — **khớp y cây gốc**, vì đây là primitive dùng chung: B6 (assignee/team) và các màn khác sẽ tái sử dụng nguyên si, không được nhân bản trong `conversation/`.

## Khác biệt cố ý / nợ

- **Toast lỗi:** gốc nuốt lỗi trong store action `assignPriority` nên `.then()` vẫn bắn toast SUCCESSFUL kể cả khi API hỏng (và khóa `CONVERSATION.PRIORITY.CHANGE_PRIORITY.FAILED` không được dùng ở đâu trong Chatwoot). `ConversationContext#togglePriority` của yona revert + throw, nên ở đây `.catch()` bắn `…CHANGE_PRIORITY.FAILED` — đúng ý nghĩa khóa, khác hành vi gốc.
- `useTrack(CONVERSATION_EVENTS.CHANGE_PRIORITY)` (analytics) không port.
- **Điều hướng ArrowUp/ArrowDown của `WootDropdownMenu` không port**: gốc dò `ul.dropdown li.dropdown-menu__item .button`, nhưng `NextButton` không gắn class `.button` → ở chính Chatwoot phím mũi tên trong multiselect đã là no-op. Bỏ = không đổi hành vi.
- Cùng lý do, style scoped `.dropdown-menu__item :deep(.button)` không áp được ở gốc → không port.
- Nhánh **AgentBot** (`assignee_type === 'AgentBot'`: avatar `icon-name`, slot `#badge`, tên `-`) chưa port — `Avatar.tsx` của yona chưa có slot `badge`. Nợ B6; priority không chạm nhánh này.
- Class `dropdown menu vertical dropdown--top` giữ nguyên trên `<ul>` cho giống DOM gốc dù **không có CSS nào bắt** (Chatwoot đã bỏ foundation; `app.scss` chỉ `@import 'woot'`).

## Bẫy

1. `i-woot-priority-*` **đã có sẵn** trong `theme/icons.js` (5 icon empty/low/medium/high/urgent) — không phải copy gì; đừng đi tìm trong `dashboard-icons.json` (đó là bộ FluentIcon, khác hệ).
2. Khi priority = None, `hasValue` = false (id `null`) → nút **không hiện icon nào**, chỉ chữ "None" (placeholder). Đừng "sửa" thành hiện `i-woot-priority-empty` — gốc là vậy, pixel sẽ lệch.
3. Trong danh sách thì cả 5 option đều hiện icon (kể cả None) vì nhánh `v-else-if="option.icon"` không phụ thuộc `hasValue`.
4. `selectedConversation.id` = `display_id` (ConversationResource ánh xạ như `_conversation.json.jbuilder`) → toast "conversation id 4" khớp gốc.
5. Đo pixel khối priority **không** cắt theo tọa độ tuyệt đối được: oracle có thêm assignee/team phía trên nên y lệch. `b5-priority-diff.mjs` chụp theo bounding box phần tử (từ `span:text-is("Priority")` lên 3 cấp).
6. Đổi priority hai bên để chụp trạng thái "đã chọn": dùng `update_column` (Rails) / `DB::table()->update()` (Laravel) để **bỏ qua callback** — `update()` qua model sẽ đẻ activity message làm bẩn dữ liệu chung.

## Gate (06/09)

- `npx tsc --noEmit` ✓ · `npm run build` ✓ · `npm test` 13 file / 61 test ✓ (mới: `conversationbox/contact/priorityOptions.test.ts`, 6 test: thứ tự option, ánh xạ priority↔option, fallback None, bấm-lại-gỡ-về-None).
- E2E headless `~/www/pixel-diff/b5-priority-e2e.mjs` (yona, John, account 2, conversation 4), không reload (`__noReloadMarker` giữ nguyên): panel contact → accordion "Conversation Actions" → nhãn "Priority" + nút "None" → mở dropdown: 5 option đúng thứ tự None/Urgent/High/Medium/Low, dấu ✓ ở None → chọn **Urgent**: nút đổi thành "Urgent" + icon `i-woot-priority-urgent`, toast "Changed priority of conversation id 4 to Urgent", activity message "John set the priority to urgent" hiện qua realtime (`noReload=true`) → chọn lại **None**: nút về "None" không icon, activity "John removed the priority" ✓.
- Pixel-diff oracle↔yona `~/www/pixel-diff/b5-priority-diff.mjs` (cắt theo bounding box khối priority), cả khi priority = null và = urgent:
  - closed light 287×66 **0.000%**, closed dark **0.000%**
  - open (dropdown bung, có ô tìm kiếm + 5 option) light 287×246 **0.000%**, dark **0.000%**
- Dọn: xóa 4 activity message test (id 37–40) của conversation 4, `priority` về NULL, `last_activity_at` trả về `2026-09-01 06:11:52` → còn đúng 5 tin / max id 7 như trước khi test. Oracle conversation 1 trả `priority` về nil, 5 tin, không sinh activity nào (dùng `update_column`).
