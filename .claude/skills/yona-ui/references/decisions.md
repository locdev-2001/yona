# Quyết định đã chốt, và vì sao

Phần không tự động hoá được. Luật kiểm được nằm ở `SKILL.md`; số tra ở
`tokens.md`; ở đây là **lý do** — thứ cần để biết khi nào được phép lệch.

## Nhãn nguồn

Mọi con số trong chuẩn phải mang một trong ba nhãn:

- `đo <ngày> · <viewport> · đã đo 2 lần` — lấy từ một bề mặt tham chiếu
- `ta chọn` — quyết định của mình
- `chưa kiểm` — chép từ đâu đó, chưa xác minh

Số không nhãn thì không được tin.

## Số đã biết là SAI — đừng chép lại

Bản chuẩn trước từng ghi mấy số này như hằng số đo được. Tất cả đều sai vì đo
một trang **đang động** bằng một ảnh chụp tĩnh.

| Từng ghi | Thực tế |
|---|---|
| "thanh accent dài 82px / 58px / 51px / 18px" | thanh **tiến trình** của carousel. Đo lại cùng một thanh sau 1.8s: nở từ 42.2px lên 106px |
| "ảnh rộng 1171×530" như một ảnh tĩnh | 1 trong 3 slide của carousel |
| "nút chính nền đen tĩnh" | đen lúc nghỉ, **đổi màu khi hover** |
| "thẻ giá có dấu cộng bốn góc" | vuông **đặc** 4×4; toàn trang không có dấu cộng nào |
| "giá ~40px" | 54px |

Bài học đã đóng thành công cụ: `scripts/check-ui.py --reference <url>` cuộn qua
từng khối, đo hai lần cách nhau 1.8s, và **trượt** nếu trang đang động.

## Lệch có chủ đích so với bề mặt tham chiếu

| Quyết định | Vì sao |
|---|---|
| Nút chính xanh `primary-600`, không phải đen | brand kit đã chốt |
| Eyebrow `lh 1.2`, không phải 1.0 | nhãn là chữ HOA tiếng Việt; `Ộ Ữ Ế` bị cắt ở 1.0. Tham chiếu chỉ có Latin không dấu nên không gặp |
| Hero hai nút, không phải form bắt email | Yona chưa có luồng đăng ký chỉ-bằng-email. Dựng form không biết dẫn đi đâu là bịa một bước sản phẩm chưa tồn tại |
| Không có dòng social proof trên h1 | chưa có khách thật. Bịa số liệu hay tên khách còn tệ hơn để trống |
| Không có dải logo khách, không có testimonial | cùng lý do |
| Footer 3 cột thay vì 5 | chưa đủ đích thật. Không thêm cột giả |
| Nền bảng giá dùng hoa văn chấm bi | tham chiếu dùng một ảnh trang trí phủ kín; ta không có asset đó |
| Hero cao đúng một màn hình | yêu cầu của chủ dự án, 20/09 |
| Ba section tĩnh, không carousel | tham chiếu dùng carousel; ta chưa chốt làm hay không |

## Vì sao một số luật tồn tại

**Không `box-shadow`.** Ba bậc bề mặt đã đủ tách lớp. Bóng là cách rẻ tiền để giả
chiều sâu, và khi mọi thứ đều có bóng thì không gì nổi lên cả.

**Ảnh sản phẩm bo 0, không bóng, không padding.** Khung media là hộp viền `1px`,
ảnh tràn sát viền. Dạng "ảnh bồi trong khung" làm mỗi khối cao thêm ~130px và đọc
ra như ảnh treo tường chứ không phải màn hình sản phẩm. *(đo 19/09 · 1440px)*

**Nền `neutral-100` chỉ lộ ra khi ảnh không phủ kín hộp** — giếng vuông và panel
trái của dạng chia đôi. Dùng **một** tông cho cả ba, không phải ba tông khác nhau.
Ba tông từng là ý của tôi để bù mảng màu; nó không có trong tham chiếu.

**Tranh trang trí chỉ nét mực nền trong suốt.** Khối màu đặc cạnh tiêu đề thành
vật thể thứ hai, hút mắt mạnh hơn cả chữ, và trên trang CRM đọc ra như ảnh nhặt
đại về dán vào. Kiểm bằng máy: alpha trong suốt > 25% và điểm có màu < 5%.

**Eyebrow màu mực, không phải xám.** Nhãn xám nhạt tụt xuống hàng chú thích; nó
phải đọc ngang hàng tiêu đề vì nó là dòng đầu của khối.

**Viền nút phụ màu mực.** Thứ bậc đã nằm ở tương phản đặc/rỗng. Viền xám nhạt làm
nút phụ đọc ra như nút bị vô hiệu.

## Mảng màu — vấn đề KHÔNG thuộc bề mặt công khai

Đo 20/09: trang đạt `2.5%` mảng tối (khớp tham chiếu đúng bằng) nhưng chỉ `0.5%`
điểm có màu so với `3.3%`.

Nguyên nhân đã khoanh được, không phải do khung ảnh hay cách cắt:

| Ảnh | Trắng | Có màu |
|---|---|---|
| `inbox.png` | 88% | 0.6% |
| `feature-contacts.png` | 95.5% | 0.7% |
| ba ảnh vuông | 92–95% | 0.8–1.2% |

Đã thử và **không ăn thua**: chụp lại rộng 2.2:1 (sửa được chiều cao, không sửa
được độ nhạt), ba kiểu cắt khác nhau (đều tệ hơn, một lần ra ảnh trắng trơn).

Giao diện dashboard là nền sáng gần như không màu. **Mảng màu của bề mặt công khai
phụ thuộc vòng 2, đừng để landing gánh tiếp.** Ngưỡng `C9` trong `check-ui.py`
đang nới rộng có chủ đích vì lý do này — siết lại sau khi revamp dashboard, nếu
không nó chỉ là số trang trí.

## Bài học về cách làm việc

**Đo một lần trên trang động là vô nghĩa.** Bốn con số sai ở trên đều sinh từ đây.

**Đánh giá thị giác của agent không đáng tin.** Phiên 19–20/09: agent mở ảnh ra xem
ba lần, ba lần tuyên bố đạt; người dùng nhìn phát ra ngay bốn lỗi. Vì vậy quy trình
nghiệm thu bắt giao ảnh cho một agent khác, và không đưa lý do kèm theo.

**Báo nhầm giết một gate nhanh hơn báo sót.** Dựng `check-ui.py` đã dính ba lần:
C2 kiểm cả bốn mép nên báo nhầm ảnh chụp nguyên màn hình; C5 vứt alpha nên cho 24
báo giả `1.00:1`; C10 đo ở đỉnh trang nên báo sót hẳn một trang có carousel. Mỗi
check phải đọ với một sự thật đã biết trước khi tin nó.

**Gate trên source không thay được gate trên kết quả.** Bảy lệnh grep xanh 100%
trên một trang có tranh đè tiêu đề và ảnh chụp chặt mất tên khách.
