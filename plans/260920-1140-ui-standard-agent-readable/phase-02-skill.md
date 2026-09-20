# Phase 2 — skill `yona-ui`: chuyển 778 dòng doc vào bốn tầng

**Phụ thuộc:** phase 1 xong. Skill chỉ được trỏ tới check đã chạy được.

## Cấu trúc

```
.claude/skills/yona-ui/
  SKILL.md              ≤ 150 dòng
  references/
    tokens.md           token, thang chữ, màu, focus, đích chạm
    decisions.md        quyết định đang có hiệu lực + lý do + nhãn nguồn
    landing.md          đặc tả 10 section của trang chủ
    app.md              bề mặt dashboard (điền ở phase 3)
```

## `SKILL.md` chứa gì

Chỉ ba thứ, vì đây là phần **luôn được nạp**:

**1. Luật ràng buộc, dạng tuyệt đối, kiểm được.** Mỗi dòng phải trả lời được "vi
phạm thì cái gì fail?". Không kiểm được thì xuống `references/decisions.md`.

**Cấm trùng lặp** (tiêu chí skill-creator): SKILL.md giữ *luật*, `tokens.md` giữ
*bảng tra*. SKILL.md **không** tóm tắt lại bảng token — chỉ trỏ sang. Thông tin
nằm ở đúng một chỗ.

**2. Quy trình nghiệm thu, đánh số, bắt buộc theo thứ tự.** Đây là thứ doc cũ
thiếu hoàn toàn, và là lý do "xong" trượt về "gate xanh + tsc xanh":

```
1. build lại  (asset đã build mới là thứ trình duyệt thấy)
2. chạy scripts/check-ui.py            <- gate máy
3. --save-crops  (cắt từng section ở 3 cỡ màn hình)
4. GIAO ẢNH CHO MỘT AGENT MỚI review thẩm mỹ   <- gate mắt
5. sửa theo phát hiện, quay lại bước 1
6. chỉ khi 2 và 4 đều sạch mới được nói "xong"
```

**Bước 4 không được tự làm.** Đây là điểm cốt tử. Agent đang dựng là người chấm tệ
nhất chính sản phẩm của nó: phiên 19–20/09 agent mở ảnh ra xem **ba lần** và ba lần
tuyên bố đạt, trong khi người dùng nhìn phát ra ngay. Nó đã tự thuyết phục mình
từng vị trí tranh là hợp lý, nên nhìn lại chỉ thấy cái nó muốn thấy.

Ràng buộc cho agent review:

- **Là subagent mới**, không phải agent đang dựng.
- **Chỉ nhận ảnh + bề mặt tham chiếu.** KHÔNG nhận lý do, không nhận "tôi làm thế
  vì…". Đưa lý do là mời nó hợp lý hoá cùng.
- **Nạp skill thẩm mỹ**: `taste-skill` (anti-slop, chuyên landing) là chính;
  `design:design-critique` khi cần phản hồi có cấu trúc về thứ bậc/nhất quán.
- Trả về danh sách phát hiện, không trả về điểm số. "7/10" không sửa được gì.

Hạn chế phải nói thẳng: reviewer cũng là LLM nhìn ảnh, cùng điểm yếu. Lợi thế chỉ
là (a) không có sunk cost, (b) có heuristic anti-slop nạp sẵn. Đây là giảm thiểu,
không phải chữa khỏi — nên phase 4 phải **đo xem bước này có thật sự bắt được gì
không**, chứ không mặc định là có.

**3. Khai phạm vi** (skill-creator bắt buộc): xử lý bề mặt công khai của Yona;
KHÔNG xử lý giao diện dashboard (chờ vòng 2), KHÔNG quyết nội dung/câu chữ, KHÔNG
chọn tài sản ảnh.

`description` **< 200 ký tự**, viết "pushy", phải bắt được: làm/sửa UI, landing,
trang công khai, component, section. Description dở thì skill không nạp — rủi ro
riêng của skill so với doc, nên phase 3 thêm lối vào tất định từ `CLAUDE.md`, và
phase 4 đo độ chính xác kích hoạt.

Scaffold bằng `skill-creator/scripts/init_skill.py` thay vì viết tay frontmatter.

## Chuyển 778 dòng đi đâu

| Mục cũ | Đi đâu | Ghi chú |
|---|---|---|
| §0 luật cứng | `SKILL.md` | giữ nguyên, phần này giữ 100% cả phiên |
| §1 token, §2 config | `references/tokens.md` | đã nằm trong config rồi, doc chỉ để tra |
| §3 công thức component | `references/tokens.md` | cắt văn xuôi, giữ bảng |
| §4 chữ | `references/tokens.md` | **đồng bộ lại với config** — bảng cũ ghi h2 28px trong khi config để 24px |
| §5 chuyển động | `references/decisions.md` | thêm luật đo trang có animation. KHÔNG để một bản tóm ở SKILL.md — trùng lặp |
| §6 icon | `references/tokens.md` | |
| §7 bề mặt công khai | `references/landing.md` | |
| §10 tự kiểm | **xoá**, thay bằng `scripts/check-ui.py` | phần này là gate grep, đã chứng minh vô dụng |
| văn xuôi giải thích | phần lớn **xoá** | giữ lại lý do, bỏ ý kiến |

## Nhãn nguồn cho mọi con số

`đo <ngày> · <viewport> · đã đo 2 lần` — số lấy từ bề mặt tham chiếu
`ta chọn` — quyết định của mình
`chưa kiểm` — chép từ đâu đó, chưa xác minh

Con số không nhãn thì không được tin. `82px` chết vì nó ngồi cùng bảng, cùng giọng
với `container 1170px`.

Số đã biết là sai, phải ghi kèm cảnh báo trong `decisions.md`: thanh accent
82/58/51/18px (thực ra là thanh tiến trình carousel), "ảnh rộng 1171×530" (thực ra
là 1 trong 3 slide), "nút chính nền #111" (đổi màu khi hover).

## `docs/design-system.md`

Rút thành stub ~15 dòng: chuẩn nằm ở đâu, chạy check bằng lệnh nào, vì sao chuyển.
Giữ tệp lại để người mở `docs/` không lạc, và để link cũ không chết.

## Nghiệm thu

- `SKILL.md` ≤ 150 dòng. Dài hơn là tái lập đúng lỗi cũ.
- Mọi quyết định đang có hiệu lực trong 778 dòng cũ đều tìm lại được ở chỗ mới —
  đối chiếu bằng danh sách, không bằng cảm giác.
- Không con số nào thiếu nhãn nguồn.
- Bảng thang chữ khớp **chính xác** `tailwind.landing.config.js` (doc cũ lệch ở
  h2/h3/h4).
- Gọi skill trên một việc UI thật → nó nạp, và quy trình nghiệm thu có trong context
  ngay từ đầu.

## Rủi ro

- **Cắt nhầm một quyết định đang có hiệu lực.** Giảm thiểu: liệt kê toàn bộ quyết
  định trước khi cắt, tick từng cái sang chỗ mới.
- **`SKILL.md` phình.** Mỗi lần thêm một dòng phải trả lời "vi phạm thì cái gì
  fail?" — không trả lời được thì nó thuộc `references/`.
