# Lõi media — đường tải đính kèm, thứ tự gắn tệp, sự kiện sau commit (07/09/2026)

Agent `core-media-fix`. Không commit. Không đụng `app/Services/Zalo/**`, `services/zalo-bridge/**`.
Gate: Pest toàn bộ trên `yona_rw_test_media` + `vendor/bin/pint --test`.

## Bảng kết quả

| # | Việc | Trạng thái | File |
|---|---|---|---|
| 1 | SSRF guard + hạn mức + stream + sniff MIME cho đường tải media dùng chung | **XONG** | `app/Services/Channels/RemoteAttachmentDownloader.php`, `app/Support/MimeType.php` (mới), `app/Support/FileUploadLimit.php` (mới), `app/Models/Attachment.php` |
| 2 | Gắn đính kèm TRƯỚC `save()` ở các kênh còn lại | **XONG** | Telegram, Line, Sms, Twilio, Tiktok, Whatsapp |
| 3 | `Message` phát sự kiện sau commit (`after_create_commit`) | **XONG** | `app/Models/Message.php` |
| 4 | `tries`/`backoff` job webhook theo `retry_on` gốc | **XONG một phần** (2/4 job có `retry_on` ở gốc) | `WhatsappEventsJob`, `TiktokEventsJob` |

## Bảng kênh × biện pháp

| Kênh | SSRF guard | Hạn mức | Stream ra tệp tạm | Attach trước `save()` | Dựa vào afterCommit |
|---|---|---|---|---|---|
| Telegram | ✔ | ✔ | ✔ | ✔ (mới) | – |
| LINE | ✔ (mới) | ✔ (mới) | ✔ (mới) | ✔ (mới) | – |
| SMS (Bandwidth) | ✔ | ✔ | ✔ | ✔ (mới) | – |
| Twilio | ✔ | ✔ | ✔ | ✔ (mới) | – |
| TikTok | ✔ | ✔ | ✔ | ✔ (mới) | – |
| WhatsApp Cloud | ✔ | ✔ | ✔ | ✔ (mới) | – |
| Messenger (Facebook) | ✔ | ✔ | ✔ | ✖ **đúng gốc** | ✔ (mới) |
| Instagram | ✔ | ✔ | ✔ | ✖ **đúng gốc** | ✔ (mới) |
| Email (ReplyMailbox/ImapMailbox) | – (tệp bóc từ MIME, không gọi mạng) | ✔ (`validateFileSize`) | – | ✖ | ✔ (mới) |
| Zalo | ✔ (qua cùng downloader) | ✔ | ✔ | đã có từ G1 | – |
| Upload từ dashboard/widget/API | – | ✔ (`validateFileSize`) | – | đã có (`pendingAttachments`) | – |

## 1. `RemoteAttachmentDownloader` — ba lớp bảo vệ

### Đối chiếu gốc trước khi sửa
- Các kênh của Chatwoot tải media bằng `Down.download(...)` (`telegram/incoming_message_service.rb:153`,
  `sms/incoming_message_service.rb:86`, `twilio`, `whatsapp/incoming_message_service_helpers.rb:3`,
  `tiktok/messaging_helpers.rb:83`, `messenger/message_builder.rb:32`) — **không** guard, **không** cap.
- Nhưng Chatwoot có sẵn khung chuẩn cho đúng việc này ở `lib/safe_fetch/` (dùng cho fetch URL người
  dùng nhập): `Fetcher#write_response_body` ghi theo khối và ném `FileTooLargeError` khi vượt
  `effective_max_bytes`; `RequestOptions#default_max_bytes` = `MAXIMUM_FILE_UPLOAD_SIZE` MB, giá trị
  `<= 0` rơi về hằng `DEFAULT_MAX_BYTES_FALLBACK_MB = 40`; `SsrfFilter` chặn dải nội bộ;
  `SafeFetch.allow_private_network?` = cờ môi trường. Bản port lấy **đúng ngữ nghĩa của khung này**
  áp vào đường tải media.

