# B10 Tiện ích soạn thảo — ghi chú frontend (agent `b10-fe`)

Nguồn: Chatwoot v4.17.1 (`refs/chatwoot`). Ngày: 06/09/2026.
Phạm vi: màn Settings › Canned Responses (CRUD), popup `/` trong ReplyBox, bản nháp
(draft), các nguồn action còn lại của command bar, mục "Keyboard shortcuts" + modal
phím tắt, i18n `CANNED_MGMT.*`.

## Trace Vue/JS ↔ TSX

| Nguồn Chatwoot | Đích yona | Ghi chú |
|---|---|---|
| `api/cannedResponse.js` + `store/modules/cannedResponse.js` | `composables/useCannedResponses.ts` | Store vuex → cache module-level + `useSyncExternalStore` (cùng khuôn `useLabelsList.ts`): màn Settings và popup `/` đọc **chung một nguồn**. `sortCannedResponses` = getter `getSortedCannedResponses`, `searchCannedResponses` = `filteredRecords` của Index.vue. **Bỏ** `CacheEnabledApiClient` (IndexedDB + `validateCacheKey`/`cache_keys`) — backend chưa port `cache_keys`, xem note `b10-notes-be.md` |
| `routes/dashboard/settings/canned/Index.vue` | `settings/canned/Index.tsx` | Dùng lại `SettingsWrapper`/`SettingsLayout`/`BaseSettingsHeader`/`BaseTable*`/`Modal`/`DeleteModal` của A5/B7. Nút tiêu đề cột đảo `asc/desc` + icon `i-woot-sort-{ascending,descending}` y gốc |
| `settings/canned/AddCanned.vue` + `EditCanned.vue` | `settings/canned/{AddCanned,EditCanned}.tsx` + `CannedForm.tsx` | Hai file gốc lặp nguyên khối form → tách `CannedForm` dùng chung (khác nhau: header, nhãn nút, chạm `blur` khi thêm / `input` khi sửa, `setTimeout(onClose, 10)` khi sửa). vuelidate `required + minLength(2)` → `isShortCodeInvalid`/`isContentInvalid` |
| `components/widgets/conversation/CannedResponse.vue` | `components/widgets/conversation/CannedResponse.tsx` | `picoSearch` cùng trọng số (`shortCode` 1, `plainText`), `buildSnippet` (SNIPPET_LEAD 24), `highlightContent` (chép từ `useMessageFormatter.js`, chỉ dùng ở đây). **Bỏ** `variables` (biến `{{…}}` = D1) → xem trước = nội dung chèn |
| `components-next/preview-picker/CaretAnchoredPicker.vue` | `components/widgets/WootWriter/CaretAnchoredPicker.tsx` | `useElementBounding`/`useResizeObserver`/`useWindowSize` của @vueuse → hook nội bộ; `TeleportWithDirection` → `createPortal(…, document.body)` bọc `<div dir="ltr">` (bản port chưa có RTL); phím Tab/Shift+Tab/Escape/Backspace + `useKeyboardNavigableList` y gốc |
| `components-next/preview-picker/PreviewPicker.vue` | `components/widgets/WootWriter/PreviewPicker.tsx` | `v-dompurify-html` → `dangerouslySetInnerHTML` + `DOMPurify.sanitize`; `scrollSelectedIntoView` phơi qua `useImperativeHandle` |
| `composables/useKeyboardNavigableList.js` | `composables/useKeyboardNavigableList.ts` | `updateSelectionIndex` tách ra làm hàm thuần (có test) |
| `WootWriter/Editor.vue` phần `createSuggestionPlugin('/')` + `insertSpecialContent('cannedResponse')` + `caretPosition` + `removeSuggestionTrigger` | `components/widgets/WootWriter/Editor.tsx` | `suggestionsPlugin`/`triggerCharacters` import thẳng `@chatwoot/prosemirror-schema/src/mentions/plugin` như gốc (type khai báo ở `WootWriter/prosemirror-mentions.d.ts`). `insertAtCursor` + `nodeCreators.cannedResponse` (kể cả mẹo `from - 1` khi `node.textContent !== content`) gộp vào Editor vì `helper/editorHelper.ts` ngoài phạm vi agent |
| `ReplyBox.vue` `getDraftKey/saveDraft/setToDraft/switchDraftContext/getFromDraft/toggleSignatureForDraft/removeFromDraft` + `store/modules/draftMessages.js` | `conversation/draftApi.ts` + phần draft trong `conversationbox/ReplyBox.tsx` | Xem mục **Draft** bên dưới |
| `ReplyBox.vue` `getKeyboardEvents()['$mod+KeyK']` | `ReplyBox.tsx` `useKeyboardEvents` | Mở command bar kể cả khi đang focus editor (`allowOnFocusedInput`) |
| `composables/commands/useGoToCommandHotKeys.js` | `commands/useGoToCommandHotKeys.ts` | `routeName` + `router.resolve` → đường dẫn account-scoped (**cùng path sidebar đang dùng**) + `router.visit`; `checkPermissions(meta.permissions)` → cờ `adminOnly` đọc `currentAccountUser.role` |
| `composables/commands/useAppearanceHotKeys.js` | `commands/useAppearanceHotKeys.ts` | `LocalStorage.set + setColorTheme` → `helper/themeHelper.updateColorScheme` |
| `composables/commands/useConversationHotKeys.js` (assign agent/team/label/priority) | `commands/useConversationHotKeys.ts` | Dùng lại `useAgentsList`, `useTeamsList`, `useLabelsList`, `labelHelpers`, `buildPriorityOptions`, `ConversationContext.assignAgent/assignTeam/togglePriority`, `updateConversationLabels`. Ba nhánh cha giống nhau → hàm chung `buildParentAction` |
| `routes/dashboard/commands/commandbar.vue` (gọi các composable) | `commands/CommandBar.tsx` | Nguồn `goto` + `appearance` đăng ký ngay trong CommandBar (nằm ngoài `ConversationProvider`); nguồn `conversation` vẫn do `ConversationView` đăng ký |
| `helper/commandbar/icons.js` | `helper/commandbar/icons.ts` | Chép **nguyên file** (53 hằng số) thay vì 6 icon của B5 |
| `components/widgets/modal/WootKeyShortcutModal.vue` + `constants.js` + `components/base/Hotkey.vue` | `commands/KeyShortcutModal.tsx` + `commands/shortcutKeys.ts` | `Hotkey.vue` chỉ có style nên gộp thẳng (xem **Bẫy · line-height**) |
| `components-next/sidebar/SidebarProfileMenu.vue` mục KEYBOARD_SHORTCUTS | `components-next/sidebar/SidebarProfileMenu.tsx` | Trả nợ ghi ở trace B4 |
| `components-next/sidebar/helpers/useSidebarKeyboardShortcuts.js` | `composables/useSidebarKeyboardShortcuts.ts` | `$mod+Slash` mở / `$mod+Escape` đóng modal, `Alt+C/V/R/S` điều hướng |
| `i18n/locale/en/cannedMgmt.json` | `lang/en/canned_mgmt.php` | `COMMAND_BAR.*`, `KEYBOARD_SHORTCUTS.*`, `COMBOBOX.*` đã có sẵn từ A/B trước |
| `canned.routes.js` (`settings/canned-response` → `/list`) | `routes/web.php` | **Ngoài** nhóm `account.role:administrator` — gốc cho mọi vai trò có quyền hội thoại |

