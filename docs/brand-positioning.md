# Định vị thương hiệu Yona

Nguồn chuẩn cho nội dung công khai và nhận diện. Cập nhật ngày 30/10/2026 theo định hướng người sáng lập: Yona lấy cảm hứng từ Yoneda Lemma, mang các nền tảng giao tiếp về một nơi. Định hướng này thay thế việc định nghĩa thương hiệu bằng “hộp thư cá nhân cho Zalo, email và bạn bè”. Sản phẩm vẫn phục vụ cá nhân; không tự suy ra chuyển hướng sang CRM hoặc phần mềm quản lý đội ngũ.

## Bản chất và mục tiêu

**Yona là nền tảng hợp nhất giao tiếp.** Yona kết nối các nền tảng giao tiếp trong một không gian chung, giúp người dùng theo dõi, tiếp tục và tìm lại các cuộc trò chuyện đang nằm rải rác ở nhiều ứng dụng.

Mục tiêu dài hạn là mang các nền tảng giao tiếp về một nơi. Nội dung phải phân biệt mục tiêu này với các kết nối hiện có; không khẳng định đã hỗ trợ mọi nền tảng. Hộp thư là một cách tổ chức trải nghiệm, không phải toàn bộ bản sắc. Zalo, Gmail và những kết nối khác là các phần của nền tảng, không định nghĩa tên gọi, headline hay mục đích tồn tại của Yona.

## Tên Yona và nguồn cảm hứng

Người sáng lập chọn tên Yona từ **Yoneda Lemma — bổ đề Yoneda** trong lý thuyết phạm trù. Một cách diễn giải trực giác là hiểu một đối tượng qua các mối liên hệ của nó. Yona chuyển cảm hứng ấy thành hướng sản phẩm: từ những kết nối rời rạc đến một trải nghiệm giao tiếp thống nhất.

“Từ phân mảnh đến hợp nhất” là cách diễn giải của thương hiệu, không phải phát biểu toán học của bổ đề. Không tuyên bố bổ đề chứng minh việc gom ứng dụng, hoặc rằng sản phẩm đang thực thi một thuật toán Yoneda.

