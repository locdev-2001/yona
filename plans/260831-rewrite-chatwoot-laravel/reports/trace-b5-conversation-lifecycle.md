# Trace B5 — Vòng đời conversation (status / priority / snooze / mute)

Ngày: 05–06/09/2026. Phiên đơn `yona-6d` (QA + e2e) + 3 agent song song. Bảng trace chi tiết nằm trong 3 ghi chú agent (nguồn sự thật, không chép lại):

| Vùng | Ghi chú | Nội dung |
|---|---|---|
| Backend | [b5-notes-be.md](b5-notes-be.md) | `toggleStatus`/`togglePriority`/`mute`/`unmute`, hook `updated` (status events → activity → conversation.updated), `ActivityMessageJob` (queue high), `ReopenSnoozedConversationsJob` (queue low + scheduler), controller + 5 route, `lang/en/conversations.php` |
| FE hành động | [b5-notes-fe-actions.md](b5-notes-fe-actions.md) | `ResolveAction` (Resolve/Reopen/Open + dropdown Snooze/Mark pending), command bar ninja-keys nhánh snooze, `CustomSnoozeModal`, mute/unmute + `EmailTranscriptModal`, phím tắt, `snoozeHelpers`, header "Snoozed until …" |
| FE panel | [b5-notes-fe-priority.md](b5-notes-fe-priority.md) | Khối Priority trong accordion "Conversation Actions", `MultiselectDropdown` primitive dùng chung, `ContactDetailsItem` |

## Kiến trúc chốt

| Chatwoot | Yona | Ghi chú |
|---|---|---|
| `Conversation#toggle_status` / `toggle_priority` | cùng tên trên `App\Models\Conversation` | rỗng → toggle open↔resolved, pending/snoozed → open |
| `execute_after_update_commit_callbacks` | hook `updated` giữ ĐÚNG thứ tự: waiting_since → status events → activity → `CONVERSATION_UPDATED` | thứ tự sai làm activity thiếu `previous_changes` |
| `ActivityMessageHandler` + `PriorityActivityMessageHandler` | `createActivity()` trên model + `App\Jobs\Conversations\ActivityMessageJob` (queue `high`) | câu chữ y `en.yml`; `content_attributes.activity` cho status |
| `ConversationMuteHelpers` | `mute()`/`unmute()`/`isMuted()` | **v4.17.1 KHÔNG dùng Redis** — `muted?` = `contact.blocked`; khóa `CONVERSATION_MUTE_KEY` trong `redis_keys.rb` là khóa mồ côi |
| `Conversations::ReopenSnoozedConversationsJob` + `schedule.yml` | cùng tên + `routes/console.php` cron `*/5 * * * *` | cửa sổ `snoozed_until` ∈ [3 ngày trước, now] |
| `handle_human_open` | tự assign agent (không phải administrator) khi chuyển sang open, trong transaction + `lockForUpdate` | nhánh `ai_assignee` là EE, bỏ |
| `ResolveAction.vue` + `CmdBarConversationSnooze.vue` + ninja-keys | `conversationbox/ResolveAction.tsx` + `commands/CommandBar.tsx` + `commands/CmdBarConversationSnooze.tsx` | dùng chính `@chatwoot/ninja-keys@1.2.3` như gốc; chỉ mở nhánh `snooze_conversation`, phần còn lại của command bar là B10 |
| `ConversationAction.vue` (khối priority) | `conversationbox/contact/ConversationAction.tsx` + `priorityOptions.ts` | khối assignee/team chừa đúng thứ tự cho B6, labels cho B7 |
| `MultiselectDropdown.vue` | `resources/js/shared/components/ui/MultiselectDropdown.tsx` | đặt đúng cây gốc để B6 tái dùng nguyên si |

## Gate (phiên chính chạy 05–06/09)

