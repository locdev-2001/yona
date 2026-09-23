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

## Sức nặng thị giác phụ thuộc VIEWPORT và LOẠI TRANG

*(đo 20/09 · đã đo 2 lần · cùng công thức C9)*

| Trang tham chiếu | Viewport | Trắng | Tối | Màu |
|---|---|---|---|---|
| trang chủ | 1440px | 81.8% | 3.2% | 3.5% |
| trang chủ | **390px** | **76.3%** | **4.8%** | **2.6%** |
| trang sản phẩm | 1440px | 86.4% | 3.6% | 2.5% |
| trang thu lead | 1440px | **74.0%** | 2.6% | **10.4%** |
| trang pháp lý (TB `/legal/privacy` + `/legal/terms-and-policies`, đo 24/09) | 1440px | **91.95%** | 3.5% | 2.9% |
| trang pháp lý (như trên) | 390px | 84.05% | 6.15% | 11.25% |

Hai điều rút ra, cả hai đều từng làm ta sửa nhầm chỗ:

**Dải phụ thuộc viewport.** CÙNG một trang đọc `3.2%` tối ở 1440px và `4.8%` ở
390px — màn hẹp thì chữ chiếm tỉ lệ diện tích lớn hơn hẳn. Đọ ảnh 390px với dải
đo ở 1440px làm mọi trang lành đều trượt. `check-ui.py` nay giữ hai dải và chọn
theo bề rộng.

**Trang thu lead là bề mặt ĐẬM nhất, không phải nhạt nhất.** Nó đo `10.4%` mảng
màu, gấp ba trang chủ. Trực giác ban đầu của tôi ngược hẳn: tôi tưởng trang form
được phép trắng hơn, và định nới ngưỡng. Số đo nói trang form trắng trơn của
mình (`95.7%`) là trống thật, nên sửa trang chứ không nới ngưỡng.

## Ba check bị siết lại sau khi dựng trang mới

Mỗi cái đều là gate tổng quát hoá quá tay một quyết định của trang chủ.

| Check | Từng làm | Nay |
|---|---|---|
| C3 | ép MỌI trang có section đầu vừa một màn hình | chỉ ép trang chủ (yêu cầu chủ dự án) và section tự khai `fill`. Trang form hai cột ở 390px xếp chồng thành 1349px, không bố cục nào vừa nổi 844px |
| C6 | đếm mọi `input` làm đích chạm | bỏ qua nhánh `aria-hidden`. Ô bẫy honeypot không phải đích chạm, và nó từng báo `187x24 < 44px` |
| C9 | một dải cho mọi viewport, mọi trang | hai dải theo viewport; bỏ qua trang khai `noindex`; trang văn bản (`data-page` = `terms`/`privacy`) dùng dải đo trên trang pháp lý của tham chiếu |

Vì sao trang văn bản có dải riêng: điều khoản và chính sách gần như toàn chữ trên
nền trắng. Đọ nó với dải trang chủ marketing (77.6% trắng) thì trang pháp lý
nào cũng trượt, kể cả trang pháp lý của chính bề mặt tham chiếu (91.1–92.8%).
Đo loại trang tương ứng bên tham chiếu, không nới dung sai. Thêm một trang văn
bản mới = thêm `data-page` của nó vào `TRANG_VAN_BAN` trong `check-ui.py`.

Vì sao bỏ C9 ở trang khai `noindex`: đó là trang cuối luồng nên nó ngắn, mà trên
trang ngắn tỉ lệ này đo chủ yếu footer so với nội dung. Một thay đổi bố cục ở
trang cảm ơn làm số nhảy **25 điểm** (91.1% -> 66.6%) trong khi mắt không thấy
khác gì. Không có trang xác nhận nào của bề mặt tham chiếu để đo dải (gửi form
giả vào hệ thống thật của họ thì không làm), nên ép nó khớp dải trang chủ
marketing là chạy theo con số. Gate thẩm mỹ vẫn xem trang này như mọi trang khác.

**Khi siết một check, phải đọ lại hai phía.** C6 sau khi thêm bộ lọc được kiểm
bằng fixture có sẵn đáp án: một nút 24px thật phải VẪN bị bắt, một ô 24px trong
nhánh `aria-hidden` phải được bỏ qua. Nới bộ lọc rồi để lọt đích chạm thật thì
gate thành trang trí.

