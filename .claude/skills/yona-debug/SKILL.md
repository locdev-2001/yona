---
name: yona-debug
description: Điều tra lỗi production của yona.vn tới nguyên nhân gốc trước khi sửa - tra log qua API Log Viewer (danh sách tệp, tìm kiếm, mở đúng một dòng từ link founder dán dạng yona.vn/logs?file=…&query=log-index:N), đo dữ liệu bằng DB production chỉ đọc, đối chiếu code, viết test tái hiện đỏ rồi mới sửa. Dùng ngay khi founder dán link yona.vn/logs, ảnh chụp Log Viewer, báo "khách thấy…", "không chạy", "trống", "biến mất", "lỗi trên production", khi một task dash là bug cần tìm nguyên nhân, hoặc khi cần đọc log production - kể cả khi founder không nói chữ "debug".
---

# Điều tra lỗi production Yona

Mục tiêu: **chứng minh nguyên nhân bằng bằng chứng production, tái hiện bằng test đỏ, rồi mới sửa.** Mô tả trong task là
giả thuyết của người viết, không phải sự thật. Ca thật 02/10/2026: task ghi "Gmail kéo email về nhưng không có tin",
DB cho thấy 0 hội thoại email, còn log mới chỉ ra gốc thật là một dòng `use` sai namespace. Đoán theo mô tả thì sẽ sửa nhầm chỗ.

## Ba nguồn bằng chứng (đều chỉ đọc, dùng thoải mái)

| Nguồn | Lệnh | Dùng khi |
|---|---|---|
| Log ứng dụng có tìm kiếm | `.claude/skills/yona-debug/scripts/prod-logs.sh …` | Tìm exception, stack trace, chuỗi `[EMAIL FETCH]`, `[GMAIL API]`, `[IMAP]`, `[Zalo]`… |
| DB production | `.claude/skills/yona-issues/scripts/prod-db.sh "SELECT …"` | Đếm, đối chiếu dữ liệu, mốc thời gian (hướng dẫn chi tiết trong skill `yona-issues`) |
| Đuôi log thô, trạng thái server | `.claude/skills/yona-deploy/scripts/remote.sh app-log 300` / `status` | Khi API log không dùng được, hoặc cần biết production đang chạy commit nào |

### prod-logs.sh

```bash
S=.claude/skills/yona-debug/scripts/prod-logs.sh
$S files                                      # identifier, tên, cỡ — log theo ngày: laravel-YYYY-MM-DD.log
$S search <identifier> "IMAP"                 # tìm trong một tệp, context cắt ngắn cho gọn
$S search <identifier> "log-index:337"        # đúng một dòng, in đủ context + stack trace
$S "https://yona.vn/logs?file=…&query=…"     # dán nguyên link founder gửi
```

- Founder dán link `/logs?file=…` → chạy thẳng script với link đó, không hỏi lại.
- Founder gửi **ảnh chụp** Log Viewer → đọc tên tệp và số dòng (cột phải) trong ảnh, rồi `search <identifier> "log-index:<số>"`
  để lấy stack trace đầy đủ. Ảnh chỉ có message cắt ngắn.
- Dòng cuối báo "mới quét x%" → tệp lớn chưa quét xong, chạy lại cùng lệnh.
- Lỗi "thiếu LOG_VIEWER_API_TOKEN" → founder đặt cùng một token vào `LOG_VIEWER_API_TOKEN` ở `.env` local và production.
  401 = token hai bên lệch. Token chỉ cho GET, không xoá hay sửa được gì.

## Quy trình

1. **Đọc task / lời founder, tách "khách thấy gì" khỏi "người viết đoán gì".** Ghi lại các giả thuyết, chưa tin cái nào.
2. **Đo hiện tượng trên production.** DB: dữ liệu có thật không, bao nhiêu, mốc giờ (DB lưu UTC, giờ VN = +7).
   Log: tìm theo tiền tố của module (`[EMAIL FETCH]`, `[GMAIL API]`, `[IMAP]`, tên job, tên class) quanh mốc giờ sự cố.
   Khi UI hiện một thứ mà DB không có, nghi ngay hai chỗ: dữ liệu bị rollback sau khi realtime đã phát
   (`RealtimeBroadcast` là `ShouldBroadcastNow`), hoặc ảnh chụp từ môi trường khác.
3. **Từ bằng chứng lần ngược vào code.** Đọc đúng dòng trong stack trace. Kiểm thứ log nói (class có tồn tại không,
   namespace thật trong `vendor/`, cấu hình thật trong `config/`) chứ đừng suy từ tên.
4. **Viết test tái hiện, chạy cho thấy ĐỎ với đúng thông điệp lỗi trên production.** Thêm vào tệp test sẵn có của vùng đó;
   fixture có sẵn ở `tests/Fixtures/` thường đủ. Test xanh ngay từ đầu = chưa tái hiện được, quay lại bước 2.
5. **Sửa ở tầng gốc**, không vá ở hiện tượng. Đặc thù kênh nằm ở driver, lõi không rẽ nhánh theo kênh (xem CLAUDE.md).
6. **Chạy lại test vùng sửa** (không chạy cả bộ, xem `~/.claude/rules/test-efficiency.md`), pint các tệp đã sửa.
7. **Ghi kết quả lên task dash** (skill `yona-issues`): nguyên nhân gốc kèm dòng log/số đo làm bằng chứng, commit sửa,
   việc còn lại sau deploy (cache bỏ qua, job chạy lại, dữ liệu cần dọn). Commit và push theo luật của repo.
   Deploy chỉ khi founder nói "deploy".

Thiếu quyền đọc một bảng hoặc thiếu log để chốt nguyên nhân → nói rõ đang thiếu gì và giả thuyết nào còn mở, đừng sửa
theo đoán rồi báo là xong.

## Dữ liệu khách thật

Log và DB chứa tên, số điện thoại, nội dung tin nhắn của khách. Trong task, bình luận, commit và báo cáo chỉ ghi id, số đếm,
mốc giờ, message lỗi kỹ thuật. Không chép nội dung tin hay thông tin cá nhân ra ngoài phiên.
