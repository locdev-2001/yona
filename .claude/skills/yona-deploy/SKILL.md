---
name: yona-deploy
description: Deploy yona.vn lên production qua cổng deploy SSH (chỉ các hành động định sẵn, không shell) - xem trạng thái server, kế hoạch deploy, dry-run, deploy thật, health, log deploy và log ứng dụng. Chỉ deploy khi founder nói rõ "deploy" trong hội thoại. Dùng khi founder bảo deploy, hoặc hỏi production đang chạy commit nào. Điều tra lỗi production và tra log có tìm kiếm thì dùng skill yona-debug.
---

# Deploy yona.vn

Mọi thao tác trên server đi qua cổng `/usr/local/sbin/yona-deploy-gate` (nguồn: `scripts/deploy-gate.sh`),
và **chỉ** qua script này:

```bash
.claude/skills/yona-deploy/scripts/remote.sh status          # commit đang chạy, bản deploy gần nhất, đĩa
.claude/skills/yona-deploy/scripts/remote.sh plan            # commit sẽ lên, migration mới, có sao lưu không — không đổi gì
.claude/skills/yona-deploy/scripts/remote.sh dry-run         # deploy.sh DEPLOY_DRY_RUN=1
.claude/skills/yona-deploy/scripts/remote.sh deploy          # sao lưu (nếu có migration mới) → deploy.sh → health
.claude/skills/yona-deploy/scripts/remote.sh health          # APP_URL/up
.claude/skills/yona-deploy/scripts/remote.sh deploy-log 400  # log lần deploy gần nhất
.claude/skills/yona-deploy/scripts/remote.sh app-log 200     # cuối tệp log ứng dụng mới nhất (tối đa 2000 dòng)
```

`status`, `plan`, `health`, `deploy-log`, `app-log` chỉ đọc — dùng thoải mái khi điều tra.

Tra log có tìm kiếm, mở đúng một dòng từ link Log Viewer, điều tra lỗi production: skill `yona-debug`.

**Luật cứng:** key cấu hình trong `.env` có thể là key root thật của founder (`github_ed`) — khi đó server không
chặn được gì, cổng chỉ còn là quy ước. Vì vậy AI **không bao giờ** tự gõ `ssh`, `scp`, `rsync` tới server,
không chạy lệnh nào ngoài `remote.sh <hành động>`, kể cả khi thấy "chỉ cần sửa một dòng" trên server.
Việc cổng không làm được → đưa lệnh cho founder tự chạy.

## Khi nào được deploy

**Chỉ khi founder nói rõ "deploy" trong hội thoại hiện tại.** Push `main` xong KHÔNG tự deploy; lần deploy trước
được phép không có nghĩa lần sau được phép. Không có lệnh thì dừng ở `plan` và báo founder sẽ lên những gì.

## Quy trình deploy

1. **Code đã lên `origin/main`:** `git fetch origin && git status -sb` — `main` sạch, không ahead/behind.
   Server deploy `origin/main`, không phải máy local; commit chưa push sẽ không lên.
2. **Gate theo người ra lệnh:**
   - **Founder nói "deploy" trong hội thoại:** deploy nhanh, KHÔNG chạy full gate. Đủ là vùng đã sửa đã được nghiệm thu
     trên UI có ảnh trong lúc làm (tsc nếu đụng FE, pint tệp đã sửa); thiếu thì làm đúng phần thiếu đó.
     Server tự chạy i18n check và build frontend khi deploy, hỏng là deploy dừng ở bước đó.
   - **AI deploy mà founder không trực tiếp ra lệnh** (khi founder đã cho phép trường hợp đó): bắt buộc full gate
     `make check` (pint + i18n-check + tsc + vite build) trên đúng commit, kèm ảnh nghiệm thu UI của thay đổi. Đỏ thì dừng,
     báo lỗi.
3. **`plan`:** đọc danh sách commit sẽ lên và migration mới. Báo founder một dòng tóm tắt trước khi chạy.
   Server có commit lạ không nằm trong `origin/main` → dừng, hỏi founder (deploy.sh chỉ fast-forward).
4. **`deploy`:** chạy và đọc hết output. Gate tự `pg_dump` khi có migration mới (giữ 14 bản ở `/www/backup/yona`).
   Deploy chạy tách khỏi SSH — mất mạng giữa chừng thì server vẫn chạy tiếp; nối lại bằng `deploy-log`.
5. **Nghiệm thu:** `health` phải 200; `app-log 200` không có lỗi mới sau giờ deploy; mở https://yona.vn trên trình
   duyệt kiểm đúng thứ vừa sửa như người dùng cuối. Cảnh báo nginx/CDN cuối log là việc cần báo, không phải lỗi deploy.
6. **Ghi lại:** bình luận vào công việc tương ứng trên dash (skill `yona-issues`): commit đã lên, kết quả nghiệm thu.

## Khi deploy lỗi

- Dòng cuối log là `KẾT QUẢ: THẤT BẠI` → `deploy.sh` **giữ maintenance mode** có chủ đích. Đọc `deploy-log`,
  tìm nguyên nhân, sửa trong code, gate xanh, push, rồi `deploy` lại. Không có cách "tắt maintenance" qua cổng.
- Cần rollback code, khôi phục DB từ bản dump, xoá/dựng lại DB, seed, sửa nginx/.env, restart dịch vụ lẻ →
  **ngoài quyền của cổng**. Báo founder kèm lệnh cụ thể trong `docs/deployment.md` (mục 10, 13) để founder tự chạy.
- "đang có một lần deploy khác chạy" → chờ, theo dõi bằng `deploy-log`, không thử lại liên tục.

## Cấu hình

`.env` của repo, nhóm `PROD_DEPLOY_*` (mẫu trong `.env.example`); `PROD_DEPLOY_SSH_KEY` là key root của người đó
hoặc — chặt hơn — một key riêng bị buộc vào cổng. Cài cổng và key trên server: `references/server-setup.md`.