## Phản hồi từ gate thẩm mỹ mà ta CỐ Ý không sửa

Review mù 20/09 nêu mấy điểm dưới đây. Đã cân nhắc và giữ nguyên — ghi ở đây để
lượt review sau không nêu lại, và để không thành im lặng bỏ qua.

| Phản hồi | Vì sao giữ |
|---|---|
| "Hai tranh hero bị mép cắt trong khi hai tranh kia nằm trọn - hai kiểu xử lý cho cùng một loại vật" | Đúng là không đồng nhất, nhưng cố ý: mỗi bên một tấm trọn + một tấm tràn nhẹ. Cả bốn tấm đều tràn thì thành mảnh vụn dán mép (đã xảy ra); cả bốn đều trọn thì mất hẳn cảm giác cụm tràn ra ngoài khung |
| "Ô vuông đổi màu và đổi cỡ qua ba section: xanh 8px, navy 8px, mực 4px" | Màu là hệ accent theo mạch sản phẩm, có chủ đích. Cỡ 4px ở thẻ giá thì đúng là ngoại lệ duy nhất - giữ vì nó đánh dấu một THẺ, không phải một section |
| "Nền hero trắng còn hai section kia kem" | Hệ ba bậc bề mặt xen kẽ, không phải lỗi. Hai section đó không liền nhau trên trang |
| "Dòng chữ nhỏ dưới CTA là tầng chữ thứ năm trong hero, làm loãng cụm nút" | Bề mặt tham chiếu CÓ dòng này ở đúng vị trí đó. Bỏ đi là đi ngược số đo |
| "Ô vuông bốn góc section kết màu `neutral-300` trên nền trắng, gần như vô hình (1.16:1)" | Đúng là mờ, và đó là ý: `tokens.md` chốt accent `neutral` cho ảnh sản phẩm và section kết. Dấu góc là dấu cấu trúc, không phải thông tin, nên nó không phải đạt ngưỡng tương phản nào. Trang chủ cũng vậy |
| "Một trong bốn mục trong khối chia đôi bị kẹt ở trạng thái đang chọn, không thấy gì để bấm" | Bốn mục đó LÀ nút thật, mục đang mở có nền `neutral-900/5`. Ảnh tĩnh không cho thấy được tính bấm được. Cùng component với trang chủ, đã qua review trước |
| "Ảnh chụp sản phẩm thu nhỏ còn 652px, chữ trong ảnh ~8-9px không đọc nổi" | Thật, nhưng sửa được chỉ sau khi chụp lại — mà chụp lại đang chặn bởi #48 (Zalo thật) và #33 (fixture dùng `Channel::Api` giả) |
| "Chân trang gạch chân mọi liên kết thường trực, đọc như thẻ `<a>` chưa style" | `landing.md` chốt "link `text-sm` weight thường, có gạch chân mảnh". Gạch chân thường trực là quyết định, không phải sót style |
| "Dấu góc dưới-phải bị che" | Bong bóng chat `woot-widget-bubble` cố định ở góc dưới-phải (đo: x1356, rộng 64px), che dấu góc ở x1416. Không phải dấu bị thiếu. Dời widget là quyết định sản phẩm, không phải việc của chuẩn UI |

## `lh 1.05` là SAI cho tiếng Việt — đảo quyết định cũ

*(đo 21/09 · Be Vietnam Pro · `TextMetrics` · 4 trang × 2 viewport)*

`tokens.md` từng ghi `lh 1.05` cho display/h1/h2 và chú thích rằng dấu hai tầng
"bị cắt **dưới** 1.05", tức 1.05 là đủ. Số đo bác điều đó:

| Cỡ | `lh` cũ cho | Mực thật của `Ộ Ữ Ế ằ ạ` | Thiếu |
|---|---|---|---|
| 54px | 57px | **63.9px** (asc 60.8 + desc 12.3) | −6.9px |
| 80px | 84px | **94.6px** | −10.6px |

Trên `/zalo-ca-nhan`, **4/6 tiêu đề** có mực tràn 5.0–10.6px sang vùng dòng kế.
Hai tiêu đề không tràn đúng là hai cái không mang dấu hai tầng nặng — nên đo một
tiêu đề rồi kết luận là cách làm sai lần trước.

Tỉ lệ cần đo được là **1.183**, trùng khít ở cả 54px lẫn 80px. Chọn `1.2` cho
biên an toàn. Sau khi sửa: quét 4 trang × 2 viewport, **0 chỗ tràn**.

