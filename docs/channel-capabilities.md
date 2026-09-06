# Chuẩn năng lực kênh tin nhắn (Channel Capability Contract)

> Lệnh founder 07/09/2026: mọi kênh tin nhắn tích hợp vào Yona tuân MỘT bộ năng lực chung. Kênh khai báo hỗ trợ gì; kênh không hỗ trợ thì lõi/UI ẩn đi, không lỗi; kênh đã khai báo hỗ trợ thì **phải hoạt động đúng** và có contract test chứng minh. Đây là rule chuẩn cho mọi kênh hiện có (Zalo cá nhân, Website, API, Email, Telegram, LINE, WhatsApp, SMS, Facebook, Instagram, TikTok) và kênh sau này.

## 1. Nguyên tắc
1. **Lõi trung tính, driver khai báo.** Lõi (Conversation/Message/Contact, UI chat) không biết tên kênh. Mọi rẽ nhánh theo kênh đi qua `Capability`, không qua `channel_type` (cấm `if channel === 'zalo'` trong lõi; kể cả `INBOX_FEATURE_MAP` hardcode theo loại kênh của Chatwoot gốc phải thay bằng khai báo từ backend).
2. **Một nguồn khai báo duy nhất**: model kênh (`app/Models/Channel/*`) trả về `CapabilitySet`. `Inbox::supports(Capability)` là cửa duy nhất để hỏi. `InboxResource` lộ `capabilities` cho FE; FE chỉ đọc từ đó.
3. **Hỗ trợ = phải đúng.** Kênh khai báo năng lực X thì phải qua bộ contract test của X (fixture đúng hình dạng payload thật) và nghiệm thu trên trình duyệt. Khai báo mà không có test = CI đỏ.
4. **Không hỗ trợ = không hiện.** UI không hiện nút/ô cho năng lực kênh không có; API trả 422 có mã lỗi rõ (`capability_not_supported`) nếu bị gọi.
5. **Đặc thù kênh sống ở driver/adapter** (bridge, service kênh, bubble riêng); dữ liệu đặc thù đi qua `content_attributes` với khoá chuẩn hoá do chuẩn này đặt tên, không dùng tên riêng của nền tảng ở lõi.
6. **Thêm kênh = thêm driver + khai báo + fixture**, không sửa lõi.

## 2. Bộ năng lực (enum `App\Channels\Capability`)
Giá trị là chuỗi snake_case ổn định, dùng chung backend/FE/webhook.

### 2.1 Nội dung tin đến (inbound)
| Capability | Ý nghĩa | Lưu trong lõi |
|---|---|---|
| `inbound_text` | văn bản thuần | `content` |
| `inbound_rich_text` | định dạng (đậm/nghiêng/danh sách) | `content` markdown |
| `inbound_image` | ảnh (kể cả nhiều ảnh/1 tin) | attachments `image` |
| `inbound_gif` | ảnh động | attachments `image` (ext gif) |
| `inbound_video` | video | attachments `video` |
| `inbound_audio` | tin thoại/âm thanh | attachments `audio` |
| `inbound_file` | tệp | attachments `file` (tên tệp thật) |
| `inbound_sticker` | sticker/emoji lớn | `content_type=sticker` + attachment image |
| `inbound_location` | vị trí | attachment `location` (`coordinates_lat/long`, `fallback_title`) |
| `inbound_contact_card` | danh thiếp | `content_attributes.contact_card {name, phone?, avatar_url, external_id}` + `content` nhãn |
| `inbound_bank_card` | thẻ tài khoản ngân hàng | `content_attributes.bank_card {bank_name, bank_bin, account_number, account_holder?, qr_url?}` |
| `inbound_reminder` | nhắc hẹn/lịch | `content_attributes.reminder {title, at, href?}` (cả lúc tạo và lúc tới giờ) |
| `inbound_call_log` | cuộc gọi thoại/video (nhỡ/đã gọi/thời lượng) | `content_attributes.call {kind, status, duration}` |
| `inbound_link_preview` | link kèm preview | `content` + `content_attributes.link_preview {url,title,description,image}` |
| `inbound_caption` | chú thích kèm media | `content` của cùng message chứa attachment (KHÔNG tách 2 tin) |
| `inbound_forward` | tin chuyển tiếp | `content_attributes.forwarded_from` |

