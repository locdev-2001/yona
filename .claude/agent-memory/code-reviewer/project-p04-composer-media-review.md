---
name: p04-composer-media-review
description: Review P04 (f1a6c47) — HIGH stored-XSS + 2 MED ĐÃ FIX ở dac4674; còn treo LOW avatar fetch không cap
metadata:
  type: project
---

Review P04 composer media (commit f1a6c47) ngày 2026-07-04: HIGH = upload không validate mime + serve inline → stored XSS. **ĐÃ FIX ở commit dac4674** ("P04 review fixes"): H1 mime allowlist + Content-Disposition attachment + nosniff cho non-inline-safe; M1 bridge re-validate host cuối sau redirect; M2 test quota-media 422.

**Why:** giữ record vòng review P04 đã đóng — tránh flag lại finding đã fix.
**How to apply:** còn treo duy nhất (LOW): avatar fetch ui-actions.mjs dùng arrayBuffer() không cap size — check nếu đụng file đó. Xem thêm [[p02-message-state-review]] cho item treo của P02.
