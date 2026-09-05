# B9 Attachments — ghi chú frontend (`b9-fe`)

Nguồn: Chatwoot v4.17.1 (`refs/chatwoot`). Ngày port: 06/09/2026.
Contract backend đọc từ `b9-notes-be.md` (mục 1 và 3) — khớp, không phải sửa gì phía FE để thích nghi.

## Vue ↔ React

| Nguồn Chatwoot | Đích Yona | Ghi chú |
|---|---|---|
| `api/inbox/message.js#buildCreatePayload` | `conversation/api.ts#buildCreateForm` + `sendMessage` | có `files` → multipart `attachments[]`; không có → giữ nguyên JSON như B3. `cc_emails`/`bcc_emails`/`to_emails` (F1) và `is_voice_message` (ghi âm) chưa gửi |
| `helper/apiClient` (mới) | `helper/apiClient.ts#postForm` | POST multipart, đặt cạnh `putForm` sẵn có — một chỗ dựng request duy nhất |
| `ReplyBox.vue` phần `getMessagePayload` + `attachFile`/`removeAttachment` | `conversationbox/ReplyBox.tsx` | gộp mọi tệp vào MỘT tin (kênh API không tách chữ/tệp như IG/TikTok/WhatsApp); bỏ toast tạm của B3 |
| `ReplyBox.vue#setReplyMode` | cùng file | đổi giữa Reply ↔ Note thì xoá đính kèm đang chờ (đúng gốc) |
| `Message.vue#componentToRender` (nhánh đính kèm) | `components-next/message/helpers/attachments.ts#resolveBubbleName` + bảng `BUBBLE_COMPONENTS` trong `Message.tsx` | tách phần thuần ra helper để test được |
| `bubbles/Image.vue` | `components-next/message/bubbles/Image.tsx` | + `composables/loadWithRetry.js` → `helpers/useLoadWithRetry.ts` |
| `bubbles/Video.vue` | `bubbles/Video.tsx` | bỏ state `hasError` (gốc chỉ emit ra ngoài, template không đọc) |
| `bubbles/Audio.vue` | `bubbles/Audio.tsx` | |
| `bubbles/File.vue` + `bubbles/BaseAttachment.vue` | `bubbles/File.tsx` + `bubbles/BaseAttachment.tsx` | slot `icon`/default của Vue → prop `iconSlot`/`children` |
| `bubbles/Fallback.vue` | `bubbles/Fallback.tsx` | |
| `bubbles/Text/FormattedContent.vue` | `bubbles/FormattedContent.tsx` | tách khỏi `Text.tsx` để `Fallback` dùng chung (gốc cũng là file riêng) |
| `bubbles/Text/Index.vue` | `bubbles/Text.tsx` | thêm `AttachmentChips` |
| `chips/AttachmentChips.vue` + `chips/{Image,Video,Audio,File}.vue` | `components-next/message/chips/*.tsx` | nhóm chip tính bằng `groupAttachmentChips` |
| `components-next/icon/FileIcon.vue` | `components-next/icon/FileIcon.tsx` | giữ đúng đường dẫn gốc (file mới, không đụng file ai) |
| `components/widgets/conversation/components/GalleryView.vue` | cùng đường dẫn `.tsx` | `TeleportWithDirection` bỏ (Modal của ta đã phủ toàn màn hình); phím Esc/←/→ qua `useKeyboardEvents` sẵn có |
| `composables/useImageZoom.js` | `components/widgets/conversation/components/useImageZoom.ts` | ref→state, computed→useMemo; giữ nguyên hằng số + công thức |
| `provider.js#filteredCurrentChatAttachments` | `provider.tsx` + `MessageList.tsx` prop `chatAttachments` | getter store gốc → `MessagesView` tính rồi truyền xuống |
| `constants.js` `ATTACHMENT_TYPES`/`MEDIA_TYPES` | `components-next/message/constants.ts` | |
| `MessagesView.vue#fetchAllAttachmentsFromCurrentChat` | `MessagesView.tsx` (`collectMediaAttachments`) | **chưa gọi API** — xem mục Khác biệt #1 |