### 2.2 Nội dung tin đi (outbound)
| Capability | Ý nghĩa | Yêu cầu tối thiểu |
|---|---|---|
| `outbound_text` | gửi văn bản | Unicode/emoji nguyên vẹn |
| `outbound_image` / `outbound_video` / `outbound_audio` / `outbound_file` | gửi media | **mọi** đính kèm của tin đều được gửi; tên tệp + content-type thật; mỗi phần gửi có `source_id` riêng lưu `content_attributes.external_source_ids[]` |
| `outbound_sticker` | gửi sticker | — |
| `outbound_location` / `outbound_contact_card` | gửi vị trí/danh thiếp | — |
| `outbound_reply_to` | trả lời trích dẫn | `content_attributes.in_reply_to` (id nội bộ) ↔ id ngoài |
| `outbound_mention` | nhắc tên trong nhóm | — |
| `outbound_reaction` | agent thả cảm xúc ra kênh | `POST …/messages/{id}/reactions` |
| `outbound_recall` | thu hồi tin đã gửi ở kênh (hai chiều) | tin đánh dấu `deleted` ở lõi + thu hồi ở kênh; thất bại phải báo |
| `outbound_edit` | sửa tin đã gửi | — |
| `outbound_typing` | báo agent đang gõ | — |
| `outbound_read_receipt` | báo đã đọc cho khách | — |
| `outbound_retry` | thử lại tin thất bại | mọi kênh có `outbound_*` **bắt buộc** có: lý do lỗi có cấu trúc (`content_attributes.external_error {code, message}`) + endpoint retry |

### 2.3 Sự kiện đến (inbound events)
| Capability | Ý nghĩa | Lõi |
|---|---|---|
| `event_delivered` | đã giao | `status: delivered` (chỉ nâng, không hạ) |
| `event_seen` | đã xem | `status: read` |
| `event_reaction` | khách thả/gỡ cảm xúc | `content_attributes.reactions[] {emoji, by: external_id, at}` |
| `event_recall` | khách thu hồi | `content_attributes.deleted=true`, xoá attachments |
| `event_edit` | khách sửa tin | `content` mới + lịch sử |
| `event_typing` | khách đang gõ | `TypingStatusManager` → `conversation.typing_on/off` |
| `event_presence` | online/offline | `contact.availability` |

### 2.4 Định danh & hồ sơ
| Capability | Ý nghĩa |
|---|---|
| `profile_name` / `profile_avatar` / `profile_phone` / `profile_email` | trường kênh có thể cung cấp; điền khi trống, không đè tên agent sửa tay; avatar tải về qua `AvatarFromUrlJob` |
| `profile_refresh` | kênh báo khách đổi tên/avatar → cập nhật |
| `identity_stable_id` | id ngoài ổn định (uid) → `contact_inboxes.source_id`; cùng id trên nhiều inbox cùng account = 1 contact |
| `group_threads` | tin nhóm: nhóm = 1 hội thoại, mỗi tin mang `sender {external_id, name, avatar}` hiện trên bong bóng, mention hoạt động |
| `friend_request` | lời mời kết bạn/tin chờ → tạo Liên hệ nháp + hội thoại |

Luật lõi (không phụ thuộc kênh): người lạ = **Liên hệ nháp**; chỉ thăng **Lead** khi có SĐT hoặc email (từ hồ sơ kênh hoặc agent nhập); chống trùng theo SĐT chuẩn E.164 qua `ContactMergeAction`.

> Cài đặt: `App\Models\Contact::syncContactAttributes()`. **Lệch có chủ đích với Chatwoot gốc** (`app/models/contact.rb#set_contact_type` thăng lead khi `additional_attributes` có bất kỳ khoá `social_*`): uid kênh không gọi/gửi thư được nên chưa phải "đã xác nhận nhu cầu". Hàm chỉ NÂNG hạng — agent vẫn chuyển tay được qua `contact_type`.

