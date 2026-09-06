# Bằng chứng lỗi inbound Zalo (phiên chính, 07/09/2026 00:30)

## 1. Backfill sau restart bridge tạo tin trùng sang hội thoại khác
- Bridge restart (đổi .env) → `restored session connection_id=6` → `old_messages batch 9 items, 9 enqueued`.
- 9 tin cũ thuộc hội thoại 132 (đã resolved) nhưng được ghi lại thành 7 tin mới (id 749–755) trong hội thoại 138 (đang mở, cùng contact_inbox) — vì `IncomingMessageService` dedupe `source_id` bằng `$conversation->messages()->where('source_id', …)` (chỉ hội thoại hiện tại). Gốc Chatwoot dedupe theo inbox (`inbox.messages.find_by(source_id:)`, ví dụ `Whatsapp::IncomingMessageBaseService#find_message_by_source_id`).
- Tin undo backfill vào với content "[Tin nhắn]" (id 751) — tin đã thu hồi không nên tạo lại.
- Đã xoá 749–755 bằng tay sau khi ghi nhận (bảng dưới).

```
749|8233978780092|
750|8233984128820|Cảm ơn em, cho anh xin link đă
751|8233985727518|[Tin nhắn]
752|8233983086020|Chào em, anh muốn hỏi giá gói 
753|8233988836407|
754|8233981086706|Chào anh, em là nhân viên hỗ t
755|8233983384565|Dạ có ạ. Gói Team 299k/tháng, 
```

## 2. Đính kèm không hiện realtime
- Khách gửi ảnh → message 734 tạo, `message.created` phát ngay khi `save()` (listener broadcast), `attachMedia()` chạy SAU → payload realtime không có `attachments` → FE `shouldRenderMessage` false, bong bóng không hiện tới khi reload (reload thấy ảnh `attachments/65`).
- Gốc: `Messages::MessageBuilder` / `Whatsapp::IncomingMessageBaseService` gắn attachment TRƯỚC `save` (hoặc trong cùng transaction rồi mới `after_create_commit`).

## 3. Chiều ra ảnh: bridge `fetch_host_not_allowed`
- `APP_URL=http://localhost:8000` → `data_url` đính kèm là `localhost`, allowlist bridge mặc định = host của `LARAVEL_WEBHOOK_URL` (127.0.0.1). Message 748 `status=3`, `external_error: "Bridge lỗi HTTP 500: fetch_host_not_allowed"`.
- Đã sửa env dev: `BRIDGE_FETCH_HOST_ALLOWLIST=localhost,127.0.0.1` trong `services/zalo-bridge/.env` → gửi lại OK (message 757 có source_id).
- Cần: ghi vào `docs/zalo-bridge/deployment.md` + `.env.example` của bridge + hướng dẫn founder trong `g1-notes.md`; hoặc bridge tự thêm host của `LARAVEL_BASE_URL` vào allowlist (hiện chỉ lấy host webhook).

## 4. Ma trận loại tin Zalo (khách gửi từ chat.zalo.me → hội thoại 138, account 3) — 07/09 00:30–00:45
| Loại | Message id | Lưu thế nào | Yona hiển thị | Kết luận |
|---|---|---|---|---|
| Text | 736 | content | bong bóng | PASS |
| Sticker | 696 (conv 132) | `content_type=sticker` + attachment image external_url (sau g1-sticker-fix) | ảnh sticker | PASS |
| Ảnh | 734 (conv 132) | attachment image tải về | hiện sau reload, KHÔNG realtime (mục 2) | FAIL realtime |
| GIF | 780 | attachment image ext gif | hiện GIF | PASS |
| File .txt | 772 | attachment file (file_type 3) | bong bóng tệp + Tải xuống | PASS |
| Link trong text | 781 | content | link bấm được | PASS |
| Text in đậm | 787 | content thuần (mất định dạng) | text thường | CHẤP NHẬN (ghi chú) |
| Trả lời trích dẫn | 718 (conv 132) | `content_attributes.quote` (msg_id = cliMsgId) | KHÔNG có khối trích dẫn | FAIL (relay-fix) |
| Danh thiếp (business_card) | 768 | content null + `content_attributes.business_card {name,title,thumbnail,…}` | KHÔNG render (giống sticker trước khi sửa) | FAIL |
| Nhắc hẹn (reminder) | 763 + 764 | 763: content "[Link] ⏰ Hẹn gọi… https://res-zalo…reminder…png" + `content_attributes.zca_message.content{title,description,href}`; 764: text "Phước Lộc tạo nhắc hẹn mới … - 00:49." | link thô + 1 dòng text | FAIL hiển thị (nên là thẻ nhắc hẹn: tiêu đề + thời gian, giống Zalo) |
| Thẻ tài khoản ngân hàng (bank_card) | — | Zalo web bấm chọn tài khoản không gửi được (đã thử 3 lần) | chưa test | Bridge có `inbound_kind: bank_card` + `bank_card{bank_name, account_number, logo_url, qr}` (`inbound-content.mjs`), nhánh main có `bank-card-message.tsx` — port render + test fixture |
| Video / audio / call / location | — | không gửi được từ Zalo web trong phiên này | chưa test | test bằng fixture theo `docs/zalo-bridge/webhook-contract.md` |
| Reaction / undo / seen / delivered | 713, 718 | không áp dụng (payload shape) | — | FAIL (relay-fix đang sửa) |

