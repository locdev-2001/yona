# B9 Attachments — ghi chú backend (`b9-be`)

## CONTRACT API (chốt — `b9-fe` đọc mục này)

### 1. Gửi tin có tệp (đường chính, đúng gốc)

`POST /api/v1/accounts/{accountId}/conversations/{displayId}/messages`
**Content-Type: `multipart/form-data`** (đường JSON cũ giữ nguyên, không đổi).

| Field | Kiểu | Ghi chú |
|---|---|---|
| `content` | string | có thể rỗng khi chỉ gửi tệp |
| `private` | bool | như cũ |
| `message_type`, `content_type`, `content_attributes`, `echo_id`, `source_id` | như B3 | `content_attributes` gửi dạng chuỗi JSON khi đi multipart |
| `attachments[]` | File **hoặc** string | mỗi phần tử là một tệp (`File`) — hoặc `signed_id` lấy từ endpoint direct upload (mục 2) |
| `is_voice_message` | bool | true + tệp audio → `meta.is_voice_message = true` |

Response **200**: đúng shape `MessageResource` của B3, **thêm** khóa `attachments` (chỉ khi có tệp).
Response **422**: `{ "error": "..." }` — cùng đường lỗi B3.

### 2. Upload trực tiếp (tùy chọn — mặc định FE KHÔNG dùng)

`POST /api/v1/accounts/{accountId}/conversations/{displayId}/direct_uploads`
`multipart/form-data`, field **`file`** (một tệp).

Response 200:
```json
{ "signed_id": "<chuỗi>", "filename": "avatar.png", "content_type": "image/png", "byte_size": 1234, "url": "http://.../storage/attachments/2/....png" }
```
`signed_id` đem nhét vào `attachments[]` của endpoint (1) để gắn vào tin.
**Chatwoot mặc định `DIRECT_UPLOADS_ENABLED=false`** (`config/installation_config.yml`) → oracle chạy đường multipart. FE yona giữ đúng mặc định đó: **gửi thẳng File qua `attachments[]`, không gọi endpoint này**. Endpoint tồn tại để giữ đủ mặt tiền API như gốc.

### 3. Shape một attachment (trong `message.attachments[]`, cả REST lẫn realtime)

```json
{
  "id": 12,
  "message_id": 34,
  "file_type": "image",          // image|audio|video|file|location|fallback|share|story_mention|contact|ig_reel|ig_post|ig_story|embed
  "account_id": 2,
  "extension": "png",
  "content_type": "image/png",
  "data_url": "http://localhost:8000/storage/attachments/2/01J....png",
  "thumb_url": "http://localhost:8000/storage/attachments/2/01J....png",
  "file_size": 1234,
  "width": 640,
  "height": 480
}
```
- `file_type` là **tên chuỗi** (không phải số) — y `push_event_data` gốc.
- `thumb_url` = `data_url` với ảnh, `""` với loại khác (khác biệt cố ý: chưa resize 250px, xem mục Khác biệt).
- `width`/`height` chỉ có với ảnh (đọc bằng `getimagesize`), loại khác `null`.
- Realtime B4 (`message.created`/`updated`) mang **cùng** mảng này (`Message::pushEventData`) → FE hiển thị được ngay không cần fetch lại.

### 4. Giới hạn (`config/limits.php`)

| Khóa | Giá trị | Nguồn |
|---|---|---|
| `maximum_file_upload_size` | 40 (MB) | `MAXIMUM_FILE_UPLOAD_SIZE` installation config |
| `number_of_permitted_attachments` | 15 | `Message::NUMBER_OF_PERMITTED_ATTACHMENTS` |
| `url_length_limit` | 2048 | `Limits::URL_LENGTH_LIMIT` |

Vượt 15 tệp → 422 `{"error":"Attachments exceeded maximum allowed"}`.
**Kiểm loại tệp + kích thước chỉ chạy với inbox `Channel::WebWidget`** (đúng gốc `should_validate_file?`) — inbox API/`api-test` KHÔNG bị chặn phía server. FE vẫn tự chặn 40MB như `useFileUpload` gốc.

### 5. i18n

**Không thêm khóa nào** vào `lang/en/conversation.php` — lỗi backend là chuỗi thuần như gốc (`errors.add(:file, 'type not supported')`), còn khóa FE (`FILE_SIZE_LIMIT`, `FILE_TYPE_NOT_SUPPORTED`, `UPLOADING_ATTACHMENTS`, `SHARED_ATTACHMENT.*`, `DOWNLOAD`, `UNKNOWN_FILE_TYPE`) đã có sẵn từ B3. `b9-fe` tự do sửa file đó, `b9-be` không đụng.

---

## Trace Ruby ↔ PHP (backend B9)

