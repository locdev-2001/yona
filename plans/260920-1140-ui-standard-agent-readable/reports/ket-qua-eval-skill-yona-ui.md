# Kết quả eval skill `yona-ui` — 20/09/2026

Phase 4 của [plan](../plan.md). Hai phép đo, hai kết luận trái ngược nhau.

## 4.1 Độ chính xác kích hoạt — TRƯỢT, nhưng phát hiện quan trọng hơn con số

Công cụ: `skill-creator/scripts/run_eval.py` (cần `PYTHONPATH=.` mới chạy được).
Bộ 10 câu ở `.claude/skills/yona-ui/evals/trigger.json`.

| Description thử | Kích hoạt đúng | Báo nhầm |
|---|---|---|
| bản đang dùng (n=1) | 0/6 | 0/4 |
| action-first tiếng Việt (n=1) | 0/6 | 0/4 |
| action-first tiếng Anh, viết kiểu "pushy" (n=1) | 0/6 | 0/4 |
| action-first tiếng Việt (n=3) | **1/18** | 0/12 |
| **đối chứng**: description lặp gần nguyên văn câu hỏi (n=1) | **1/2** | — |

Ba description rất khác nhau đều ra gần đúng 0%. Khi dụng cụ đọc 0 cho mọi mẫu thì
phải nghi dụng cụ trước — nên chạy ca đối chứng: description lặp gần nguyên văn
câu truy vấn. Nó nổ 1/2, chứng minh **cơ chế đo có hoạt động**.

Kết luận: chênh lệch giữa các cách viết description bị nhấn chìm bởi tỉ lệ nền quá
thấp. Ngay cả bản khớp gần như nguyên văn cũng chỉ ~50%. Không phải chuyện chữ
nghĩa.

**Hệ quả thực tế:** không được trông vào cơ chế tự kích hoạt của skill. Dòng trỏ
trong `CLAUDE.md` không còn là biện pháp giảm thiểu phụ — **nó là cơ chế chính**.
Plan từng ghi "skill nạp theo xác suất" ở mục rủi ro; phép đo nâng nó lên thành
sự thật đã xác nhận.

Chưa làm: chạy `improve_description.py`. Với tỉ lệ nền như trên thì tối ưu câu chữ
là tối ưu nhiễu.

## 4.3 Gate thẩm mỹ (E4, thử mù) — ĐẠT, vượt mức đặt ra

Ba ảnh đặt tên trung tính A/B/C, giao cho **subagent mới** nạp `taste-skill`, cấm
đọc mã nguồn, cấm nhận lý do, cấm chấm điểm.

| Ảnh | Sự thật | Reviewer nói |
|---|---|---|
| A | section kết, tranh đè lên tiêu đề | **bắt đúng, xếp hạng nặng nhất**: chỉ đích danh ba chữ "với", "nhắn", "của" nằm trên ba bức tranh tối màu, gọi ra là lỗi trông như z-index |
| C | hero, tranh bị mép cắt đôi | **bắt đúng**: "mép cắt là đường vuông sắc, không mask/fade, đọc như tràn khung chứ không như bleed có chủ đích" |
| B | ĐỐI CHỨNG, đang ổn | **nói ỔN**, không bịa lỗi nặng |

2/2 ảnh hỏng bị bắt, mô tả đúng chỗ chứ không phán chung chung, và đối chứng không
bị bịa lỗi. Ngưỡng đặt ra là ≥2/3.

Chỉ dựng được 2 ảnh hỏng thay vì 3: bản FeatureC có dấu góc lấm tấm trên ảnh trắng
không còn ảnh chụp nào lưu lại.

### Reviewer còn bắt được thứ tôi chưa thấy

Đều là lỗi thật, chưa sửa:

- **Dấu góc thiếu một góc.** Ở cả hai ảnh chỉ thấy 3/4 dấu vuông; góc dưới-phải bị
  bong bóng chat che. Thiếu một góc đọc ra như sót, không như nhịp thiết kế.
- **Bộ chuyển ngôn ngữ trên nav.** Gạch dọc đặt TRƯỚC "VI" nên nó dính vào "Bảng
  giá"; "EN" xám quá nhạt, trông như bị vô hiệu hoá.
- **Tiêu đề hero ba dòng xám/đen/xám** đọc như chữ placeholder bị disable, và làm
  đứt mạch câu.
- **Dòng chữ nhỏ dưới CTA** là tầng chữ thứ năm trong hero, làm loãng cụm nút.

Đây là lập luận mạnh nhất cho việc giữ gate: nó tìm ra thứ mà cả tôi lẫn bộ check
máy đều bỏ sót, trên đúng những ảnh tôi đã tự duyệt là đạt.

## Đọng lại

| Gate | Trạng thái |
|---|---|
| Tầng 1 — token trong config | giữ 100% cả phiên |
| Tầng 2 — `check-ui.py` | 9/9 trên trang thật, 8/8 tự kiểm |
| Tầng 3 — gate thẩm mỹ mù | **hiệu quả**, bắt 2/2 và không bịa trên đối chứng |
| Tầng 3 — tự kích hoạt skill | **không đáng tin**, phải dựa vào `CLAUDE.md` |

## Câu hỏi còn treo

1. Bốn lỗi reviewer mới tìm ra — sửa luôn hay xếp vào vòng sau?
2. Tỉ lệ kích hoạt thấp: chấp nhận `CLAUDE.md` làm lối vào duy nhất, hay điều tra
   thêm xem `claude -p` một lượt có phải môi trường đại diện đúng cho cách skill
   được dùng thật không?
