# CSAT widget — bằng chứng (phiên chính, 07/09 06:55, harness `~/www/pixel-diff/c5-widget-e2e.mjs`)

- Tiền đề: `c5-widget-e2e` giả định inbox 25 (account 2) đã bật CSAT; `g3-e2e` dọn về `csat_survey_enabled=false` → lượt chạy của g3 "chưa kết luận" là do fixture, KHÔNG phải app.
- Bật CSAT tạm rồi chạy lại: bước 1–6 PASS (khách nhắn qua SDK, agent resolve, khối `.customer-satisfaction` hiện realtime, chấm 4 sao, gửi phản hồi "phuc vu tot" → DB `messages` 893 `content_type=9 (input_csat)`, `submitted_values.csat_survey_response = {rating:4, feedback_message:"phuc vu tot"}`).
- **FAIL bước 7**: reload trang nhúng (`open()` lại widget) → `.customer-satisfaction` không hiện trong 20s. Gốc Chatwoot: sau reload vẫn hiện khối CSAT ở trạng thái đã gửi ("Thank you for your feedback" + rating đã chọn). Nghi: widget lọc/ẩn tin `input_csat` khi tải lại lịch sử (`AgentMessage.tsx:43` chỉ render khi… kiểm điều kiện `submitted_values`/`conversation.status`), hoặc API widget messages không trả `input_csat` cho hội thoại resolved.
- Cần kiểm thêm khi sửa: reload TRƯỚC khi chấm (chưa submit) có hiện không; hai trạng thái đều phải đúng gốc (`refs/chatwoot/app/javascript/widget/components/template/CustomerSatisfaction.vue`, `AgentMessage.vue`).
- Đã trả `csat_survey_enabled=false` cho inbox 25 sau khi chạy. Hội thoại 173 (account 2, resolved) còn lại làm dữ liệu đối chứng — dọn khi xong.
