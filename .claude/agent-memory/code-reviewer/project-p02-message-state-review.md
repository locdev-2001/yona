---
name: p02-message-state-review
description: Review P02 message-state pipeline (c7f62d5) — pass 9 acceptance; treo MED index source_id + MED test race 23505
metadata:
  type: project
---

Review commit c7f62d5 (P02 message-state pipeline, branch feat/inbox-full-messaging) 2026-07-04: cả 9 acceptance (BLK-1 target extraction, BLK-2 pending bounded, group guard, idempotency, no-meter, HTTP contract, race 23505, backward compat, RLS) đều PASS mức code.

**Why:** Phase rủi ro nhất theo red-team; đối chiếu trực tiếp zca-js-2.1.2 source (Undo/Reaction/SeenMessage/DeliveredMessage/Typing/Enum + listen.ts) — parser đúng shape, ThreadType Group=1.

**How to apply — item MED còn treo, check ở review sau:**
- MED-1: messages KHÔNG có index dẫn đầu source_id (chỉ unique conversation_id+source_id) → `MessageSourceResolver::findForAccount` per-item trong applyReceipts/applyReactions (batch 50) = N+1 + scan. Đề xuất index (workspace_id, source_id) + batch whereIn. Spec P02 risk đã ghi "tránh N+1" nhưng chưa làm.
- MED-2: race-merge 23505 trong `ZaloSendService::persistMessage` KHÔNG có test (path mới hoàn toàn, money-path).
- LOW: reaction replay cùng ts → broadcast lần 2 (gt() cho qua, update no-op nhưng broadcast vẫn bắn); typing lane có thể 500 khi broadcaster down (broadcastTyping không catch).
- Note kiến trúc: forwarder KHÔNG set target_source_id như spec cũ — thay bằng parse server-side (ZaloStateEventParser đọc args nguyên vẹn từ envelope.payload). Hợp lệ, DRY hơn.
