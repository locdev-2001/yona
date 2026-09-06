# Nhận xét UX Zalo của phiên chính (07/09/2026 01:45, Browser pane, account 3)

Bổ sung cho workflow `zalo-deep-audit` (finder `ux-zalo` bị cắt vì giới hạn API). Mỗi mục: quan sát · vì sao quan trọng · đề xuất.

| # | Quan sát | Vì sao | Đề xuất |
|---|---|---|---|
| 1 | Header hội thoại "#2 • Nguyễn Phước Lộc" và card danh sách chỉ có icon chung, không có logo Zalo | Omnichannel "wow" = nhìn là biết kênh; SME có 2 số Zalo + website sẽ lẫn | Icon kênh theo `channel_type` (Zalo logo SVG chuẩn, Lucide cho kênh khác) ở card + header + sidebar Kênh; giữ tên inbox làm tooltip |
| 2 | Panel phải "Liên hệ": 3 dòng "Không có sẵn" (email/SĐT/…) chiếm chỗ đầu tiên | Chỗ đắt nhất của panel đang nói "không có gì"; Zalo cá nhân không lộ email nên dòng này gần như luôn rỗng | Ẩn trường rỗng, thay bằng thông tin có thật: kênh Zalo (uid ẩn, tên Zalo), hội thoại trước, nhãn; hiện ô "Thêm SĐT" như hành động thay vì placeholder |
| 3 | Trang cấu hình inbox Zalo: "Hình đại diện kênh" là icon chung; không thấy avatar/tên/uid tài khoản Zalo đã kết nối ngoài dòng "Đang kết nối với …" | Chủ shop cần biết inbox này là số Zalo nào | Lấy avatar + display_name lúc promote (bridge có `session_ok` payload) làm avatar inbox mặc định; hiện thẻ "Tài khoản Zalo đang kết nối" + trạng thái phiên + thời điểm kết nối |
| 4 | Không có nút "Ngắt kết nối" / "Đổi tài khoản Zalo" ở inbox | Audit finder session-lifecycle: xoá inbox không đăng xuất slot ở bridge, cookie sống mãi | Nút ngắt kết nối (gọi bridge logout + đổi state), và xoá inbox phải đăng xuất bridge |
| 5 | Tab inbox Zalo: Cài đặt · Cộng tác viên · Giờ làm việc · CSAT · Cấu hình · Cấu hình Bot | Chưa rõ CSAT/Bot có hợp với Zalo cá nhân không; nếu có thì phải chạy được thật | Kiểm CSAT gửi qua Zalo (link khảo sát) hoạt động; nếu không hỗ trợ thì ẩn tab theo `channel_type` như gốc làm với vài kênh |
| 6 | Tin cũ 804 (nhắc hẹn tới giờ), 827/828 (thẻ ngân hàng) vẫn dạng thô sau sửa | Worker cũ đã nuốt payload; không backfill được vì dữ liệu mất | Chấp nhận với dữ liệu cũ; cần founder gửi lại thẻ ngân hàng + vị trí từ điện thoại sau khi lô sửa kế tiếp xong để nghiệm thu |
| 7 | Tin "[Link] ⏰ … .png" từ nhắc hẹn tới giờ | Zalo hiện thẻ nhắc hẹn cả khi tạo lẫn khi tới giờ | Driver map cả 2 biến thể (chat.ecard tạo/tới giờ) vào `reminder` |
| 8 | Card hội thoại mất ~7–12 giây tải khi máy đang tải nặng, có màn đen | Không kết luận về tốc độ khi 5 agent Playwright dồn `artisan serve` đơn luồng | Đo lại khi máy rảnh; cân nhắc `php artisan serve` → Octane/FrankenPHP cho dev demo; skeleton thay spinner toàn trang |
| 9 | Placeholder ô soạn dài ("Shift + enter cho dòng mới. Bắt đầu với '/' để chọn Câu trả lời soạn trước.") | Giống gốc, nhưng tiếng Việt lủng củng | Rút gọn: "Nhập tin nhắn… (/ để chọn câu trả lời mẫu)" |
| 10 | Typing của khách không hiện | Kỳ vọng cơ bản của chat | Nối relay `typing` vào `TypingStatusManager` (audit relay-events xác nhận lõi đã có ống dẫn) |

Đã PASS bằng mắt: sticker/GIF/ảnh/file hai chiều realtime, danh thiếp thẻ, nhắc hẹn thẻ (tin mới), reaction, tin thu hồi, đã xem, avatar khách về hồ sơ, thời gian tương đối tiếng Việt.

## Bổ sung cho Lô 5 (UI chat) — từ chat-guest-names-finish
| 11 | CSS `capitalize` biến "Gấu nâu ẩn danh" → "Gấu Nâu Ẩn Danh" ở danh sách hội thoại + panel phải nhưng không ở tiêu đề chat | ux-brief cấm Title Case máy móc; lệch nhau trong cùng khung hình | Bỏ `capitalize` ở `conversation/conversationbox/contact/ContactInfo.tsx:136`, `components/widgets/conversation/ConversationCard.tsx:162`, `reports/components/CsatContactCell.tsx:26`; ghi deviation |
| 12 | Tin "email collect" của widget còn tiếng Anh ("Give the team a way to reach you.") khi account locale vi | lẫn ngôn ngữ ngay trước mặt khách | Dịch theo locale account/inbox (lang/vi) |