Bề mặt tham chiếu là trang tiếng Anh nên `1.05` đúng cho nó. Chép số đo của một
trang tiếng Anh vào chuẩn tiếng Việt là cách lỗi này sinh ra.

## Bong bóng chat che form thu lead — ẩn nó, không dời nó

*(đo 21/09 · 390px · quét cuộn từng 60px)*

Widget của chính Yona là `position:fixed` góc phải, `z-index` 2147483000. Trên
`/dat-lich-demo` ở 390px nó lần lượt chồng lên ô tên, ô số, ô ghi chú và nút gửi
tuỳ vị trí cuộn — chạm vào vùng đó mở chat chứ không focus ô.

Đã thử nâng bong bóng lên `bottom: 96px`: **vẫn chồng** 1658–2816px². Trang cuộn
dài thì một điểm cố định luôn đâm vào thứ gì đó. Chừa `pr` cho thẻ form thì ô
nhập tụt từ 310px còn 226px — form là nội dung chính, không nên nhường.

Chọn: ẩn bong bóng ở trang form, chỉ dưới 768px. Khách vào tới trang này đã có ý
định để lại số; widget chat ở đây chỉ cạnh tranh với chính cái form. Sau khi sửa:
quét cuộn toàn trang, **0 chỗ chồng**; desktop và 3 trang còn lại giữ nguyên
widget (kiểm 5/5).

Khác với mục "dấu góc dưới-phải bị che" ở trên: ở đó widget che một dấu trang
trí, ở đây nó che ô nhập của kênh thu lead duy nhất. Không cùng một việc.

## Menu điện thoại dựng bằng `<details>`, không bằng state

*(đo 21/09 · 390px)*

Trước đây bốn mục nav mang `hidden md:inline-flex` và **không có gì thay thế**:
khách mở trên điện thoại mất đường vào Bảng giá, Đặt lịch demo và **Đăng nhập**
(nav chỉ còn logo, vi/en, Dùng thử).

Chọn `<details>` vì đóng/mở, Enter/Space và thứ tự tab là hành vi sẵn có. Một
`Dialog` cho bốn liên kết đổi lấy state, overlay, focus trap, khoá cuộn và một
phụ thuộc mới. `popover` native cho cả Esc lẫn click-ra-ngoài miễn phí nhưng chỉ
có từ Safari 17 — iOS cũ hơn sẽ thấy nút bấm không làm gì, hỏng thầm lặng còn tệ
hơn thiếu Esc. Esc và đóng-khi-mất-focus thêm bằng hai handler một dòng.

**Bẫy đã dính:** `<details>` đóng chỉ ẩn con bằng `content-visibility`, mà
`position:absolute` bỏ qua cơ chế đó — panel vẫn hiện nguyên khi menu đóng (đo:
vẫn ở 150,54 kích thước 224×194). Phải thêm `hidden` + `[[open]>&]:block`.

## Ảnh sản phẩm: CROP, không phải ảnh nguyên màn hình thu nhỏ

*(đo 21/09 · `/zalo-ca-nhan`)*

`feature-contacts.png` 1600×728 ép xuống 519px trong khung hero: chữ 16px trong
ảnh còn **5.2px**. Ảnh sản phẩm là bằng chứng "phần mềm này có thật" — không đọc
được thì nó không chứng minh gì, chỉ chiếm chỗ.

Crop 728×312 (ba thẻ liên hệ, bỏ sidebar) cho **11.4px** ở cùng bề ngang. Không
cần chụp lại nên không đụng #48/#33.

| | trước | sau |
|---|---|---|
| 1440px | 5.2px | **11.4px** |
| 390px | 3.9px | 7.8px |

Ở 390px khung chỉ 356px — không crop nào cứu được chữ ở bề ngang đó. Giới hạn
vật lý, ghi lại để không ai thử tiếp.

**Nhát cắt phải rơi vào nền, không xuyên chữ** — C2 kiểm đúng việc này và vẫn
đạt sau khi crop. Mép trái giữ trọn bo góc thẻ; mép phải cắt tự nhiên thì đọc ra
là "còn tiếp bên phải", không phải xén ẩu.

## Trang cảm ơn cần TÍN HIỆU, không chỉ cần chữ

*(đo 21/09)*