### Đã làm
- `SafeHttp::assertPublicUrl($url)` ngay đầu `download()` (tôn trọng `ALLOW_PRIVATE_WEBHOOK_URLS`
  qua `config('safe_http.allow_private_networks')`), **và** trong `on_redirect` của Guzzle — máy chủ
  ngoài trả `302 → 169.254.169.254` cũng bị chặn. Giới hạn 3 hop, chỉ http/https.
- Hạn mức hai nhịp: từ chối theo `Content-Length` trước khi tải một byte nào; và đếm theo từng khối
  256KB khi ghi, vượt là dừng ngay (máy chủ khai gian hoặc không khai đều bị chặn).
- Nội dung ghi thẳng ra tệp tạm bằng `->withOptions(['stream' => true])` + đọc PSR stream theo khối,
  rồi `Attachment::storeLocalFile()` chảy từ tệp tạm sang kho bằng `writeStream`. Tệp tạm luôn được
  xoá trong `finally`. Trước đây `$response->body()` nạp NGUYÊN tệp vào RAM rồi `storeContents()`
  giữ thêm một bản sao.
- Timeout: `connectTimeout` 5s + `timeout` 30s (gốc `DEFAULT_OPEN_TIMEOUT` 2s / `DEFAULT_READ_TIMEOUT` 20s;
  nới nhẹ vì CDN thật của Zalo/Meta hay chậm hơn lab).
- Kiểu MIME lấy từ **nội dung** (`finfo`) chứ không tin header: `MimeType::resolveForFile()` giữ lời
  khai khi cùng họ MIME (`application/vnd.openxmlformats-…` hay bị finfo đoán thành
  `application/zip`), còn khác họ thì bytes thắng. Máy chủ lạ không thể khai `image/png` để nhét
  HTML vào kho.
- Mọi thất bại trả `null` chứ không ném ra ngoài ⇒ job không fail ⇒ **không mất tin**.

### DRY — quyết định lệch brief, nói rõ để duyệt
- Brief đề nghị `config('limits.attachment_max_bytes')`. **Không thêm khoá đó**: `config/limits.php`
  đã có `maximum_file_upload_size` (đúng port `MAXIMUM_FILE_UPLOAD_SIZE`), thêm khoá thứ hai cho cùng
  một con số là đúng thứ trùng lặp mà `CLAUDE.md` cấm, và khoá tính sẵn lúc nạp cấu hình sẽ **không**
  theo `config([...])` override trong test. Thay bằng `App\Support\FileUploadLimit::maxBytes()` —
  đọc config lúc gọi, áp luật `<= 0 → 40MB` của gốc, và `Attachment::validateFileSize()` cũng gọi
  chính nó (trước đây tự chép lại luật đó). Một chỗ đổi hạn mức, hai đường cùng theo.
- `AvatarContentType` giữ nguyên vai trò "ảnh nào làm avatar được" nhưng phần chuẩn hoá tên MIME +
  `finfo` đã tách ra `App\Support\MimeType` và dùng chung với đường tải đính kèm (brief yêu cầu tái
  dùng; tái dùng nguyên `AvatarContentType` thì sai tầng — allowlist của nó chỉ có 4 kiểu ảnh, còn
  media của kênh gồm cả video/audio/pdf/docx).

### Ngoài phạm vi được giao nhưng có đụng (cần phiên chính duyệt)
- `app/Models/Attachment.php`: thêm `storeLocalFile()` (đường lưu bằng stream) + tách
  `storagePathFor()`/`storedAttributes()` dùng chung với `storeContents()`, và
  `validateFileSize()` chuyển sang `FileUploadLimit`. Bắt buộc phải ở đây: quy ước đường dẫn kho
  (`uploadDirectory`) là `private`, đặt chỗ khác là chép lại quy ước lưu tệp ra ngoài model.
- `app/Services/Line/LineClient.php`: đổi `messageContent(): Response` → `messageContentUrl(): string`
  + `authHeaders()`. Lý do: LINE là kênh duy nhất còn tự tải nội dung bằng `$response->body()` nên
  nằm ngoài mọi lớp bảo vệ; đưa nó vào cùng một đường tải là mục tiêu "MỌI kênh" của brief.
  Không còn nơi nào khác gọi `messageContent()` (đã grep).

