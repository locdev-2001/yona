# Triển khai chất lượng cuộc gọi ngày 22/10/2026

Trạng thái: đã triển khai và kiểm tra trên local; chưa commit, push hoặc deploy production. Các task chuyển sang chờ kiểm tra, chưa đánh dấu hoàn thành vì còn nghiệm thu tiếng/hình hai máy và FPS game thực tế.

## Phạm vi

| Công việc | Đã triển khai |
|---|---|
| [Ghi thông số cuộc gọi (#267)](https://dash.yona.vn/admin/tasks/view/267) | Bộ đọc WebRTC dùng chung, sự kiện vòng đời, mẫu số đo, hai API nhận cùng lõi, trang tổng hợp và dòng thời gian trong admin |
| [Hiện FPS và độ phân giải (#262)](https://dash.yona.vn/admin/tasks/view/262) | Lớp phủ FPS/resolution/bitrate gửi và nhận; nhớ lựa chọn bật/tắt; timer không cập nhật state toàn màn gọi |
| [Video mờ và máy người xem tụt FPS (#263)](https://dash.yona.vn/admin/tasks/view/263) | Profile màn hình tối thiểu 1080p60, kiểm capture trước publish; codec xét capability, một encoding màn hình; giảm camera giải mã và số lần vẽ hiệu ứng |
| [Tiếng nhỏ, rè, dính tạp âm (#264)](https://dash.yona.vn/admin/tasks/view/264) | AEC/AGC/mono rõ ràng; bộ lọc AudioWorklet/WASM tự host, bật/tắt và fallback browser; tránh NS kép |
| [Âm lượng từng người (#265)](https://dash.yona.vn/admin/tasks/view/265) | Gain 0–200% từng người, âm lượng chung 0–100%, lưu trên máy; dùng Web Audio cho gain trên 100% |
| [Loa và thiết bị phát (#266)](https://dash.yona.vn/admin/tasks/view/266) | Thiết bị phát thật từ browser, dùng chung cài đặt; không lấy thao tác tắt âm thanh làm nút loa ngoài; nền tảng không hỗ trợ có chỉ dẫn hệ điều hành |
| [Tin mở phòng biến thành chữ (#270)](https://dash.yona.vn/admin/tasks/view/270) | Mọi tin có dữ liệu call đều dùng thẻ, thiếu snapshot thì đang cập nhật; không rơi về tin chữ hoặc giả kết thúc 0 giây |

## Quyết định đã áp dụng

- Founder duyệt hai bảng `call_telemetry_events` và `call_telemetry_samples`, yêu cầu giữ số liệu để phân tích. Migration đã chạy **chỉ trên `yona_rw` local**; không có lịch tự xóa sau 30 ngày.
- Không ghi nội dung hình/tiếng vào telemetry. Payload không nhận SDP, địa chỉ ICE/IP, token, deviceId, tên thiết bị hay UA nguyên văn. Có major browser, họ OS, kiểu kết nối nếu đọc được, build và metric có giới hạn/kiểu rõ ràng.
- `user_id` và participant do server xác định. Chính sách từng kiểu gọi quyết định quyền gửi; không có nhánh nhà cung cấp trong lõi telemetry. Mẫu và sự kiện chống trùng bằng client session và sequence/event UUID.
- UI theo portal hiện hành. Skill cũ chuyển ra khỏi thư mục hoạt động và đổi entry thành `.claude/disabled-skills/yona-ui/DISABLED.md`; không còn entry SKILL.md để tự nạp. Danh sách màu sáng/tối, size, spacing, radius, vùng chạm ở `docs/portal-ui.md`.
- `CallSettings`, `VolumeControl`, `ParticipantVolume` tái sử dụng Dialog/Button/Switch. Yêu cầu chất lượng tập trung ở `resources/js/dashboard/calls/qualityProfile.ts`; UI và driver cùng đọc nguồn này.

Đợt nghiệm thu dùng tài khoản seed có sẵn và tạo thêm một tài khoản quản trị QA chỉ trên local để kiểm trang tổng hợp.

## Cách giảm tải

Màn hình chỉ publish một encoding, yêu cầu 1920×1080 và 60 fps. Nguồn capture không đáp ứng thì báo rõ; lớp phủ dùng số thực ở sender/receiver, không gán số cấu hình thành số đã đạt. Camera có profile riêng 720p30. Bộ chọn H.264/VP8 xét tín hiệu MediaCapabilities; đây là gợi ý, không chứng minh encoder/decoder runtime dùng phần cứng.

Phòng đông gắn tối đa 8 camera vào lưới, hoặc 4 thumbnail khi xem màn hình, ưu tiên người nói gần đây. Giữ audio mọi người. Adaptive stream ngừng video không được xem; track tạm ngừng vì người dùng không xem không được tính như chất lượng video lỗi. Vẫn đo các video đang xem bị nghẽn.

Khi bật lớp phủ, video được đọc khoảng 1 giây/lần. Bình thường khoảng 5 giây/lần; audio không đọc dày hơn 5 giây kể cả khi bật lớp phủ. Mỗi stream có mốc sampledAt riêng. Telemetry gửi khoảng 15 giây/lần, hàng đợi có giới hạn, có lần gửi cuối khi rời. Quả cầu dừng vẽ khi tab ẩn và giới hạn 30 lần vẽ/giây. Chưa có benchmark chứng minh mức cải thiện FPS game.

## Kiểm tra đã thực hiện

| Kiểm tra | Bằng chứng/kết quả |
|---|---|
| TypeScript | `pnpm tsc` xanh trên bản cuối |
| i18n | Sinh lại en/vi và `make i18n-check` xanh |
| PHP | Pint trên các file thay đổi xanh |
| Build | `pnpm build` xanh, cả app và SDK; asset worklet/WASM được build cùng ứng dụng |
| Diff | `git diff --check` xanh |
| UI cài đặt | Thao tác thật trên browser local: bộ lọc báo enhanced; tắt về off và bật lại; đổi thiết bị phát thành công; thanh âm lượng xuống 0% và về 100%; bật/tắt lớp phủ |
| Vùng chạm | DOM tại khung 375px đo input range cao 44px; có ảnh cài đặt desktop và 375px |
| Telemetry session | Browser thực gửi các request 204; DB có mốc connecting/connected, thay đổi bộ lọc/mic/thiết bị và mẫu Opus/UDP. Trang admin đọc cùng dữ liệu |
| API token | Không auth: 401; token hợp lệ: 204; người ngoài nhóm/cuộc gọi: 403; trường SDP ngoài whitelist: 422; trên 64 KiB: 413; gửi lại mẫu thật: 204 và không tạo trùng |
| Camera | Preview DOM đọc được 1280×720, readyState 4. Đây là kiểm tra một client; không có người nhận nên không dùng FPS gửi 0 để kết luận chất lượng truyền |
| Thẻ hoạt động gọi | Tin 118168 đã có metadata call. Lỗi là nhánh Activity chỉ chọn thẻ khi có snapshot realtime. Đã nghiệm thu thẻ đang cập nhật khi thiếu snapshot và thẻ đang mở khi snapshot tới; ảnh trước/sau trên dash |

Bộ bằng chứng UI nằm tại `reports/call-media-evidence/`. Không giữ ảnh chứa hình camera trong bộ bằng chứng và không đính hình camera lên dash.

### Lỗi được bắt trong nghiệm thu video

Mẫu video thật có implementation `SimulcastEncoderAdapter (OpenH264, OpenH264)`. Validation ban đầu không cho dấu phẩy nên browser nhận 422 và mẫu video chưa lưu. Đã sửa trường này thành chuỗi ASCII in được, tối đa 100 ký tự. Gửi lại đúng payload đã bị từ chối nhận 204; gửi lặp vẫn 204, DB chỉ có một mẫu. Không dùng số liệu tự tạo để xác nhận phần này.

## API và trang quản trị

- Session: `POST /api/v1/calls/{call}/telemetry`.
- API token: `POST /api/v1/telemetry/calls/{call}`.
- Admin: `/admin/call_quality`, lọc khoảng ngày/kiểu gọi, nhóm theo browser/OS, codec và nguồn/chiều; thời gian nối và lần phát audio đầu tiên p50/p95; tín hiệu power-efficient và thời gian xử lý khung hình.
- `/admin/call_quality/{call}`: mốc trên dòng calls, tối đa 500 sự kiện và 100 mẫu mới nhất; dữ liệu thô vẫn giữ trong DB.

Trường không được browser cung cấp là null. RTT/jitter là giây; processingMs/long_task_ms là mili giây; bitrate là bit/giây. Counter tích lũy không phải tỉ lệ. Effective network type không chứng minh Wi-Fi hay di động. Long tasks/FPS video không phải FPS trò chơi.

## Nghiệm thu còn lại

1. Truyền màn hình 1080p60 giữa hai máy, xem số thực ở đầu nhận và đo FPS/frame time của game trước–sau trên cùng cảnh.
2. Gọi thật giữa máy tính và iPhone/Android: nghe A/B giọng Việt, quạt, bàn phím; kiểm méo giọng, vọng, độ trễ và chọn loa theo năng lực nền tảng.
3. Phòng ít nhất ba người để nghe xác nhận gain 0–200% chỉ tác động người đã chọn; kiểm số luồng video/CPU/GPU ở phòng đông.
4. Nghiệm thu video overlay gửi/nhận cùng `webrtc-internals`, gồm đổi thiết bị, chia sẻ/dừng chia sẻ và lỗi quyền.

Không có bằng chứng từ đợt này cho tuyên bố giữ nguyên FPS game, đạt 1080p60 trên mọi thiết bị, hoặc sức chứa 25/50 người của server production. Không thêm test tự động theo quy ước repo. Không sửa task Web/tin nhắn chậm (#268).