## Draft — bám đúng dashboard gốc: localStorage, KHÔNG gọi API

`b10-be` đã port `GET|PATCH|DELETE …/conversations/{displayId}/draft_messages` (Redis) để giữ
đủ mặt tiền API, **nhưng dashboard Chatwoot v4.17.1 không dùng chúng**: `store/modules/draftMessages.js`
đọc/ghi thẳng `localStorage` khóa `draftMessages`. Bản port giữ nguyên nguồn đó (`conversation/draftApi.ts`)
để hành vi trùng oracle. Nếu sau này muốn nháp theo tài khoản (đa thiết bị) thì đó là **thay đổi
so với gốc**, phải có lệnh riêng.

Luồng trong `ReplyBox.tsx` (đúng thứ tự gốc):

- Khóa `draft-{conversationId}-{REPLY|NOTE}` (`REPLY_EDITOR_MODES` là chữ HOA — đã đối chiếu `draft-4-REPLY` với gốc).
- Đổi hội thoại → `switchDraftContext(conversationId, REPLY)`: lưu nháp ngữ cảnh cũ → khôi phục nháp ngữ cảnh mới (qua `toggleSignatureForDraft`).
- Đổi chế độ trả lời ↔ ghi chú → `switchDraftContext(conversationId, replyType)` (mỗi chế độ một nháp riêng).
- Mỗi lần `message` đổi → `debounce(save, 500, immediate)` như `doAutoSaveDraft` gốc; nội dung cắt bằng `trimContent(message, maxLength)`.
- Gửi xong → `removeFromDraft()` trong `afterSent()`; sau đó `clearMessage()` ghi lại chuỗi rỗng — **giống hệt gốc** (`saveDraft` gốc cũng ghi `''`).
- **Bẫy React đã xử lý:** effect `[message]` chạy cùng commit với effect đổi ngữ cảnh và thấy `message` cũ → `switchDraftContext` gán `messageRef.current` **đồng thời** với `setMessage`, hàm lưu đọc qua ref nên không ghi đè nháp vừa khôi phục bằng chuỗi rỗng.