## 2. Gắn đính kèm trước `save()`

Bảng trace gốc ↔ port (mỗi dòng đã mở file gốc để kiểm, không suy đoán):

| Gốc (Ruby) | Thứ tự gốc | Port |
|---|---|---|
| `telegram/incoming_message_service.rb:34-35` | `process_message_attachments` → `@message.save!` | `Telegram/IncomingMessageService.php` — attach → `save()` |
| `line/incoming_message_service.rb:29-30` | `attach_files` → `@message.save!` | `Line/IncomingMessageService.php` |
| `sms/incoming_message_service.rb:17-18` | `attach_files` → `@message.save!` | `Sms/IncomingMessageService.php` |
| `twilio/incoming_message_service.rb:22-24` | `attach_files` + `attach_location` → `@message.save!` | `Twilio/IncomingMessageService.php` |
| `tiktok/message_service.rb:49-50` | `create_message_attachments(message)` → `message.save!` | `Tiktok/MessageService.php` |
| `whatsapp/incoming_message_base_service.rb:95-104` | `attach_contact`/`attach_files`/`attach_location` (`attachments.new`) → `@message.save!` | `Whatsapp/IncomingMessageService.php` |
| `messenger/message_builder.rb:14-15` + `facebook/message_builder.rb:24,49-52` | `messages.create!` → `process_attachment` — **nhưng cả cụm trong `ActiveRecord::Base.transaction`**, sự kiện là `after_create_commit` | Giữ nguyên thứ tự, sửa bằng afterCommit (mục 3) |

Tất cả dùng `Message::$pendingAttachments` đúng đường mà driver Zalo và `Builders\Messages\MessageBuilder`
đã dùng — không thêm cơ chế mới.

**Sửa kèm ở WhatsApp:** caption trước đây ghi bằng `$message->update(['content' => …])` (một lượt UPDATE
riêng sau khi lưu, phát thêm `message.updated`); nay gán thẳng `$message->content = …` trước `save()`,
đúng `@message.content ||= attachment_payload[:caption]` của gốc.

**Fallback khi tải hỏng:** thay vì bỏ im lặng, mỗi kênh nay gắn đính kèm `file_type: fallback`
(`RemoteAttachmentDownloader::fallbackAttributes()` — một chỗ dựng duy nhất). **`external_url` chỉ
truyền khi URL mở được mà không kèm bí mật của kênh**: URL tệp Telegram nhúng bot token, URL của
WhatsApp/Twilio/LINE/TikTok/Bandwidth cần bearer hoặc basic auth riêng ⇒ những kênh đó để `null`,
chỉ giữ `fallback_title` = tên tệp. `bubbles/Fallback.tsx` đã xử lý sẵn trường hợp không có URL
(hiện tên dạng chữ thường). Messenger/Instagram giữ nguyên `external_url` như gốc (URL Meta ký sẵn,
không mang bí mật).

## 3. `Message` phát sự kiện sau commit

`static::created` giữ `persistPendingAttachments()` chạy trong lượt save (đúng `autosave: true` của
`has_many :attachments`), còn cụm `execute_after_create_commit_callbacks` chuyển vào
`$message->getConnection()->afterCommit(...)`.

- Dùng `getConnection()->afterCommit()` chứ không `DB::afterCommit()` — bám đúng connection của model.
- Không có transaction đang mở ⇒ callback chạy **ngay lập tức**, nên mọi kênh không bọc transaction
  (Telegram, LINE, Zalo, SMS, Twilio, TikTok, WhatsApp, API dashboard) giữ nguyên hành vi cũ.
- Có transaction (Facebook/Instagram `MessageBuilder`, `ReplyMailbox`, `ImapMailbox`) ⇒ chạy sau
  commit, đúng `after_create_commit`. Hệ quả: `message.created` bay đi khi đính kèm đã tồn tại, và
  rollback sau đó không còn để lại tin "ma" trên UI.
