---
name: p04-composer-media-review
description: Kết quả review P04 (f1a6c47, feat/inbox-full-messaging) — HIGH stored-XSS do bỏ mime allowlist, cần verify fix ở commit sau
metadata:
  type: project
---

Review P04 composer media (commit f1a6c47) ngày 2026-07-04: HIGH duy nhất = upload không validate mime (chỉ cap 20MB) + route `inbox.attachments.show` serve inline qua `Storage::response()` → member upload .html/.svg = stored XSS trên origin app. Phase spec YÊU CẦU "validate mime/size" nhưng mime bị bỏ ("validate đã chốt" chỉ nói bỏ cap ảnh 10MB, không nói bỏ mime).

**Why:** đây là blocking finding chưa fix tại thời điểm review — commit sau trên branch này phải có mime allowlist HOẶC Content-Disposition: attachment + nosniff cho non-image.
**How to apply:** khi review các commit P05+ trên feat/inbox-full-messaging, kiểm tra fix này đã vào chưa; các MED còn treo: redirect-follow không re-validate host trong media-fetch.mjs, thiếu test quota/rate-áp-cho-media, avatar fetch ui-actions.mjs còn arrayBuffer() không cap.
