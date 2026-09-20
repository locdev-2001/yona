# Chuẩn UI cho agent — chuyển từ doc sang skill + check chạy được

**Trạng thái:** đã duyệt hướng · tạo 20/09/2026 · nhánh `main`

## Vấn đề

`docs/design-system.md` (778 dòng) viết để AI đọc rồi làm UI. Đo trên phiên dựng
lại landing 19–20/09: **mọi lỗi người dùng bắt bằng mắt đều đi qua đủ 7 gate** —
tranh đè tiêu đề, ảnh chụp chặt mất tên khách, dấu góc lấm tấm trên nền trắng,
tranh cắt đôi ở mép, hero tràn màn hình.

Ba nguyên nhân, đều đặc thù cho người đọc là AI:

1. **Doc không có lối vào tự động.** `CLAUDE.md` **chưa từng nhắc tới**
   `design-system.md`. Nó chỉ vào context khi agent tình cờ đi tìm — mà agent chỉ
   đi tìm khi đã nghi ngờ sẵn. Thực tế cả phiên chỉ `grep` từng mảnh.
2. **Doc không tới được agent làm việc.** 4 subagent sửa 6 section đều nhận bản
   *diễn giải lại* của controller. Chỗ controller diễn giải sai (thanh accent
   `82px`) thì cả bốn kế thừa nguyên xi, không đứa nào cãi.
3. **Đánh giá thị giác của agent không đáng tin; đo thì đáng tin.** Ba lần agent
   nhìn ảnh rồi tuyên bố đạt, ba lần người dùng chỉ ra hỏng. Doc lại **không định
   nghĩa "xong"**, nên "xong" trượt về "gate xanh + tsc xanh".

Ngược lại, phần doc nằm trong Tailwind config giữ **100%** cả phiên: class vi phạm
không compile, agent không cần nhớ gì.

## Nguyên tắc

Thứ gì agent phải *nhớ* thì sẽ trượt. Thứ gì *tự nạp* và thứ gì *fail* thì giữ.

## Quyết định: skill thay vì doc

| Nguyên nhân | Skill xử lý |
|---|---|
| 1 — không vào context | `description` khớp việc → `SKILL.md` nạp **nguyên vẹn, trước khi bắt đầu** |
| 2 — không tới subagent | agent con **gọi skill**, bỏ hẳn bước controller nén lại |
| 3 — không có "xong" | quy trình nghiệm thu nằm trong phần luôn được nạp |

Thêm: skill **đóng gói được script**, nên chuẩn và công cụ ép chuẩn không lệch pha.
Progressive disclosure của skill khớp đúng bốn tầng dưới đây.

Thử ngược trên 5 lỗi thật của phiên: doc chặn **0/5**; skill + check chặn 4/5 bằng
máy, còn lỗi thứ 5 (dấu góc lấm tấm trên ảnh trắng) do **gate thẩm mỹ** lo — và
gate đó phải tự chứng minh bằng thử mù ở phase 4, không mặc định là có tác dụng.

## Bốn tầng, đáng tin giảm dần

| Tầng | Là gì | Ở đâu | Hiện trạng |
|---|---|---|---|
| 1 — không thể vi phạm | token ghi đè trong Tailwind config | `tailwind.landing.config.js` | đã có, giữ nguyên |
| 2 — kiểm được | assertion trên trang ĐÃ RENDER | `scripts/check-ui.py` | **chưa có — giá trị lớn nhất** |
| 3 — quy trình nghiệm thu | **hai gate**: máy (`check-ui.py`) + mắt (agent MỚI nạp `taste-skill`, chỉ nhận ảnh, không nhận lý do) | `SKILL.md` | chưa có |
| 4 — quyết định + lý do | phần không tự động hoá được | `references/decisions.md` | đang lẫn trong văn xuôi |

## Hình dạng đích

```
.claude/skills/yona-ui/
  SKILL.md              ≤150 dòng — luật ràng buộc + quy trình nghiệm thu + khai phạm vi
  references/
    tokens.md           BẢNG TRA: token, thang chữ, màu (SKILL.md không tóm tắt lại)
    decisions.md        quyết định + lý do + nhãn nguồn
    landing.md          đặc tả 10 section
    app.md              bề mặt dashboard (vòng 2)
scripts/check-ui.py     tầng 2, Python (playwright + PIL + numpy đã có sẵn)
docs/design-system.md   rút còn stub trỏ sang skill
CLAUDE.md               thêm một dòng trỏ skill — lối vào tất định
```

Script nằm ở `scripts/` chứ không trong thư mục skill: một bản duy nhất, dùng được
cho cả skill, CI và người.

## Hai luật về chính chuẩn

