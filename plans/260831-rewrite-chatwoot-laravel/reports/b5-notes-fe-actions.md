# B5 Vòng đời conversation — ghi chú FE actions (agent `b5-fe-actions`)

Nguồn: Chatwoot v4.17.1 (`refs/chatwoot`). Ngày: 02/09/2026. Phạm vi: Resolve/Reopen/Open/Mark as pending/Snooze, mute/unmute, transcript modal, khung command bar (ninja-keys) + snooze, phím tắt, header "Snoozed until".

## Trace Vue/JS ↔ TSX

| Nguồn Chatwoot | Đích | Ghi chú |
|---|---|---|
| `api/inbox/conversation.js` `toggleStatus/togglePriority/mute/unmute/sendEmailTranscript` | `conversation/api.ts` cùng tên | `toggle_priority`/`mute`/`unmute`/`transcript` trả 200 body rỗng → `postWithoutBody` nuốt `SyntaxError` của `response.json()` (apiClient không thuộc phạm vi sửa) |
| `store/modules/conversations/actions.js#toggleStatus` + mutation `CHANGE_CONVERSATION_STATUS` | `ConversationContext#toggleStatus({status, snoozedUntil?, conversationId?})` + `lifecycleReducers#applyConversationStatus` | Ghi `current_status` + `snoozed_until` từ payload lên conversation; lỗi nuốt như gốc. Bỏ nhánh `customAttributes` (required attributes = EE) |
| `assignPriority` + `setCurrentChatPriority` (`ASSIGN_PRIORITY`), cách gọi của `ConversationAction.vue` | `ConversationContext#togglePriority(priority)` + `applyConversationPriority` | Lạc quan trước, POST sau; lỗi → revert giá trị cũ rồi throw (panel `b5-fe-priority` toast) |
| `muteConversation/unmuteConversation` (`MUTE_CONVERSATION/UNMUTE_CONVERSATION`) | `ConversationContext#muteConversation/unmuteConversation` + `applyConversationMuted` | Backend mute còn resolve + block contact → realtime `status_changed` tự cập nhật status |
| `components/buttons/ResolveAction.vue` | `conversationbox/ResolveAction.tsx` | ButtonGroup = div bọc 2 nút; `isLoading` cục bộ; toast `CONVERSATION.CHANGE_STATUS` sau promise; `Alt+KeyM` mở dropdown (allowOnFocusedInput), `Alt+KeyE` resolve (preventDefault vì Chrome/Windows), `$mod+Alt+KeyE` resolve + click card kế (`.conversations-list .conversation` / `.active` — DOM y gốc). Bấm Snooze **không** đóng dropdown (gốc chỉ `ninja.open({parent:'snooze_conversation'})`). Bỏ `ConversationResolveAttributesModal` + `useConversationRequiredAttributes` (EE) |
| `widgets/conversation/MoreActions.vue` | `conversationbox/MoreActions.tsx` | mute/unmute theo `currentChat.muted`; toast `CONTACT_PANEL.MUTED_SUCCESS/UNMUTED_SUCCESS`; nhận `CMD_MUTE/UNMUTE/SEND_TRANSCRIPT` từ emitter |
| `widgets/conversation/EmailTranscriptModal.vue` | `components/EmailTranscriptModal.tsx` | vuelidate `required+email+minLength(4)` → regex + touched; 402 → `SEND_EMAIL_PAYMENT_REQUIRED` |
| `widgets/conversation/ConversationHeader.vue` `snoozedReopenTime` | `conversationbox/ConversationHeader.tsx` | Thay `dateFormat` tạm của B3 bằng `helper/snoozeHelpers#snoozedReopenTime` (`h.mmaaa` / `d MMM, h.mmaaa` / `d MMM yyyy, h.mmaaa`) |
| `helper/snoozeHelpers.js` | `helper/snoozeHelpers.ts` | `findStartOfNextWeek/Month`, `findNextDay`, `setHoursToNine`, `findSnoozeTime`, `snoozedReopenTime`, `snoozedReopenTimeToTimestamp`, `shortenSnoozeTime`. **Bỏ** `generateSnoozeSuggestions` (kéo theo `snoozeDateParser` ~1.7k dòng — nợ B10) |
| `constants/globals.js#SNOOZE_OPTIONS` | `constants/globals.ts` | |
| `helper/commandbar/{events,icons,actions}.js` | `helper/commandbar/{events,icons,actions}.ts` | icons chỉ 6 icon nhóm Conversation; actions = OPEN/SNOOZE/RESOLVED + SEND_TRANSCRIPT/MUTE/UNMUTE |
| `composables/commands/useConversationHotKeys.js` (statusActions + conversationAdditionalActions) | `commands/useConversationHotKeys.ts` (gọi trong `ConversationView`) | Đăng ký vào `commands/commandBarStore.ts` (nguồn `conversation`). Assign agent/team/label/priority/macro/AI = B10 |
| `routes/dashboard/commands/commandbar.vue` | `commands/CommandBar.tsx` + `commandbar.scss` (mount ở `Dashboard.tsx`) | Web component `@chatwoot/ninja-keys@1.2.3` (pnpm, pin exact). `data` gộp từ `commandBarStore` (useSyncExternalStore) vì CommandBar nằm ngoài `ConversationProvider`. Patch `open/close` + event `selected/change/closed` để đổi placeholder `SNOOZE_PLACEHOLDER`. **Bỏ:** `buildDynamicSnoozeActions` (gợi ý NLP khi gõ), `isPaywalled`, `setContextMenuChatId`, tracking, `ConversationResolveAttributesModal` |
| `routes/dashboard/commands/CmdBarConversationSnooze.vue` | `commands/CmdBarConversationSnooze.tsx` (mount trong `ConversationView` như gốc) | preset → `findSnoozeTime`; số → epoch; `until_custom_time` → CustomSnoozeModal; bỏ `contextMenuChatId` (context menu card chưa port) |
| `components/CustomSnoozeModal.vue` (+ `vue-datepicker-next@1.0.3`) | `components/CustomSnoozeModal.tsx` + `.scss` | **Xác minh:** bản 1.0.3 KHÔNG có prop `inline` → gốc render ô nhập `.mx-input` + popup lịch/giờ append vào body (không phải lịch inline). Port đúng DOM/class `mx-*` (calendar 6×7, header ‹‹ ‹ › ›› + tháng/năm, panel giờ 3 cột HH/mm/ss, `disabledDate`/`disabledTime` y gốc, vị trí popup theo `getRelativePosition`). SCSS = subset `vue-datepicker-next/scss` + ghi đè `plugins/_date-picker.scss` |
| `composables/useKeyboardEvents.js` + `shared/helpers/KeyboardHelpers.js` (typeable/QWERTZ) + `useDetectKeyboardLayout.js` | `composables/useKeyboardEvents.ts` | tinykeys **4.0.0** (3.0.0 vỡ types qua `exports`); v4 mặc định bỏ qua phím từ ô nhập → truyền `ignore: () => false` để `shouldIgnoreEvent`/`allowOnFocusedInput` quyết như gốc. Handler đọc qua ref nên map phím không cần memo |
| `i18n/locale/en/generalSettings.json` `COMMAND_BAR` | `lang/en/command_bar.php` | Các khóa CONVERSATION.HEADER/RESOLVE_DROPDOWN/CUSTOM_SNOOZE/CHANGE_STATUS, CONTACT_PANEL.MUTE*, EMAIL_TRANSCRIPT.* đã có sẵn |

