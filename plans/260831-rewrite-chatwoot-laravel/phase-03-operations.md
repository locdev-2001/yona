# Phase 03 — Vận hành đội ngũ

Ngày vào phase: 06/09/2026.

## Trạng thái

D5 Notifications và D6 Working hours đã đóng ở `eb5847e`. D1 Automation rules
đang triển khai trong working tree; D3 Macros phải dùng lại
`app/Services/ConversationActions/ActionExecutor.php` sau khi D1 đạt pixel
fidelity. D2 Reports và D4 Webhooks + Agent Bots chưa bắt đầu.

## D1 slice

- Schema: `automation_rules`, `automation_rule_pending_executions`.
- Runtime: event listener cho conversation/message, matcher điều kiện, executor
  hành động chung, delayed pending execution + scheduler.
- UI: `/settings/automation/list`, CRUD/clone/toggle và builder điều kiện/action.
- Không đưa vào slice các driver phụ thuộc F1/D4/EE; ghi nợ trong trace D1.

## Blocking edges

- D3 phụ thuộc executor chung của D1.
- D2 cần reporting events từ conversation/message sau khi automation ổn định.
- D4 sẽ cắm webhook retry và agent bot vào action/event seams, không sửa lại
  matcher hoặc builder hiện có.
