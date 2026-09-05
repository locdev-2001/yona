# Trace B6 — Assignment + auto-assignment

Ngày: 06/09/2026. Phiên đơn `yona-6d` (QA + e2e) + 3 agent song song. Bảng trace chi tiết nằm trong 3 ghi chú agent:

| Vùng | Ghi chú | Nội dung |
|---|---|---|
| Backend | [b6-notes-be.md](b6-notes-be.md) | bảng `assignment_policies` + `inbox_assignment_policies`, `AutoAssignment\*` (round-robin Redis, rate limiter, agent + bulk service), `AssignmentJob` coalesce, concern `AssignmentHandler` + `AutoAssignmentHandler`, activity assignee/team, `AssignmentsController`, `BulkActionsController` + `BulkActionsJob` |
| FE panel | [b6-notes-fe.md](b6-notes-fe.md) | khối Assignee (+ Assign to me) và Team trong accordion "Conversation Actions", `useAgentsList`, action `assignAgent`/`assignTeam` trong context |
| FE bulk | [b6-notes-fe-bulk.md](b6-notes-fe-bulk.md) | chọn nhiều trong ChatList, thanh bulk + 3 popup (agent/team/status), `bulkApi`, phím tắt bulk |

## Kiến trúc chốt

| Chatwoot | Yona | Ghi chú |
|---|---|---|
| `AssignmentHandler` (`before_save` ensure-assignee-from-team, `after_commit` notify + activity) | `App\Models\Concerns\AssignmentHandler` | trait boot TRƯỚC `booted()` nên listener `updated` chạy trước phần status/priority của B5 — đúng thứ tự khai báo trong `conversation.rb` |
| `AutoAssignmentHandler` (V1 legacy trong `before_save`, V2 `enqueue_for_inbox` trong `after_save`) | `App\Models\Concerns\AutoAssignmentHandler` | đường tạo mới gọi callback tay trong hook `created` sau khi nạp `display_id`, không thì payload realtime thiếu id |
| `AutoAssignment::AgentAssignmentService` | cùng tên trong `app/Services/AutoAssignment/` | giữ `assignUnderLock` + `discardAlreadyAppliedStatusChange` + `reassignmentStillNeeded` để không bắn trùng event khi có writer song song |
| `AutoAssignment::AssignmentJob` (marker Redis `SET NX EX 300`, nhả bằng compare-and-delete) | cùng tên | Lua compare-and-delete thay `WATCH/MULTI` |
| `assignable_agents_controller.rb` (`inbox_ids[]`) | `GET /api/v1/accounts/{id}/assignable_agents` → `InboxesController::assignableAgentsForInboxes` | phiên chính port bổ sung; một inbox là trường hợp riêng của phép giao nên `Inbox::assignableAgents()` gọi lại chính hàm này (một nguồn) |
| `bulk_actions_controller` + `BulkActionsJob` | cùng tên | nhận `fields.assignee_id/team_id/status`, `labels.{add,remove}` để chỗ cắm B7 |

## Gate (phiên chính chạy 06/09)

1. **Pest 584/584** (1386 assertion) · vitest **89/89** (16 file) · `npx tsc` · `npm run build` · pint · `i18n:generate --check` — xanh.
2. Trace: file này + 3 note agent.
3. **Pixel-diff**: màn conversation 0.006%/0.006% (mask dùng chung); khối Assignee/Team trong panel **0.000%** cả 8 lượt (closed/open × light/dark, cả khi đã gán); popup bulk Team **0.000%**, popup bulk Status **0.000%**; footer xác nhận team 0.000%. Hai chỗ lệch còn lại đều là khác biệt chủ đích (mục dưới).
4. **Audit nút** trên `/conversations/{id}`: danh sách OK/DEAD trùng oracle, chỉ còn mic (B9) là khác. Không phát sinh nút chết mới.
5. **E2e**: gán agent/team trong panel → activity "Assigned to Samantha by John" / team hiện không reload, F5 giữ; "Assign to me" → "John self-assigned this conversation"; bulk chọn 1→2→tất cả→Clear, gán agent 2 hội thoại (`POST /bulk_actions`), gán team, đổi trạng thái, đổi tab xóa lựa chọn. **Round-robin thật** (`b6-roundrobin.mjs` + kịch bản làm mới presence): 8 hội thoại mới mỗi bên khi John + Samantha cùng online → **cả hai bên chia xen kẽ hoàn hảo** (yona John/Sam/John/Sam…; oracle Sam/John/Sam/John… — chỉ khác agent bắt đầu vì hàng đợi Redis mỗi bên khởi tạo khác thời điểm). Dữ liệu tạm đã xóa sạch hai bên.

## Khác biệt cố ý / nợ

1. **Thứ tự danh sách agent gán**: gốc không sắp xếp (`account.users.where(id: …) + administrators`), và hai endpoint của chính oracle trả hai thứ tự khác nhau cho cùng dữ liệu (per-inbox `[John, Samantha]`, account-scoped `[Samantha, John]`) — tức PostgreSQL quyết định. Yona sắp **tất định**: member theo `user_id` trước, administrator sau. Hệ quả: popup bulk "Assign agent" lệch 1.016% so oracle ở lần chụp này; danh sách và pixel từng dòng trùng khớp, chỉ đảo chỗ hai dòng.
2. **Thanh bulk lệch 3.114%**: yona chưa dựng 2 nút nhãn (`BulkLabelActions`) vì API nhãn thuộc B7 — dựng nút không bấm được là trái lệnh founder 02/09. Khung thanh 324×44 và tọa độ trùng khít. Chấm lại sau B7.
3. `AgentBot` (assignee_type, badge avatar trong dropdown): chưa port — nợ D4.
4. `PeriodicAssignmentJob` và controller quản lý `assignment_policies`: chưa port (chưa có màn cấu hình chính sách) — nợ nhóm sau.
5. `bulk_actions` map `team_id: 0` → `null` vì cột có khóa ngoại thật; hành vi quan sát y hệt.
6. `automation.system_name` để lại cho D1 (namespace `automation`, không nhét vào `auto_assignment.php` để giữ luật i18n một nguồn).

## Bẫy đã trả giá

1. **`enable_auto_assignment` + `assignment_v2` đều bật mặc định** → mọi hội thoại mở ra đều kích hoạt `AssignmentJob`; trong test (`QUEUE_CONNECTION=sync`) job chạy ngay trong `save()`. Muốn test phân công tất định thì tạo hội thoại trước rồi mới bật agent online.
2. **Presence chỉ sống 20 giây**: đo round-robin phải làm mới presence ngay trước mỗi lần tạo hội thoại, không thì `available_agents` rỗng và không bên nào gán (lần đo đầu cả hai bên đều `null` — âm tính giả).
3. `$conversation->messages()` đã có `orderBy('created_at')` → lấy activity mới nhất phải `reorder('id','desc')`; `latest('id')` chỉ thêm cột sắp xếp nên trả tin cũ nhất.
4. Thứ tự `use` trait trong `Conversation` quyết định thứ tự activity message — thêm trait mới phải xem lại.
5. Hai agent chạy song song cùng ghi vào conversation 4 (fixture dùng chung) làm pixel-diff nhiễu 2.677% một lần; luôn kiểm `assignee_id`/`team_id`/`priority` NULL ngay trước khi đo.