- **Test không cần đổi:** `RefreshDatabase` cài `Illuminate\Foundation\Testing\DatabaseTransactionsManager`,
  transaction bọc ngoài của test bị bỏ qua trong `callbackApplicableTransactions()` (đã đọc vendor để
  chắc, không đoán) — nên callback vẫn chạy trong test như ngoài đời.

Đã đo lại **toàn bộ suite** vì đây là hook lõi: 2251 xanh.

## 4. `tries` / `backoff` job webhook

Gốc chỉ khai `retry_on` ở 4 job, và đều là `LockAcquisitionError` (xung đột khoá advisory), không phải
retry chung:

| Gốc | Port | Ghi chú |
|---|---|---|
| `whatsapp_events_job.rb:6` — `wait: 2s, attempts: 20` | `$tries = 20`, `$backoff = 2` | An toàn: service bỏ qua tin đã có `source_id` ngay đầu vào |
| `tiktok_events_job.rb:4` — `wait: 2s, attempts: 8` | `$tries = 8`, `$backoff = 2` | An toàn: `findExistingMessage()` tra `source_id` trước khi dựng tin |
| `facebook_events_job.rb:3` — `wait: 1s, attempts: 8` | **KHÔNG áp** | Port chưa có khoá advisory nên chưa có `LockAcquisitionError` để retry đúng phạm vi; Facebook builder **không** dedupe `source_id` ⇒ retry mù sẽ sinh tin trùng. Cần dedupe trước, xem "Ngoài phạm vi" |
| `instagram_events_job.rb:11` — `attempts: 3` | **KHÔNG áp** | Như trên |

Line/SMS/Telegram/Twilio: gốc không khai `retry_on`, port giữ nguyên 1 lượt. Rủi ro mất tin đã hạ
bằng cách khác: lỗi tải media không còn làm job fail (mục 1 + fallback ở mục 2).

## Spec ↔ Pest

| Hành vi khoá | Test |
|---|---|
| URL nội bộ (169.254.169.254, loopback, 10/x, 192.168/x, `file://`) bị chặn, không gửi request | `tests/Feature/Channels/RemoteAttachmentDownloaderTest.php` |
| `ALLOW_PRIVATE_WEBHOOK_URLS=true` mở lại được (dev/harness) | nt |
| Tệp khai `Content-Length` vượt cap → từ chối, không ghi tệp nào vào kho | nt |
| Tệp vượt cap **không khai** `Content-Length` → dừng giữa chừng, không ghi tệp | nt |
| Lỗi mạng → `null`, không ném ra ngoài | nt |
| Header khai `image/png` nhưng bytes là HTML → lưu `text/html` | nt |
| Tệp 20MB: đỉnh bộ nhớ tăng < 12MB (bản nạp cả tệp: 23MB) | nt |
| `message.created` có `attachments` **ngay lúc phát** — Telegram / LINE / SMS / Twilio / TikTok / WhatsApp / Messenger | `tests/Feature/Channels/InboundAttachmentPayloadTest.php` |
| Tải hỏng vẫn tạo tin + đính kèm `fallback`, `external_url` null (không rò bot token) | nt |

**Đã chứng minh test bắt được lỗi thật** (không phải test tự khen): tạm hoàn nguyên Telegram về
attach-sau-save và `Message` về phát sự kiện trong hook `created` ⇒ 3 bài đỏ đúng chỗ (Telegram,
Messenger, fallback); hoàn nguyên downloader về `$response->body()` ⇒ bài cap-không-khai-Content-Length
và bài bộ nhớ đỏ. Sau đó khôi phục nguyên trạng.

Bài đo bộ nhớ phải dùng `memory_reset_peak_usage()` + nguồn là stream đọc từ **đĩa**: nếu fixture nằm
sẵn trong RAM thì `$response->body()` chỉ trả lại chính chuỗi đó (copy-on-write) và bài đo không phân
biệt được hai bản.

## Kết quả gate

