# Yona — Design System

> **Đã chuyển thành skill.** Chuẩn UI bề mặt công khai nay ở
> [`.claude/skills/yona-ui/`](../.claude/skills/yona-ui/SKILL.md).
>
> | Cần gì | Ở đâu |
> |---|---|
> | Luật ràng buộc + quy trình nghiệm thu | `.claude/skills/yona-ui/SKILL.md` |
> | Token, thang chữ, màu, chuyển động, icon | `references/tokens.md` |
> | Quyết định đã chốt và lý do | `references/decisions.md` |
> | Đặc tả 10 section trang chủ | `references/landing.md` |
> | Bề mặt dashboard | `references/app.md` |
> | Kiểm trang đã render | `npm run check:ui` · `npm run check:ui:self` |
>
> **Vì sao chuyển:** bản doc 778 dòng này không có lối vào tự động — `CLAUDE.md`
> chưa từng nhắc tới nó, nên nó chỉ vào context khi agent tình cờ đi tìm. Nó cũng
> không tới được subagent: controller diễn giải lại thành prompt, và chỗ diễn giải
> sai thì cả bốn agent con kế thừa nguyên xi. Và nó không định nghĩa "xong", nên
> "xong" trượt về "gate xanh + tsc xanh" trên một trang đang hỏng.
>
> Bảy lệnh grep trong §10 cũ đã **xoá hẳn**, không phải sửa: chúng xanh 100% trên
> một trang có tranh đè tiêu đề và ảnh chụp chặt mất tên khách. Thay bằng
> `scripts/check-ui.py` — assertion trên trang đã render, kèm `--self-test` chứng
> minh từng check bắt lại được lỗi cũ.