Nền thẻ trang cảm ơn là `neutral-100`, y hệt thẻ form trang trước. Không có gì
đổi ngữ cảnh nên khách phải ĐỌC CHỮ mới biết đã gửi xong, và người đang vội dễ
tưởng form lỗi rồi gửi lại.

Thêm dấu tick `i-lucide-check` màu `success` — màu duy nhất trên bề mặt công
khai không phải `primary`, dùng đúng một chỗ này. Đo: `success` trên
`neutral-100` cho **4.68:1**, đạt AA.

Footer mobile xếp 2 cột thay vì 1: **920px → 749px**. Đích chạm 44px của từng
link giữ nguyên (luật §10) nên không rút được chiều cao dòng — chỉ xếp lại cột.
Tỉ lệ nội dung/footer từ 0.61 lên 0.8.

## Phát hiện gate thẩm mỹ bị BÁC sau khi đo

*(đo 21/09 · đo lại bằng Playwright, không đọc từ ảnh)*

| Gate nói | Đo được | Kết luận |
|---|---|---|
| "Ô nhập cao ~38px, dưới ngưỡng chạm 44px" (A13/B9) | mọi ô nhập và nút **≥44px**; phần tử duy nhất dưới ngưỡng là honeypot `website` (24px), vốn là ô bẫy bot | **SAI** |
| "Textarea viền đậm hơn hai input, đảo ngược tín hiệu" (A4) | cả ba ô dùng **cùng một** `neutral-500` `rgb(112,107,99)` | **SAI** |
| "Viền ô nhập quá nhạt, trông bị vô hiệu hoá" (A3) | 5.29:1 với ruột trắng, 4.57:1 với panel — vượt xa ngưỡng 3:1 của WCAG 1.4.11 | **SAI trên bản hiện tại**; đúng với bản trước khi đổi `neutral-300`→`neutral-500` |
| "Lề trái 390px nhảy ba mốc (16/18/41)" (A11/B11) | hai mốc: `x=16` nội dung trang, `x=40` chữ trong thẻ be | **ĐÚNG nhưng không sửa**: `landing.md` chốt panel `neutral-100` pad 24. Lề nhảy là hệ quả tất yếu của thẻ có padding |
| "Placeholder nhạt hơn mức đọc được, dưới AA" (D3) | `rgb(112,107,99)` trên trắng = **5.29:1** | **SAI** |
| "Viền ô nhập quá nhạt trên nền be" (D2, lặp lại A3) | 4.57:1 với panel, 5.29:1 với ruột | **SAI** — gate đọc "mảnh 1px" thành "nhạt", đúng kiểu lỗi đã ghi ở trên |
| "Xanh lá của tick là màu lạc hệ, chỉ dùng một chỗ" (C1) | đúng: `success` dùng duy nhất ở `DemoThanks`. Nhưng đó LÀ lý do nó hiệu quả — màu trạng thái dùng nhiều chỗ thì hết là trạng thái | **GIỮ quyết định**, không có bằng chứng mới, chỉ là lập luận ngược |

**Bài học:** gate thẩm mỹ đọc ảnh tĩnh nên không phân biệt được "viền nhạt" với
"viền đủ tương phản nhưng mảnh 1px", và không thấy được phần tử ẩn. Mọi phát
hiện về **kích thước, màu, tương phản** phải đo lại bằng trình duyệt trước khi
sửa. Phát hiện về **bố cục, nhịp, thứ bậc** thì ảnh là bằng chứng đúng.

Cũng đừng giao gate ảnh đã cũ: vòng 2 chụp trước khi bản sửa được build, nên ba
trong bốn phát hiện nặng nhất của nó đã hết từ trước khi nó nhìn.

## Ẩn widget thì phải ẩn cả câu trỏ vào widget

