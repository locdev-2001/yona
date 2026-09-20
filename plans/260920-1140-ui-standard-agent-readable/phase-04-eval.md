# Phase 4 — eval: skill có kích hoạt không, có chặn được lỗi cũ không

**Phụ thuộc:** phase 2 xong.

## Vì sao phase này bắt buộc

Doc cũ đạt 100% tiêu chí của chính nó và chặn được **0/5** lỗi thật. Nó "đạt" vì
tôi vừa viết vừa tự chấm: mỗi lần đo được thứ trái với doc thì tôi sửa doc cho khớp.

Ship skill mà không đo thì lặp lại y nguyên, chỉ đổi vỏ. Phase này là cái chốt độc
lập.

## Lấy gì làm ground truth

Năm lỗi thật của phiên 19–20/09, đều do người dùng bắt bằng mắt sau khi agent đã
tuyên bố đạt:

| # | Lỗi | Máy bắt được? |
|---|---|---|
| L1 | Tranh đè thẳng lên tiêu đề section kết | có — C1 |
| L2 | `square-contacts` / `square-contact` chặt mất chữ cái đầu mọi tên khách | có — C2 |
| L3 | Hero tràn quá một màn hình | có — C3 |
| L4 | Tab: cả hai đều có thanh accent nên không chỉ được tab nào đang chọn | có — C8 |
| L5 | Dấu góc xám đè lên ảnh chụp nền trắng, đọc ra như vết bẩn | không phải máy — **gate thẩm mỹ (E4)** |

Mục tiêu: máy chặn ≥ 3/5 (L1–L4). L5 do gate thẩm mỹ lo, đo riêng ở 4.3.

## 4.1 Độ chính xác kích hoạt

Rủi ro riêng của skill so với doc: nạp theo khớp `description`, không tất định.

Dùng `skill-creator/scripts/run_eval.py`. Bộ câu truy vấn:

**Phải kích hoạt** — "sửa lại section bảng giá", "làm trang landing", "đổi màu nút
trên trang chủ", "thêm một section vào trang công khai", "căn lại spacing hero",
"dựng component mới cho marketing site".

**Không được kích hoạt** — "sửa query N+1 ở ContactsController", "viết test cho
webhook Zalo", "thêm cột vào bảng conversations", "dịch chuỗi sang tiếng Anh".

Đạt: bắt đúng ≥ 90% nhóm một, báo nhầm ≤ 10% nhóm hai. Trượt thì chạy
`improve_description.py` rồi đo lại.

## 4.2 So with-skill và baseline

Ba ca, lấy nguyên văn từ việc thật đã làm trong phiên:

| Ca | Prompt | Khẳng định |
|---|---|---|
| E1 | "Thêm cụm tranh trang trí quanh tiêu đề section kết" | không tấm nào đè glyph (C1); có chạy `check-ui.py` trước khi báo xong |
| E2 | "Chụp lại ảnh sản phẩm cho ba giếng vuông" | mực không chạm mép ảnh (C2) |
| E3 | "Đo bề mặt tham chiếu rồi ghi số đo vào chuẩn" | có đo **hai lần cách nhau ≥1.5s**; mọi con số ghi ra đều có nhãn nguồn |

E3 quan trọng nhất: đó là lỗi gốc đẻ ra bốn con số sai (`82/58/51/18px`), và là lỗi
duy nhất thuần về *quy trình* chứ không về kết quả.

Chạy song song with-skill và baseline. Chấm bằng khẳng định nhị phân, không chấm cảm
tính — chấm cảm tính là đúng cái agent làm dở.

## 4.3 Gate thẩm mỹ có thật sự bắt được gì không

Quy trình nghiệm thu ở phase 2 thêm bước "giao ảnh cho agent mới review thẩm mỹ".
Bước nào cũng phải tự chứng minh, nếu không nó chỉ là thủ tục cho yên tâm.

**E4 — thử mù.** Đưa reviewer đúng ba tấm ảnh đã hỏng của phiên 19–20/09, lấy từ
lịch sử git, **không kèm bất cứ lý do gì**:

| Ảnh | Lỗi cần bắt |
|---|---|
| section kết ở `ca4fa683` | tranh đè thẳng lên tiêu đề |
| khối tính năng C trước khi sửa | dấu góc xám lấm tấm trên ảnh trắng (L5) |
| hero bản 5 tấm tràn mép | tấm nào cũng bị cắt đôi, đọc ra là mảnh vụn |

Đạt: bắt ≥ 2/3, và **mô tả đúng chỗ hỏng** chứ không phán chung chung kiểu "bố cục
chưa cân". Phán chung chung tính là trượt — nó không dẫn tới hành động nào.

**Đối chứng âm.** Đưa kèm một ảnh section đang ổn (bảng giá bản hiện tại). Reviewer
bịa ra lỗi ở đó thì độ nhiễu quá cao, và gate sẽ bị bỏ qua sau vài lần báo sai —
đúng như C1 từng cho 2 báo giả vì đo theo hộp bao thay vì glyph.

Trượt E4 thì **không giữ bước 4 trong quy trình**. Một gate không bắt được gì mà
vẫn bắt chạy thì chỉ dạy agent thói quen bấm cho qua.

## 4.4 Không làm

Bỏ, theo YAGNI: workspace nhiều iteration, agent grader/comparator/analyzer, HTML
viewer, `run_loop.py` train/test split. Đó là cho skill phân phối rộng; đây là skill
nội bộ một repo, ba dev.

Giữ lại: `run_eval.py` (trigger) và so with/without thủ công trên ba ca trên.

## Nghiệm thu

- Trigger: ≥ 90% đúng, ≤ 10% nhầm.
- With-skill chặn ≥ 3/5 lỗi; baseline chặn 0–1 (nếu baseline cũng chặn được hết thì
  skill không đóng góp gì, phải xem lại).
- Cả ba ca E1–E3 đều thấy agent **chạy `check-ui.py` trước khi báo xong**. Không
  chạy thì quy trình nghiệm thu trong SKILL.md chưa đủ ép.
- E4: reviewer mù bắt ≥ 2/3 ảnh hỏng, và không bịa lỗi trên ảnh đối chứng.
- Kết quả ghi vào `plans/260920-1140-ui-standard-agent-readable/reports/`.

## Nếu trượt

Trượt trigger → sửa description, đo lại.
Trượt chặn lỗi → không phải sửa văn, mà xem lỗi đó có check chưa; chưa có thì bổ
sung vào `check-ui.py`. **Văn xuôi thêm vào không bao giờ là cách sửa** — đó là
toàn bộ bài học của 778 dòng cũ.
