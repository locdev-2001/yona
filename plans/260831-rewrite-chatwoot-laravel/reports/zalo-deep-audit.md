# Audit sâu kênh Zalo cá nhân — tổng hợp sau phản biện (07/09/2026)

Nguồn: 126 finding của 9 finder (`zalo-deep-audit-findings.json`) + 10 nhận xét UX của phiên chính
(`ux-zalo-main-session-notes.md`) + bằng chứng thật (`g1-inbound-evidence.md`). Đã phản biện lại bằng
cách đọc thẳng file:dòng viện dẫn và `git diff` của 3 agent vừa sửa (inbound / relay / contact-sync):
126 finding + 10 nhận xét UX **gộp còn 82 mục**, **loại hẳn 1**, **viết lại/hạ mức 5**, và một danh sách
những thứ đã được sửa trong worktree nên không báo lại. Chi tiết ở phụ lục.

---

## Tóm tắt điều hành

1. Kênh Zalo **chạy được nhưng chưa đứng được một mình**: 3 agent G1 vừa vá xong lớp hiển thị (bong bóng, thẻ, biên nhận, trích dẫn, avatar, tiếng Việt), phần còn thiếu nằm ở lớp **sống sót và định danh**.
2. Rủi ro lớn nhất — **inbox điếc im lặng**: `slot.api.listener.start()` gọi không có `{retryOnClose:true}` (mặc định `false`, `zca-js/dist/apis/listen.js:98`) và handler `closed` chỉ xử lý mã 3000/3003 (`index.mjs:1631`). Mọi lần rớt mạng thường ⇒ WS chết, không nối lại, **không báo `session_lost`**, Yona vẫn hiện "đang kết nối". Khách nhắn — không ai biết.
3. Kèm theo: bridge **một process cho mọi tenant, không có `process.on('unhandledRejection')`** ⇒ một exception lạc trong handler làm sập kênh của tất cả khách hàng.
4. Rủi ro dữ liệu lớn nhất: **số trên danh thiếp khách gửi bị gán làm số của người gửi** (`IncomingMessageService.php:171`) và không chuẩn E.164 ⇒ vừa gộp nhầm hồ sơ hai người, vừa làm luật chống trùng theo SĐT (CLAUDE.md #1) không bao giờ chạy.
5. Chiều ra mất dữ liệu im lặng: `SendOnZaloService.php:75` chỉ lấy `attachments()->first()` ⇒ **tệp thứ 2..15 không bao giờ tới khách** mà tin vẫn báo đã gửi; tệp tới tay khách mang tên `zbr-<uuid>.bin`.
6. Trải nghiệm chat: tin chủ shop gửi từ điện thoại hiện "Bot", tick trạng thái luôn là đồng hồ xoay, khách "đang nhập…" không hiện, card hội thoại không có logo Zalo, panel phải mở ra ba dòng "Không có sẵn".
7. Vùng đã lành (không cần đụng lại): đính kèm realtime, dedupe `source_id` theo inbox, 4 thẻ Zalo, biên nhận/thu hồi/biểu cảm, `in_reply_to`, avatar `image/jpg`, thời gian tương đối tiếng Việt.

**Top-5 làm ngay** (giá trị/chi phí cao nhất): ① bridge tự nối lại WS + chống sập toàn cục (Lô 1) · ② bỏ số danh thiếp khỏi định danh + chuẩn E.164 + gộp qua `ContactMergeAction` (Lô 2) · ③ gửi đủ mọi đính kèm + tên tệp thật + lý do lỗi và nút thử lại (Lô 3) · ④ `external_echo` cho `direction=out` + nhánh FE `externalEcho` + tick trạng thái thật (Lô 2 BE + Lô 5 FE) · ⑤ ba việc UX rẻ mà "wow": icon kênh Zalo ở card/header, panel phải bỏ "Không có sẵn", typing của khách (Lô 5 + Lô 4).

---

## Bảng finding còn lại

Mức: 🔴 critical · 🟠 high · 🟡 medium · ⚪ low. Cột "Gốc" = dimension:index trong JSON (nhiều số = đã gộp).

### Lô 1 — BRIDGE-SỐNG (`services/zalo-bridge/**`)

| # | Mức | Tiêu đề | Bằng chứng | Đề xuất | Gốc |
|---|---|---|---|---|---|
| 1.1 | 🔴 | WS rớt với mã thường ⇒ không nối lại, không báo mất phiên, Yona vẫn "connected" | `index.mjs:1925` `listener.start()` không tham số; `zca-js/dist/apis/listen.js:98` `retryOnClose = false`; `index.mjs:1631` chỉ bắt `KickConnection`/`DuplicateConnection` | `start({retryOnClose:true})`; handler `closed` cho MỌI mã → post `session_lost` ngay rồi tự `reloginSlot()` từ cookie đã lưu, backoff 5s→5m | performance:0, relay-events:0, session-lifecycle:0 |
| 1.2 | 🔴 | Exception lạc trong handler async ⇒ sập bridge của mọi tenant | `grep unhandledRejection services/zalo-bridge/src/*.mjs` = 0; `void (async…)` và `enqueue()` không await | `safeAsync()` bọc mọi handler listener; `process.on('unhandledRejection'/'uncaughtException')` log + counter ra `/health`; pm2 giữ nguyên | performance:1 |
| 1.3 | 🟠 | Lỗi parse MỘT frame bị coi là mất phiên ⇒ khoá gửi giả, không tự hồi | `index.mjs:1615-1619` mọi `listener.on('error')` → `loginPhase='session_lost'` | Tách lỗi transport khỏi lỗi decode (counter `frame_errors`, không đổi phase); self-heal: sau 30s còn nhận frame → post `session_ok` | performance:2, session-lifecycle:5 |
| 1.4 | 🟠 | N+1 gọi API Zalo mỗi tin đến (getUserInfo/getGroupInfo/getStickersDetail/getQR) | `index.mjs` lane live gọi mỗi tin, không cache | Cache profile theo slot (TTL 6h, LRU 5k); sticker dùng `withStickerUrl` như lane backfill; danh thiếp chỉ gọi khi thiếu | performance:3 |
| 1.5 | 🟠 | Caption ảnh/video/tệp bị lọc mất ở mọi lane — contract và fixture hứa có | `parseInboundDescriptor` đưa caption qua `extractInboundPlainText` (dựng chuỗi `[Link]`) rồi bỏ | Nhánh media: `caption = String(c.title ?? c.description ?? '').trim()` lấy thẳng từ content object | inbound-kinds:1 |
| 1.6 | 🟡 | `GET /health` không xác thực, vừa lộ uid/tên/avatar mọi slot vừa GHI đè `bot_id`/meta (mất `workspace_id`) | `index.mjs:2209` trả `session_lost`, uid, avatar; get-or-create slot theo query | Tách `GET /` liveness (không auth, không tham số) khỏi `GET /health?connection_id` (bắt buộc `checkUiSecret`, `slots.get`, không side-effect) | security:6, session-lifecycle:11, performance:12 |
| 1.7 | 🟡 | Log mặc định in nguyên nội dung tin khách + uid + SĐT danh thiếp (tới 16KB/tin), pm2 không rotate | `ZALO_BRIDGE_LOG_QUOTE` bật mặc định | Đảo thành opt-in (`=== '1'`); chỉ log msgId/threadId; `qr_token` chỉ 8 ký tự đầu; cảnh báo lúc boot nếu bật ở production | security:8, performance:9 |
| 1.8 | 🟡 | Sự kiện chatty (typing/connected/disconnected/upload_attachment) vẫn tốn 1 HTTP + 1 job Redis mỗi cái, đứng trước tin thật | `BridgeEventService:79` `=> null`; forwarder gửi hết | `CONSUMED_RELAY_EVENTS` cấu hình một chỗ ở bridge, `AbortSignal.timeout(5000)`, cap in-flight | performance:7 |
| 1.9 | 🟡 | Backfill bắn 2 lane `requestOldMessages` không cursor/không debounce mỗi lần WS auth; deep sync 40 vòng × 2 lane | `reconnect-backfill.mjs`; guard 200 tin/phút/hội thoại làm job fail ⇒ **mất tin** | Lưu `lastMsgId` mỗi lane vào meta slot; debounce ≥60s/slot; deep sync theo lô ≤100 tin/phút/thread | performance:8 |
| 1.10 | 🟡 | Loại tin không nhận dạng bị nuốt im lặng ở lane live (location, doodle, todo, poll, zinstant khác) | lane backfill ghi `[Tin nhắn]`, lane live bỏ; lõi đã có contract `is_unsupported` chưa dùng | Hợp nhất 2 lane: `inbound_kind:'unsupported'` + `msg_type` + nhãn, luôn gửi và log để đo tần suất | inbound-kinds:4 |
| 1.11 | 🟡 | `chat.location` không được xử lý ⇒ gửi vị trí KHÔNG tạo tin nào | `grep location services/zalo-bridge/src/{index,inbound-content}.mjs` = 0 | Thêm nhánh → map thẳng vào `file_type: location` của lõi (`coordinates_lat/long`, `fallback_title`), driver không cần bubble riêng | g1-inbound-notes §ngoài phạm vi |
| 1.12 | 🟡 | `chat.link`/`webcontent` ra chuỗi thô `[Link] Tiêu đề https://…` | lõi đã có contract `fallback` (`fallback_title` + `external_url`) | `inbound_kind:'link'` `{url,title,description,thumb}` → driver map sang attachment `file_type=fallback` | inbound-kinds:6 |
| 1.13 | ⚪ | Sticker chiều ra: bridge đọc `cateId` nhưng payload thật dùng `catId` ⇒ `cateId=0` | so `inbound-content.mjs` với payload đã lưu | Đọc `catId ?? cateId` | outbound:13 |
| 1.14 | ⚪ | Allowlist media-fetch theo hostname, không ghim scheme/port; docs khuyên thêm `localhost` | `media-fetch.mjs` `buildAllowedHosts` | Ghim `https` + port; chặn dải riêng tư trừ host được khai báo tường minh | security:11 |

### Lô 2 — DRIVER ĐỊNH DANH & INBOUND (`app/Services/Zalo/IncomingMessageService.php`)

| # | Mức | Tiêu đề | Bằng chứng | Đề xuất | Gốc |
|---|---|---|---|---|---|
| 2.1 | 🟠 | **Số danh thiếp của NGƯỜI KHÁC bị gán cho NGƯỜI GỬI** ⇒ gộp nhầm hồ sơ; số không E.164 nên luật chống trùng không chạy | `IncomingMessageService.php:171` `$this->params['user']['phone'] ?? $this->params['business_card']['phone']` → `contactAttributes.phone_number:154`; bridge lấy `phone` qua `getUserInfo(contact_uid)` (uid TRÊN thiếp); `Contact::PHONE_NUMBER_REGEX` (`Contact.php:43`) đòi `^\+…` | Chỉ nhận số thiếp khi `business_card.contact_uid === peer_uid`; chuẩn hoá `0x…/84x…` → `+84x…` **tại driver**; điền khi trống; trùng hồ sơ khác → `ContactMergeAction`, KHÔNG update thẳng (chặn ở `Contact::validationErrors()`, không phải 23505) | contact-identity:0, inbound-kinds:0, security:0, data-integrity:3, g1-contact-sync §5.2 |
| 2.2 | 🟠 | Cùng khách trên 2 inbox Zalo hoặc sau khi xoá/tạo lại inbox ⇒ 2 hồ sơ; `social_zalo_user_id` (khoá ổn định duy nhất) không dùng để tra | `ContactInboxWithContactBuilder` chỉ tra identifier→email→phone | `resolveContactInbox()` tra trước `additional_attributes->>'social_zalo_user_id'` (cần index expression jsonb) rồi gọi `ContactInboxBuilder` với contact đó; **đặc thù ở driver, lõi giữ nguyên** | contact-identity:1 |
| 2.3 | 🟠 | Tên/avatar đóng băng lúc tạo: tin backfill sinh hồ sơ ẩn danh **vĩnh viễn**; khách đổi tên/avatar không bao giờ cập nhật | `ContactInboxWithContactBuilder` trả về sớm theo `source_id` (đúng gốc Chatwoot — xác nhận ở `g1-contact-sync-notes §4`); bridge `mapUserName()` trả `'Zalo User'`/uid (`index.mjs:307-320`) nên `AnonymousName` không bao giờ kích hoạt cho tin live | Driver tự làm mới sau `resolveContactInbox()`: tên hiện tại là placeholder (`AnonymousName`/`'Zalo User'`/== uid) ⇒ ghi `user.name` + `social_zalo_user_name`; avatar trống ⇒ dispatch lại `AvatarFromUrlJob`. Bridge: trả `name: null` thay vì bịa `'Zalo User'` | contact-identity:2, contact-identity:3, data-integrity:10, tests-coverage:11 |
| 2.4 | 🟠 | `platform_sent_at` bị bỏ, `created_at = now()`, cờ `backfill` bị lờ ⇒ tin lịch sử sai thứ tự, nhảy "vừa xong", bơm unread/last_activity | `grep platform_sent_at app/Services/Zalo/*.php` = 0 | Gán thẳng `$message->created_at = Carbon::createFromTimestampMs(platform_sent_at)`; `backfill===true` ⇒ không notification, không reopen, không đụng `waiting_since` | inbound-kinds:3, data-integrity:4 |
| 2.5 | 🟠 | Tin chủ shop gửi từ điện thoại (`direction=out`) không được coi là "đã trả lời" ⇒ `waiting_since`, `first_reply_created_at`, SLA, báo cáo đều sai | `IncomingMessageService.php:265` chỉ đặt `external_echo` khi `direction==='echo'`; bridge phát `'out'` cho backfill (`index.mjs:1554`) | Đặt `external_echo = true` cho MỌI direction ≠ `in` (đúng nghĩa `outgoing_echo` của Chatwoot) — FE ở Lô 5 | data-integrity:0, inbound-kinds:2, outbound:6 |
| 2.6 | 🟠 | Echo của msgId thứ hai (ảnh+chú thích, tệp+chú thích, ảnh+trích dẫn) không dedupe được ⇒ **bong bóng "Bot" ma** | zca trả 2 msgId, Laravel chỉ lưu `source_id` đầu | Lô 3 GHI `content_attributes.zalo_source_ids`; **Lô 2 ĐỌC**: `findBySourceId` tra thêm `content_attributes->'zalo_source_ids' ? :id` | data-integrity:2, outbound:3, relay-events:2, tests-coverage:5 |
| 2.7 | 🟡 | Backfill `chat.undo` chỉ bị BỎ QUA, chưa áp thu hồi ⇒ tin khách đã rút sống lại sau restart bridge | `IncomingMessageService.php:36`; `RelayEventParser::recallSourceId()` chỉ bóc envelope relay | Backfill item `chat.undo` → lấy `content.globalMsgId` → `MessageStateService::applyRecall` (accessor do Lô 4 thêm vào `RelayEventParser`) | relay-events:3, data-integrity:6 |
| 2.8 | 🟡 | Tải media thất bại ⇒ vẫn lưu tin rỗng vô hình nhưng bơm unread (rủi ro cao ở backfill vì URL CDN có token hết hạn) | lane backfill dùng URL CDN có TTL | Tạo attachment `file_type=fallback` + `external_url` + `fallback_title` ("Ảnh không tải được — mở trên Zalo"), log kèm `source_id` | inbound-kinds:5 |
| 2.9 | ⚪ | `content_type` từ CDN Zalo không đáng tin (GIF ghi `image/jpeg`, `.txt` ghi octet-stream) | evidence §4 | Nhận dạng theo byte ở **một** chỗ dùng chung (`AvatarContentType` đã có tiền lệ) | inbound-kinds:9 |
| 2.10 | ⚪ | Thông báo hệ thống của Zalo hiện như tin khách gõ thay vì dòng hoạt động | tin 764 | Map sang `message_type=activity` khi `msgType` là system | inbound-kinds:11 |
| 2.11 | ⚪ | Emoticon dạng mã (`/-strong`, `:>`) hiện nguyên mã trong văn bản | `ReactionIcons` đã có bảng 55 mã nhưng chỉ dùng cho reaction | Dùng lại chính bảng đó cho `content` — 1 hàm, không thêm bảng thứ hai | data-integrity:13 |

### Lô 3 — CHIỀU RA (`SendOnZaloService`, retry endpoint)

| # | Mức | Tiêu đề | Bằng chứng | Đề xuất | Gốc |
|---|---|---|---|---|---|
| 3.1 | 🟠 | **Chỉ đính kèm ĐẦU TIÊN được gửi** — tệp 2..15 mất im lặng, tin vẫn báo đã gửi | `SendOnZaloService.php:75` `->attachments()->first()` | Lặp qua toàn bộ attachments (gửi text+quote một lần rồi từng tệp theo thứ tự, hoặc `file_urls[]` để zca gộp album), gom mọi `source_ids`; hỏng một tệp ⇒ ghi `external_error` nêu rõ tệp nào | outbound:0, data-integrity:1 |
| 3.2 | 🟠 | Tệp tới tay khách mang tên `zbr-<uuid>.<ext>`; Office/zip thành `.bin` | bridge tự đặt tên tạm | Gửi kèm `filename` + `content_type`; bridge dùng `{data, filename, metadata}` (AttachmentSource của zca) | outbound:1 |
| 3.3 | 🟠 | Tin gửi thất bại chỉ là bong bóng đỏ câm: không lý do, không nút thử lại (gốc Chatwoot có) | `MessageError` chưa port; không có endpoint retry | Port `POST /conversations/{id}/messages/{mid}/retry` + `claimMessageRetry`; driver dịch mã lỗi bridge sang câu tiếng Việt ngắn. **FE thuộc Lô 5** | outbound:2 |
| 3.4 | 🟡 | Phân loại lỗi bridge sai tầng: 503/403 do thiếu/sai secret bị hiểu là mất phiên / Zalo từ chối; lỗi zca thật (HTTP 500) không bao giờ mở ngắt mạch | `callBridge` quy mọi non-2xx về `not_connected` | Bridge trả `error_code` có cấu trúc (`config_error`/`not_logged_in`/`zalo_api_error{code}`/`fetch_error`); driver map đúng: `config_error` KHÔNG đụng state kênh | outbound:5, session-lifecycle:7, tests-coverage:4 |
| 3.5 | 🟡 | Tin khảo sát CSAT ra Zalo không kèm link ⇒ khách nhận câu "vui lòng đánh giá" cụt | `outgoing_content` của gốc chưa port | Port `Message::outgoingContent()` vào **lõi**, mọi `SendOn*Service` gửi `outgoingContent()` | outbound:10 |
| 3.6 | ⚪ | Không có khoá idempotency Laravel→bridge; echo-dedup chỉ 120s/500 id, phụ thuộc thứ tự worker | dev đang chạy 2 worker song song | Gửi `client_ref = message.id`; bridge dedupe theo `client_ref` trước khi gọi zca | outbound:14, data-integrity:11 |
| 3.7 | ⚪ | `SendReplyJob` vào queue `default` thay vì `high` như gốc | so `refs/chatwoot` | `onQueue('high')` — một dòng | outbound:16 |
| 3.8 | ⚪ | Ghi âm gửi ra thành tệp thường, không phải voice Zalo; `audio/webm` bị đặt `.mp3` | `mimeToExt` | Dùng API voice của zca khi `file_type=audio` và mime hợp lệ | outbound:12 |
| 3.9 | ⚪ | `quotePayload()` chỉ kiểm `msgId`, thiếu 7 trường còn lại của `SendMessageQuote` | `SendOnZaloService::quotePayload()` (mã mới) | Kiểm đủ 8 trường, thiếu ⇒ gửi không trích dẫn thay vì gửi trích dẫn hỏng; 1 test | outbound:11 |

### Lô 4 — SỰ KIỆN & TRẠNG THÁI TIN (`MessageStateService`, `RelayEventParser`, `BridgeEventService`)

| # | Mức | Tiêu đề | Bằng chứng | Đề xuất | Gốc |
|---|---|---|---|---|---|
| 4.1 | 🟡 | **Thu hồi không xoá đính kèm** — ảnh/tệp khách đã rút vẫn hiện trong bong bóng "đã bị xoá" và trong tab Media/Files | `MessageStateService::applyRecall()` không đụng `attachments` (đã đọc mã mới) | Bọc transaction + `$message->attachments->each->delete()` như `destroy_all` của gốc | data-integrity:5, relay-events:6 |
| 4.2 | 🟡 | Reactions là mảng emoji phẳng, không uid/ts ⇒ đổi cảm xúc thành tích luỹ, một người gỡ xoá của tất cả, cảm xúc của chính tenant lẫn với khách | `MessageStateService::applyReactions` | Lưu `{uid, emoji, ts, self}`; parser trả thêm `uid`/`is_self`/`ts`; FE gom theo emoji + count | relay-events:5 |
| 4.3 | 🟡 | Khách "đang nhập…" không bao giờ hiện dù lõi đã có đủ ống dẫn | `BridgeEventService.php:79` `'typing' => null`; `TypingStatusManager` nhận Contact, FE có bubble + timeout 30s | `TypingRelayService`: `threadId` → `ContactInbox` → hội thoại mở mới nhất → `TypingStatusManager(on)`; job delay ~5s bắn `off`; đi queue `critical` | relay-events:7, UX #10 |
| 4.4 | ⚪ | Gap backfill sau reconnect chỉ kéo tin, không kéo `old_reactions` ⇒ cảm xúc lúc bridge chết mất vĩnh viễn | Laravel đã parse được `old_reactions` | Bridge gọi thêm `requestOldReactions` trong `backfillOnReconnect` (phối hợp Lô 1) | relay-events:8 |
| 4.5 | ⚪ | Biên nhận nhóm: `selfListen` đưa cả seen/delivered do CHÍNH tenant tạo; `applyReceipts` không lọc `message_type` | `GroupSeenMessage.isSelf` | Lọc `isSelf` ở parser + `message_type=outgoing` ở service | relay-events:9 |
| 4.6 | ⚪ | `deleteMsg` trong undo chưa diễn giải: nếu Zalo sync "Xoá chỉ ở phía tôi" thì Yona đánh dấu như khách thu hồi | confidence 0.35 — **đo trước khi sửa** | Bắt payload thật một lần rồi mới quyết | relay-events:10 |

### Lô 5 — UI CHAT & NHẬN DIỆN KÊNH (`resources/js/dashboard/components-next/**`)

| # | Mức | Tiêu đề | Bằng chứng | Đề xuất | Gốc |
|---|---|---|---|---|---|
| 5.1 | 🟠 | Tin chủ shop gửi từ điện thoại hiện avatar/bong bóng **"Bot" tím** | FE chưa port nhánh `externalEcho` của `Message.vue` | Port nhánh `externalEcho`: variant AGENT, avatar = tên/icon inbox, tooltip NATIVE_APP (backend do 2.5 cấp) | inbound-kinds:2, outbound:6 |
| 5.2 | 🟡 | Trạng thái tin đi luôn là đồng hồ xoay "Đang gửi" dù DB đã ghi delivered/read | `MessageMeta` chưa có nhánh cho Zalo | Port bảng phân nhánh của `MessageMeta.vue` theo `channelType`, thêm Zalo vào nhóm "có source_id + status thật" (sent ✓ / delivered ✓✓ / read ✓✓ xanh) | outbound:7 |
| 5.3 | 🟡 | Card hội thoại + header + sidebar không có **icon kênh** — omnichannel mà nhìn không biết kênh nào | UX #1 | Icon theo `channel_type` (logo Zalo SVG chuẩn, Lucide cho kênh khác), tên inbox làm tooltip | UX #1 |
| 5.4 | 🟡 | Panel phải mở ra 3 dòng "Không có sẵn" ở chỗ đắt nhất; dấu hiệu Zalo (uid, tên Zalo, QR danh thiếp) có trong DB nhưng vô hình | UX #2; contact-identity:11 | Ẩn trường rỗng; hiện kênh Zalo + tên Zalo + hội thoại trước + nhãn; "Thêm SĐT" là hành động, không phải placeholder | UX #2, contact-identity:11 |
| 5.5 | 🟡 | Nút thử lại + lý do lỗi trên bong bóng đỏ (FE của 3.3) | — | Port `MessageError` (hiện `external_error` + nút thử lại ≤24h) | outbound:2 |
| 5.6 | ⚪ | Placeholder ô soạn dài, tiếng Việt lủng củng | UX #9 | "Nhập tin nhắn… (/ để chọn câu trả lời mẫu)" | UX #9 |
| 5.7 | ⚪ | Chuỗi tin thu hồi dùng khoá Chatwoot "Tin nhắn đã bị xoá"; Zalo nói "đã được thu hồi" | nội dung do driver sinh | Khoá riêng cho driver Zalo, không đụng UI lõi | relay-events:12 |
| 5.8 | ⚪ | Trích dẫn tin nằm ngoài trang đang tải không hiện khối quote | gốc `MessageList.vue:65` fetch cửa sổ ±100 | Port nhánh fetch API (API `getPreviousMessages` đã có) — làm cùng B9 | inbound-kinds:8, g1-relay-notes |

### Lô 6 — PHIÊN & VÒNG ĐỜI INBOX

| # | Mức | Tiêu đề | Bằng chứng | Đề xuất | Gốc |
|---|---|---|---|---|---|
| 6.1 | 🟠 | **Xoá inbox không đăng xuất bridge**: phiên Zalo cá nhân của chủ shop sống mãi trên server, tự restore mỗi lần boot, tin tiếp tục đổ về rồi bị vứt êm | không có hook `deleting` gọi bridge logout | `Zalo::booted()` → `static::deleting(... logout)` (best-effort + job retry); `QrLoginService::start` gọi `cancelQrLogin` trước khi mở token mới; bridge tự `clearSlot` qr chưa promote sau N phút | session-lifecycle:1, security:2, contact-identity:7 |
| 6.2 | 🟠 | Mất phiên chỉ hiện ở trang cài đặt inbox — sidebar không có icon `reauthorization_required`, không thông báo | `InboxResource.php:100` `externalChannelAttributes` không có nhánh Zalo | `Zalo::reauthorizationRequired()` = `state !== connected` + thêm vào `externalChannelAttributes` (**dùng contract lõi có sẵn, không `if zalo`**) + port `ChannelLeaf` | session-lifecycle:2 |
| 6.3 | 🟠 | Quét nhầm tài khoản (409): bridge enqueue `session_ok` TRƯỚC khi Laravel phát hiện mismatch ⇒ DB rơi về `connected` giả trong khi bridge trống slot | `QrLoginService::promote` | `/auth/qr/promote` nhận `expected_personal_uid`; bridge so `slot.personalUid` TRƯỚC clearSlot/start listener/post session_ok → 409 + `clearSlot(qrKey)` (**cần Lô 1**) | session-lifecycle:3 |
| 6.4 | 🟠 | Cùng một tài khoản Zalo gắn vào 2 inbox: nổ 500 sau khi bridge đã kết nối, listener thứ hai đá phiên thứ nhất; lỗi hiện thành "bridge chưa chạy" | unique index `zalo_uid` | `promote` kiểm `Zalo::where(account_id)->where(zalo_uid)->whereKeyNot(id)->exists()` → 409 `zalo_account_in_use` với thông điệp chỉ rõ hộp thư nào | session-lifecycle:4, contact-identity:6 |
| 6.5 | 🟠 | Không có heartbeat Laravel↔bridge: bridge chết ⇒ DB vẫn "connected", banner không hiện, mỗi tin gửi lỗi riêng lẻ | không có job kiểm tra | `ZaloHealthSweepJob` mỗi phút: `state=connected` → `health(connectionId)`; 3 lần liên tiếp hỏng → `session_lost('bridge_down')`; hồi lại → `connected` | performance:4 |
| 6.6 | 🟡 | Wizard giữ `inboxId` trong state React, bước QR không có URL riêng ⇒ F5/quay lại tạo inbox mồ côi (58 trùng tên 59) | inbox 58 mồ côi trong DB dev | Bước QR có route riêng `settings/inboxes/new/{inboxId}/zalo` (đúng mô hình mỗi bước = một URL của gốc) | session-lifecycle:8 |
| 6.7 | 🟡 | Không có "Ngắt kết nối"/"Đổi tài khoản"; phiên quét dở để cookie sống tới 24h; slot `qr:*` không dọn | UX #4 | `POST …/zalo/logout` + `…/zalo/reset`; banner connected hiện avatar/tên tài khoản + 2 nút | session-lifecycle:10, UX #4 |
| 6.8 | 🟡 | Panel QR: hết hạn 100s hiện lỗi thô tiếng Anh; không có trạng thái "đã quét, chờ xác nhận"/"đã từ chối"; bridge chết ⇒ spinner vô hạn | `ZaloQrPanel` | 3 trạng thái + chuỗi tiếng Việt + timeout có lối thoát | session-lifecycle:9, session-lifecycle:12 |
| 6.9 | 🟡 | Promote QR: Laravel timeout 10s trong khi bridge chờ REST Zalo ⇒ báo "bridge chưa chạy" dù đã promote; bấm lại ra `promote_failed` | `QrLoginService` | Nâng timeout promote + trả trạng thái trung gian; poll `qr_status` dùng backoff | performance:13 |
| 6.10 | 🟡 | Promote không lưu SĐT/avatar tài khoản Zalo của shop ⇒ `zalo_phone` luôn null, inbox không avatar | payload `session_ok` đã có avatar/tên | Lưu vào channel + đặt làm avatar inbox mặc định | contact-identity:10, UX #3 |
| 6.11 | ⚪ | `bridge_session` phụ thuộc `bot_id` từ file meta: thiếu meta ⇒ restore/promote chạy nhưng không bao giờ báo Laravel | `index.mjs` | Suy `bot_id` từ `connection_id` khi meta thiếu; không cho `/health` ghi meta (xem 1.6) | session-lifecycle:11 |
| 6.12 | 🟡 | Lời mời kết bạn kèm lời nhắn (`friend_event` REQUEST) bị vứt ở `default => null` ⇒ **mất lead từ người lạ** | `BridgeEventService.php:33` | Tạo hội thoại/Liên hệ nháp từ lời mời (**cần founder chốt** — xem mục quyết định) | contact-identity:5 |

### Lô 7 — KIỂM THỬ & CI

| # | Mức | Tiêu đề | Bằng chứng | Đề xuất | Gốc |
|---|---|---|---|---|---|
| 7.1 | 🟠 | **CI không chạy `vitest` (730 test), `node --test` của bridge (61 test), lẫn `tsc`** | `.github/workflows/ci.yml` chỉ có `pnpm lint` + `pnpm build` | Thêm job bridge (`node --test src/*.test.mjs`) + `pnpm vitest run` + `tsc --noEmit` vào CI (đúng ghi nhớ *build-verify-gate-frontend*) | tests-coverage:3 |
| 7.2 | 🟠 | `webhook-contract.md` KHÔNG mô tả `relay_event` dù parser phụ thuộc hình dạng zca; fixture "dựng theo contract" chính là nguồn sinh fixture sai | `grep relay_event docs/zalo-bridge/webhook-contract.md` = 0 (kiểm lại sau bản sửa của agent inbound) | `docs/zalo-bridge/schema/{inbound,relay_event,bridge_session}.schema.json` làm nguồn duy nhất; bridge test + `ChannelFixture::load` cùng validate theo schema đó | tests-coverage:0, relay-events:11 |
| 7.3 | 🟠 | `parseInboundDescriptor` và toàn bộ bộ dựng payload inbound của bridge **không có unit test nào** | `services/zalo-bridge/src/*.test.mjs` | Tách `inbound-descriptor.mjs` + `inbound-payload.mjs` khỏi `index.mjs` (không đổi logic) rồi test dạng bảng `listener_data thật → {inbound_kind, content, media_url, quote}` | tests-coverage:1 |
| 7.4 | 🟠 | Không có fixture "golden" trích từ payload thật; nhiều fixture là shape tự nghĩ, có cái xanh nhờ nhánh không tồn tại ngoài đời | fixture reaction cũ đã phải thay | `tests/Fixtures/channels/zalo/real/*.json` trích từ DB + `redis-relay*.log`, **che PII**, mỗi file có `_source:{message_id, captured_at}` | tests-coverage:2 |
| 7.5 | 🟡 | Thiếu fixture/test cho tin nhóm, thẻ ngân hàng shape thật, outbox (`max_queue_age`, `payload_too_large`, counter qua restart), 29/30 route HTTP của bridge | — | Bổ sung theo thứ tự: nhóm → outbox → route | tests-coverage:6,7,9 |
| 7.6 | ⚪ | `Http::fake('cdn.zalo.test/*' → image/jpeg)` toàn cục làm test media không phản ánh header CDN thật | — | Fake theo từng test, dùng header thật đã bắt được | tests-coverage:10 |
| 7.7 | ⚪ | E2E `g1-zalo-e2e.mjs` nằm ngoài repo, bridge giả chấp nhận mọi payload, chỉ phủ text | — | Đưa vào repo + validate theo schema 7.2 | tests-coverage:8 |
| 7.8 | ⚪ | QR lifecycle thiếu test (promote 422 / bridge non-2xx / `phase:error`); FE thiếu vitest 409, QR hết hạn, banner; `cancelQrLogin` là code chết | — | Bổ sung cùng Lô 6 | tests-coverage:12 |

### Lô 8 — BẢO MẬT & VẬN HÀNH

| # | Mức | Tiêu đề | Bằng chứng | Đề xuất | Gốc |
|---|---|---|---|---|---|
| 8.1 | 🟠 | **Cookie phiên Zalo (toàn quyền tài khoản cá nhân) lưu plaintext, mode 664**, trái chuẩn trong repo (Telegram `bot_token` cast `encrypted`) | `.sessions/*.json` | `mkdir 0700` + `writeFile 0600`; mã hoá AES-256-GCM bằng `BRIDGE_SESSION_KEY`; production thiếu key ⇒ **từ chối boot** | security:1 |
| 8.2 | 🟡 | Webhook tra kênh chỉ bằng `connection_id` số nguyên, không so `personal_uid` với `zalo_uid`, một secret dùng chung mọi tenant ⇒ tái dùng id đưa tin của người này vào inbox người khác | `BridgeEventService` | So `personal_uid` với `channel.zalo_uid` trước khi ghi; log + bỏ khi lệch | security:4 |
| 8.3 | 🟡 | Route `/attachments/{id}/{filename}` không auth, không chữ ký | `routes/web.php:36`; **hạ từ high** — `path` là `Str::random(40)`/`hashName` nên không đoán được, phải biết đúng id + tên tệp gốc | `URL::temporarySignedRoute` cho `downloadUrl()` dùng bởi kênh ngoài; bridge allowlist giữ nguyên | security:3 |
| 8.4 | 🟡 | Raw `zca_message` (params JSON, uid chủ shop, gUid, href CDN) lộ qua API, webhook bên thứ ba và agent bot; payload phình | `content_attributes.zca_message` ra thẳng `MessageResource` | Lọc ở resource: chỉ giữ 8 trường `SendMessageQuote` cần cho quote, phần còn lại ẩn khỏi API công khai | security:5, data-integrity:12 |
| 8.5 | 🟡 | URL do client Zalo đặt được server tải không có chốt SSRF (`media_url` Laravel, `data_url` thẻ ngân hàng ở bridge) | `RemoteAttachmentDownloader`; bridge fetch mọi host https | Áp `SafeHttp::assertPublicUrl` cho `media_url`; bridge ghim host CDN Zalo cho `data_url` | security:7 |
| 8.6 | 🟠 | **Đính kèm đến tải nguyên vào RAM không giới hạn, 3 bản sao trong PHP, đồng bộ trong `ZaloEventsJob`; job `--tries=1` ⇒ tệp lớn/lỗi tạm = tin khách mất vĩnh viễn** | `RemoteAttachmentDownloader` | Stream `->sink($tmp)` + precheck `Content-Length` + cap `limits.maximum_file_upload_size`; vượt cap ⇒ vẫn tạo tin kèm nhãn + `external_error` | performance:5, data-integrity:7 |
| 8.7 | 🟡 | Vận hành worker chưa chốt: `queue:listen` spawn process mỗi job (~1s/tin), 2 worker song song `--tries` khác nhau, `retry_after` 90s < `media_timeout` 120s, `deploy.sh` gọi `horizon:terminate` dù không có Horizon | `ps` 07/09: PID 13283 (`queue:listen --tries=1`) + PID 1209844 (`queue:work redis --tries=3 --timeout=120`) chạy song song | Chốt một cấu hình: `--timeout` ≥ `media_timeout` + đệm, `retry_after > timeout`; dev giữ MỘT consumer; `deployment.md` ghi rõ | performance:10, outbound:4, performance:6 |
| 8.8 | 🟡 | Sau khi sửa `app/**.php` phải `queue:restart` — worker `queue:work` giữ code cũ trong RAM (bằng chứng: tin 804/827/828 mất `zca_message`) | **hạ mức, sửa mô tả**: PID 957169 trong finding đã chết; hiện là PID 1209844 (khởi động 01:22, TRƯỚC khi agent inbound sửa xong) | Việc vận hành, không phải code: `php artisan queue:restart` trước mỗi lượt nghiệm thu; ghi luật vào `qa-account3-brief` | relay-events:1 |
| 8.9 | 🟡 | Không rate-limit `POST /webhooks/zalo` và `POST /inboxes/{id}/zalo/qr`; mỗi lần mở QR không huỷ phiên trước | `routes/*.php` | `throttle` middleware + huỷ phiên QR cũ (ghép với 6.1) | security:12 |
| 8.10 | 🟡 | Bridge: secret UI nhận qua query string `?ui_secret=` và so sánh `===` (không hằng thời gian); 3 cách so secret trong 1 bridge; production không bắt buộc `LARAVEL_WEBHOOK_SECRET/URL` | `routes/ui-actions.mjs` | Một helper `safeEqual` dùng chung; secret qua header; guard production từ chối boot khi thiếu | security:9, security:10 |
| 8.11 | 🟠 | **File bằng chứng trong `plans/reports` chứa uid Zalo thật, tên và nội dung tin của người thật — chưa che, sắp commit lên GitHub** | `g1-inbound-evidence.md`, `redis-relay*.log` | Che PII trước khi commit (uid → placeholder cố định, tên → "Khách A"); thêm rule vào `.gitignore` cho `redis-*.log` | security:14 |
| 8.12 | ⚪ | `deployment.md` lệch code: `make bridge` không tồn tại, zca-js ghi 2.0.0 (pin 2.1.2), thiếu `BRIDGE_ELEVATED_SECRET`/guard production/giới hạn 1 process & 512M/backup `.sessions` | — | Sửa docs cùng lúc với 8.1/8.7 | performance:11 |
| 8.13 | ⚪ | Metering "chỉ tính khi tenant trả lời" chưa tồn tại trên nhánh rewrite; tín hiệu `direction=out` không lưu bền | quyết định đã chốt ở CLAUDE.md | Dựng lại khi mở gói thu phí — **không tự dựng gate** (ghi nhớ *quota-gate-removed*) | outbound:15 |
| 8.14 | ⚪ | `AvatarFromUrlJob` theo tối đa 3 redirect nhưng chỉ kiểm SSRF ở URL đầu | `AvatarFromUrlJob.php:88-90` `assertPublicUrl` rồi `allow_redirects.max=3` | `allow_redirects=false` + vòng lặp tự kiểm mỗi hop | contact-identity:9 |

---

## Danh sách lô cho agent code

| Lô | Mục tiêu | File sở hữu (không giao nhau) | Mục | Song song với | Founder quyết? |
|---|---|---|---|---|---|
| **1. BRIDGE-SỐNG** | Bridge không chết, không điếc, không lộ | `services/zalo-bridge/src/**`, `.env*.example`, `docs/zalo-bridge/deployment.md` | 1.1–1.14 | 2, 3 | Cần **cửa sổ restart bridge** |
| **2. DRIVER-ĐỊNH DANH** | Một người = một hồ sơ, đúng người, đúng giờ | `app/Services/Zalo/IncomingMessageService.php`, `InboundCardParser.php`, migration index jsonb, `tests/Feature/Channels/ZaloChannelTest.php`, `tests/Fixtures/channels/zalo_*` | 2.1–2.11 | 1, 3 | Không (2.1 theo luật CLAUDE.md #1) |
| **3. CHIỀU RA** | Gửi đi không mất, hỏng thì biết vì sao | `app/Services/Zalo/SendOnZaloService.php`, `app/Jobs/SendReplyJob.php`, `app/Http/Controllers/**/MessagesController.php`, `tests/Feature/Channels/ZaloSendTest.php` | 3.1–3.9 | 1, 2 | Không |
| **4. SỰ KIỆN & TRẠNG THÁI** | Thu hồi/biểu cảm/typing đúng | `app/Services/Zalo/{MessageStateService,RelayEventParser,BridgeEventService,ReactionIcons}.php`, `app/Services/Zalo/TypingRelayService.php` (mới) | 4.1–4.6 | 5, 6 | Không |
| **5. UI CHAT & KÊNH** | "Wow" ngay khi mở inbox | `resources/js/dashboard/components-next/message/**`, `…/Conversation/ConversationCard/**`, `…/Contacts/ContactsSidebar/**`, `lang/{en,vi}/**` | 5.1–5.8 | 4, 6 | Không (ghi vào `ux-deviations.md`) |
| **6. PHIÊN & INBOX** | Kết nối/ngắt/đổi tài khoản minh bạch | `app/Models/Channel/Zalo.php`, `app/Services/Zalo/{QrLoginService,ZaloBridgeClient}.php`, `app/Jobs/Zalo/**`, `app/Http/Resources/InboxResource.php`, `resources/js/dashboard/settings/inboxes/**`, `routes/web_api.php` | 6.1–6.12 | 4, 5 | 6.12 (lời mời kết bạn) |
| **7. TEST & CI** | Fixture thật, gate thật | `.github/workflows/*.yml`, `docs/zalo-bridge/schema/**`, `tests/Fixtures/channels/zalo/real/**`, `services/zalo-bridge/package.json` + module tách ra | 7.1–7.8 | 8 (sau 1) | Không |
| **8. BẢO MẬT & VẬN HÀNH** | Cookie, PII, worker, docs | `app/Support/SafeHttp.php`, `app/Http/Controllers/AttachmentsController.php`, `app/Services/RemoteAttachmentDownloader.php`, `routes/web.php`, `config/queue.php`, `deploy.sh`, `plans/**/reports/*evidence*` | 8.1–8.14 | 7 (sau 1) | 8.11 (che PII trước commit) |

**Thứ tự chạy** (tối đa 3 lô cùng lúc):
- **Sóng 1 (song song):** Lô 1 · Lô 2 · Lô 3 — ba cây file rời nhau. Chốt trước 1 contract chung: Lô 3 GHI `content_attributes.zalo_source_ids`, Lô 2 ĐỌC nó trong `findBySourceId`.
- **Sóng 2 (song song):** Lô 4 · Lô 5 · Lô 6 — Lô 6 làm phần Laravel trước, phần `expected_personal_uid` chờ Lô 1 xong.
- **Sóng 3 (song song):** Lô 7 · Lô 8 — Lô 7 tách module bridge nên **bắt buộc sau Lô 1**.

### Prompt gợi ý cho từng lô

**Lô 1 — BRIDGE-SỐNG**
```
Sửa services/zalo-bridge/src/** (KHÔNG đụng app/ hay resources/). Mục 1.1–1.14 của
plans/260831-rewrite-chatwoot-laravel/reports/zalo-deep-audit.md.
Ưu tiên theo thứ tự: 1.1 reconnect (listener.start({retryOnClose:true}) + handler 'closed' cho MỌI mã →
post session_lost rồi relogin backoff), 1.2 chống sập (safeAsync + process.on unhandledRejection/
uncaughtException), 1.3 tách lỗi decode khỏi lỗi transport, 1.5 caption, 1.6 /health, 1.7 log PII.
Đọc trước: services/zalo-bridge/node_modules/zca-js/dist/apis/listen.{d.ts,js} (canRetry/close codes).
DoD: node --test services/zalo-bridge/src/*.test.mjs xanh + test mới cho 1.1/1.2/1.5 (giả lập ws close
mã 1006 → có relogin; handler ném lỗi → process còn sống; content {title} → caption ra content);
cập nhật docs/zalo-bridge/webhook-contract.md + deployment.md. KHÔNG restart bridge — phiên chính quyết
thời điểm (phiên Zalo thật của founder đang chạy). Báo cáo: reports/zalo-lo1-notes.md, mẫu Status.
```

**Lô 2 — DRIVER-ĐỊNH DANH**
```
Chỉ sửa app/Services/Zalo/IncomingMessageService.php (+ InboundCardParser nếu cần), 1 migration index
jsonb, tests/Feature/Channels/ZaloChannelTest.php, tests/Fixtures/channels/zalo_*.
Mục 2.1–2.11 của reports/zalo-deep-audit.md. Đọc trước: reports/g1-contact-sync-notes.md §5.2 (mã mẫu +
3 cái bẫy: E.164 bắt buộc, trùng số chặn ở Contact::validationErrors chứ không phải 23505, chỉ điền khi
trống) và reports/g1-inbound-notes.md (đường lưu hiện tại).
Ràng buộc kiến trúc: đặc thù Zalo sống ở driver; KHÔNG sửa ContactInboxWithContactBuilder (đã đúng gốc);
KHÔNG rải if-zalo vào lõi. Contract với Lô 3: đọc alias source_id ở content_attributes->'zalo_source_ids'.
DoD: Pest ZaloChannelTest xanh + test khoá cho: số thiếp người khác KHÔNG vào hồ sơ người gửi; 0901… →
+84901…; số trùng hồ sơ khác → ContactMergeAction; tra lại theo social_zalo_user_id ra ĐÚNG 1 contact khi
xoá/tạo lại inbox; created_at = platform_sent_at; direction=out ⇒ external_echo=true và waiting_since null.
pint + phpstan --memory-limit=1G không tăng lỗi. Báo cáo: reports/zalo-lo2-notes.md.
```

**Lô 3 — CHIỀU RA**
```
Chỉ sửa app/Services/Zalo/SendOnZaloService.php, app/Jobs/SendReplyJob.php, endpoint retry ở
MessagesController, tests/Feature/Channels/ZaloSendTest.php. KHÔNG đụng IncomingMessageService (Lô 2) và
KHÔNG đụng resources/js/**/message/** (Lô 5).
Mục 3.1–3.9 của reports/zalo-deep-audit.md. Ưu tiên 3.1 (lặp mọi attachment, gom source_ids), 3.2 (gửi
filename + content_type thật), 3.3 backend (endpoint retry + dịch mã lỗi), 3.4 (map error_code có cấu trúc).
Contract với Lô 2: GHI content_attributes.zalo_source_ids = mọi source_id bridge trả về.
DoD: Pest ZaloSendTest xanh + test khoá: tin 3 đính kèm → bridge nhận 3 lượt và cả 3 source_id được lưu;
tệp .docx tới bridge kèm tên gốc; bridge trả 503 do thiếu secret → state kênh KHÔNG đổi; retry endpoint đổi
status và dispatch lại. pint + phpstan sạch. Báo cáo: reports/zalo-lo3-notes.md.
```

**Lô 4 — SỰ KIỆN & TRẠNG THÁI**
```
Chỉ sửa app/Services/Zalo/{MessageStateService,RelayEventParser,BridgeEventService,ReactionIcons}.php và
thêm app/Services/Zalo/TypingRelayService.php. KHÔNG đụng IncomingMessageService.
Mục 4.1–4.6 của reports/zalo-deep-audit.md: 4.1 thu hồi phải xoá đính kèm (bọc transaction, giống
destroy_all của gốc); 4.2 reactions lưu {uid, emoji, ts, self}; 4.3 typing nối vào TypingStatusManager của
lõi (queue critical, job delay bắn 'off'); 4.5 lọc isSelf ở biên nhận nhóm.
Thêm accessor backfill undo vào RelayEventParser cho Lô 2 dùng (chỉ đọc content.globalMsgId).
DoD: Pest ZaloChannelTest xanh + test: undo tin có attachment → attachments()->count()=0 và file bị xoá;
A đổi cảm xúc → 1 entry; A gỡ không xoá của B; typing → broadcast đúng conversation rồi tự tắt.
4.6 KHÔNG sửa — chỉ ghi cách đo. Báo cáo: reports/zalo-lo4-notes.md.
```

**Lô 5 — UI CHAT & KÊNH**
```
Chỉ sửa resources/js/dashboard/components-next/message/**, …/Conversation/ConversationCard/**,
…/Contacts/ContactsSidebar/**, lang/{en,vi}/** (+ artisan i18n:generate). KHÔNG đụng app/**.
Mục 5.1–5.8 của reports/zalo-deep-audit.md. Nguồn gốc đối chiếu: refs/chatwoot Message.vue (nhánh
externalEcho) và MessageMeta.vue (bảng tick theo channelType).
Ràng buộc: i18n chỉ qua lang/{locale}/*.php + i18n:generate (không JSON locale riêng); mọi lệch có chủ đích
so với Chatwoot phải ghi vào reports/ux-deviations.md kèm cách pixel-mask; phong cách flat, Lucide, không
emoji làm icon, 150–200ms.
DoD: vitest xanh (+ test: direction out → variant AGENT không phải Bot; status read → ✓✓ xanh; card có icon
kênh; panel phải không hiện dòng rỗng); tsc --noEmit sạch; npm run build xanh; i18n:generate --check khớp.
Báo cáo: reports/zalo-lo5-notes.md.
```

**Lô 6 — PHIÊN & INBOX**
```
Chỉ sửa app/Models/Channel/Zalo.php, app/Services/Zalo/{QrLoginService,ZaloBridgeClient}.php,
app/Jobs/Zalo/**, app/Http/Resources/InboxResource.php, resources/js/dashboard/settings/inboxes/**,
routes/web_api.php. KHÔNG đụng services/zalo-bridge/** (Lô 1 sở hữu) — phần bridge của 6.3 ghi thành đề
xuất cho Lô 1.
Mục 6.1–6.12 của reports/zalo-deep-audit.md. Ưu tiên 6.1 (xoá inbox ⇒ logout bridge), 6.5 (health sweep
job), 6.2 (reauthorization_required qua contract lõi, KHÔNG if-zalo), 6.4 (409 trùng tài khoản), 6.6–6.8 (UX
wizard/QR/ngắt kết nối).
DoD: Pest + test: xoá inbox Zalo → gọi logout (fake client) dù bridge chết; state connected mà health hỏng 3
lần → session_lost; quét tài khoản đã gắn inbox khác → 409 có thông điệp chỉ rõ inbox; vitest cho panel QR
(hết hạn, đã quét, bridge chết). 6.12 CHỜ founder. Báo cáo: reports/zalo-lo6-notes.md.
```

**Lô 7 — TEST & CI**
```
Chạy SAU Lô 1. Sửa .github/workflows/*.yml, docs/zalo-bridge/schema/**, tests/Fixtures/channels/zalo/real/**,
services/zalo-bridge/package.json và tách inbound-descriptor.mjs / inbound-payload.mjs khỏi index.mjs
(chuyển nguyên hàm, KHÔNG đổi logic).
Mục 7.1–7.8 của reports/zalo-deep-audit.md. 7.1 là ưu tiên số 1 (CI đang bỏ lọt 730 vitest + 61 test bridge
+ tsc — ghi nhớ build-verify-gate-frontend).
Fixture golden phải CHE PII (uid → 9876543210, tên → "Khách A", avatar → cdn.zalo.test) và có _source.
DoD: CI xanh trên nhánh; mọi fixture zalo_* validate được theo schema mới; test bảng cho parseInboundDescriptor
với ≥8 loại content thật. Báo cáo: reports/zalo-lo7-notes.md.
```

**Lô 8 — BẢO MẬT & VẬN HÀNH**
```
Chạy SAU Lô 1 (phần bridge). Sửa app/Support/SafeHttp.php, AttachmentsController.php,
RemoteAttachmentDownloader, routes/web.php, config/queue.php, deploy.sh, docs, và che PII trong
plans/**/reports/*evidence*.
Mục 8.1–8.14 của reports/zalo-deep-audit.md. Ưu tiên: 8.11 (che PII TRƯỚC khi commit), 8.6 (stream đính kèm
+ cap kích thước — đang là đường mất tin của khách), 8.1 (mã hoá cookie phiên), 8.2 (so personal_uid),
8.7/8.8 (chốt cấu hình worker + ghi luật queue:restart vào brief).
KHÔNG dựng lại gate hạn mức (ghi nhớ quota-gate-removed) — 8.13 chỉ ghi chú.
DoD: Pest xanh + test: tệp 60MB → tin vẫn tạo kèm external_error, không OOM; webhook có personal_uid lệch →
bị bỏ và ghi log; signed URL hết hạn → 403. grep uid thật trong plans/**/reports = 0.
Báo cáo: reports/zalo-lo8-notes.md.
```

---

## Cần founder quyết (đổi hành vi sản phẩm — agent KHÔNG tự làm)

| # | Câu hỏi | Bối cảnh | Lựa chọn |
|---|---|---|---|
| Q1 | **`lock_to_single_conversation = true` mặc định cho inbox Zalo?** | App Zalo là "1 người = 1 luồng vĩnh viễn"; Chatwoot mặc định mở hội thoại mới sau khi resolve. SME sẽ thấy 1 khách có nhiều luồng | (A) bật mặc định ở driver (`Zalo::INBOX_DEFAULTS`), người dùng đổi được trong Settings · (B) giữ như Chatwoot (data-integrity:9) |
| Q2 | **Người lạ nhắn Zalo = "Liên hệ nháp" hay "Lead"?** | `Contact.php:298` hiện thăng `lead` ngay khi có social details — trái luật CLAUDE.md #2 | (A) đổi glossary, giữ ngữ nghĩa Chatwoot · (B) chỉ thăng lead khi có phone/email hoặc agent bấm "Xác nhận nhu cầu" (sửa duy nhất ở `syncContactAttributes`) (contact-identity:8) |
| Q3 | **Tin nhóm Zalo xử lý thế nào?** | Hiện cả nhóm thành MỘT "khách hàng", người gửi thật bị bỏ, nhóm được thăng Lead, mentions rơi | (A) mỗi nhóm = 1 hội thoại, người gửi hiện trong bong bóng (`sender_uid` bridge đã gửi) · (B) tách hồ sơ theo người gửi · (C) tạm ẩn tin nhóm khỏi inbox (contact-identity:4, inbound-kinds:7, data-integrity:8) |
| Q4 | **Thu hồi hai chiều?** | Xoá tin từ Yona hiện chưa port; Zalo có API thu hồi | (A) chỉ xoá cục bộ như gốc, "Thu hồi trên Zalo" là hành động RIÊNG của driver · (B) không làm (data-integrity:14) |
| Q5 | **Agent thả cảm xúc ra Zalo từ dashboard?** | Hiện chỉ hiển thị một chiều; bridge có API | (A) có (mở rộng ngoài gốc) · (B) chỉ đọc (g1-inbound-notes) |
| Q6 | **Định nghĩa "tin chủ động"** | Hiện = không có tin khách trong 24h ⇒ chặn cả trả lời muộn cho khách thật | (A) giữ · (B) chỉ áp cho tin gửi hàng loạt/automation, tin agent gõ tay không tính (outbound:9) |
| Q7 | **Lời mời kết bạn kèm lời nhắn (`friend_event` REQUEST)** | Đang bị vứt ⇒ mất lead từ người lạ | (A) tạo Liên hệ nháp + hội thoại · (B) chỉ thông báo, không tạo hồ sơ (contact-identity:5) |
| Q8 | **Hàng biểu cảm dưới bong bóng (đã làm, ngoài gốc Chatwoot)** | Cần xác nhận giữ + pixel-diff loại trừ `[data-yona-reactions]` | (A) giữ · (B) gỡ (g1-inbound-notes §6) |

---

## Phụ lục A — Finding bị LOẠI

| Gốc | Lý do loại |
|---|---|
| relay-events:1 (phần "PID 957169 là consumer duy nhất chạy code cũ") | Sai theo thời điểm hiện tại: `ps` lúc 07/09 ~01:55 cho thấy PID 957169 **không còn**; đang chạy PID 1209844 (`queue:work redis`, khởi động 01:22:49) + PID 13283 (`queue:listen`). Giữ lại phần nội dung còn đúng dưới dạng mục vận hành **8.8** (hạ xuống 🟡) |
| tests-coverage:11 (phần "tên Haikunator") | Mô tả lỗi thời: `app/Support/Haikunator.php` **đã bị xoá** trong diff hiện tại, thay bằng `app/Support/AnonymousName.php` + `RenameAnonymousContacts`. Phần còn đúng ("hồ sơ tạo qua backfill giữ tên ẩn danh vĩnh viễn") đã gộp vào **2.3** |
| relay-events:4 (chatty lane đi tắt outbox, sự kiện tới trước tin bị DROP im lặng) | Không còn tác động thực sau bản sửa của agent relay: toàn bộ đường xử lý đã idempotent (dedupe `source_id`, biên nhận chỉ nâng, reaction so trước khi ghi, undo bỏ qua tin đã `deleted`), nên sự kiện tới sớm bị bỏ sẽ được lô backfill/`old_reactions` bù. Chi phí sửa (làm chatty lane durable) lớn hơn lợi ích; giữ **4.4** để bù phần `old_reactions` |

## Phụ lục B — Finding bị HẠ MỨC hoặc sửa mô tả

| Gốc | Mức cũ → mới | Lý do (nguồn kiểm chứng) |
|---|---|---|
| security:3 (route `/attachments/{id}/{filename}`) | 🟠 → 🟡 (mục 8.3) | Đọc `app/Models/Attachment.php:169,190`: đường dẫn trên đĩa là `hashName()`/`Str::random(40)` ⇒ không đoán được. Kẻ tấn công phải biết đúng `id` **và** tên tệp gốc; `AttachmentsController::show` đã `abort_unless($attachment->filename === $filename)`. Vẫn nên ký URL nhưng không phải "tệp mọi tenant truy được" |
| relay-events:1 | 🟠 → 🟡 (mục 8.8) | Xem phụ lục A |
| relay-events:10 (`deleteMsg` trong undo) | ⚪ giữ, **không xếp lô** (4.6) | confidence 0.35, thuần suy đoán về hành vi Zalo. Phải bắt payload thật một lần rồi mới quyết — sửa mù có thể làm hỏng đường undo đang chạy đúng |
| security:13 (undo/reaction bỏ qua `threadId`) | ⚪ giữ, không xếp lô | confidence 0.4; giả định "Zalo không kiểm quyền sở hữu msgId" chưa được kiểm chứng. Đo trước |
| inbound-kinds:10 (metadata media HD/thumb/duration) | ⚪ giữ, không xếp lô | confidence 0.5; ảnh hưởng thẩm mỹ, chi phí sửa nằm ở bridge + lõi attachment meta. Để sau khi Lô 1 ổn định |

## Phụ lục C — Đã được sửa trong worktree hiện tại (không báo lại)

Kiểm bằng `git diff --stat` + đọc mã: đính kèm gắn **trước** `save()` (payload `message.created` đã có tệp);
dedupe `source_id` theo **inbox** và tra trước khi resolve hội thoại; `chat.undo` trong backfill không dựng lại
tin; 4 thẻ Zalo (danh thiếp/ngân hàng/nhắc hẹn/cuộc gọi) + 4 bong bóng; `RelayEventParser` bóc đúng tầng
envelope zca (seen/delivered/reaction/undo); biên nhận đi qua model nên phát realtime và **chỉ nâng**;
`ReactionIcons` 55 mã; `InReplyToMessageBuilder` + `ensureInReplyTo` (thiếu ở LÕI, ảnh hưởng mọi kênh);
quy `cliMsgId` → `source_id` cho trích dẫn hai chiều; `AvatarContentType` (nhận `image/jpg`, kiểm theo byte,
không khoá hash khi hỏng); Twilio `updateContactNameIfNeeded`; thời gian tương đối tiếng Việt +
`distanceToNowInEnglish` cho dạng rút gọn; `AnonymousName` thay `Haikunator`;
`buildAllowedHosts` nhận thêm host của `LARAVEL_BASE_URL`.

---

```
Status: DONE_WITH_CONCERNS
Summary: Đã phản biện 126 finding bằng cách đọc thẳng file:dòng và diff của 3 agent vừa sửa — gộp còn 82 mục,
loại hẳn 1, viết lại/hạ mức 5 — rồi chia thành 8 lô có ranh giới file rời nhau, xếp thành 3 sóng (tối đa 3 lô
song song) kèm prompt và DoD cho từng lô; rủi ro lớn nhất được xác nhận bằng mã nguồn là bridge không bao giờ
tự nối lại WS (listener.start() thiếu retryOnClose) và không có chốt chống sập toàn cục.
Concerns:
- Lô 1 cần CỬA SỔ RESTART BRIDGE: phiên Zalo thật của founder đang chạy trên :3710, mọi bản sửa bridge chỉ có
  hiệu lực sau restart.
- Trước mỗi lượt nghiệm thu phải `php artisan queue:restart`: worker `queue:work` (PID 1209844, khởi động
  01:22) giữ code cũ trong RAM, đây là lý do kết quả trên Zalo thật trông "lúc được lúc không".
- 8 câu hỏi cần founder quyết đang khoá tay Lô 6 (mục 6.12) và một phần Lô 2 (ngữ nghĩa Lead) — hỏi trước khi
  spawn sóng 2.
- Mục 8.11: file bằng chứng trong plans/reports đang chứa uid/tên/nội dung tin của người thật và chưa che —
  nên xử lý TRƯỚC lần commit tới.
- Ba mục confidence thấp (relay-events:10, security:13, inbound-kinds:10) cố ý không xếp lô: cần đo payload
  thật trước, sửa mù dễ làm hỏng đường đang chạy đúng.
```
