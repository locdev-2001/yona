# Lô 2 — Driver định danh & inbound Zalo (07/09/2026)

Phạm vi: `app/Services/Zalo/IncomingMessageService.php`, 1 migration index, fixture + Pest của kênh Zalo.
Nguồn yêu cầu: `reports/zalo-deep-audit.md` §"Lô 2" (2.1–2.11), `reports/g1-contact-sync-notes.md` §5.2,
`reports/g1-inbound-notes.md`, `reports/g1-inbound-evidence.md`.

## File đã sửa / thêm

| File | Việc |
|---|---|
| `app/Services/Zalo/IncomingMessageService.php` | toàn bộ phần sửa nghiệp vụ (2.1–2.6, 2.8) |
| `database/migrations/2026_09_07_200000_index_contacts_on_social_zalo_user_id.php` | index `(account_id, additional_attributes ->> 'social_zalo_user_id')` cho phép tra ở 2.2 |
| `tests/Feature/Channels/ZaloChannelTest.php` | +15 case khoá (đuôi file, không đụng case của phiên khác) |
| `tests/Fixtures/channels/zalo_inbound_location.json`, `zalo_inbound_link.json` | payload mới theo hợp đồng bridge |
| `tests/Fixtures/channels/zalo_inbound_business_card.json` | thêm `phone` + `contact_uid` (bridge có gửi — `index.mjs:1171-1185`) |

Không đụng `ContactInboxWithContactBuilder`, không thêm nhánh `if zalo` vào lõi: mọi đặc thù (uid Zalo,
số nội địa Việt, cờ `backfill`, thẻ Zalo) nằm trong driver.

## Đã làm

| # | Việc | Cách sửa | Test khoá |
|---|---|---|---|
| 2.1 | Số danh thiếp của NGƯỜI KHÁC không còn gán cho người gửi | `phoneNumber()` chỉ lấy `user.phone`; số trên thiếp chỉ nhận khi `business_card.contact_uid === peer_uid` (thiếp của chính người gửi). Số trên thiếp vẫn nằm nguyên trong `content_attributes.business_card` | `không gán số trên danh thiếp của người khác cho người gửi` (có hồ sơ khác đang giữ số đó — cũ thì hội thoại chui vào hồ sơ người trên thiếp), `nhận số trên danh thiếp khi đó là thiếp của chính người gửi` |
| 2.1 | Chuẩn E.164 tại driver | `toE164()`: `0901234567`/`090 123 4567`/`84901234567`/`+84…` → `+84901234567`; số trần không rõ mã quốc gia → bỏ (không đoán) | `quy số nội địa về E.164…` (4 dataset), `bỏ số không rõ mã quốc gia thay vì đoán bừa` |
| 2.1 | Chỉ điền khi trống + gộp qua `ContactMergeAction` | `fillPhoneNumber()`: trống thì điền; số đã có chủ trong account → `ContactMergeAction`, xong `refresh()` contact_inbox (gộp dời contact_inbox sang hồ sơ giữ lại) | `điền số vào hồ sơ đang trống ở tin sau, không đè số agent đã nhập`, `gộp qua ContactMergeAction khi số đến sau đã thuộc hồ sơ khác` |
| 2.2 | Cùng khách trên 2 inbox / xoá–tạo lại inbox = 1 hồ sơ | `resolveContactInbox()`: có contact_inbox theo `source_id` → dùng luôn (đúng gốc); chưa có → tra `additional_attributes ->> 'social_zalo_user_id'` rồi gọi thẳng `ContactInboxBuilder` với hồ sơ đó; hết mới tới builder gộp của lõi | `cùng khách ở inbox Zalo thứ hai về đúng một hồ sơ`, `xoá inbox rồi tạo lại vẫn về đúng hồ sơ cũ theo uid Zalo` |
| 2.3 (audit 2.4) | `created_at` = `platform_sent_at`, không bơm chưa đọc | `sentAt()` gán thẳng `$message->created_at` (bỏ mốc rác < năm 2000 và mốc tương lai). Chưa đọc so `created_at` với `agent_last_seen_at` nên tin lịch sử tự khắc không vào bộ đếm | `xếp tin theo giờ nền tảng và không bơm chưa đọc khi kéo lịch sử về` |
| 2.3 | `backfill=true` không mở lại hội thoại, không dời mốc chờ / mốc hoạt động | `persist()` chụp `status/waiting_since/first_reply_created_at/last_activity_at` trước khi `save()` rồi trả về nguyên trạng (update thẳng, không bắn event). Lõi không có khái niệm "tin hồi phục" nên xử lý ngay tại driver | `tin lịch sử không mở lại hội thoại đã đóng và không dời mốc chờ` |
| 2.4 (audit 2.5) | `direction=out` ⇒ `external_echo` | `contentAttributes()`: mọi `direction !== 'in'` đều đặt `external_echo = true` (đúng nghĩa `outgoing_echo` của gốc) | `coi tin chủ shop gửi từ điện thoại là đã trả lời: external_echo + hết mốc chờ` |
| 2.5 | Vị trí → contract lõi | `inbound_kind: 'location'` → attachment `file_type = location` (`coordinates_lat/long`, `fallback_title`, `external_url`) như WhatsApp | `đưa vị trí vào contract location của lõi` |
| 2.6 | Link → contract `fallback` | `inbound_kind: 'link'` → attachment `file_type = fallback` (`external_url` + `fallback_title`), không còn chuỗi "[Link] …" trong nội dung | `đưa link vào contract fallback của lõi thay cho chuỗi [Link] thô` |
| audit 2.6 | Đọc bí danh `zalo_source_ids` (hợp đồng với Lô 3) | `findByAliasSourceId()`: khi `source_id` không khớp và tin là tin dội lại (`direction !== 'in'`), tra `jsonb_exists((content_attributes)::jsonb -> 'zalo_source_ids', ?)` | `dedupe theo mọi msgId chiều ra đã ghi trong zalo_source_ids` |
| audit 2.3 | Làm mới tên/ảnh khách | `refreshDisplayProfile()`: chỉ ghi đè tên do NỀN TẢNG đặt (chưa lần nào lưu được `social_zalo_user_name`, hoặc tên hiện tại đúng bằng tên Zalo lần trước); ảnh thử lại khi hồ sơ chưa có ảnh | `làm mới tên khách khi bridge chỉ mới đặt tên tạm, giữ tên agent sửa tay` |
| audit 2.8 | Tải media hỏng không còn lưu tin rỗng vô hình | `buildAttachments()`: `RemoteAttachmentDownloader::download()` trả `null` → attachment `fallback` giữ `external_url` + tên tệp | `giữ dấu vết tệp khi URL CDN đã hết hạn thay vì lưu tin rỗng` |

