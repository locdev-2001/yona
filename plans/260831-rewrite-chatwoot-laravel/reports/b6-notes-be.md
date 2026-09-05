# B6 Assignment + auto-assignment — ghi chú agent `b6-be` (backend)

Ngày: 06/09/2026.

## ⚠️ CONTRACT API cho `b6-fe` và `b6-fe-bulk` (chốt trước, code sau)

### 1. Gán agent / team cho một hội thoại

```
POST /api/v1/accounts/{accountId}/conversations/{conversationDisplayId}/assignments
```

Ba nhánh, đúng như `assignments_controller.rb` gốc:

| Body gửi lên | Hành vi | HTTP | Response body |
|---|---|---|---|
| `{ "assignee_id": 12 }` | gán agent id 12 | 200 | object agent (shape `_agent.json.jbuilder` = `AgentResource`) |
| `{ "assignee_id": null }` | gỡ gán agent | 200 | `null` |
| `{ "team_id": 3 }` | gán team 3 (kèm auto-assign trong team nếu `allow_auto_assign`) | 200 | object team |
| `{ "team_id": 0 }` | gỡ team | 200 | `null` |
| `{}` (không tham số) | no-op | 200 | `null` |

Ưu tiên: có key `assignee_id` (kể cả null) → nhánh agent; ngược lại có key `team_id` → nhánh team.
`assignee_type: "AgentBot"` CHƯA port (AgentBot thuộc nhóm sau) — gửi lên sẽ đi nhánh agent thường.

Agent payload (200):

```json
{
  "id": 1, "account_id": 2, "availability_status": "online", "auto_offline": true,
  "confirmed": true, "email": "john@acme.inc", "provider": "email",
  "available_name": "John", "custom_attributes": {}, "name": "John",
  "role": "administrator", "thumbnail": "http://…/avatar.png"
}
```

Team payload (200): object model team — `{ "id", "name", "description", "allow_auto_assign", "account_id", "icon", "icon_color", "created_at", "updated_at" }`.

Lỗi: 401 khi user không có quyền vào inbox/team của hội thoại; 404 khi display_id không thuộc account.

### 2. Bulk actions (nhiều hội thoại)

```
POST /api/v1/accounts/{accountId}/bulk_actions
```

Body:

```json
{
  "type": "Conversation",
  "ids": [4, 7, 9],
  "fields": { "status": "snoozed", "assignee_id": 12, "team_id": 3 },
  "snoozed_until": 1757000000,
  "labels": { "add": [], "remove": [] }
}
```

- `ids` = **display_id** của hội thoại (không phải khóa chính).
- `fields` tất cả optional; `status` ∈ `open|resolved|pending|snoozed`; `status: null` bị bỏ qua (không ghi).
- `assignee_id: null` = gỡ gán; `team_id: 0` = gỡ team.
- `snoozed_until` = epoch giây (giống `toggle_status`).
- `labels` là **chỗ cắm B7** — hiện backend nhận nhưng chưa xử lý.
- Response: **200, body rỗng** (`head :ok` của bản gốc). `type` khác `Conversation` → **422** `{"success": false}`.
- Chạy nền (queue `medium`) → FE phải chờ realtime `conversation.updated` / `assignee.changed` để cập nhật, không đọc response.

Chỉ những hội thoại user có quyền (member của inbox, hoặc administrator) mới bị đổi — phần còn lại bị bỏ qua im lặng.

## Bảng trace Ruby ↔ PHP