## Khác biệt cố ý / nợ

1. **AI Assist trong command bar (Captain/EE) — CHƯA port.** Oracle (account 1, cờ `captain_tasks` bật)
   có nhóm `AI Assist` (1 action cha + 1 con `Reply suggestion`), yona không có → command bar oracle 53
   action vs yona 51. Handler gốc chỉ `emitter.emit(CMD_AI_ASSIST, key)` cho Copilot xử lý; port giả sẽ
   thành nút bấm không phản ứng (vi phạm gate 4) nên **ghi nợ** thay vì dựng rỗng. Mọi mục còn lại
   trùng **từng dòng, đúng thứ tự** (đã dò bằng `~/www/pixel-diff/b10-cmdbar-probe.mjs` hai bên).
2. **Danh sách "Go to …" khớp đúng oracle, không khớp `GO_TO_COMMANDS` đầy đủ của source:** oracle chặn
   Captain / Calls / SLA *settings* / Data / Audit Logs / Billing bằng cờ tính năng nên bản port cũng bỏ;
   **SLA *reports* thì oracle CÓ** nên giữ. Nếu sau này bật cờ tương ứng thì thêm lại theo `GO_TO_COMMANDS` gốc.
3. **Macro (`#`) trong editor + `useMacroHotKeys` = D3** — chưa dựng (đúng phân công).
4. **Mention `@` (B11), variables `{{ }}` (D1), emoji gõ `:` ** vẫn chưa có trong Editor — B10 chỉ thêm nhánh `/`.
   `PreviewPicker`/`CaretAnchoredPicker` đặt tạm ở `components/widgets/WootWriter/` (gốc: `components-next/preview-picker/`)
   theo ranh giới file của tính năng này — **khi port picker thứ hai nên chuyển về đúng cây gốc**.
5. **`ReplyBoxBanner` ("This conversation is not assigned to you / Assign to me") chưa port — nợ có từ B3**,
   nhưng B10 mới làm nó lộ ra: gõ bất kỳ ký tự nào (kể cả `/`) làm oracle chèn banner cao 56px phía trên
   ReplyBox → khung tin nhắn co lại 56px. Vì vậy pixel-diff **toàn khung** ở trạng thái "đang gõ" lệch
   2–4%, còn **chính popup canned thì 0.000%**. Muốn full-frame sạch thì phải port `ReplyBoxBanner` + `ui/Banner`
   (thuộc B3/B6, ngoài phạm vi agent này).
6. **Modal thêm/sửa canned lồng HAI lớp `Modal`** — đúng gốc (`Index.vue` mở `woot-modal`, `AddCanned.vue`
   lại bọc `Modal` của chính nó) nên nền mờ chồng hai lớp. Ban đầu port một lớp → dark lệch 0.641%;
   lồng đúng hai lớp → 0.020%.
7. **`KeyShortcutModal` phải `createPortal` ra `document.body`**: gốc mount ở `Dashboard.vue`, bản port
   mount trong `SidebarProfileMenu` (Dashboard.tsx ngoài phạm vi agent) mà sidebar có `transform` →
   `position: fixed` bị neo vào sidebar (modal rộng 159px thay vì 900px).
8. `getCommandBarActions()` là getter mới thêm vào `commandBarStore` (chỉ để test đọc snapshot đã gộp).
9. **404 body khác oracle** (`APP_DEBUG`) và thiếu `cache_keys` — xem `b10-notes-be.md`, không phải việc FE.

## Bẫy

- **`line-height` của `kbd.hotkey`:** gốc `kbd.hotkey{ leading-[0.625rem] }` (0,1,1) bị class scoped `.key`
  (`@apply … text-xs`, 0,2,0) đè → line-height thật là **16px**. Khi dẹp hai lớp thành một chuỗi utility,
  `leading-[0.625rem]` lại thắng `text-xs` (thứ tự phát sinh của Tailwind) → mỗi phím thấp 6px, modal
  thấp 48px. **Bỏ hẳn `leading-*` khỏi lớp base** mới trùng oracle.
- `uppercase` (base) vs `normal-case` (customClass) cùng đặc hiệu — Tailwind phát `normal-case` sau nên
  thắng; giữ nguyên cả hai class như gốc thì kết quả đúng (`Win / ⌘` không bị viết hoa).
- `GET /canned_responses` trả **mảng trần** (không bọc `payload`) — khác `labels`.
- Popup canned lấy focus (ô tìm kiếm) → editor `blur` → `reply-box` mất class `is-focused`. Giống gốc.
- Danh sách tin tự cuộn đáy không đồng thời hai bên; muốn chấm full-frame phải ép `scrollTop` hoặc
  chấm theo crop (đã ghi ở B5).
