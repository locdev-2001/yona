# CRM — Automation / Workflow Engine

> The **Automation** bounded context: 1 trigger→condition→action graph-execution engine, phục vụ cả inbox auto-reply (Phase 4) lẫn Marketing workflow (Phase 5) — không phải 2 hệ thống riêng. Companion to [system-architecture.md](system-architecture.md) (bounded contexts, Integration Driver pattern), [crm-domain-definition.md](crm-domain-definition.md) (module map), [crm-conversations-inbox.md](crm-conversations-inbox.md) (Conversation/Message — nguồn trigger event, escalate→Ticket), [crm-marketplace.md](crm-marketplace.md) (`module.marketing` entitlement).

Date: 2026-07-04 · Status: **designed, chưa build** (roadmap "later" — [development-roadmap.md](development-roadmap.md) M4)

## Scope (v1)

- 1 engine chạy graph node (trigger→condition→action, nhiều bước nếu cần) — **1 rule đơn giản = graph 3 node**, không tách engine riêng cho "rule" vs "workflow phức tạp".
- Phục vụ 2 use case: inbox auto-reply (trigger từ Conversation/Lead event) và Marketing workflow (trigger từ Segment/lịch/thủ công).
- Không viết trực tiếp vào bảng context khác — luôn qua service/driver đã có (xem Node Handler registry).

## Mô hình tham khảo

- **Chatwoot Automation Rules** — event+condition+action phẳng, không graph. Mô hình cho rule đơn giản.
- **Mautic `campaign_lead_event_log`** — track vị trí từng contact qua nhiều bước campaign, resumable. Mô hình cho `workflow_runs`.
- **`Illuminate\Support\Manager`** — pattern đã dùng trong repo (`ChannelManager`, system-architecture.md §5 Integration Driver Pattern) cho driver pluggable. Mô hình cho `NodeHandlerManager`.
- Không adopt Mautic/n8n làm dependency — SME scale (vài chục workflow/workspace) không cần 1 app/service riêng.

## Domain Boundary

- **Owns:** `Workflow`, `WorkflowRun`, `WorkflowRunLog`. `WorkflowEngine` chỉ đi-bộ graph, không chứa nghĩa business của từng node.
- **Invariant:** action luôn qua service context khác (`ChannelManager`, `TaskService`, `ReminderService`, `TagService`, `LeadService`, `NotificationService`) — không bao giờ ghi thẳng bảng Lead/Conversation/Task.
- **Cross-context:** nghe domain event có sẵn (`LeadStageChanged`, `LeadCreated`, `LeadAssigned`, `MessageReceived`) — read-only.

## Data model

| Table | Notable columns | Notes |
|---|---|---|
| `workflows` | `workspace_id, name, graph jsonb {nodes,edges}, is_active` | Graph định nghĩa cả rule đơn giản lẫn journey nhiều bước. |
| `workflow_runs` | `workspace_id, workflow_id, subject_type(lead\|contact\|conversation), subject_id, current_node_id, status(running\|waiting\|completed\|failed), resume_at, loop_count` | 1 dòng = 1 lần enroll của 1 subject. Unique partial `(workflow_id, subject_type, subject_id) WHERE status='running'` — chặn double-enroll. |
| `workflow_run_logs` | `workspace_id, workflow_run_id, node_id, node_type, result(success\|failed\|skipped), message, created_at` | Append-only (như `messages`) — audit trail, trả lời "sao rule không chạy". |

Index chính: `workflow_runs(status, resume_at) WHERE status='waiting'` (query cron resume) · `workflow_run_logs(workflow_run_id, created_at desc)` (view debug).

## Layer architecture

| Layer | Trách nhiệm | Ví dụ class | Gọi xuống |
|---|---|---|---|
| Entry | Nhận trigger (HTTP/Event/Cron), 0 business logic | `WorkflowController`, `EvaluateWorkflowTriggers` listener, `workflow:resume-waiting` command | Engine |
| Engine | Đi-bộ graph, next-node, cap loop | `WorkflowEngine::enroll()/advance()` | Node Handler |
| Node Handler | Dịch config node → gọi 1 service thật | `NodeHandlerManager` + `*Handler` (Manager pattern, như `ChannelManager`) | Domain Service |
| Domain Service | Business rule thật, không lặp lại ở Automation | `ChannelManager`, `TaskService`, `ReminderService`, `TagService`, `LeadService`, `NotificationService` | Model |

Nguyên tắc: mỗi layer chỉ gọi xuống layer ngay dưới. Thêm node-type mới = 1 class ở Node Handler layer, Engine không đổi.

## Node Handler registry

**v1 (trigger từ event có sẵn):**