### Kiểm chứng test có "cắn" thật
Đảo `phoneNumber()` về bản cũ (nhận thẳng số thiếp, không E.164) rồi chạy lại: **5 case đỏ**
(`không gán số trên danh thiếp…`, `nhận số trên danh thiếp khi…`, 3 dataset E.164) → file đã khôi phục ngay
sau phép đo. Đo này còn lộ một điều đáng ghi: số sai định dạng **được lưu nguyên** lúc TẠO hồ sơ
(`discardInvalidAttrs()` chỉ trả về giá trị cũ khi UPDATE), tức không chuẩn hoá thì `contacts.phone_number`
có rác `0912345678` chứ không phải "mất số".

## Bảng trace gốc ↔ port

| Hành vi | Ruby gốc | PHP port | Ghi chú |
|---|---|---|---|
| Dedupe theo inbox | `whatsapp/incoming_message_service_helpers.rb:95 find_message_by_source_id` | `IncomingMessageService::findBySourceId()` | giữ nguyên đường có sẵn, chỉ nối thêm nhánh bí danh |
| Tin do kênh đẩy lại là "đã trả lời" | `messages/facebook/message_builder.rb:121`, `instagram/base_message_builder.rb:170`, `whatsapp/incoming_message_base_service.rb:178` (`external_echo`) + `models/message.rb:371` | `contentAttributes()` + `Message::isHumanResponse()` | gốc đặt cờ cho MỌI tin echo, không phân biệt điện thoại hay CRM |
| Attachment vị trí | `messages/facebook/message_builder.rb:86` (`coordinates_lat/long`) | `locationAttachment()` | cùng contract, không bubble riêng |
| Attachment fallback cho link/share | `messages/facebook/message_builder.rb:92-104` (`fallback_params`, comment "keeps the title/link without attempting a download") | `linkAttachment()` + nhánh tải hỏng | |
| Builder KHÔNG làm mới hồ sơ khi đã có contact_inbox | `builders/contact_inbox_with_contact_builder.rb:15-16` | `ContactInboxWithContactBuilder` (giữ nguyên) | đã xác nhận ở `g1-contact-sync-notes §4` |
| Kênh tự làm mới hồ sơ trong driver của mình | `services/telegram/incoming_message_service.rb:15,62 update_contact_avatar` | `syncContactProfile()` | đúng chỗ gốc cho phép làm |
| Gộp hồ sơ trùng định danh | `actions/contact_merge_action.rb` | `ContactMergeAction` (dùng lại, không sửa) | |
| Không có khái niệm backfill | — (gốc không có kênh nào kéo lịch sử) | `persist()` chụp–khôi phục trạng thái hội thoại | phần "ngoài gốc", ghi rõ lý do trong comment |

## Hợp đồng cần bridge (Lô 1) gửi lên — driver đã sẵn sàng đọc