| Nguồn Chatwoot | Đích Laravel | Ghi chú |
|---|---|---|
| `app/models/attachment.rb` (enum `file_type` 13 giá trị, `ACCEPTABLE_FILE_TYPES`, `ACCEPTABLE_FILE_EXTENSIONS`, `GENERIC_FILE_CONTENT_TYPES`) | `app/Models/Attachment.php` | Enum → hằng `FILE_TYPE_*` + map `FILE_TYPES` (name ↔ int) như cách Message/Conversation đã làm |
| `Attachment#push_event_data` + `metadata_for_file_type` (location/fallback/contact/audio/embed/file) | `Attachment::pushEventData()` + `metadataForFileType()` | Đủ 6 nhánh. BỎ nhánh `instagram_incoming_message?` (driver Meta chưa port) |
| `Attachment#file_url` / `download_url` / `thumb_url` / `with_attached_file?` | `fileUrl()` / `downloadUrl()` / `thumbUrl()` / `withAttachedFile()` | ActiveStorage → `Storage::disk($disk)->url($path)`; '' khi chưa gắn tệp như gốc |
| `before_save :set_extension` | `Attachment::saving` → `setExtension()` | `File.extname(filename)` → `pathinfo(..., PATHINFO_EXTENSION)`, rỗng → null |
| `validate :acceptable_file` + `should_validate_file?` + `validate_file_size` + `validate_file_content_type` | `validateFile()` (public) + `shouldValidateFile()` + `validateFileSize()` + `validateFileContentType()` | Giữ nguyên cổng `Channel::WebWidget`; lỗi ném `MessageValidationException` (controller → 422) thay `errors.add` |
| `validates :external_url, length: { maximum: Limits::URL_LENGTH_LIMIT }` | `validateExternalUrlLength()` + migration nới cột | Cột A4 là varchar(255) → migration `2026_09_06_300000` đổi `external_url`/`fallback_title` sang varchar không giới hạn (Rails `string`) |
| `FileTypeHelper#file_type` / `image_file?` / `video_file?` | `Attachment::fileTypeFor()` | Cùng danh sách content-type |
| `ActiveStorage` (blob + attach) | `Attachment::storeUpload()` / `signUpload()` / `resolveSignedUpload()` | Một chỗ lưu tệp dùng chung cho multipart lẫn direct upload; `signed_id` = payload mã hóa `Crypt`, ràng `account_id` |
| `Message#attachments` (`has_many … dependent: :destroy, autosave: true`) | `Message::attachments()` (morphMany) + `Message::$pendingAttachments` + `persistPendingAttachments()` + hook `deleting` | `pendingAttachments` lưu ngay trong lượt `created`, TRƯỚC các callback after_create_commit → payload realtime đã có tệp (autosave của Rails) |
| `before_add: :validate_attachments_limit` + `NUMBER_OF_PERMITTED_ATTACHMENTS = 15` | `Message::guardAttachmentsLimit()` + `config('limits.number_of_permitted_attachments')` | Một nguồn duy nhất, builder gọi trước mỗi tệp |
| `messages/message_builder.rb#process_attachments` + `attachment_file_type` + `tag_voice_message` | `MessageBuilder::buildAttachments()` / `buildAttachment()` / `tagVoiceMessage()` | Nhận `UploadedFile` hoặc chuỗi signed_id; kiểm tệp TRƯỚC khi lưu tin, hỏng thì xóa tệp đã ghi và không đẻ tin |
| `api/v1/models/_attachment.json.jbuilder` + `_message.json.jbuilder` (`json.attachments … if present?`) | `MessageResource::attachmentsPayload()` | Dùng chung cho `toArray()` và `pushEventData()`; vắng khóa khi không có tệp |
| `Api::V1::…::DirectUploadsController` | `app/Http/Controllers/WebApi/Conversations/DirectUploadsController.php` + route `web_api.php` | Gộp 2 bước ActiveStorage thành 1 POST multipart (mục 2 phần contract) |
| `lib/limits.rb` + installation config `MAXIMUM_FILE_UPLOAD_SIZE` | `config/limits.php` | `url_length`, `maximum_file_upload_size`, `number_of_permitted_attachments` |
| morph map | `AppServiceProvider` thêm `'Message' => Message::class` | `attachable_type` ghi tên ngắn kiểu Ruby, đồng bộ với `User`/`Contact`/`Inbox` đã có |

## Spec ↔ Pest

| RSpec | Pest |
|---|---|
| `spec/models/attachment_spec.rb` | `tests/Feature/Models/AttachmentTest.php` (24) |
| `spec/models/message_spec.rb` phần attachment | `tests/Feature/Models/MessageTest.php` — describe `attachments` (3) |
| `spec/builders/messages/message_builder_spec.rb` phần attachment/voice | `tests/Feature/Builders/MessageBuilderTest.php` — describe `attachment messages` (7) |
| `spec/controllers/…/messages_controller_spec.rb` phần attachment | `tests/Feature/WebApi/ConversationMessagesControllerTest.php` — describe `POST messages with attachments` (7) |
| `spec/controllers/…/direct_uploads_controller_spec.rb` | `tests/Feature/WebApi/Conversations/DirectUploadsControllerTest.php` (7) |

