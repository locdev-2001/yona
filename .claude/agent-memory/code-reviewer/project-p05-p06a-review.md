---
name: p05-p06a-phone-enrichment-outbound-review
description: Review P05 phone enrichment + P06a outbound interactions (1d9efa1 + 9158234) — acceptance PASS, MED treo throttle verify-phone
metadata:
  type: project
---

Review 04/07: P05 (1d9efa1) + P06a (9158234) trên feat/inbox-full-messaging — 13 acceptance PASS, status DONE_WITH_CONCERNS.

**Why:** các finding chưa fix cần theo dõi ở commit sau / pre-merge.

**How to apply:** khi review commit tiếp theo trên branch này, check các item treo:
- MED: `ConversationPhoneController::update` không có Laravel-side throttle → findUser burst (acc-ban vector) + oracle dò SĐT theo peer_uid. Đề xuất RateLimiter ~5/min/user.
- LOW: quote + attachment → bridge path file KHÔNG pass `content.quote` nhưng media_meta.quote vẫn lưu → portal hiện quote, Zalo app không.
- LOW: media_meta.sticker.url/thumbnail là input client (chỉ validate url:http,https), render <img> cho cả workspace — chưa host-allowlist (zadn.vn/zdn.vn).
- LOW: thiếu test findUser uid-mismatch/500 (chỉ test nhánh no-slot 422).

Pattern đã verify đúng (đừng nghi lại): B1 HMAC Laravel `hash_hmac('sha256', connId.':'.wsId)` khớp bridge `workspaceToken()`; ZaloInteractionService = caller /zca DUY NHẤT trong app/; mergeIdentities chỉ flag needs_merge_review (không repoint); stream chỉ expose boolean `quotable`, không leak platform_meta thô.