1. **Pest 501/501** (1236 assertion) · vitest **61/61** (13 file) · `npx tsc` · `npm run build` · pint · `i18n:generate --check` — xanh.
2. Trace: file này + 3 note agent.
3. **Pixel-diff** (harness `~/www/pixel-diff`, mask dùng chung khai báo một chỗ trong `mask-diff.mjs`): màn conversation 0.006%/0.006%; dropdown Resolve▾ 0.006%/0.006%; menu ⋮ 0.006%/0.006%; modal transcript 0.021%/0.010%; command bar snooze 0.003%/0.003%; khối Priority (cắt bounding box vì oracle có thêm assignee/team) **0.000%** cả 4 trạng thái closed/open × light/dark. Vùng che chủ đích: logo, `#display_id`, pill unread (B8), placeholder editor (nợ B3), ô search.
4. **Audit nút** hai bên trên `/conversations/{id}`: khớp hoàn toàn trừ **mic** (oracle OK, yona DEAD — B9). Resolve/Reopen/Open, ▾, ⋮, Reply/Note, ✨, emoji, chữ ký, panel đều OK; `#id` copy và ⤢ DEAD ở CẢ HAI (clipboard headless + Δel không đổi). Audit làm bẩn oracle lẫn yona (Resolve thật) — đã khôi phục.
5. **E2e trình duyệt** (`b5-e2e-full.mjs`, chạy như người dùng, kiểm F5 sau mỗi bước): Resolve → nút "Reopen" + activity "Conversation was marked resolved by John" hiện không reload, F5 giữ; Reopen → "Resolve" + activity; ▾ → Mark as pending → "Open" + activity, F5 giữ; ▾ → Snooze → command bar đúng 6 lựa chọn (Until next reply / an hour / tomorrow / next week / next month / Custom…) → "Until tomorrow" → header "Snoozed until 7 Sep, 9.00am", F5 giữ; panel → Priority → Urgent, F5 giữ, activity "John set the priority to urgent" về qua realtime không reload (`b5-prio-check.mjs`).

## Khác biệt cố ý / nợ

- `status`/`priority` giá trị lạ → 422 (gốc ArgumentError → 500).
- Mute không dùng Redis (theo đúng source v4.17.1, xem bảng trên).
- `POST …/transcript` chưa có backend (D5): modal Email Transcript mở + validate được, Submit trả lỗi.
- Gợi ý snooze theo ngôn ngữ tự nhiên khi gõ (`snoozeDateParser`) và context menu trên card danh sách: nợ B10.
- Nhánh activity theo `Current.executed_by` (automation D1) và `Current.contact` (widget C) chưa port; auto-resolve theo `auto_resolve_after` (D6) mới có phần đọc cấu hình.
- `lang/en/conversations.php` là chuỗi backend nhưng vẫn vào bundle FE vì `i18n:generate` không có cơ chế loại trừ — chấp nhận (một nguồn), bundle chỉ tăng ~30 chuỗi.
- Nhánh AgentBot trong dropdown assignee (badge avatar) chưa port — B6.

## QA recheck 06/09/2026

- Browser E2E sau khi sửa status: Resolve/Reopen/Pending/Open/Snooze/Open, reload,
  transcript modal và hotkey đều chạy; status đổi optimistic trước response chậm
  1.5s, `Alt+M` mở ngay, lỗi API chậm rollback về trạng thái cũ.
- Filter status thật: sau Snooze, `Status = Snoozed` ở tab `Mine` cho 0 vì hội thoại
  chưa assign; chuyển `All` cho đúng 1 conversation. Đây là semantics của bộ lọc,
  không phải mất dữ liệu.
- Pixel full-frame cũ không còn là bằng chứng hợp lệ: Yona đang có thêm inbox
  WebWidget `Yona` trong account 2 còn oracle chỉ có `api-test`, làm header/sidebar
  lệch. Cần chuẩn hóa fixture hoặc chỉ crop vùng tương tác trước khi chấm lại.

## Bẫy đã trả giá

1. **State ui_settings làm pixel-diff lệch giả:** e2e của agent để lại `is_contact_sidebar_open` + `is_conv_actions_open` = true ở CẢ HAI bên → màn conversation nhảy từ 0.39% lên 1.11% vì oracle hiện thêm Assignee/Team/Labels trong accordion. Trước khi chấm gate 3 phải reset ui_settings hai bên về mặc định.
2. **Chữ ký sót lại:** một e2e đặt `message_signature` cho John ở yona ("Dead is like the wind…") rồi gửi 2 tin — vừa bẩn dữ liệu vừa đổi editor. Kiểm cả `message_signature` khi khôi phục, không chỉ ui_settings.
3. **Script playwright PHẢI nằm trong `~/www/pixel-diff`** (node_modules riêng) — để trong scratchpad thì `import playwright` không phân giải được.
4. Kiểm activity message sau thao tác phải `waitForSelector` (job activity → broadcast qua worker), chờ cứng 2.5s cho kết quả âm tính giả.
5. Đổi priority hai bên để chụp pixel phải dùng `update_column`/`toBase()->update()` — đi qua model sẽ đẻ activity message làm bẩn dữ liệu chung.
