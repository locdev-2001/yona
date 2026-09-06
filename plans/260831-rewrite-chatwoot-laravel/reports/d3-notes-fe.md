# D3 Macros — frontend (agent `d3-fe`)

06/09/2026. Nguồn: `refs/chatwoot` v4.17.1 (trừ `enterprise/`). Contract API đọc từ
`reports/d3-notes-be.md` (agent `d3-be`).

## Bảng trace Vue ↔ TSX

| Chatwoot | Yona | Ghi chú |
|---|---|---|
| `routes/dashboard/settings/macros/Index.vue` | `resources/js/dashboard/settings/macros/Index.tsx` | SettingsLayout + BaseSettingsHeader + BaseTable + DeleteModal như `settings/automation/Index.tsx` |
| `.../MacrosTableRow.vue` | `.../settings/macros/MacrosTableRow.tsx` | `router-link` → `Link` của Inertia; `v-tooltip.top` → attribute `title` (quy ước đã dùng ở `AutomationRuleRow.tsx`) |
| `.../MacroEditor.vue` | `.../settings/macros/MacroEditor.tsx` | prop `macroId` đến từ Inertia thay cho `route.params`; wrapper `SettingsContent` (headerTitle + back) đúng `macros.routes.js` |
| `.../MacroForm.vue` | `.../settings/macros/MacroForm.tsx` | Vuelidate (`name`, `visibility` required) → cờ `nameTouched`; `validateActions` dùng chung với Automation |
| `.../MacroNodes.vue` | `.../settings/macros/MacroNodes.tsx` | `vuedraggable` → HTML5 drag-and-drop, kéo bằng đúng tay cầm (như `PreChatFields.tsx`) |
| `.../MacroNode.vue` | `.../settings/macros/MacroNode.tsx` | dùng lại `components/widgets/AutomationActionInput.tsx` của D1 (`isMacro`) |
| `.../MacroProperties.vue` | `.../settings/macros/MacroProperties.tsx` | ô tên là legacy `woot-input` (`components/widgets/forms/Input.tsx`) như gốc |
| `.../constants.js` + `macroHelper.js` + `composables/useMacros.js` | `.../settings/macros/macroHelper.ts` | gom một file: `MACRO_ACTION_TYPES`, `emptyMacro`, `resolveActionName`, `getFileName`, `getMacroDropdownValues`, `resolveMacroActions`, `formatMacro`, `generateMacroPayload` |
| style scoped của `MacroForm.vue` + `MacroNodes.vue` | `.../settings/macros/macros.scss` | nền chấm bi + đường nối nét đứt; `dark:` → `.dark` (darkMode = 'class') |
| `store/modules/macros.js` + `api/macros.js` | `.../settings/macros/macrosStore.ts` | store Vuex → cache module-level + `useSyncExternalStore`, cùng khuôn `composables/useCannedResponses.ts` |
| `MacroEditor.fetchDropdownData` (3 dispatch agents/teams/labels) | `.../settings/macros/useMacroOptionSets.ts` | một nguồn cho cả editor và popup xem trước |
| `routes/dashboard/conversation/Macros/List.vue` | `.../conversation/macros/MacroList.tsx` | thân accordion `macros` của ContactPanel |
| `.../Macros/MacroItem.vue` | `.../conversation/macros/MacroItem.tsx` | |
| `.../Macros/MacroPreview.vue` | `.../conversation/macros/MacroPreview.tsx` | |
| `composables/useOrderedMacros.js` | `.../conversation/macros/useOrderedMacros.ts` | computed get/set → `orderMacros()` + `macrosOrderPatch()`; ui_settings đến từ `ConversationContext` |
| `composables/useMacroExecution.js` | `.../conversation/macros/useMacroExecution.ts` | xem "Khác biệt cố ý" |
| `composables/commands/useMacroHotKeys.js` | `.../commands/useMacroHotKeys.ts` | nhóm "Execute a macro" trong command bar; đăng ký một dòng ở `ConversationView.tsx` |
| `i18n/locale/en/macros.json` | `lang/en/macros.php` | giữ nguyên key (kể cả `LIST.TABLE_HEADER.CREATED BY` có dấu cách) |

## Bảng spec ↔ vitest

