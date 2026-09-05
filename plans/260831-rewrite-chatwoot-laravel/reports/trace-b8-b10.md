# Trace B8 (Bộ lọc + unread + tabs) và B10 (Tiện ích soạn thảo)

Ngày: 06/09/2026. Phiên đơn `yona-6d` (QA + e2e) + 4 agent song song, hai tính năng chạy cùng lúc. Bảng trace chi tiết trong 4 note: [b8-notes-be.md](b8-notes-be.md), [b8-notes-fe.md](b8-notes-fe.md), [b10-notes-be.md](b10-notes-be.md), [b10-notes-fe.md](b10-notes-fe.md).

## B8 — kiến trúc chốt

| Chatwoot | Yona | Ghi chú |
|---|---|---|
| `conversations_controller#update_last_seen` (throttle 1 giờ khi không có tin chưa đọc) + `#unread` | cùng tên trên `WebApi\ConversationsController` | `unread` đặt mốc = tin incoming cuối − 1 giây nên badge quay lại **1**, không phải toàn bộ — đúng gốc |
| `unread_messages` / `assignee_unread_messages` / `unread_messages_count_arel` | `Conversation::unreadIncomingMessagesCount()` + `unreadMessagesCountSql()` | một nguồn SQL duy nhất cho cả sắp xếp lẫn bộ đếm sidebar; trần 10 như `...last(10)` của gốc (badge hiện `9+`) |
| `services/conversations/unread_counts/**` (16 file, cache Redis nhiều tầng) | `App\Services\Conversations\UnreadCounts\Counter` | **khác biệt cố ý**: tính trực tiếp bằng SQL thay vì tầng cache; ngữ nghĩa và số liệu khớp oracle từng số |
| `conversation_unread_counts` feature flag | gate cùng cờ ở cả API lẫn UI | oracle account 1 **không bật cờ này** nên sidebar không có badge — bật ở yona sẽ lệch pixel |
| mark read (`update_columns`, không phát `conversation.updated`) | FE tự hạ badge tại chỗ, giữ **độ trễ 4 giây** như `setTimeout` gốc | pill "N Unread Messages" còn kịp đọc |
| context menu chuột phải trên thẻ | `ConversationContextMenu.tsx` (mới) — lát cắt Mark as read/unread | các mục khác của menu là nợ nhóm sau |

## B10 — kiến trúc chốt

| Chatwoot | Yona | Ghi chú |
|---|---|---|
| `canned_responses` + controller (index có `search`) | migration + `CannedResponse` (scope `search` gộp điều kiện + thứ tự ưu tiên short_code) + `CannedResponsesController` | body khớp oracle từng byte |
| `draft_messages_controller` (Redis) | `DraftMessagesController` + `App\Support\ConversationDraftMessage` | **dashboard gốc KHÔNG gọi endpoint này** — nháp nằm ở `localStorage`; endpoint port để đủ mặt tiền API, FE bám theo gốc |
| `suggestionsPlugin('/')` + `CannedResponse.vue` | `WootWriter/Editor.tsx` + `CaretAnchoredPicker`/`PreviewPicker` + `conversation/CannedResponse.tsx` | popup đo 697×200 tại (562,420), trùng tuyệt đối oracle |
| command bar (`commandbar.vue` + 5 composable nguồn action) | `commands/**` + `commandBarStore.ts` (khung dựng ở B5) | thêm nguồn go-to (26 action), appearance, conversation; thiếu nhóm `AI Assist` (Captain/EE) — cố ý |
| `HotKeyModal` + mục Keyboard shortcuts trong menu profile | `commands/KeyShortcutModal.tsx` + mục trong `SidebarProfileMenu` | trả nợ ghi ở trace B4 |

## Việc phiên chính làm thêm trong đợt này