Case cắt: mọi kịch bản Instagram (story_mention / ig_reel / instagram_direct_message), `ActiveStorage::UnrepresentableError`, AgentBot token, feature `api_and_webhooks` — đều thuộc nhóm chưa port, ghi ở đầu từng file test.

## Khác biệt cố ý

1. **`thumb_url` không resize.** Gốc trả biến thể `resize_to_fill: [250, nil]` qua ActiveStorage; yona chưa có pipeline biến thể ảnh nên trả đúng URL gốc (ảnh) / `""` (loại khác). FE hiển thị đúng, chỉ tốn băng thông ở thumbnail.
2. **`file_url` không qua redirect 301.** Gốc là `/rails/active_storage/blobs/redirect/…`; yona trả thẳng URL đĩa `public` (`/storage/attachments/{account_id}/…`) như avatar A4. Hệ quả: URL đoán được nếu biết tên tệp ngẫu nhiên 40 ký tự — cùng mức bảo vệ như avatar hiện tại.
3. **`direct_uploads` gộp 2 bước thành 1.** Không có ActiveStorage nên không có bước "tạo blob rồi PUT tệp"; `signed_id` là payload `Crypt` chứa path + metadata + account_id.
4. **Tệp direct upload không được gắn vào tin sẽ nằm lại trên đĩa** (giống blob mồ côi của ActiveStorage, gốc có job dọn định kỳ — chưa port). Đường multipart không có rác: tệp bị validate chặn được xóa ngay.
5. **`width`/`height` đọc bằng `getimagesize`** lúc nhận tệp và lưu vào `meta`, thay `blob.metadata` do ActiveStorage analyzer sinh.
6. **Lỗi validate là chuỗi thuần** (`File type not supported`, `File size is too big`, `Attachments exceeded maximum allowed`, `External url is too long (maximum is 2048 characters)`) — không có prefix `Validation failed:` của Rails.
7. **Kiểm tệp chỉ chạy với `Channel::WebWidget`** đúng như gốc; hiện chưa có driver kênh đó nên đường API/`api-test` không bị chặn phía server. Test dựng inbox `channel_type = 'Channel::WebWidget'` để chạy nhánh này.

## Ghi chú vận hành

- `ConversationResource` (danh sách hội thoại) nhúng tin cuối qua `MessageResource::pushEventData` → mỗi hội thoại nạp thêm 1 truy vấn attachments. `MessagesController@index` đã `->load('attachments')` nên màn chat không N+1; nếu danh sách hội thoại chậm thì eager-load ở `ConversationFinder` (ngoài phạm vi B9).
- Gate đã chạy: `vendor/bin/pest` **696/696 xanh**, `pint --dirty` sạch, `route:list` có `direct_uploads`, curl thật (John, account 2, conversation 4) gửi 1 ảnh + 1 PDF → 200, đọc lại thấy `attachments`, mở URL trả về ra đúng tệp (200, `image/png` 281B / `application/pdf` 193B); direct upload → signed_id → gắn vào tin cũng 200. Dữ liệu test đã xóa: conversation 4 còn đúng 5 tin (id 3–7), `last_activity_at = 2026-09-01 06:11:52`, không còn bản ghi attachment nào và thư mục `storage/app/public/attachments` đã dọn.
- **Bẫy môi trường:** DB test `yona_rw_test` và thư mục `Storage::fake` dùng chung giữa các phiên agent chạy song song — hai lượt `pest` chồng nhau làm bên kia thấy `relation "accounts" does not exist` / deadlock lúc `migrate:fresh`. Muốn chạy suite lúc có agent khác, đặt DB riêng: `DB_DATABASE=<db> vendor/bin/pest` (env shell thắng `phpunit.xml`), nhớ `CREATE EXTENSION pg_trgm, pgcrypto` cho DB đó.

### Dọn dữ liệu curl — trạng thái bàn giao

Tin curl của `b9-be` (id 92, 93) đã xóa lúc 19:16, conversation 4 khi đó về đúng 5 tin (3–7) + `last_activity_at = 2026-09-01 06:11:52` + 0 attachment + thư mục `storage/app/public/attachments` rỗng (đã xác nhận).

Sau đó agent `b9-fe` tự tạo tin test của họ trên cùng hội thoại (id 95, 96 với `b9-anh.png` / `b9-tailieu.pdf`, 19:22–19:23) — **không xóa** vì họ đang chạy dở. Khi B9 xong, dọn nốt bằng:

```bash
php artisan tinker --execute="
App\Models\Message::where('conversation_id', App\Models\Conversation::where('account_id',2)->where('display_id',4)->value('id'))->where('id','>',7)->get()->each->delete();
App\Models\Conversation::where('account_id',2)->where('display_id',4)->toBase()->update(['last_activity_at'=>'2026-09-01 06:11:52','updated_at'=>'2026-09-01 06:11:52']);"
```

(Hook `deleting` của Message xóa luôn attachment + tệp trên đĩa.)