| Ruby (refs/chatwoot v4.17.1) | PHP (yona) | Ghi chú |
|---|---|---|
| `db/migrate/20250806140000_create_assignment_policies` + `20250806140001_create_inbox_assignment_policies` + `20260617000000_add_exclude_older_than_hours` | `database/migrations/2026_09_06_100000_create_assignment_policies_tables.php` | gộp 3 migration làm một (Yona dựng bảng lần đầu); cột/enum/index/`timestamps(6)` y gốc |
| `AssignmentPolicy` (enum `conversation_priority`, `assignment_order`) | `App\Models\AssignmentPolicy` | hằng `ORDER_ROUND_ROBIN` / `PRIORITY_EARLIEST_CREATED` / `PRIORITY_LONGEST_WAITING` + `isLongestWaiting()`; `assignment_order` chỉ round_robin (balanced = EE) |
| `InboxAssignmentPolicy` | `App\Models\InboxAssignmentPolicy` | `inbox_id` unique |
| `Inbox has_one :assignment_policy, through:` | `Inbox::assignmentPolicy()` (`hasOneThrough`) + `inboxAssignmentPolicy()` | |
| `InboxAgentAvailability#member_ids_with_assignment_capacity` | `Inbox::memberIdsWithAssignmentCapacity()` | CE = toàn bộ member |
| `Inbox#auto_assignment_v2_enabled?` | `Inbox::autoAssignmentV2Enabled()` | `account.featureEnabled('assignment_v2')` — mặc định BẬT (`config/features.php`) |
| `Inbox after_destroy :delete_round_robin_agents` | hook `deleted` của `Inbox` | `InboxRoundRobinService::clearQueue()` |
| `InboxMember after_create/after_destroy` round robin | hook `created`/`deleted` của `InboxMember` | `Inbox::removeMembers()` đổi sang xóa từng bản ghi (`destroy_all`) để hook chạy |
| `AutoAssignment::InboxRoundRobinService` + `Redis::Alfred::ROUND_ROBIN_AGENTS` | `App\Services\AutoAssignment\InboxRoundRobinService` (hằng `ROUND_ROBIN_AGENTS`) | `queue.intersection(allowed).pop` → `array_intersect` (giữ thứ tự hàng đợi) + `array_pop`; `lpush`/`lrem 0` cho ra đúng thứ tự Ruby (đã kiểm bằng redis thật) |
| `AutoAssignment::RoundRobinSelector` | `…\RoundRobinSelector::selectAgent(Collection<InboxMember>)` | |
| `AutoAssignment::RateLimiter` + `ASSIGNMENT_KEY(_PATTERN)` | `…\RateLimiter` (hằng cùng tên) | `Redis::keys()` tự gắn prefix của Laravel nên đếm đúng; mặc định limit 5 / window 300s khi inbox không có policy |
| `AutoAssignment::AgentAssignmentService` (`find_assignee`, `assign_under_lock`, `perform`) | `…\AgentAssignmentService` | `clear_attribute_changes` → `syncOriginalAttribute()`; `will_save_change_to_*?` → `isDirty()`; `discardAlreadyAppliedStatusChange` + `reassignmentStillNeeded` port đủ |
| `AutoAssignment::AssignmentService#perform_bulk_assignment` | `…\AssignmentService::performBulkAssignment()` | thứ tự `earliest_created` / `longest_waiting`, loại theo `exclude_older_than_hours` (mặc định 168h khi inbox không có policy, `null` = không loại), lọc team + rate limit, `FOR UPDATE SKIP LOCKED` |
| `Current.executed_by = inbox.assignment_policy \|\| inbox` | `App\Support\CurrentExecutedBy::run()` | chỉ nhận `AssignmentPolicy\|Inbox` (đúng phạm vi CE) |
| `AutoAssignment::AssignmentJob` + `AUTO_ASSIGNMENT_IN_FLIGHT_KEY` | `App\Jobs\AutoAssignment\AssignmentJob` | `enqueueForInbox()` = `SET key token NX EX 300`; `delete_if_equals` (WATCH/MULTI) → Lua `get`+`del` một lệnh; queue `default`; `AUTO_ASSIGNMENT_BULK_LIMIT` |
| `AssignmentHandler` (`ensure_assignee_is_from_team`, `notify_assignment_change`, `process_assignment_activities`) + `AssigneeActivityMessageHandler` + `TeamActivityMessageHandler` | `App\Models\Concerns\AssignmentHandler` | `before_save` → hook `saving`; `after_commit` → hook `updated` đăng ký TRONG boot trait (chạy trước `booted()`) nên đứng trước phần status/priority của B5, đúng thứ tự khai báo của `conversation.rb` |
| `AutoAssignmentHandler` (`run_legacy_auto_assignment`, `run_auto_assignment`) | `App\Models\Concerns\AutoAssignmentHandler` | `before_save unless new_record?` → `saving` + `$conversation->exists`; `after_save` → `saved`; `previous_changes.key?(:id)` → `wasChanged('id')` |
| `Conversations::AssignmentService` | `App\Services\Conversations\AssignmentService` | bỏ nhánh AgentBot |
| `Api::V1::…::Conversations::AssignmentsController#create` | `WebApi\Conversations\AssignmentsController::create` | `params.key?` → `$request->has()`; agent → `AgentResource` (partial `_agent`), team → model JSON, còn lại `null` |
| `Api::V1::Accounts::BulkActionsController#create` | `WebApi\BulkActionsController::create` | chỉ nhánh Conversation; `head :ok` → `noContent(200)` |
| `BulkActionsJob` | `App\Jobs\BulkActionsJob` | queue `medium`; `Current.user` → `Auth::setUser()` (khôi phục user cũ ở `finally`); `Conversations::PermissionFilterService` viết thẳng trong job (chưa có consumer thứ hai) |
| `config/locales/en.yml` `conversations.activity.{assignee,team}` | `lang/en/conversations.php` | placeholder `{assignee_name}` `{team_name}` `{user_name}` |
| `config/locales/en.yml` `auto_assignment.*` | `lang/en/auto_assignment.php` | |

