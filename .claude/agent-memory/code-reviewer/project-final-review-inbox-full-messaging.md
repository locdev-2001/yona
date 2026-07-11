---
name: project-final-review-inbox-full-messaging
description: Final review branch feat/inbox-full-messaging (620a2a9..8b71b44) — HIGH queued-broadcast+RLS prod-only, các MED/LOW treo
metadata:
  type: project
---

Final review 05/07: DONE_WITH_CONCERNS — 4 trụ bất biến PASS, 120 test targeted + tsc + bridge 47 xanh.

**HIGH treo (prod-only, không lớp evidence nào bắt được):** `MessageStateChanged` + `MessageReceived` (pre-existing) dùng `SerializesModels` + ShouldBroadcast (queue database). Prod = cho_rach_app (P10 DbRoleGuard ép), worker không bind `app.current_workspace` → RLS chặn model restore → ModelNotFoundException → mọi broadcast fail + failed_jobs poisoning. Dev không thấy vì DB_USERNAME=postgres (superuser bypass RLS). Fix mẫu ĐÚNG có sẵn: `ConversationSystemLine` (payload scalar, không SerializesModels).
**Why:** tương tác P10 least-privilege × queued broadcast × RLS là lỗi tích hợp branch-level; runtime checklist founder chạy trên dev env cũng không bắt được.
**How to apply:** mọi event ShouldBroadcast mới trong repo này PHẢI capture payload scalar trong constructor, CẤM SerializesModels + query trong broadcastWith. Check mục này ở mọi review sau.

MED treo: (1) stream `hasMore` (pre-existing main): 2 nguồn đều <limit nhưng tổng >limit → mất trang lịch sử im lặng — P08 system lines làm dễ dính hơn; (2) file >200 dòng vi phạm luật plan: index.tsx 782, webhook 499, composer 387, ZaloSendService 335, driver 316; (3) seam chưa khai trong bảng contract: ZALO_QUOTA_KEY + quota UI block trong pages/inbox/index.tsx.
LOW treo: sticker+text/sticker+file bridge nuốt im lặng nhưng DB vẫn lưu body/media (nên 422 như quote+file); mime allowlist thiếu audio/x-wav + heic; outbox.test.mjs flaky khi chạy cả bộ (~1/3 lần, pre-existing ngoài diff).