Nguồn đối chiếu toán học: [MIT — The Yoneda lemma](https://math.mit.edu/~hrm/papers/lectures-905-906.pdf).

## Hệ thông điệp

- **Loại nền tảng:** Nền tảng hợp nhất giao tiếp.
- **Thông điệp cốt lõi:** Kết nối các nền tảng. Hợp nhất giao tiếp.
- **Headline trang chủ:** Nhiều nền tảng. Một nơi giao tiếp.
- **Lợi ích:** Theo dõi tập trung; tiếp tục cuộc trò chuyện qua kết nối tương ứng; tìm lại nội dung trong các cuộc trò chuyện đã kết nối.
- **Mô tả ngắn:** Yona kết nối các nền tảng giao tiếp trong một không gian thống nhất, giúp bạn đọc, trả lời và tìm lại các cuộc trò chuyện ở một nơi.
- **Lời kêu gọi chính:** Tạo tài khoản. Khi đã đăng nhập: Mở Yona.

Trình tự câu chuyện trên website: nền tảng → vấn đề phân mảnh → trải nghiệm hợp nhất → kết nối hiện có → nguồn gốc Yona → cách bắt đầu và câu hỏi thực tế. Tránh biến trang thành một danh sách tính năng hoặc logo tích hợp.

## Văn phong

Rõ, điềm tĩnh, chính xác, có chiều sâu. Mỗi đoạn giải thích một giá trị hoặc trả lời một câu hỏi của người đọc. Ưu tiên động từ cụ thể như kết nối, đọc, trả lời, tìm lại. Giải thích “hợp nhất” bằng hành vi thật, không lặp thuật ngữ như một khẩu hiệu.

Không dùng giọng xuề xòa như “gom tin”, “lục lại”, “nói thật những gì nên biết”, hoặc các câu sáo rỗng như “giải pháp toàn diện”, “đột phá”, “nâng tầm”, “cách mạng hóa”. Cũng không nhồi lý thuyết phạm trù vào mọi đoạn. Câu chuyện Yoneda giải thích nguồn gốc tên và cách suy nghĩ, không đòi hỏi người dùng biết toán.

## Hiện trạng dùng để chứng minh

Trên nhánh mã hiện tại, người dùng có thể kết nối Zalo cá nhân, Gmail và nhắn với người dùng Yona qua `@username`. Hội thoại giữ nguồn kênh; trả lời được gửi qua kết nối tương ứng. Nhóm có trong repo; không lấy tài liệu cũ để kết luận chưa có. Các tính năng gọi phụ thuộc cấu hình và triển khai.

Không mô tả một kênh là đang khả dụng chỉ vì có tên driver trong code. Nội dung giới thiệu kết nối phải dựa trên luồng có thể sử dụng và nêu rõ điều kiện khi cần. Không hứa đồng bộ toàn bộ lịch sử, hợp nhất danh tính giữa các kênh, hoặc chuyển tiếp mọi định dạng khi chưa xác minh.

## Nguyên tắc minh bạch

- Kết nối Zalo cá nhân qua QR không phải tích hợp chính thức của Zalo; có thể gián đoạn hoặc khiến tài khoản bị hạn chế. Đặt thông tin này cạnh phần giới thiệu kết nối và trong thông tin sử dụng, không dùng làm định vị trung tâm.
- Tin nhắn được lưu trên máy chủ; không có mã hóa đầu cuối. Không dùng khóa, khiên hay chữ “riêng tư tuyệt đối” để tạo ấn tượng sai.
- Không bịa số người dùng, đánh giá, khách hàng, giải thưởng hoặc quan hệ đối tác.
- Không hứa miễn phí mãi mãi, app gốc iOS/Android hoặc hỗ trợ mọi nền tảng.
- Nội dung điều khoản/chính sách cần đúng cơ chế vận hành; không dùng văn phong marketing để thay đổi các cam kết pháp lý.

## Nội dung và SEO

Trang chủ sở hữu ý định tìm hiểu Yona và nền tảng hợp nhất giao tiếp. Cụm từ chính: “nền tảng hợp nhất giao tiếp”; các cụm hỗ trợ: “kết nối các nền tảng nhắn tin”, “quản lý tin nhắn nhiều ứng dụng”, “tin nhắn và email ở một nơi”. Đây là định hướng biên tập, chưa phải dữ liệu lượng tìm kiếm hay độ khó.

Title, mô tả, H1, các heading, footer và bản Việt/Anh phải kể cùng một câu chuyện. Tên các kết nối xuất hiện trong phần khả năng hiện có và hướng dẫn thực tế. Chỉ tạo trang con khi có nội dung và luồng thực tương ứng; không tạo nhiều URL cùng một nội dung để nhắm từ khóa. Không nhồi từ khóa và không cam kết thứ hạng. Câu chuyện tên gọi không thay cho việc giải thích sản phẩm bằng ngôn ngữ người dùng hiểu.

## Cơ sở cho nhận diện

Lãnh địa ý nghĩa là **sự liên hệ và hợp nhất**: các thành phần giữ bản sắc nhưng tham gia một cấu trúc chung. Người sáng lập chốt brief ngày 30/10/2026: **Y + tin nhắn + kết nối + hội tụ**. Chữ Y cần là cấu trúc chính và nhận ra được; hai nhánh gợi các hướng hội thoại cùng đi vào một điểm nối và một thân chung. Tránh chỉ dán một chữ vào hình chứa. Logo cần ít nét, có quy luật hình học rõ và đứng được ở một màu. Chưa chốt biểu tượng, màu hoặc kiểu chữ. Các phương án cá voi, chữ y cam, bong bóng khoét Y và vòng vuông ghép mảnh trước đây không được xem là phương án đã duyệt.

Qua các mẫu tham khảo ngày 30/10, người sáng lập đánh giá cao nét y viết tự nhiên và cách chi tiết có nghĩa hòa vào nét chữ, đặc biệt ví dụ đuôi chữ thành jack 3.5. Đây là chỉ dẫn về nguyên tắc sáng tạo, chưa phải quyết định dùng nguyên một kiểu đầu nối hoặc sao chép hình tham khảo. Phát triển một bản có chủ đích mỗi vòng để đánh giá.

Phản hồi hình thức mới nhất ngày 30/10: **nét cứng, mạnh mẽ và dứt khoát**. Phương án nét mềm dạng dấu phẩy đã bị loại. Ưu tiên mảng và nét chéo có lực, góc cắt rõ, khoảng âm gọn; không tiếp tục mặc định nét cong mềm hoặc thư pháp.