- Sau `npm run build` mà tab cũ còn mở, Inertia trả **409 POST /app/login** (version asset đổi) rồi tự
  reload — vô hại, thấy trong log e2e.

## Gate đã chạy

- `npx tsc --noEmit` ✓ · `npm run build` ✓ · `npm test` **27 file / 208 test** ✓
  (mới: `composables/useCannedResponses.test.ts`, `composables/useKeyboardNavigableList.test.ts`,
  `commands/commandBarStore.test.ts`, `conversation/draftApi.test.ts` — 29 test mới).
- `php artisan i18n:generate` ✓ (`en.ts` chỉ **+78 dòng**, 0 dòng xóa).
- **Pixel-diff (1280×800, light + dark, `~/www/pixel-diff/b10-editor-diff.mjs`):**

  | Trạng thái | light | dark |
  |---|---|---|
  | Settings › Canned Responses (2 bản ghi, `compare.mjs`) | 0.030% | 0.030% |
  | Modal "Add canned response" (phần tử) | 0.000% | 0.000% |
  | Modal "Add canned response" (toàn khung, gồm nền mờ) | 0.038% | 0.020% |
  | Modal "Edit canned response" (phần tử) | 0.000% | 0.000% |
  | Popup canned `/` (phần tử 697×200 @562,420 — trùng vị trí tuyệt đối) | 0.000% | 0.000% |
  | Modal "Keyboard shortcuts" (phần tử 900×504) | 0.000% | 0.000% |
  | Modal "Keyboard shortcuts" (toàn khung) | 0.039% | 0.031% |
  | Popup canned — toàn khung | 2.154% | 4.566% |

  Ô cuối **không đạt** do `ReplyBoxBanner` chưa port (mục 5 ở trên); hội thoại lúc nghỉ vẫn ở mức nền
  0.060% / 0.113% (`compare.mjs` conversation, bằng baseline B3).
- **Audit nút** `audit-buttons.mjs … /settings/canned-response/list`: hai bên **trùng khít**
  (Add / ✎ / 🗑 đều OK, nút sắp cột báo DEAD ở **cả hai** vì heuristic không thấy DOM đổi khi chỉ đảo thứ tự).
- **E2E** `~/www/pixel-diff/b10-editor-e2e.mjs` (yona, John, account 2, conversation 4):
  màn Settings rỗng → tạo (`Submit` disabled khi trống) → sửa → tạo bản 2 → đảo sắp xếp asc/desc → tìm kiếm →
  gõ `/` mở popup (2 mục, ô tìm tự focus) → gõ `b10` lọc còn 1 → chọn → **chèn đúng nội dung** vào editor,
  popup đóng → nháp ghi `{"draft-4-REPLY":"…"}` → rời sang dashboard rồi quay lại: **nháp còn nguyên** →
  gửi tin: nháp xóa + editor rỗng → `Ctrl+K` mở command bar (35 action) → chọn "Go to Contacts Dashboard"
  điều hướng đúng → menu profile → "Keyboard shortcuts" mở modal 15 dòng → Esc đóng → `Ctrl+/` mở lại.
  Không có lỗi trang (ngoài 409 Inertia nói trên).
- **Probe phụ** `b10-extra-probe.mjs`: `/` **không** mở popup ở chế độ ghi chú riêng tư (đúng
  `isAllowed: () => !isPrivate`); nhánh `Change Appearance` có Light/Dark/System, chọn Dark thì
  `body.dark = true` + `localStorage.color_scheme = "dark"`.
- **Dọn sạch:** `canned_responses` = 0 hàng ở **cả hai bên**; đã chạy `~/www/pixel-diff/reset-fixture.sh`
  (yona display 4 / oracle display 1, 5 tin mỗi bên); nháp chỉ nằm trong localStorage của trình duyệt
  headless (không lưu profile) nên không còn dấu vết; script tạm `storage/app/b10-*.php` đã xóa.

## Script mới trong `~/www/pixel-diff`

`b10-editor-e2e.mjs` (e2e trọn vòng) · `b10-editor-diff.mjs` (pixel-diff 4 trạng thái, light+dark) ·
`b10-cmdbar-probe.mjs` (liệt kê action command bar một bên) · `b10-extra-probe.mjs` (ghi chú riêng tư +
đổi giao diện) · `b10-modal-probe.mjs`, `b10-shortcut-probe.mjs`, `b10-scroll-probe.mjs`, `b10-footer-probe.mjs`
(dò kích thước, dùng khi truy nguyên lệch pixel).