Ẩn bong bóng chat ở trang form dưới 768px làm câu `demo.alt.note` ("bấm bong
bóng chat ở góc phải, đó chính là Yona đang chạy thật") trỏ vào chỗ không có gì.

Ẩn câu đó cùng breakpoint. Và khi `hasChannel` false thì cả khối `border-t` còn
lại rỗng — đo 390px: cao 25px, không con nào hiện, chỉ còn một đường kẻ không
dẫn tới đâu. Ẩn luôn cả khối.

## Menu mobile cần LỚP PHỦ, không chỉ cần panel

*(đo 21/09 · 390px)*

Panel menu rộng 224px neo góc phải cắt ngang tiêu đề hero phía sau: "Bán bằng Z|"
và "quản như m|" bị chặt giữa chữ. Không lớp phủ, không viền rõ ở mép trái thì
nó đọc ra là lỗi render chứ không phải menu đang mở.

Thêm `bg-neutral-900/40` phủ từ dưới nav xuống hết màn, `z-40` (dưới header
`z-50`, trên nội dung). Bấm vào lớp phủ đóng menu. KHÔNG `backdrop-filter`
(luật §2); `shadow-overlay` trên panel là ngoại lệ đã duyệt của luật §1, dành
đúng cho lớp phủ nổi như thế này.

**Đừng tin ảnh chụp khi ghi đè cùng đường dẫn.** Kiểm lớp phủ ba lần bằng ảnh và
ba lần thấy nó "không hiện" — trong khi `elementFromPoint` trả về chính nó, và
pixel tại (60,300) đo được `rgb(160,160,160)` thay vì `rgb(255,255,255)`. Ảnh
hiển thị là bản cache của lần chụp trước. Đọc pixel từ tệp trên đĩa mới là bằng
chứng; ảnh render chỉ dùng để nhìn bố cục, không dùng để phán một thay đổi vừa
build đã vào hay chưa.

## `clamp` theo viewport làm màn RỘNG hơn vỡ nhiều dòng hơn

*(đo 21/09 · hero `/zalo-ca-nhan`)*

Hero chia đôi: cột chữ 521px ở mọi bề rộng, nhưng `text-h1` là
`clamp(1.75rem, 3.75vw, 3.375rem)` nên ở 1440px nó đạt trần 54px. Nửa dài nhất
của tiêu đề cần **620px** — vượt cột 99px, vỡ thành 4 dòng. Ở 1280px chữ chỉ
48px, cần 551px, vừa 2 dòng.

| viewport | cỡ chữ | cột | nửa A cần | dòng |
|---|---|---|---|---|
| 1440px | 54px | 521 | 620 | **4** |
| 1280px | 48px | 521 | 551 | 2 |
| 390px | 28px | 358 | 322 | 2 |

`clamp` đo viewport, không đo cột chứa nó. Mọi tiêu đề nằm trong cột nửa màn đều
dính bẫy này.

Sửa bằng tỉ lệ cột `5/4` (`grid-cols-9`) thay vì `1/1`: cột chữ 584px, ảnh 467px.
Còn 3 dòng — đó LÀ trạng thái đúng cho câu này ở cột nửa màn, vì cụm dài nhất
`Zalo cá nhân,` chỉ 357px.

Đã thử và loại: `3/2` cho chữ 673px nhưng kéo ảnh xuống 449px, chữ trong ảnh từ
11.4px còn 9.9px — đổi lại đúng thứ vừa sửa ở mục crop ảnh. `6/9` còn tệ hơn:
ảnh 350px, chữ 7.7px. Container chỉ 1099px nên không đủ cho cả tiêu đề 54px hai
nửa lẫn ảnh đọc được; một trong hai phải nhường, và nhường ít nhất là `5/4`.

## Một hình vuông không gánh được bốn vai

*(đếm 21/09 · `/zalo-ca-nhan`)*

39 ô vuông `8×8` trên 6 section: 24 dấu góc trang trí, 4 bullet danh sách,
3 eyebrow, 8 dấu mục trong lưới. `landing.md` chốt hình vuông cho **bốn góc
section, bốn góc thẻ, đầu nhãn eyebrow** — bullet danh sách không có trong bảng
đó, nên đó là chỗ sửa được mà không phá quyết định.

Bullet trong `<li>` văn xuôi đổi sang gạch ngang `8×2`. Giữ nguyên dấu mục trong
lưới và mọi thứ `landing.md` đã chốt.

## Hai section cùng khuôn: phân biệt bằng thứ SỐNG SÓT qua mobile

*(đo 21/09 · 390px)*

Section "vấn đề" và "năng lực" ở desktop khác nhau nhờ số cột (2 vs 4). Ở 390px
cả hai xếp một cột và trở nên gần như trùng khít: cùng nền `rgb(250,249,246)`,
cùng 4 mục, 0 ảnh, 0 nút, cao **851 vs 845px** — chênh 6px.

Số cột không sống sót qua breakpoint, nên nó không phải thứ để phân biệt. Thay
`AccentBar` của khối năng lực bằng **icon Lucide khớp nghĩa từng mục** (thu hồi,
cảm xúc, tin nhóm, vị trí). Icon `primary-700` trên nền band đo được 6.95:1.
Sau khi sửa: 925 vs 851px, và một bên có icon một bên không.

## Phát hiện gate vòng 3 bị BÁC sau khi đo

| Gate nói | Đo được | Kết luận |
|---|---|---|
| "Số vạch trang trí đổi theo breakpoint, desktop 2 mobile 4" (Z13) | `[0,4,4,4,0,0]` ở **cả hai** viewport | **SAI** — desktop xếp 4 vạch trên 2 hàng nên trông như 2 |
| "Section CTA canh giữa phá nhịp canh trái" (Z8) | `landing.md` dòng 49 chốt "Kết trang · `text-display` **căn giữa**" | **BÁC** — phản đối một quyết định đã ghi, không có bằng chứng mới |
| "Ảnh treo lơ lửng, không canh với cột chữ" (Z3/F2) | `items-center`, lệch đều 93px hai đầu vì chữ cao 383 ảnh cao 197 | **BÁC** — căn giữa đúng; `items-start` để lại 186px trống dưới, tệ hơn |
| "Ảnh bị cắt cụt mép phải, như chụp thiếu" (Z1) | ảnh ĐÃ có viền `neutral-300` (`MediaFrame framed`), mép cắt nằm trong khung | **BÁC** — crop trọn thẻ cho chữ 7.1px, không đọc được; mép cụt là đánh đổi có chủ đích |

## Gate thẩm mỹ vòng 4: 8/13 phát hiện SAI — điểm dừng của vòng lặp

*(đo 21/09 · đo lại toàn bộ bằng Playwright)*

| Gate nói | Đo được |
|---|---|
| "Lưới 4 cột: hai cột trái có khoảng hở lớn giữa tiêu đề và body" | cả bốn cột hở **10px đồng đều**, `h3Bottom` 3010 → `bodyTop` 3020 |
| "Gạch xanh chỉ có ở hai mục trên, desktop khác mobile" | **4 vạch, mỗi mục một vạch, cả hai viewport**. Desktop xếp trên 2 hàng nên trông như 2 |
| "Gạch xanh đặt sai nhịp, không có giữa mục 1 và 2" | cùng số đo trên — nhịp đều |
| "Mép phải cột trái so le ba mức (745/755/505)" | `h1`, `p`, cụm nút, cột đều kết thúc đúng **759** |
| "Tiêu đề section phụ to hơn hero" | cả năm `h2` đều **54px**, bằng `h1`; chỉ section kết 80px theo `text-display` |
| "Khoảng trắng chết 150px đáy section" | `doTren` và `doDuoi` đều **0** — thứ gate thấy là `py-20`, nhịp mà `landing.md` chốt |
| "Khoảng trắng chết dưới ảnh hero" | như trên |
| "Ảnh hộp thư chữ không đọc nổi" | **11.3px**, tương đương ảnh liên hệ đã crop (10px) |

Giữ lại đúng **một** phát hiện: dòng chú thích của khối năng lực trình bày như
ghi chú chân trang trong khi nội dung nó là cam kết "đang chạy thật, không phải
kế hoạch". Nâng `text-sm`/`neutral-500` → `text-base`/`neutral-700` (10.75:1).
Mép trái thì gate nói sai: nó `x=175`, thẳng hàng với lưới.

**Đây là điểm dừng.** Bốn vòng gate, tỉ lệ sai tăng dần khi trang càng đúng:
vòng 2 sai 4, vòng 3 sai 4, vòng 4 sai 8/13. Lý do có thật: gate đọc ảnh tĩnh
nên phải SUY RA cấu trúc, và trang càng ít lỗi thật thì suy diễn càng lấp chỗ
trống. Dặn nó "đừng đoán con số" không đủ — vòng 4 đã được dặn và vẫn suy ra
"hai cột hở lớn hơn", "chỉ hai mục có gạch", "ba mép phải".

Cách dùng gate đúng: chạy **một vòng** sau khi dựng xong, đo lại mọi phát hiện
đo được, rồi dừng. Chạy lặp tới khi gate hết phát hiện là chạy tới khi nó bịa.

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