```jsonc
// vị trí — chat.location.new
{ "inbound_kind": "location",
  "location": { "latitude": 10.762622, "longitude": 106.660172,
                "title": "Chợ Bến Thành", "address": "Lê Lợi, Quận 1, TP.HCM",
                "url": "https://maps.google.com/?q=…" } }

// link / webcontent — chat.link
{ "inbound_kind": "link",
  "content": "<chú thích khách gõ, có thể rỗng>",
  "link": { "url": "https://…", "title": "…", "description": "…", "thumb": "https://…" } }
```
- `latitude`/`longitude` chấp nhận thêm bí danh `lat`, `long`, `lng`; thiếu toạ độ số → driver bỏ qua nhánh
  này (không sinh attachment rác).
- `business_card.contact_uid` **bắt buộc** khi bridge tra được: thiếu nó thì số trên thiếp bị coi là của
  người khác và không bao giờ vào hồ sơ (an toàn, nhưng thiếp của chính khách cũng mất số).
- `backfill: true` phải có mặt ở mọi lane kéo lịch sử (`index.mjs:1558` đã gửi ở lane nhóm — cần kiểm lane
  còn lại), nếu không tin cũ vẫn mở lại hội thoại đã đóng.

## Chưa làm (kèm lý do)

| # | Việc | Vì sao |
|---|---|---|
| 2.7 | Backfill `chat.undo` áp thu hồi thật | Cần accessor `RelayEventParser::backfillRecallSourceId()` do **Lô 4** thêm; hiện tin `chat.undo` vẫn bị bỏ qua (an toàn, không dựng lại tin khách đã xoá) |
| 2.9 | `content_type` từ CDN Zalo không đáng tin (GIF ghi `image/jpeg`) | Nhận dạng theo byte phải nằm ở `RemoteAttachmentDownloader`/`Attachment` — file dùng chung, ngoài phạm vi. Đề xuất: `Attachment::sniffContentType()` dùng chung với `AvatarContentType` |
| 2.10 | Thông báo hệ thống Zalo → `message_type=activity` | Chưa có danh sách `msgType` hệ thống đủ tin cậy trong bằng chứng (chỉ 1 mẫu, tin 764); đoán bừa sẽ nuốt tin khách. Cần Lô 1 gắn `inbound_kind: 'system'` |
| 2.11 | Emoticon dạng mã (`/-strong`, `:>`) trong `content` | Bảng mã nằm ở `ReactionIcons::EMOJI` (private) và file đó thuộc Lô 4. Đề xuất 1 dòng ở file đó: `public static function inText(string $text): string` dùng lại đúng bảng đó, driver gọi trong `content()` |
| — | Chặn notification cho tin backfill | Notification bắn từ listener của `EventType::MESSAGE_CREATED` trong lõi; chặn được thì phải nới hợp đồng lõi (`Message` cần biết "tin hồi phục"), ngoài phạm vi lô này. Hiện đã giảm thiệt hại: tin lịch sử không vào chưa đọc, không mở lại hội thoại, không dời mốc chờ |
| — | Index cho phép tra bí danh `zalo_source_ids` | `messages.content_attributes` là cột `json` (không phải `jsonb`) nên không đặt index biểu thức trực tiếp được. Đã giới hạn thiệt hại: chỉ tra khi `direction !== 'in'` (bí danh chỉ có trên tin mình gửi). Đề xuất dài hạn: đổi cột sang `jsonb` như gốc rồi thêm GIN |

## Gate

| Gate | Kết quả |
|---|---|
| `DB_DATABASE=yona_rw_test_lo2 php artisan test tests/Feature/Channels/ZaloChannelTest.php` | **53 passed / 208 assertions** |
| `… tests/Feature/Channels tests/Feature/Builders` (kiểm hàng xóm) | **219 passed / 607 assertions** |
| `vendor/bin/pint --test` (3 file sửa + migration) | passed |
| `phpstan --memory-limit=1G` | **KHÔNG chạy được** — repo/worktree không cài PHPStan (`vendor/bin/phpstan` không tồn tại, không có `phpstan.neon`, `composer.json` không khai). Không đo được baseline trước/sau; cần founder/phiên chính xác nhận công cụ này còn dùng không |

Dọn dẹp: `dropdb yona_rw_test_lo2` đã chạy; không đụng `yona_rw`, không commit, không `git add`.

```
Status: DONE_WITH_CONCERNS
Summary: Đã sửa 2.1–2.6 (+2.3 tên/ảnh, 2.8 tải hỏng) trong đúng driver Zalo, 15 case Pest khoá, 219 test kênh + builder xanh trên DB riêng.
Concerns/Blockers: (1) PHPStan không có trong repo nên gate "không tăng lỗi" không đo được; (2) 2.5/2.6 chỉ chạy được khi bridge (Lô 1) gửi `inbound_kind: location|link` theo hợp đồng ghi ở trên — chưa có payload thật để đối chiếu; (3) 2.7 chờ accessor của Lô 4, 2.9/2.11 nằm ở file ngoài phạm vi; (4) notification cho tin backfill vẫn bắn (cần nới lõi).
```
