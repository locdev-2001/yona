# Đề xuất schema số liệu cuộc gọi

Trạng thái: founder đã duyệt ngày 22/10/2026, yêu cầu giữ số liệu để phân tích. Liên quan [Ghi mọi thông số cuộc gọi](https://dash.yona.vn/admin/tasks/view/267). Được phép viết migration và API theo đề xuất này.

## Hai bảng đề xuất

| Bảng | Trường chính | Vai trò |
|---|---|---|
| `call_telemetry_events` | `id` bigint, `call_id` FK, `user_id` FK, `call_participant_id` FK nullable, `client_session_id` UUID, `event_id` UUID, `event_name` varchar(40), `observed_at` timestamp(6), `elapsed_ms` integer nullable, `attributes` JSONB, `created_at` timestamp(6) | Mốc nối phòng, bật nguồn, lỗi quyền/thiết bị, reconnect, rời; metadata thiết bị/phần mềm |
| `call_telemetry_samples` | `id` bigint, `call_id` FK, `user_id` FK, `call_participant_id` FK nullable, `client_session_id` UUID, `sequence` integer, `observed_at` timestamp(6), `interval_ms` integer, `environment` JSONB, `streams` JSONB, `performance` JSONB, `created_at` timestamp(6) | Mẫu tổng hợp video/audio/kết nối và long tasks |

Khóa duy nhất chống gửi lại: events `(user_id, client_session_id, event_id)`; samples `(user_id, client_session_id, sequence)`. Index phục vụ xem theo cuộc và xóa hết hạn: `(call_id, observed_at)`, `created_at`. FK xóa theo cuộc gọi hoặc participant. Không thêm cột vào bảng cuộc gọi hiện có.

## Giới hạn và quyền

- Giữ số liệu kỹ thuật để phân tích, **không tự xóa sau 30 ngày** theo phản hồi duyệt. Không thêm lịch dọn dữ liệu trong phạm vi này.
- Đọc stats cục bộ khoảng 1 giây/lần; gửi mẫu tóm tắt theo lô khoảng 15 giây, khi rời trang chỉ gửi phần còn lại, không chặn rời cuộc gọi.
- Server xác định user/participant từ phiên đăng nhập và quyền vào cuộc gọi; không tin actor/account/participant id do client khai. Hai mặt tiền web_api/api dùng cùng service.
- Chỉ nhận danh sách metric có kiểu và giới hạn rõ: FPS, bitrate, resolution, codec, loss, jitter, RTT, thời gian encode/decode, concealment, giới hạn CPU/băng thông, capability và cờ thiết bị. Trường không được browser hỗ trợ là null, không giả là 0.
- Không nhận tên thiết bị, deviceId/groupId, SDP, ICE address/IP, token, nội dung audio/video hoặc chuỗi UA nguyên văn. Thông tin môi trường chỉ gồm họ browser/OS, phiên bản major, form factor, PWA và kiểu mạng nếu có.
- Hạn chế số stream, số event, kích thước payload và tần suất mỗi người/cuộc; dữ liệu client chỉ là quan sát không đáng tin, không dùng để cấp quyền.
- Màn tổng hợp chỉ cho system admin; tách số liệu media khỏi FPS game. WebRTC không tự đo được FPS của trò chơi khác.

## Phạm vi đã được duyệt

Cho phép thêm hai bảng trên và giữ số liệu kỹ thuật để phân tích. Không ghi nội dung hình/tiếng. Triển khai migration, API lưu, bộ đo, lớp phủ và trang tổng hợp trong cùng phạm vi sáu task.

`user_id` luôn do server xác định. `call_participant_id` cho phép null để ghi lỗi kết nối trước khi webhook xác nhận người vào phòng; không tạo participant giả từ telemetry.

## Đơn vị số đo

Bitrate là bit/giây, FPS là khung/giây, width/height là pixel. RTT và jitter giữ đơn vị giây của WebRTC; processingMs và long_task_ms là mili giây. Packets, packetsLost, framesDropped, freezeCount và concealedSamples là counter tích lũy của track; không coi counter là tỉ lệ. PacketsLost có thể âm khi nhận gói trùng. `effective_type` chỉ là nhóm ước lượng tốc độ mạng, không chứng minh Wi-Fi hay di động; `connection_type` mới là loại kết nối vật lý nếu browser cung cấp. Tín hiệu powerEfficient/capability là gợi ý, trường runtime không hỗ trợ vẫn null. Số đo từ client không phải bằng chứng FPS game hoặc chất lượng nghe thực tế.