## Khác biệt cố ý / nợ

- `POST …/transcript` chưa có backend (mailer D5): Submit bấm được, backend 404 → toast `SEND_EMAIL_ERROR`.
- Gợi ý snooze NLP khi gõ trong command bar (`snoozeDateParser`) → B10. Ctrl+K vẫn mở được bar (mặc định ninja-keys) nhưng chỉ có nhóm Conversation — khung cho B10.
- Context menu chuột phải trên card (`contextMenuChatId`) chưa port → snooze chỉ áp cho conversation đang mở.
- `cw_keyboard_layout` headless chromium trả chuỗi rỗng (layoutMap rỗng) → dò lại mỗi lần, vô hại, giống gốc.

## Bẫy

- Tin nhắn/label đổi trước khi `isLoading` reset (context cập nhật trong promise, `setIsLoading(false)` sau `.then`) → test phím tắt ngay sau khi label đổi có thể dính `disabled`; chờ thêm 1 tick.
- Dropdown Resolve gốc: `WootDropdownItem` `mb-1` bị wrapper `[&_ul>li]:mb-0` đè → KHÔNG có gap; B3 để `gap-0.5` làm "Mark as pending" lệch 2px — đã bỏ.
- `status` trong DB là int enum (0=open): reset bằng `DB::table('conversations')->update(['status'=>0])`, `update(['status'=>'open'])` qua model lỗi 22P02.
- Pixel-diff full-frame nhiễu do state: oracle đang expanded layout + cờ chữ ký (ui_settings John bên oracle bẩn), yona conversation 4 có 7 tin (2 tin "Dead is like the wind…" id ≤21 của ai đó, không phải của tôi) → chấm bằng crop vùng tương tác (`~/www/pixel-diff/crop-b5.mjs`).

## Gate

- `npx tsc --noEmit` ✓ · `npm run build` ✓ · `npm test` 12 file / 55 test ✓ (mới: `helper/snoozeHelpers.test.ts`, `conversation/lifecycleReducers.test.ts`, `composables/useKeyboardEvents.test.ts`).
- E2E headless `~/www/pixel-diff/b5-lifecycle-e2e.mjs` (yona, John, account 2, conversation 4), không reload (`__noReloadMarker` giữ): Resolve → nút Reopen + activity "Conversation was marked resolved by John" ✓ → Reopen ✓ ("Conversation was reopened by John") → chevron → Mark as pending → nút "Open", chevron ẩn ✓ ("Conversation was marked as pending by John") → Open ✓ → chevron → Snooze → ninja-keys mở parent `snooze_conversation`, placeholder SNOOZE, 6 lựa chọn ✓ → "Until tomorrow" → header "#4 • Snoozed until 3 Sep, 9.00am", nút Open ✓ → Open ✓ → reload giữ trạng thái ✓ → ⋮ = Block Contact / Send Transcript ✓ → modal transcript ✓ → Alt+E resolve ✓, Alt+M mở dropdown ✓ (kể cả khi focus editor).
- Pixel crop oracle↔yona (`b5-lifecycle-diff.mjs` + `crop-b5.mjs`): snooze command bar 0.000%/0.000%, transcript modal 0.001%/0.012%, dropdown Resolve▾ light 0.210% (viền panel mờ trên nền tin khác nhau), ⋮ light 0.713% (chữ tin phía sau); dark 5–10% = nội dung phía sau panel `backdrop-blur` khác (nhiễu state), nội dung menu trùng.
- Dọn: xóa mọi activity test (id > 21) trong conversation 4, status về 0/`snoozed_until` null — giữ 7 tin trước test.
