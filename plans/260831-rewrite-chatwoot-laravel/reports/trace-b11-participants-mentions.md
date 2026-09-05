# Trace B11 — Participants + Mentions + Bảng liên hệ

Ngày: 06/09/2026. Phiên đơn `yona-6d` (QA + e2e) + 4 agent (3 song song, 1 đợt dọn cuối). Chi tiết trong 4 note: [b11-notes-be.md](b11-notes-be.md), [b11-notes-fe-panel.md](b11-notes-fe-panel.md), [b11-notes-fe-mentions.md](b11-notes-fe-mentions.md), [b11-notes-fe-finish.md](b11-notes-fe-finish.md).

## Kiến trúc chốt

| Chatwoot | Yona | Ghi chú |
|---|---|---|
| `conversation_participants` + `mentions` | cùng bảng, cùng chỉ mục/unique | `Conversation::addParticipant()` là **cổng duy nhất** tạo participant, dùng chung cho controller, dịch vụ mention và listener gán việc |
| `mention_service.rb` | `App\Services\Messages\MentionService` + `UserMentionJob`, gọi từ `NotificationListener::messageCreated` | **cú pháp mention là liên kết markdown `[@Tên](mention://user/{id}/{tên})`** trong nội dung, không phải thuộc tính HTML; điều kiện: ghi chú riêng tư + nội dung khác rỗng |
| `conversation_finder` nhánh `mention`/`participating` | `ConversationFinder::filterByConversationType()` nối thật (B8 để khung rỗng) | |
| `contact_merge_action.rb` | `App\Actions\ContactMergeAction` + `POST /actions/contact_merge` (`{base_contact_id, mergee_contact_id}`) | thứ tự gộp: hội thoại → tin nhắn → liên kết hộp thư → ghi chú; phần cuộc gọi là EE nên bỏ |
| `contacts/notes_controller` + `models/note.rb` | bảng `notes` + `Note` + `Contacts\NotesController` (phiên chính port bổ sung) | thiếu nó thì nút "+ Add contact note" không dựng được và bảng ghi chú lệch 2,2% |
| `contacts/conversations_controller` | `Contacts\ConversationsController` (phiên chính port bổ sung) | 20 hội thoại gần nhất, dùng lại đúng phép lọc quyền hộp thư của danh sách chính |
| `conversations#attachments` | `ConversationsController::attachments` (phiên chính port bổ sung) | 15 tệp/trang, mới nhất trước; nạp ở mức hội thoại như store gốc, không nạp theo accordion |
| `ContactNotes.vue`, `SharedFiles.vue`, `ContactConversations.vue`, `ConversationParticipant.vue`, `ConversationInfo.vue`, `CustomAttributes` | cùng tên trong `conversationbox/contact/**` | 6 accordion vốn rỗng từ B3 nay có thân thật |

## Gate (phiên chính chạy 06/09)

1. **Pest 820/820** (1911 assertion) · vitest **241/241** (33 file) · tsc · build · pint · `i18n:generate --check` — xanh.
2. Trace: file này + 4 note.
3. **Pixel-diff**: **cả 6 accordion 0.000%** ở light lẫn dark (gồm Contact Notes, trước khi có nút thêm ghi chú lệch 2,2%/2,3%); popup `@` 0.000%; trang Mentions 0.030%/0.031%; màn hội thoại hồi quy 0.006%.
4. **Audit nút**: danh sách nút không phản ứng trùng oracle (id sao chép, phóng to, kẹp giấy, ảnh đại diện panel), khác biệt duy nhất còn lại là mic.
5. **E2e**: ghi chú riêng tư gõ `@` → chọn Samantha → gửi → bong bóng hiện `@Samantha` → mục Mentions của Samantha có hội thoại → mở thẻ ra đúng URL `/mentions/conversations/4`; thêm/xóa ghi chú liên hệ và giữ sau khi tải lại; tab Attachments hiện tệp đã gửi; Previous Conversations hiện hội thoại của liên hệ; gộp hai liên hệ tạm → hội thoại dồn về hồ sơ gốc.

## Việc phiên chính làm thêm

1. Port bảng `notes` + model + controller + resource, endpoint hội thoại của liên hệ, endpoint tệp của hội thoại (3 endpoint mà bảng bên phải cần) — kèm 15 test Pest mới.
2. Giao agent dọn cuối nối 3 endpoint đó vào giao diện và **gộp danh sách Mentions về `ConversationContext`**, xóa store thứ hai `useMentionConversations`: `conversationType` trở thành thuộc tính của provider như `inboxId`/`teamId`/`label`, hai hàm dựng truy vấn trùng nhau gom về một. Nhờ vậy danh sách mention nhận đủ mọi sự kiện thời gian thực, không chỉ sự kiện nhắc tên.

## Khác biệt cố ý / nợ

- Thông báo trong ứng dụng khi bị nhắc tên (chuông, huy hiệu "My Inbox") chờ nhóm thông báo D5 — đây là phần lệch duy nhất còn lại trên trang Mentions so với bản gốc.
- Thuộc tính tùy biến của liên hệ chờ E1; sự kiện thời gian thực `contact.merged` chưa có handler; menu chuột phải trong Previous Conversations chờ mở rộng.
- Popup `@` và `/` vẫn nằm trong thư mục trình soạn thảo thay vì thư mục picker dùng chung của bản gốc — chuyển khi port picker biến và emoji.
- Participant chỉ được thêm khi **được giao hội thoại** hoặc **được nhắc tên**; bản gốc không có đường "trả lời thì thành người tham gia" (đã kiểm nguồn).

## Bẫy đã trả giá

1. **Cú pháp mention khác giả định ban đầu**: brief nói thuộc tính HTML, source thật là liên kết markdown `mention://user/{id}/{tên}`. Luôn đọc dịch vụ parse trước khi sinh nội dung.
2. **Trạng thái mở/đóng accordion nằm trong cài đặt người dùng**: kịch bản đo mở accordion bằng cách bấm tiêu đề, chạy lần hai không đặt lại thì lại đóng vào — phải chạy `reset-fixture.sh` ngay trước mỗi lần đo.
3. Ba agent cùng ghi vào chính hội thoại dùng để đo khiến hai lần đo đầu lệch 3–7% hoàn toàn do dữ liệu, không phải do mã.
4. `pint --dirty` khi nhiều agent chạy song song sẽ định dạng cả tệp của agent khác — chạy pint theo danh sách tệp.