| Spec gốc | Test yona | Số case |
|---|---|---|
| `helper/specs/macrosHelper.spec.js` + `composables/spec/useMacros.spec.js` | `settings/macros/macroHelper.test.ts` | 14 |
| `settings/macros/specs/MacroProperties.spec.js` | `settings/macros/MacroProperties.test.tsx` | 4 |
| `settings/macros/specs/MacrosTableRow.spec.js` | `settings/macros/MacrosTableRow.test.tsx` | 4 (thêm 1: fallback email khi tác giả không có tên) |
| `composables/spec/useOrderedMacros.spec.js` | `conversation/macros/useOrderedMacros.test.ts` | 7 |
| `composables/spec/useMacroExecution.spec.js` | `conversation/macros/useMacroExecution.test.tsx` | 3 (xem "Khác biệt cố ý") |

## Khác biệt cố ý

1. **Danh sách action của macro = 12/15 của Chatwoot.** Bỏ `send_email_transcript`,
   `send_attachment`, `send_webhook_event` — đúng bộ đã bị ẩn ở
   `settings/automation/constants.ts` (D1) vì `ActionExecutor` chưa có driver, và
   `AutomationActionInput.tsx` chưa port ba kiểu input `email`/`attachment`/`url`.
   Backend (`d3-be`) vẫn nhận đủ 17 tên nên bật lại chỉ là thêm dòng vào
   `MACRO_ACTION_TYPES` khi driver + input có mặt.
   > Kéo theo: luồng đính kèm của `d3-be` (POST `/upload` → `blob_id`) chưa có UI dùng tới.
2. **`useMacroExecution` bỏ nhánh "thuộc tính bắt buộc khi resolve"**
   (`useConversationRequiredAttributes` + `ConversationResolveAttributesModal`):
   tính năng trả phí chưa port — xem ghi chú sẵn có ở
   `settings/conversationWorkflow/Index.tsx` và `conversationbox/ResolveAction.tsx`.
   Macro luôn chạy thẳng, đúng hành vi gốc khi account không bật tính năng đó.
   Các case spec về `pendingAttributes`/`change_status` vì vậy không port.
3. **`components/widgets/conversation/MacroList.vue`** (popup `/` chèn macro trong ô
   soạn tin, dựa trên `CaretAnchoredPicker`) **chưa port** — `CaretAnchoredPicker`
   chưa có trong repo. Không nằm trong DoD của D3; ghi lại để nhóm sau nhặt.
4. **Kéo thả** (`vuedraggable`/Sortable) → HTML5 drag-and-drop, cả ở MacroNodes và
   danh sách macro trong hội thoại. Không thêm phụ thuộc npm, đúng tiền lệ
   `settings/inboxes/PreChatForm/PreChatFields.tsx`.
5. **`v-on-clickaway` của popup xem trước** đặt trên cả hàng macro thay vì trên
   chính popup: `useClickAway` nghe `mousedown` (chạy trước `click`), đặt trên popup
   sẽ làm nút "Preview" không đóng lại được.

## Sửa ngoài vùng sở hữu (đã ghi rõ, đều là thêm `export`, không đổi hành vi)

- `settings/automation/automationHelper.ts`: `generateActionParams` từ private → `export`
  (chính là `actionQueryGenerator.js` của gốc, macro dùng lại nguyên vẹn).
- `settings/automation/validations.ts`: tách `validateActions` thành hàm export và
  cho `validateAutomation` gọi lại nó — đúng cấu trúc `helper/validations.js` gốc.
- `conversation/conversationbox/ContactPanel.tsx`: chỉ thêm `body: <MacroList .../>`
  cho entry `macros` (+ import) và bỏ chữ "Macros (D3) còn rỗng" trong comment.
- `conversation/ConversationView.tsx`: thêm một dòng `useMacroHotKeys()`.

## Bẫy đã trả giá