Nguyên tắc sửa: driver Zalo map về contract lõi Chatwoot khi có (sticker→content_type sticker+attachment; file/ảnh/gif/video/audio→attachment đúng file_type; quote→in_reply_to). Loại Zalo-đặc-thù không có trong lõi (business_card, bank_card, reminder, call) → `content_type` riêng hoặc `content_attributes` chuẩn hoá + component render trong `components-next/message/bubbles/` theo mẫu Chatwoot (Instagram story, WhatsApp location/contacts…), KHÔNG `if channel === zalo` rải trong lõi; preview card danh sách phải có nhãn ("[Danh thiếp]", "[Tài khoản ngân hàng]", "[Nhắc hẹn]").

## 5. Bổ sung 07/09 01:05 — founder gửi từ điện thoại Zalo (conv 138)
| Loại | Message id | Lưu | Kết luận |
|---|---|---|---|
| Thẻ tài khoản ngân hàng ×2 (VietinBank, Liobank) | 827, 828 | `content="[Tài khoản ngân hàng]"`, `content_attributes = []`, không attachment | Bridge đã gắn nhãn (`bank_card_source.label`) và có `enrichBankCard` → `bank_card{...}` nhưng driver `IncomingMessageService::contentAttributes()` chỉ giữ `sticker/business_card/call` → **mất dữ liệu thẻ** (số TK, ngân hàng, QR). Phải lưu `bank_card` + render thẻ có nút sao chép số. |
| Vị trí (location) | — | **không có bản ghi** | Bridge KHÔNG xử lý `chat.location` (grep `location` trong `inbound-content.mjs`/`index.mjs` = 0). Chatwoot lõi có attachment `file_type: location` (`coordinates_lat/long`, `fallback_title`, bubble bản đồ) → map thẳng vào contract lõi, không cần bubble riêng. |
| Nhắc hẹn tới giờ | 804 | lại một tin "[Link] ⏰ …png" | Zalo bắn tin nhắc khi tới giờ hẹn → cùng cách render thẻ nhắc hẹn. |
| Khách đang gõ (typing) | — | không hiện gì ở Yona | `BridgeEventService`: `'typing' => null`. Chatwoot lõi có `Conversations::TypingStatusManager` + event `conversation.typing_on/off` → map relay `typing` (payload[0].data / isSelf=false) vào đó để agent thấy "đang nhập…" như Chatwoot làm với widget. |

## 6. Hình dạng thật của tin VỊ TRÍ (07/09 02:30, message 878 backfill)
`zca_message.msgType = "chat.location.new"`, `content = { title: null, description: "<địa chỉ dạng chữ, có dấu>", href: null, thumb: null, action: null, params: "{\"isUserLocation\":1,\"srcId\":\"0\",\"latitude\":<số>,\"longitude\":<số>}", type: null }`. Toạ độ nằm trong CHUỖI JSON `content.params` (phải `JSON.parse`), địa chỉ ở `content.description`. Map vào lõi: attachment `file_type=location`, `coordinates_lat/long`, `fallback_title = description`. (Toạ độ thật không ghi vào repo.)
- **Lệch parser lô 1 (kiểm 02:32):** `services/zalo-bridge/src/index.mjs:1128` so `msgType === 'chat.location'` (thật: `chat.location.new`, và zca `utils.js:445` cũng dùng `chat.location.new`); `parseInboundLocation` (`inbound-content.mjs:361`) đọc `obj.latitude` ở tầng ngoài trong khi toạ độ nằm trong `content.params` (chuỗi JSON). Cần: chấp nhận `chat.location` và `chat.location.new`; parse `params` như `parseBankCardSource` đã làm (`inbound-content.mjs:96-99`); `address = description`. Test fixture theo hình dạng §6.
- **Nợ từ lô 1b → lô 4/5:** `app/Services/Zalo/ZaloOutboundActions.php` (lô 4 đang viết) phải gửi `thread_type` (0 user / 1 group) cho reaction/undo/typing, nếu không tin nhóm gọi nhầm endpoint Zalo.