### 2.5 Hội thoại & phiên
| Capability | Ý nghĩa |
|---|---|
| `threading_history` | hội thoại mới sau resolve (như Chatwoot); panel phải hiện chuỗi hội thoại trước của khách (mọi inbox), bấm là chuyển; không nối luồng chat (founder chốt 07/09) |
| `messaging_window` | nền tảng tự áp cửa sổ trả lời (WhatsApp/Facebook 24h) → lõi hiện cảnh báo + template; **Yona không tự đặt giới hạn tin chủ động** (quyết định 07/09: bỏ cửa sổ giờ/trần ngày) |
| `session_qr` / `session_token` / `session_oauth` | cách kết nối |
| `session_reauth` | kênh có thể mất phiên → banner "kết nối lại" ở inbox **và** icon ở sidebar kênh (như Chatwoot `reauthorization_required`) |
| `session_disconnect` | có hành động ngắt kết nối/đổi tài khoản, xoá inbox phải đăng xuất ở adapter |
| `health` | trạng thái sống của adapter hiện trên inbox |

## 3. Contract kỹ thuật
**Backend**
```php
enum Capability: string { case InboundText = 'inbound_text'; /* … theo §2 */ }
interface DeclaresCapabilities { public function capabilities(): CapabilitySet; }
// Channel\Zalo implements DeclaresCapabilities; Inbox::supports(Capability $c): bool
// InboxResource: 'capabilities' => $inbox->capabilities()->values()
// API ghi: abort_unless($inbox->supports(Capability::OutboundReaction), 422, 'capability_not_supported')
```
- `CapabilitySet` bất biến, có `has()`, `values()`, `merge()`; driver có thể khai báo theo cấu hình (ví dụ WhatsApp provider) nhưng phải quyết định lúc đọc model, không lúc gửi.
- Webhook/Platform API trả `capabilities` trong payload inbox để tích hợp bên ngoài biết.

**Frontend**
- `useInboxCapabilities(inbox)` → `supports('outbound_reply_to')`; component gate: `<IfSupports cap="outbound_reaction">`.
- Thay toàn bộ `INBOX_FEATURE_MAP`/`inboxHasFeature` theo `channel_type` bằng hook này. Cấm `inbox.channel_type === …` cho mục đích bật/tắt tính năng (chỉ được dùng để chọn icon/nhãn kênh).
- Bubble đặc thù (`bubbles/*Card.tsx`) chọn theo khoá `content_attributes` chuẩn (§2.1), không theo kênh.

**Test (contract test chung)**
- `tests/Contracts/Channels/` có một trait/case cho mỗi capability (ví dụ `InboundImageContract`, `OutboundAttachmentsContract`, `EventSeenContract`, `GroupThreadsContract`). Mỗi kênh có `tests/Feature/Channels/<Kênh>CapabilitiesTest.php` tự động chạy đúng các contract mà driver khai báo, với fixture đặt tại `tests/Fixtures/channels/<kênh>/<capability>.json` **trích từ payload thật (ẩn PII)**.
- Test khung: `CapabilityDeclarationTest` — với mọi kênh, mọi capability khai báo phải có fixture; capability không khai báo mà fixture tồn tại = cảnh báo.
- Pixel/e2e: harness kênh chỉ chạy kịch bản theo năng lực khai báo.