Thêm khai báo `downloadFile`/`getFileInfo`/`debounce`/`calculateCenterOffset`/`applyRotationTransform`/`normalizeToPercentage` vào `resources/js/types/chatwoot-prosemirror-schema.d.ts` (file này `declare module '@chatwoot/utils'` nên **che** d.ts thật của package — thiếu khai báo là tsc báo "has no exported member" dù package có đủ).

## i18n

**Không thêm khoá nào.** `CONVERSATION.DOWNLOAD`, `UNKNOWN_FILE_TYPE`, `SHARED_ATTACHMENT.FILE`, `NO_CONTENT`, `UPLOADING_ATTACHMENTS`, `FILE_SIZE_LIMIT`, `COMPONENTS.MEDIA.{IMAGE_UNAVAILABLE,LOADING_FAILED}`, `GALLERY_VIEW.ERROR_DOWNLOADING` đã có từ B3 → không chạy `artisan i18n:generate`.

## Test

`npx tsc --noEmit` sạch (chỉ còn lỗi của `conversation/labelHelpers.test.ts` — file đang sửa dở của `b7-fe`), `npm run build` xanh, `npx vitest run` **21 file / 163 test** xanh. Test mới:

| File | Nội dung |
|---|---|
| `components-next/message/helpers/attachments.test.ts` | `resolveBubbleName` (image/video/ig_reel/audio/file/fallback, có chữ → text, nhiều tệp → text, loại chưa port → text), `groupAttachmentChips` (thứ tự ảnh trước video), `collectMediaAttachments` (chỉ tin `sent`, bù `created_at`/`sender`) |
| `shared/helpers/FileHelper.test.ts` | `formatBytes`, `checkFileSizeLimit` (biên đúng 40MB), lọc danh sách tệp, `fileSizeInMegaBytes` |

## E2E trình duyệt (`~/www/pixel-diff/b9-attachments-e2e.mjs`)

yona, account 2, conversation 4, john@acme.inc:

- chọn tệp qua nút 📎 → preview hiện đúng tên; gửi → `POST /messages` **200**, `private=false`, `attachments=1`; preview tự xoá.
- ảnh → `[data-bubble-name="image"]`, `GET data_url` = `200 image/png`.
- PDF → `[data-bubble-name="attachment"]` ("John has shared a file" + nút Download), `GET` = `200 application/pdf`.
- chữ + ảnh cùng tin → `[data-bubble-name="text"]` có chip ảnh (đúng gốc: >1 đính kèm hoặc có chữ thì KHÔNG lên bubble media).
- bấm bubble ảnh → gallery mở, đủ **6 nút header** (zoom in/out, xoay trái/phải, tải, đóng), footer `1 / 1`, Esc đóng.

Đường lỗi (`b9-error-probe.mjs`): gửi 16 tệp → **422** `{"error":"Attachments exceeded maximum allowed"}` → toast hiện đúng câu chữ backend, **preview giữ nguyên**, nút gửi bật lại.

## Pixel-diff (`~/www/pixel-diff/b9-attachments-diff.mjs`) — gửi cùng 2 tệp hai bên trước khi đo

| Bubble | light | dark |
|---|---|---|
| ảnh | **0.091%** (21 px) | 1.543% (355 px) |
| text + chip ảnh | 1.282% (280 px) | 1.859% (406 px) |
| tệp | **LỆCH KÍCH THƯỚC** 280×175 (oracle) vs 323×175 (yona) | như light |

- **ảnh dark 1.5%**: đo `getBoundingClientRect` hai bên **giống hệt** (184×124, top 197.5625, radius `12px 12px 2px`, ảnh 160×100), màu nền bubble giống hệt; lệch nằm gọn ở **hàng 0 và hàng 124** (mép trên/dưới) = pha nửa pixel khi chụp phần tử có toạ độ lẻ. Light chỉ 0.09% vì tương phản nền/bubble nhỏ nên pixelmatch bỏ qua. Không phải lệch style.
- **chip 1.3–1.9%**: toàn bộ lệch nằm ở **dòng dấu thời gian** (`2:29 AM` vs `2:26 AM`) — trạng thái sống, không phải lệch code.
- **bubble tệp**: xem Blocker #1.

## CẦN `b9-be` XỬ LÝ