- **Mọi con số có nhãn nguồn:** `đo 20/09 · 1440px · đã đo 2 lần` / `ta chọn` /
  `chưa kiểm`. `82px` chết vì nó ngồi cùng bảng, cùng giọng với `container 1170px`
  mà một cái là khung hình bắt giữa animation đang chạy.
- **Cấm diễn giải chuẩn cho subagent.** Bảo nó gọi skill + chạy check, không đưa
  bản tóm tắt của controller.

## Các phase

| # | Việc | Tệp |
|---|---|---|
| 1 | Dựng `scripts/check-ui.py` + fixture hồi quy từ lịch sử git | [phase-01-check-harness.md](phase-01-check-harness.md) |
| 2 | Dựng skill `yona-ui`, chuyển 778 dòng doc vào bốn tầng | [phase-02-skill.md](phase-02-skill.md) |
| 3 | Bề mặt dashboard + luật bàn giao subagent + lối vào từ CLAUDE.md | [phase-03-app-surface-handoff.md](phase-03-app-surface-handoff.md) |
| 4 | Eval: skill có kích hoạt không, có chặn được lỗi cũ không | [phase-04-eval.md](phase-04-eval.md) |

Phase 1 trước phase 2: skill chỉ được trỏ tới check đã chạy được, không hứa suông.

## Theo tiêu chí skill-creator

Soi plan qua `skill-creator` ngày 20/09, sửa theo sáu điểm:

| Tiêu chí | Áp dụng |
|---|---|
| SKILL.md < 300 dòng | ta siết còn ≤ 150 |
| Description < 200 ký tự, "pushy" | viết nháp + test trigger ở phase 4 |
| **Cấm trùng lặp** giữa SKILL.md và references | SKILL.md giữ *luật ràng buộc*; `tokens.md` giữ *bảng tra*; không tóm tắt lẫn nhau |
| Script có test + `requirements.txt`, tránh bash | phase 1, Python |
| **Khai phạm vi** "xử lý X, KHÔNG xử lý Y" | bắt buộc trong SKILL.md |
| Dùng `init_skill.py` scaffold | thay vì viết tay frontmatter |

**Lệch có chủ đích:** skill-creator mặc định đặt ở `$HOME/.claude/skills/`. Ta đặt
trong repo `.claude/skills/` để commit cùng code — 3 dev và CI đều cần, `$HOME` chỉ
một máy có.

**Không làm theo:** bộ eval đầy đủ (workspace nhiều iteration, agent
grader/comparator/analyzer, HTML viewer, `run_loop.py`). Đó là cho skill phân phối
rộng; đây là skill nội bộ một repo. Theo YAGNI chỉ lấy test trigger + so
with/without trên vài ca thật (phase 4).

## Nghiệm thu chung

- Mỗi check ở phase 1 **bắt lại được một lỗi thật của phiên 19–20/09**, chứng minh
  bằng fixture lấy từ lịch sử git (đã xác minh lấy được: bản
  `square-contacts.png` ở `39bc7bc9` có mực chạm cột 0).
- `SKILL.md` ≤ 150 dòng. Dài hơn là tái lập đúng lỗi cũ.
- Không mất quyết định nào đang có hiệu lực từ 778 dòng cũ.
- Chạy được bằng một lệnh; agent không phải nhớ thứ tự.
- Không con số nào thiếu nhãn nguồn.
- **Skill chặn được ≥ 3/5 lỗi thật** của phiên 19–20/09 trong eval with/without.
  Không đo được thì coi như chưa xong — đây đúng là cái bẫy doc cũ đã rơi vào.

## Ngoài phạm vi

- Carousel cho 3 section (tính năng, chốt riêng).
- Chất lượng ảnh sản phẩm và giao diện dashboard — vòng 2, chuẩn không chữa.
- `docs/code-standards.md`: **không tồn tại** trong repo (hook và ghi chép cũ có
  trỏ tới, nhưng `docs/` chỉ có `deployment.md`, `design-system.md`,
  `design-system-app.md`). Không gộp gì cả.

## Rủi ro đã biết

- **Skill kích hoạt theo xác suất** — description dở thì không nạp, trong khi doc ở
  đường dẫn cố định thì luôn tìm được. Giảm thiểu: `CLAUDE.md` trỏ thẳng skill.
- **Markdown của skill nằm ngoài `docs/`**, lệch quy ước "markdown chỉ ở docs/ và
  plans/". Ngoại lệ bắt buộc vì `.claude/skills/` là vị trí chuẩn của skill.
- **Trùng nguồn sự thật** nếu giữ cả doc lẫn skill. Vì vậy doc rút thành stub.