## 4. Ma trận khai báo ban đầu (✓ hỗ trợ · ○ có thể nhưng chưa làm · – nền tảng không có)
| Capability | Zalo cá nhân | Website | API | Email | Telegram | LINE | WhatsApp | SMS | Facebook | Instagram | TikTok |
|---|---|---|---|---|---|---|---|---|---|---|---|
| inbound_text/image/file | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓/○/– | ✓ | ✓ | ✓ |
| inbound_gif/video/audio | ✓ | ✓ | ✓ | ✓ (đính kèm) | ✓ | ✓ | ✓ | – | ✓ | ✓ | ○ |
| inbound_sticker | ✓ | – | ○ | – | ✓ | ✓ | ✓ | – | ✓ | ✓ | – |
| inbound_location | ✓ | – | ○ | – | ✓ | ✓ | ✓ | – | ○ | – | – |
| inbound_contact_card | ✓ | – | ○ | – | ✓ | – | ✓ | – | – | – | – |
| inbound_bank_card / reminder / call_log | ✓ | – | – | – | – | – | – | – | – | – | – |
| inbound_caption | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | – | ✓ | ✓ | ✓ |
| outbound_text | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| outbound_image/video/audio/file (đủ mọi đính kèm) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ○ (MMS) | ✓ | ✓ | ○ |
| outbound_reply_to | ✓ | ✓ | ✓ | ✓ (quote) | ✓ | – | ✓ | – | ✓ | ✓ | ✓ |
| outbound_reaction | ✓ (Q5) | – | ○ | – | ✓ | – | ✓ | – | ✓ | ✓ | – |
| outbound_recall | ✓ (Q4) | ○ | ○ | – | ✓ | – | ✓ | – | ✓ | ✓ | – |
| outbound_edit | – | ○ | ○ | – | ✓ | – | – | – | – | – | – |
| outbound_typing | ✓ | ✓ | – | – | ✓ | – | ✓ | – | ✓ | ✓ | – |
| outbound_retry | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| event_delivered / event_seen | ✓ | ✓ | ○ | – | – | ✓ (seen) | ✓ | ✓ (delivered) | ✓ | ✓ | – |
| event_reaction | ✓ | – | ○ | – | ✓ | – | ✓ | – | ✓ | ✓ | – |
| event_recall | ✓ | – | ○ | – | ✓ | – | ✓ | – | ✓ | ✓ | – |
| event_typing | ✓ | ✓ | – | – | – | – | – | – | ✓ | ✓ | – |
| profile_name / avatar | ✓ | ○ (pre-chat) | ✓ | ✓ (tên) | ✓ | ✓ | ✓ | – | ✓ | ✓ | ✓ |
| profile_phone / email | ○ danh thiếp/– | pre-chat | ✓ | –/✓ | – | – | ✓/– | ✓/– | – | – | – |
| identity_stable_id | ✓ uid | ✓ token | ✓ identifier | ✓ email | ✓ | ✓ | ✓ số | ✓ số | ✓ psid | ✓ | ✓ |
| group_threads | ✓ (Q3) | – | ○ | – (CC) | ✓ | ✓ | ✓ | – | – | – | – |
| friend_request | ✓ (Q7) | – | – | – | – | ✓ (follow) | – | – | – | – | – |
| threading_history | ✓ (Q1) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| messaging_window | – | – | – | – | – | – | ✓ 24h | – | ✓ 24h | ✓ 24h | ✓ |
| session_qr / token / oauth | qr | – | – | token | token | token | token/oauth | token | oauth | oauth | oauth |
| session_reauth / disconnect / health | ✓/✓/✓ | – | – | ✓/○/○ | ○ | ○ | ✓/○/○ | – | ✓/○/○ | ✓/○/○ | ✓/○/○ |

Ô "○" là nợ có tên: driver KHÔNG được khai báo cho tới khi có test + nghiệm thu. Ma trận này là tài liệu sống; thay đổi phải đi cùng thay đổi khai báo trong code (test `CapabilityDeclarationTest` so khớp bảng này bằng snapshot).

### 4.1 Chênh lệch đã kiểm chứng với code (đợt lõi, 07/09/2026)

Ma trận §4 mô tả **nền tảng làm được gì**; khai báo trong code chỉ nhận **cái đã chạy thật hôm nay**
(snapshot: `tests/Contracts/Channels/capability-matrix.snapshot.json`). Các ô sau đang ✓ ở bảng trên nhưng
KHÔNG được khai, vì đọc code thấy chưa có đường thực thi — mỗi dòng là một nợ có tên:

| Năng lực | Ô ✓ ở §4 | Sự thật trong code | Đóng ở lô nào |
|---|---|---|---|
| `outbound_retry` | mọi kênh trừ Zalo | Zalo ĐÃ đóng (lô 3: `POST …/messages/{id}/retry`); các kênh khác chưa có endpoint retry | theo kênh |
| `outbound_reaction` / `outbound_recall` | Telegram, WhatsApp, FB, IG | Zalo ĐÃ đóng (lô 4: `POST`/`DELETE …/messages/{id}/reactions`, `DELETE …/messages/{id}` thu hồi hai chiều) | theo kênh |
| `outbound_edit` | Zalo (Q4/Q5), Telegram, WhatsApp, FB, IG | không có route sửa tin ở kênh nào | theo kênh |
| `outbound_typing` | WhatsApp, FB, IG | Zalo ĐÃ đóng (lô 4: `toggle_typing_status` → `ChannelActionRegistry` → bridge `/personal-messages/typing`); WebWidget đẩy thẳng tới widget | theo kênh |
| `event_typing` | — | Zalo ĐÃ đóng (lô 4: relay `typing` → `TypingRelayService` → `TypingStatusManager`) | — |
| `outbound_image/video/audio/file` (Zalo) | Zalo | `SendOnZaloService` mới gửi đính kèm ĐẦU TIÊN của tin | Zalo lô 3 |
| `messaging_window` | WhatsApp, FB, IG, TikTok | lõi chưa có cảnh báo cửa sổ 24h/template trong hộp trả lời | khi port template WhatsApp |
| `event_delivered` / `event_seen` (FB, IG) | FB, IG | webhook delivery/read của Meta chưa được xử lý | lô kênh Meta |
| `event_seen` (LINE) | LINE | chưa xử lý biên nhận đã xem | lô LINE |
| `event_reaction` (Telegram, WhatsApp, FB, IG) | các kênh đó | WhatsApp bỏ hẳn `reaction` (UNPROCESSABLE); các kênh khác không có bộ xử lý | theo kênh |
| `event_recall` (Telegram, WhatsApp, FB) | các kênh đó | chỉ Instagram có `message_unsend`, Zalo có `undo` | theo kênh |
| `inbound_location` (LINE) | LINE | driver LINE chưa dựng attachment vị trí | lô LINE |
| `inbound_sticker` (FB, IG) | FB, IG | đính kèm về theo kiểu ảnh, không đặt `content_type=sticker` | lô kênh Meta |
| `inbound_image/file`, `inbound_caption`, `outbound_reply_to` (TikTok) | TikTok | `Tiktok\MessageService` mới dựng tin chữ | lô TikTok |
| `outbound_reply_to` (WhatsApp, LINE→–) | WhatsApp | driver gửi chưa đính `context` trích dẫn | lô WhatsApp |
| `group_threads` (Telegram, LINE, WhatsApp) | các kênh đó | Zalo ĐÃ đóng (lô 2b: `content_attributes.sender/mentions/thread`, hồ sơ nhóm `zalo_thread_type=group`); Telegram **bỏ qua** chat nhóm ngay ở IncomingMessageService | lô nhóm |
| `friend_request` (LINE) | LINE | Zalo ĐÃ đóng (lô 2b: webhook `friend_request` → Liên hệ nháp + hội thoại + `content_attributes.friend_request`); LINE chưa có xử lý sự kiện follow | lô LINE |

Thêm vào (code có, bảng thiếu): `inbound_rich_text` cho Email (HTML → markdown), `event_typing` cho Website
(widget đã có `toggle_typing`), `profile_refresh` cho Zalo. Hàng `event_presence` chưa có trong bảng §4 nên
chưa kênh nào khai.

`Channel::TwitterProfile` (không có cột trong §4) khai **rỗng**: bản port không có driver tin đến lẫn tin đi.
`Channel::TwilioSms` khai theo `medium` nên có hai dòng snapshot (`sms` và `whatsapp`).

## 5. Lộ trình áp dụng
1. **Lõi**: enum + `CapabilitySet` + interface + `Inbox::supports` + `InboxResource.capabilities` + FE hook/gate + thay `INBOX_FEATURE_MAP` + `CapabilityDeclarationTest` khung. (1 agent)
2. **Zalo** khai báo đầy đủ theo cột Zalo và đóng các "○" theo lô audit (`reports/zalo-deep-audit.md`): lô 2 (định danh, vị trí, echo), lô 3 (đính kèm đủ + retry), lô 4 (reaction/recall hai chiều, typing), lô 5 (UI: icon kênh, panel phải + chuỗi hội thoại Q1, nhóm Q3), lô 6 (phiên: reauth icon sidebar, disconnect).
3. **Các kênh khác**: mỗi kênh một lượt: khai báo theo ma trận + chạy contract test → sửa phần đỏ (đã biết: 7 kênh gắn đính kèm sau save; Twilio đổi tên; Email retry).
4. Docs: `docs/code-standards.md` §0 thêm mục "Năng lực kênh" trỏ về file này; `glossary.md` thêm Liên hệ nháp/Lead theo luật §2.4.