## Spec ↔ Pest

| RSpec | Pest |
|---|---|
| `spec/services/auto_assignment/inbox_round_robin_service_spec.rb` | `tests/Feature/Services/AutoAssignment/InboxRoundRobinServiceTest.php` (+ case hook thêm/bớt member, xóa inbox) |
| `round_robin_selector_spec.rb` | `RoundRobinSelectorTest.php` (bản gốc mock service, ở đây chạy Redis thật) |
| `rate_limiter_spec.rb` | `RateLimiterTest.php` (bản gốc mock `Redis::Alfred`, ở đây ghi/đếm key thật) |
| `agent_assignment_service_spec.rb` | `AgentAssignmentServiceTest.php` (+ case bỏ status trùng của luồng song song) |
| `assignment_service_spec.rb` | `AssignmentServiceTest.php` (16 case: limit, chỉ open/chưa gán, age exclusion 3 nhánh, longest_waiting, team, rate limit, event, tên chủ thể activity) |
| `spec/jobs/auto_assignment/assignment_job_spec.rb` | `tests/Feature/Jobs/AutoAssignment/AssignmentJobTest.php` |
| `spec/jobs/bulk_actions_job_spec.rb` | `tests/Feature/Jobs/BulkActionsJobTest.php` (+ case administrator, + team activity) |
| `spec/controllers/api/v1/accounts/bulk_actions_controller_spec.rb` | `tests/Feature/WebApi/BulkActionsControllerTest.php` |
| `spec/controllers/api/v1/accounts/conversations/assignments_controller_spec.rb` | `tests/Feature/WebApi/Conversations/AssignmentsControllerTest.php` |
| `spec/models/concerns/assignment_handler_shared.rb` + `auto_assignment_handler_shared.rb` + phần assignee/team của `conversation_spec.rb` | `tests/Feature/Models/ConversationAssignmentTest.php` |

## Khác biệt cố ý

1. **AgentBot chưa port** → bỏ `assignee_type=AgentBot` ở controller, `assign_agent_bot` trong `Conversations::AssignmentService`, và các case spec liên quan. Cột `assignee_agent_bot_id` vẫn được đọc đúng trong mọi điều kiện (chỉ chưa có đường ghi).
2. **`AutoAssignment::PeriodicAssignmentJob` chưa port** (cron quét mọi account/inbox có policy). Chưa cần vì `enqueue_for_inbox` đã chạy theo sự kiện; ghi nợ cho lúc dựng đủ scheduler.
3. **Controller quản lý `assignment_policies`** (`assignment_policies_controller.rb`) chưa port — thuộc màn Settings, không nằm trong B6. Bảng + model đã có sẵn để cắm.
4. **`bulk_actions` `team_id: 0`** được đổi thành `null` trước khi ghi. Bản gốc ghi thẳng 0 (bảng Chatwoot không có FK); `conversations.team_id` của Yona có khóa ngoại thật nên 0 sẽ vi phạm. Hành vi quan sát được y hệt (team về null, activity "Unassigned from <team cũ>").
5. **`render json: nil`** của Rails trả đúng chữ `null`; `response()->json(null)` của Laravel trả `{}`. Controller đặt content thẳng `'null'` để FE nhận đúng như oracle.
6. **`automation.system_name`** (nhánh `Current.executed_by` là AutomationRule) chưa port — thuộc namespace `automation`, để lại nhóm D1 cùng automation. `CurrentExecutedBy` vì thế chỉ nhận `AssignmentPolicy|Inbox`.
7. **`Conversations::PermissionFilterService`** viết thẳng trong `BulkActionsJob` (chưa tách service vì `ConversationFinder` đã có bản lọc riêng của nó). Khi có consumer thứ ba thì tách.
8. **`FilteredCountInvalidator`** trong `InboxMember` vẫn là nợ B8.