```
DB_DATABASE=yona_rw_test_media php artisan test --compact
→ 2251 passed, 0 failed (trước khi sửa: 2232 — thêm 19 bài mới)

vendor/bin/pint --test → passed
```

Không đụng FE nên không chạy `tsc`/`vitest`.

## Ngoài phạm vi — bằng chứng + đề xuất (KHÔNG tự sửa)

1. **Facebook/Instagram builder không dedupe `source_id`.** `app/Builders/Messages/Facebook/MessageBuilder.php`
   và `Instagram/MessageBuilder.php` dựng tin mà không tra `source_id` trước (WhatsApp có ở
   `Whatsapp/IncomingMessageService.php:83`, TikTok ở `findExistingMessage()`). Hệ quả: chưa thể bật
   `tries` cho `FacebookEventsJob`/`InstagramEventsJob` theo gốc, và Meta gửi lại webhook là sinh tin
   trùng. Đề xuất: thêm dedupe theo `inbox->messages()->where('source_id', …)` rồi mới áp
   `$tries = 8` / `$tries = 3`.
2. **Bản port chưa có khoá advisory theo hội thoại** (`LockAcquisitionError` của gốc). Hai webhook về
   cùng hội thoại chạy song song có thể tạo hai hội thoại. Đề xuất một lô riêng.
3. **`AgentBotFactory::outgoing_url` dùng tên miền faker thật** (`database/factories/AgentBotFactory.php:20`,
   `'https://'.fake()->unique()->domainName().'/bot'`). Test nào không `Http::fake()` sẽ gọi ra
   Internet thật: một lượt chạy full suite đã đỏ ở
   `tests/Feature/WebApi/ConversationBotHandoffTest.php` với `RetryableError: 500` từ `stehr.com`,
   chạy lại riêng thì xanh. **Chớp tắt phụ thuộc mạng, không phải lỗi của lô này.** Đề xuất đổi sang
   miền dành riêng (`https://bot.test/...`) hoặc bật `Http::preventStrayRequests()` trong `TestCase`.
4. **TikTok tải media thiếu header `x-user`.** Gốc `tiktok/messaging_helpers.rb:83` truyền
   `headers: { 'x-user' => channel.validated_access_token }`; `Tiktok/MessageService.php:161` gọi
   `download()` không headers. URL ký sẵn có thể vẫn tải được, nhưng lệch gốc. Đề xuất kiểm với tài
   khoản thật rồi bổ sung headers.
5. **`fallback_title` rỗng khi kênh không gửi tên tệp** (TikTok ảnh hỏng): bong bóng fallback hiện
   trống. Cần một chuỗi i18n ("Không tải được tệp") — `lang/**` là nguồn dùng chung, không tự thêm.
6. **Đính kèm email chưa sniff MIME**: `app/Mailboxes/Concerns/MailboxHelper.php:75,94` lưu theo
   `Content-Type` khai trong thư. `MimeType::resolveForFile()` đã sẵn sàng dùng lại nếu muốn siết.

## Dọn dẹp

- `yona_rw_test_media` đã `dropdb` sau khi đo xong.
- Không commit, không `git add`. File tạm trong scratchpad, không nằm trong repo.

```
Status: DONE
Summary: Đường tải media dùng chung của mọi kênh nay có SSRF guard (kể cả sau redirect), hạn mức
theo `MAXIMUM_FILE_UPLOAD_SIZE`, stream ra tệp tạm (20MB: đỉnh bộ nhớ 23MB → 9MB) và sniff MIME từ
nội dung; 6 kênh gắn đính kèm trước `save()` như gốc, Messenger/Instagram/mailbox được sửa đúng bản
chất bằng `after_create_commit`; 19 bài Pest mới, toàn suite 2251 xanh, pint sạch.
Concerns: Chưa áp `tries` cho FacebookEventsJob/InstagramEventsJob vì hai builder đó còn thiếu dedupe
`source_id` (mục 1 phần Ngoài phạm vi). Có sửa `app/Models/Attachment.php` và
`app/Services/Line/LineClient.php` — hơi ngoài danh sách file được giao, lý do ghi rõ ở mục 1.
```
