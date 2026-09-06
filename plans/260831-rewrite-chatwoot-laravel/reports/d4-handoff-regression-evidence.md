# Auto-assignment gán hội thoại PENDING → banner bot handoff biến mất (phiên chính, 07/09 07:10)

- Harness `~/www/pixel-diff/d4-bot-handoff-e2e.mjs` (sau khi tạo bot "Bot Trợ Lý QA" qua API + gắn vào inbox 1): "hội thoại mới pending" OK, nhưng "banner bot hiện đúng tên bot" FAIL, "ô soạn khoá Ghi chú riêng" FAIL → nút "Take over" không có.
- `ReplyBoxBanner.tsx:27-29`: `isBotHandoff = status === pending && meta.assignee_type === 'AgentBot'`.
- Tái hiện tối thiểu KHÔNG cần bot: `POST /conversations {inbox_id:1, status:'pending'}` (account 2, inbox api-test có `enable_auto_assignment=true`, `auto_assignment_config={}`) → sau 10 giây DB: conversation 177 (display 151) `status=2 (pending)`, `assignee_id=2`. Tức `AssignmentJob → AssignmentService::performBulkAssignment` chọn cả hội thoại pending. Gốc Chatwoot chỉ round-robin hội thoại `open` (`Conversation#run_round_robin` gate `conversation_status_changed_to_open?`; `AutoAssignment::AssignmentService` chọn `unassigned.open`).
- Hệ quả: mọi inbox có bot + auto-assign → bot bị "cướp" hội thoại ngay khi khách nhắn; banner "Take over" không bao giờ hiện.
- Sửa: lọc `status = open` (và `assignee_id null`) trong `AssignmentService` + test khoá "pending không bị gán, open được gán". Dữ liệu QA: contact "Khách Pending QA" + conversation 177 — đã xoá sau khi ghi.

## Kết luận sau khi kiểm tay (07:00)
KHÔNG phải lỗi app. Bot tạm có `outgoing_url` không tồn tại (`bot.example.com`) → webhook bot lỗi → hệ thống mở lại hội thoại với activity "marked open by system due to an error with the agent bot" (đúng gốc), rồi auto-assign V2 gán agent cho hội thoại đã `open`. Với receiver sống (`127.0.0.1:9999`, dev có `ALLOW_PRIVATE_WEBHOOK_URLS=true`): hội thoại 154 giữ `pending`, banner "This conversation is currently handled by Bot Trợ Lý QA · Take over" + ô soạn khoá Ghi chú riêng hiện đúng. Harness `d4-bot-handoff-e2e` cần tự dựng bot + receiver (như `d4-bots-e2e`) thay vì giả định bot có sẵn — ghi cho lô 7.