## Gate (06/09)

- `vendor/bin/pest`: **584/584** xanh (1386 assertion) — tăng 83 case so với B5.
- `vendor/bin/pint --dirty` + `pint --test` trên toàn bộ file mới: sạch.
- `php artisan route:list | grep -E 'assignments|bulk'`: có `POST …/conversations/{conversationId}/assignments` và `POST …/bulk_actions`.
- Curl thật (token John, account 2, conversation 4) — tất cả 200:
  - `{"assignee_id":6}` → payload agent Samantha đầy đủ 13 khóa; activity "Assigned to Samantha by John".
  - `{"team_id":2}` → payload team đủ 9 cột như `render json: @team`; auto-assign kéo John (online, thành viên team) → activity "Assigned to John via support by John".
  - `{"assignee_id":null}` → body `null`; activity "Conversation unassigned by John".
  - `{"team_id":0}` → body `null`; activity "Unassigned from support by John".
  - `{}` → body `null`, không đổi gì.
  - `bulk_actions` type `Test` → 422 `{"success":false}`; type `Conversation` + `fields.assignee_id` → 200 body rỗng, worker áp dụng + sinh activity.
- **Đã khôi phục** conversation 4: `assignee_id=null`, `team_id=null`, `last_activity_at=2026-09-01 06:11:52.355`, còn đúng 5 tin (id 3–7), xóa hết activity test.

## Bẫy / lưu ý

1. **`enable_auto_assignment` mặc định TRUE + feature `assignment_v2` mặc định TRUE** → mọi hội thoại mở ra đều kích hoạt `AssignmentJob::enqueueForInbox`. Trong test (`QUEUE_CONNECTION=sync`) job chạy NGAY trong lúc `save()`. Muốn test phân công hàng loạt tất định thì tạo hội thoại TRƯỚC rồi mới bật agent online.
2. **Thứ tự hook**: trait được boot TRƯỚC `booted()`, nên listener `updated` của `AssignmentHandler` chạy trước phần status/priority của B5 — đúng thứ tự Rails. Nếu đổi thứ tự `use` trong `Conversation` (hoặc thêm trait mới) là đổi thứ tự activity message.
3. **Đường tạo mới** gọi `runAssignmentCommitCallbacks()` tay trong hook `created` của `Conversation` (sau khi nạp `display_id`), không đăng ký listener — nếu đăng ký thì payload realtime sẽ thiếu `display_id`.
4. **`$conversation->messages()` đã `orderBy('created_at')`** — muốn lấy activity mới nhất phải `reorder('id', 'desc')`, `latest('id')` chỉ THÊM một cột sắp xếp nên trả về tin CŨ nhất. Bẫy này làm sai 3 test lúc viết.
5. `ConversationBuilderTest` "maps the conversation params" phải cho assignee vào team, vì `ensure_assignee_is_from_team` gỡ assignee không thuộc team ngay lúc tạo (đúng bản gốc).
6. Test dùng Redis DB 4 chung — mọi file test của B6 đều `Redis::flushdb()` trong `beforeEach`.
7. `AssignmentJob` ghi `Log::info("Assigned N conversations for inbox X")` mỗi lần chạy (y bản gốc) → log dev/test khá ồn.
8. Khi curl kiểm chứng trên dev, có phiên khác đang dọn message của conversation 4 song song — đọc DB ngay sau request, đừng tin kết quả đọc trễ.