| Node | Loại | Delegate tới |
|---|---|---|
| Sự kiện: tin nhắn đến / lead tạo / lead đổi stage / lead assign | start | event có sẵn (`MessageReceived`/`Lead*`) |
| Vào Segment / Chạy thủ công | start | Segment filter (Marketing context) |
| Điều kiện (nhiều dòng AND: field+operator+value, field tùy subject_type) | flow | matcher nội bộ, không service ngoài |
| Chờ (N phút/giờ/ngày) | flow | `resume_at` + cron resume |
| Kết thúc | flow | — |
| Gửi tin nhắn (channel resolve theo subject — xem Execution semantics) | action | `ChannelManager::driver()->sendMessage()` |
| Tạo Task (gate: chỉ khi subject resolve được `related_type` hợp lệ — `Task.related` KHÔNG nhận `conversation` trực tiếp, `app/Models/Task.php:68`) | action | `TaskService` |
| Thông báo nội bộ | action | `NotificationService` |
| Gắn/Gỡ Tag | action | `TagService` |
| Đổi Lead stage | action | `LeadService::moveStage()` (optimistic-lock sẵn có) |

**Sau này (đăng ký thêm handler, Engine không đổi):**

| Node | Lý do chưa làm v1 |
|---|---|
| Lịch chạy (cron recurrence) | cần cron tick command riêng — thêm khi có nhu cầu broadcast định kỳ thật |
| Tạo Ticket | Ticket model chưa build (Support module, roadmap "later"); đúng hướng domain hơn Task cho escalate-từ-conversation (xem [crm-conversations-inbox.md](crm-conversations-inbox.md) §Escalate to Ticket) |
| Trả lời bằng AI | chưa có SDK AI/LLM nào trong repo (`composer.json` verified — trống); external integration mới hoàn toàn, cần entitlement `module.ai` + posture draft-review trước khi auto-send (rủi ro AI trả lời sai cho khách của tenant) |

## Execution semantics

- **Event timing fix bắt buộc:** `LeadStageChanged` bắn trong `DB::transaction` (`app/Services/LeadService.php:131-158`) + `config/queue.php` có `after_commit=false` toàn cục → listener `EvaluateWorkflowTriggers` PHẢI implement `ShouldQueueAfterCommit`, nếu không có race đọc state cũ.
- **Debounce tin nhắn dồn dập:** job delay ~8s, khi chạy check `Message::max(created_at)` của conversation — có tin mới hơn thì skip (tin mới tự có job riêng lo).
- **Dedup:** unique partial index (enroll, xem Data model) + `ShouldBeUnique` theo `workflow_run_id` trên job advance (chặn 2 job advance cùng 1 run).
- **Lặp lại (loop):** không có node "Loop" riêng — cho phép edge quay lại node trước đó + `workflow_runs.loop_count` cap cứng (mặc định 5), check trong `WorkflowEngine::advance()` (1 chỗ, không phải per-node-type).
- **Gửi tin nhắn đa kênh:** subject=Conversation (trigger tin nhắn đến) → trả lời ngay trên conversation đó, không chọn kênh. Subject=Lead/Contact (trigger khác) → cần dropdown chọn kênh + resolve `Conversation::where('lead_id'/'contact_id', ...)->where('channel', ...)`; không có hội thoại trên kênh đó → `result=skipped` (không phải lỗi — giới hạn nền tảng, Zalo cá nhân không cold-send được tới người lạ).

## Consistency & scale

- Toàn bộ **eventually consistent** — action thật (sendMessage/TaskService...) luôn đứng ngoài DB transaction, chỉ log + update vị trí trong TX nhỏ.
- Scale SME: vài chục workflow/workspace, vài trăm event/ngày — không hot path, toàn bộ async qua queue có sẵn (Horizon).

## Permissions & entitlement

- Permission `tenant.automation.manage` (convention `TenantPermission` enum).
- Gate `EntitlementService::allows($workspaceId, 'module.marketing')` — tái dùng flag đã định nghĩa ([crm-business-config.md](crm-business-config.md)), chưa cần cơ chế flag mới.

## UI — node canvas builder

- Kéo-thả node từ palette → canvas, nối qua handle (input/output), click node mở inspector panel cấu hình.
- Thư viện: `@xyflow/react` (React Flow) — dependency mới, lý do: không có lib graph/dnd nào sẵn trong `package.json`, tự vẽ canvas+bezier+zoom là over-engineer so với dùng lib chuẩn ngành.
- Node điều kiện: 2 output (Đúng/Sai); field khả dụng tùy subject_type (xem Node Handler registry).
- Đã build thử 1 demo tương tác (vanilla JS, local only) để duyệt UX kéo-thả — không phải bản implementation thật.

## Rejected alternatives

- 2 engine song song (rule phẳng riêng + workflow canvas riêng) — gộp thành 1 (rule = graph 3 node), tránh trùng lặp maintain.
- Package rule-engine/business-rules ngoài, hoặc statechart lib (kiểu XState) cho graph walk — `Manager` pattern + vòng lặp `while` tự viết đã đủ ở quy mô này.
- Cold-send marketing broadcast qua Zalo cá nhân tới người chưa từng nhắn — không khả thi (giới hạn nền tảng zca-js/ToS, không phải thiếu sót thiết kế).

## Open questions

- Thứ tự build: Automation engine (Phase 4, inbox) trước hay Campaign/Segment UI (Phase 5, Marketing) trước — roadmap hiện cả 2 đều "later", cần founder chốt.
- `MergeFieldResolver` (`app/Services/MergeFields`) có tái dùng nguyên được cho node "Gửi tin nhắn" không — cần xác nhận khi implement.
- AI-reply node: auto-send hay bắt buộc draft-review — quyết định sản phẩm, chưa chốt.