1. **`woot-input` và `mb-4`.** Gốc có scoped `:deep(input[type='text']) { @apply mb-0 }`
   nhưng rule đó **thua** selector `input[type]:not(...)...` của `_base.scss` (nhiều
   `:not([type=…])` → độ đặc hiệu cao hơn), nên oracle vẫn giữ `mb-4`. Port y nguyên
   class đó sang React (`[&_input]:!mb-0`) làm cả cột phải cao lên 16px → lệch **2.07%**.
   Chỉ giữ lại rule thực sự thắng: `.error .message { mb-0 }`. (Nối tiếp bẫy #4 của D1.)
2. **Fixture sót giữa hai lần chạy.** Một lần `d3-macros-ui.mjs` timeout giữa chừng để
   lại macro trên oracle → lần chạy sau oracle có 2 macro, lệch 2.5%. Script nay
   `cleanFixture()` (xoá macro trùng tên + nhãn `billing`) TRƯỚC khi seed mỗi lần chụp.
3. **Selector tooltip khác nhau hai bên.** Oracle dùng directive `v-tooltip` (không sinh
   attribute `title`), yona dùng `title` → không thể bắt nút bằng `button[title="…"]`
   trong script chung; phải đi từ hàng chứa tên macro rồi lấy nút đầu tiên.
4. **Cột chat trong màn hội thoại không đo được** (phiên/agent khác cùng ghi dữ liệu):
   các cảnh panel cắt đúng dải panel phải `x=960..1280` như `b11-panel-diff.mjs`.
5. **Nhãn hai bên lệch nhau** (oracle 0 nhãn, yona 2 nhãn "Khách mới/Khách sộp") — cảnh
   nào cần `add_label` phải tự tạo nhãn `billing` ở CẢ HAI bên rồi xoá đi.
6. Không có vite dev server ở phiên này (`public/hot` không tồn tại): mỗi lần sửa TSX
   phải `npm run build` rồi mới pixel-diff, nếu không sẽ đo lại đúng bản cũ.
7. **Hai lần gọi `onChange` liên tiếp trên component controlled = mất thay đổi đầu**
   (lỗi QA bắt trên trình duyệt 06/09: `/settings/macros/new` bấm "Add a Label" →
   dropdown đóng nhưng node vẫn "Assign a Team", không tạo được macro khác mặc định).
   `AutomationActionInput.onActionNameChange` gốc Vue emit hai lần
   (`update:modelValue` rồi `resetAction`) — Vue mutate cùng một object nên không sao.
   Bên React, D1 sống sót vì `AutomationRuleForm` dùng `setAutomation(current => …)`
   (functional, hai lần cập nhật nối tiếp nhau), còn `MacroForm` là component
   **controlled** — cả hai lần đều tính từ prop `macro` CŨ nên lần sau
   (`resetNode` ghi lại `actions`) đè mất `action_name` vừa chọn. Sửa DRY ở đúng
   widget dùng chung: `AutomationActionInput` đổi loại action và xoá `action_params`
   trong MỘT lần `onChange`; `resetNode`/`resetAction` của hai form chỉ còn dọn lỗi
   của node đó (một nguồn duy nhất cho quy tắc "đổi action thì mất tham số").
   Bài học chung: pixel-diff seed macro qua API nên không bao giờ chạm luồng này —
   **màn hình có form phải có e2e bấm thật**, không chỉ chụp ảnh.

## Gate

1. `npx tsc --noEmit` — **sạch trên file của D3**. Còn 2 lỗi ở vùng agent khác
   (`dashboard/reports/composables/useReportMetrics.ts` — `formatTime` không có trong
   `@chatwoot/utils`; `shared/components/charts/viz/BarChart.tsx` — kiểu `Datum`),
   không sửa hộ.
   `npx vitest run` — **60 file / 448 test xanh**, trong đó D3 là 5 file / 32 test.
   `npm run build` — xanh.
2. Pixel-diff (`~/www/pixel-diff/d3-macros-ui.mjs`, light + dark, ngưỡng 0.1%,
   nhiễu nền ~0.030%):

   | Cảnh | light | dark |
   |---|---|---|
   | `list-empty` — danh sách rỗng | 0.030% | 0.030% |
   | `list` — 1 macro (tên, người tạo/sửa + avatar, visibility, 2 nút) | 0.030% | 0.030% |
   | `editor-new` — /settings/macros/new | 0.035% | 0.036% |
   | `editor-edit` — 3 action: add_label + send_message + resolve_conversation | 0.035% | 0.036% |
   | `panel-closed` — accordion Macros đóng (cắt panel phải) | 0.000% | 0.000% |
   | `panel-open` — accordion mở, có macro | 0.000% | 0.000% |
   | `panel-hover` — rê chuột lên macro (nút Preview + Execute) | 0.000% | 0.000% |
   | `preview` — popup xem trước macro | 0.000% | 0.000% |

3. `audit-buttons.mjs` hai bên:

   `/settings/macros` — hai bên **giống hệt nhau từng dòng**:
   ```
   OK   @1112,151 140x32 "Add a new macro" → /settings/macros/new
   ```
   `/settings/macros/new` — hai bên **giống hệt nhau từng dòng** (cùng toạ độ, cùng icon):
   ```
   OK   @224,24   51x24  "Back" i-lucide-chevron-left → /dashboard
   OK   @280,152 142x32  "Assign a Team" i-lucide-users-round
   OK   @430,152 163x32  "Select an option..." i-lucide-plus
   OK   @272,224 163x40  "Add new action" i-lucide-plus-circle
   DEAD @929,206 149x95  "Public…"  (oracle cũng DEAD: Public đang được chọn sẵn)
   DEAD @1090,206 149x95 "Private…" (oracle cũng DEAD: chỉ đổi class, không đổi số phần tử)
   OK   @929,425 310x40  "Save macro"
   ```

## Gate lần sửa lỗi 06/09 (agent `d3-fe-fix`)

Sửa: `components/widgets/AutomationActionInput.tsx` (một lần `onChange` khi đổi loại
action), `settings/macros/MacroForm.tsx` + `settings/automation/AutomationRuleForm.tsx`
(`resetNode`/`resetAction` chỉ dọn lỗi), thêm `settings/macros/MacroForm.test.tsx`
(test hồi quy: bỏ bản vá thì test đỏ đúng thông điệp `expected 'assign_team' to be 'add_label'`).

- `npx tsc --noEmit` — **sạch, không còn lỗi nào** (2 lỗi vùng `dashboard/reports` trước đó
  đã được agent kia sửa).
- `npx vitest run` — **64 file / 473 test xanh** (D3: 6 file / 33 test).
- `npm run build` — xanh.
- `node d3-macros-ui.mjs` (light + dark) — không đổi: list-empty/list 0.030%,
  editor-new/editor-edit 0.035–0.036%, 4 cảnh panel 0.000%. Tất cả ≤ 0.1%.
- `node d3-macros-e2e.mjs` — **30/30 bước PASS** (xem mục dưới).
- Pint: không đụng file PHP nào ở lần sửa này.

### e2e thật `~/www/pixel-diff/d3-macros-e2e.mjs`

Playwright headless, login `john@acme.inc`, yona account 2. Hai phần:

1. **Vòng đời macro "Cảm ơn & đóng"**: tạo bằng chuột qua UI 3 action
   (Add a Label "Khách mới" → Send a Message "Cảm ơn bạn đã liên hệ" →
   Resolve Conversation), visibility Public → Save → list có macro → F5 vẫn còn →
   API xác nhận `action_params` → mở Edit hydrate đúng 3 action + nhãn + nội dung →
   vào hội thoại display 4, mở panel Contact → accordion Macros → hover → Execute →
   chờ job nền tối đa 30s rồi xác nhận qua API: nhãn "Khách mới" có, tin outgoing
   đúng nội dung, `status = resolved` → xoá macro qua UI (danh sách trống + API xác nhận).
2. **Rà mọi kiểu selector tham số**: một macro probe 6 node —
   `assign_team` (search_select → team id), `assign_agent` (search_select → agent id),
   `remove_label` (multi_select → title nhãn), `change_priority` (search_select → `urgent`),
   `snooze_conversation` (không tham số), `add_private_note` (textarea) — kiểm `action_params`
   lưu đúng từng loại.

Cuối cùng luôn dọn: gỡ nhãn khỏi hội thoại, xoá macro test qua API, chạy
`~/www/pixel-diff/reset-fixture.sh` (xoá tin test, mở lại hội thoại).

Bẫy selector của script (ghi lại để khỏi trả giá lần nữa): tay cầm kéo và nút xoá node
chỉ có icon nên phải bắt ô chọn theo "nút CÓ chữ" (`filter({ hasText: /\S/ })`) —
nút thứ nhất là loại action, nút thứ hai là tham số; thẻ visibility "Public" là `button`
chứa cả đoạn mô tả nên phải lọc theo `has: p:has-text("Public")`; macro chạy trong job
nền nên phải poll API chứ không `waitForTimeout` cố định (một lần chạy 4s không đủ → FAIL giả).

## Lệnh chạy lại

```bash
# FE
npx tsc --noEmit
npx vitest run resources/js/dashboard/settings/macros resources/js/dashboard/conversation/macros
npm run build

# i18n
php artisan i18n:generate

# Pixel-diff (cần oracle :3000 + yona :8000 đang chạy)
cd ~/www/pixel-diff
node d3-macros-ui.mjs                # tất cả cảnh
node d3-macros-ui.mjs editor-edit    # một cảnh
node audit-buttons.mjs http://localhost:8000 /settings/macros
node audit-buttons.mjs http://localhost:3000 /settings/macros

# e2e thật (tạo/sửa/chạy/xoá macro qua UI, tự dọn fixture)
node d3-macros-e2e.mjs
```