1. **`data_url` phải kết thúc bằng tên tệp gốc.** Gốc dùng ActiveStorage `url_for(file)` → URL kết thúc bằng tên người dùng tải lên, và `bubbles/File.vue` + `chips/File.vue` **đọc tên tệp từ chính URL** (`getFileInfo(dataUrl)`), không có trường `filename` trong payload. Backend Yona trả `.../attachments/2/0hBZ1mn5wCfNCRocamW9nmWyELdFYtbxsDHhwIwJ.pdf` → bubble hiện chuỗi băm thay vì `b9-tailieu.pdf`, và bubble **rộng ra 323px** thay vì 280px (pixel-diff không đo được). Cột `filename` đã lưu tên gốc (`Attachment::createFromUpload`) — chỉ cần `fileUrl()` trả URL kết thúc bằng nó.
2. **`(bool) ($this->params['private'] ?? false)` trong `MessageBuilder::messageParams()` hiểu sai multipart.** Form-data luôn gửi chuỗi; `(bool) 'false'` = `true` trong PHP → mọi tin có tệp thành ghi chú riêng tư. Rails ép kiểu boolean đúng nên gốc không dính. FE đã né bằng cách gửi `'1'/'0'` (theo quy ước multipart của repo, xem `settings/inboxes/Show.tsx`), nhưng client ngoài đi theo tài liệu Chatwoot sẽ gửi `"false"` và vẫn dính — nên sửa ở backend (`filter_var(..., FILTER_VALIDATE_BOOLEAN)` hoặc `$request->boolean()`).
3. Chưa có `GET /api/v1/accounts/{id}/conversations/{displayId}/attachments` (`ConversationApi.getAllAttachments`) — xem Khác biệt #1.

## Khác biệt cố ý (ghi để B10+ không "sửa giùm")

1. **Gallery chỉ duyệt media của các tin ĐANG nạp**, không phải cả hội thoại: gốc gọi `fetchAllAttachments` khi mở/đổi hội thoại rồi ghép thêm tin mới (`ADD_CONVERSATION_ATTACHMENTS`). Endpoint chưa có nên `MessagesView` chỉ chạy nửa sau (`collectMediaAttachments(messages)`). Khi backend mở endpoint: thêm `fetchConversationAttachments` vào `conversation/api.ts` và ghép hai nguồn (dedup theo `id`).
2. **Tin CÓ tệp không có bubble "đang gửi" (status `progress`).** `sendReply` của `ConversationContext.tsx` chỉ nhận `{content, isPrivate}` và file đó **thuộc `b7-fe-conversation`** trong phiên này nên không được sửa → `ReplyBox` gọi thẳng `sendMessage` của `api.ts`, chờ kết quả, xoá soạn thảo khi thành công, giữ preview + toast khi lỗi; bubble thật hiện qua realtime `message.created` (đã kiểm: hiện đúng 1 lần, không nhân đôi). **Việc cần làm sau khi B7 xong:** cho `sendReply` nhận thêm `files` rồi để `ReplyBox` dùng lại một đường gửi duy nhất — lúc đó bubble pending quay lại đúng gốc và bỏ được mục 3 dưới đây.
3. **Nhãn nút gửi đổi thành `CONVERSATION.UPLOADING_ATTACHMENTS` trong lúc upload** (gốc không có, vì gốc đã có bubble pending làm phản hồi). Gỡ khi mục 2 xong.
4. Chưa port: dán tệp từ clipboard (`onPaste` + `isFileTypeAllowedForChannel`), direct upload (`DIRECT_UPLOADS_ENABLED` mặc định tắt ở gốc — b9-be xác nhận), ghi âm (`AudioRecorder`), `transcribedText` trong chip Audio (Captain/EE), các bubble `Embed`/`Location`/`Contact`/`InstagramStory`/`Email`/`CSAT`/`Form` (kênh khác, nhóm C/F) — chúng rơi về bubble text như hiện trạng.
5. `timeStampAppendedURL` của `helper/URLHelper.js` viết cục bộ trong `chips/Audio.tsx` (4 dòng, chỉ chỗ này dùng) vì `helper/URLHelper.ts` ngoài phạm vi sửa của agent này.

## Dọn dẹp sau đo

`conversation 4` (yona, DB `yona_rw`) và `conversation 1` (oracle) đều còn **đúng 5 tin**, `last_activity_at = 2026-09-01 06:11:52`, `storage/app/public/attachments/2/` rỗng, blob oracle đã purge.