1. **`ReplyBoxBanner` (nợ từ B3/B6)**: port banner "This conversation is not assigned to you" + nút "Assign to me" (nhánh bot handoff để nhóm D). Trước đó khung soạn thảo lúc đang gõ lệch 2.154%/4.566% vì thiếu banner cao 56px.
2. **Bug màu chữ banner**: bản gốc để `text-white` ở lớp base rồi ghi đè bằng style scoped `.banner.secondary` (hai class = độ đặc hiệu cao hơn); port bằng utility Tailwind cùng độ đặc hiệu nên `text-white` thắng và chữ banner bị mờ. Đã gom màu chữ vào từng scheme. Sau khi sửa: khung soạn thảo lúc đang gõ **0.000% cả light lẫn dark**. Cùng họ bug với ColorPicker của B7.
3. **Handler 404 chung** (`bootstrap/app.php`): mọi endpoint API trả `{"error":"Resource could not be found"}` như `request_exception_handler.rb`, thay body exception mặc định của framework. Lệch này có từ trước, phát hiện khi đối chiếu B10.
4. **`reset-fixture.sh`** bổ sung reset `agent_last_seen_at`/`assignee_last_seen_at` — từ B8 hai cột này điều khiển badge và pill.
5. **Bỏ vùng che pill "N Unread Messages"** khỏi `mask-diff.mjs` (B8 đã trả nợ): đo lại đúng cùng con số 0.006%.

## Gate (phiên chính chạy 06/09)

1. **Pest 758/758** (1766 assertion) · vitest **208/208** (27 file) · tsc · build · pint · `i18n:generate --check` — xanh.
2. Trace: file này + 4 note.
3. **Pixel-diff**: màn conversation 0.006% (mask còn logo, `#display_id`, placeholder editor, bút chì search); dashboard và tab All có badge 0.030%; khung soạn thảo lúc đang gõ **0.000%**; Settings › Canned Responses 0.030%, modal Add/Edit **0.000%**, popup `/` **0.000%**, modal phím tắt **0.000%**.
4. **Audit nút**: 15/15 khớp oracle, chỉ còn mic (B9) là khác biệt.
5. **E2e**: badge "1" → mở hội thoại → pill hiện → badge về 0 sau 4 giây → "Mark as unread" → quay về danh sách với badge "1" → F5 giữ; bộ đếm tab đổi realtime; tạo canned response → gõ `/` chèn đúng nội dung → rời hội thoại quay lại còn nháp → gửi thì nháp mất → `Ctrl+K` mở command bar và điều hướng → modal phím tắt mở/đóng.

## Khác biệt cố ý / nợ

- Bộ đếm chưa đọc tính trực tiếp bằng SQL thay tầng cache Redis nhiều lớp của gốc.
- `mention`/`participating` trong `conversation_type` mới là khung (trả rỗng) — chờ bảng participants của B11.
- `MarkConversationReadService` (xóa thông báo khi mở hội thoại) chờ nhóm thông báo D5.
- Nhóm `AI Assist` của command bar (Captain/EE) không port: oracle 53 action, yona 51.
- `GET /accounts/{id}/cache_keys` chưa port nên FE lấy canned response thẳng từ mạng thay vì IndexedDB.
- Nháp lưu `localStorage` theo đúng dashboard gốc; endpoint Redis vẫn có để client khác dùng.
- Picker tạm đặt trong `WootWriter/` thay vì `components-next/preview-picker/` — chuyển về cây gốc khi port picker mention/variable/emoji (B11/D1).

## Bẫy đã trả giá

1. **Utility Tailwind không thay được style scoped của Vue** khi bản gốc dựa vào độ đặc hiệu hai class (banner, ColorPicker). Khi port style scoped, kiểm màu/kích thước bằng ảnh chứ đừng tin class trông giống.
2. `audit-buttons.mjs` bấm Resolve ở cả hai bên làm bộ đếm chưa đọc về 0 — phải chạy `reset-fixture.sh` sau khi audit, và reset trước **mỗi** scheme khi chụp pill (lần light đã đánh dấu đã đọc).
3. Modal canned của gốc **lồng hai lớp Modal** → nền mờ chồng đôi; port một lớp làm dark lệch 0.641%.
4. `kbd.hotkey` có `leading-[0.625rem]` bị `.key` (`text-xs`) đè — dẹp hai lớp CSS thành utility làm modal phím tắt thấp đi 48px.
5. `pint --dirty` khi hai agent chạy song song sẽ format cả file của agent kia; nên pint theo danh sách file.
