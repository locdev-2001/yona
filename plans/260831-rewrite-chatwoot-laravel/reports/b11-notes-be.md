# B11 — note backend (participants + mentions + merge contact)

## HỢP ĐỒNG API (chốt cho `b11-fe-panel` và `b11-fe-mentions`)

### 1. Cú pháp nội dung mention — QUAN TRỌNG NHẤT

Backend parse **markdown link tới scheme `mention://`**, KHÔNG phải `data-mention-id`.
Nguồn: `refs/chatwoot/app/services/messages/mention_service.rb#mentioned_ids`.

Nội dung `content` của tin nhắn (plain text markdown, đúng thứ FE gửi lên
`POST /conversations/{display_id}/messages`) phải chứa:

```
[@Samantha](mention://user/12/Samantha)
[@Support Team](mention://team/3/Support Team)
```

Regex backend chạy trên `content`:
- user: `\(mention://user/(\d+)/(.+?)\)`
- team: `\(mention://team/(\d+)/(.+?)\)`

Chỉ phần trong ngoặc đơn có ý nghĩa — nhãn `[@Tên]` chỉ để hiển thị, backend
không đọc. Dấu ngoặc đơn đóng `)` kết thúc mention (regex non-greedy), nên tên
chứa `)` sẽ cắt sớm — đúng như bản gốc, đừng "sửa" ở FE.

Điều kiện để backend xử lý mention (cả ba phải đúng):
1. `private = true` (tin ghi chú riêng);
2. `content` khác rỗng;
3. có ít nhất một `mention://…` khớp regex.

Người được nhắc phải là **inbox member của inbox chứa hội thoại HOẶC administrator
của account**; ID không thỏa bị bỏ im lặng. Mention team được nở ra thành danh
sách user của team rồi lọc tiếp theo cùng luật đó.

Render phía FE: `[@Tên](mention://user/…)` hiển thị thành
`<span class="prosemirror-mention-node">@Tên</span>` (xem
`refs/chatwoot/app/javascript/shared/helpers/markdownIt/link.js`).

### 2. Participants

Base URL: `/api/v1/accounts/{accountId}/conversations/{display_id}/participants`

| Method | Body | Trả về |
|---|---|---|
| `GET` | — | mảng agent (payload `_agent.json.jbuilder`) của **tất cả** participant |
| `POST` | `{ "user_ids": [1,2] }` | mảng agent của **những người vừa được thêm** (đã là participant thì không nằm trong mảng) |
| `PATCH`/`PUT` | `{ "user_ids": [1,2] }` | mảng agent của **toàn bộ** participant sau khi đồng bộ (thêm người thiếu, xóa người không có trong danh sách) |
| `DELETE` | `{ "user_ids": [1] }` | `200` body rỗng |

Payload mỗi phần tử = shape agent quen thuộc:
`{id, account_id, availability_status, auto_offline, confirmed, email, provider,
available_name, custom_attributes, name, role, thumbnail}`.

Lỗi: user_id không nằm trong `assignable_agents` của inbox (inbox member +
administrator) → `422 {"error": "Invalid participant IDs"}`, **không thay đổi gì**
(áp cho `POST` và `PATCH`; `DELETE` không validate, chỉ bỏ qua id lạ).

Dashboard gốc chỉ gọi `GET` và `PATCH` (`fetchParticipants` / `updateParticipants`).

### 3. Tab Mentions / Participating

Dùng đúng endpoint danh sách hội thoại đang có, thêm tham số:

- `GET /api/v1/accounts/{id}/conversations?conversation_type=mention&assignee_type=all&status=open`
- `GET /api/v1/accounts/{id}/conversations?conversation_type=participating&…`
- `GET /api/v1/accounts/{id}/conversations/meta?conversation_type=…` cho bộ đếm.

Shape trả về không đổi (`data.payload` + `data.meta`). `conversation_type` lọc
TRƯỚC khi đếm nên `meta.*_count` bám theo tab đang chọn.

`mention` = có bản ghi trong bảng `mentions` cho user hiện tại;
`participating` = có bản ghi trong `conversation_participants`. Cả hai vẫn đi qua
bộ lọc quyền inbox: mất quyền vào inbox thì hội thoại biến khỏi danh sách.

### 4. Merge contact

`POST /api/v1/accounts/{accountId}/actions/contact_merge`
body `{ "base_contact_id": 3, "mergee_contact_id": 9 }`

- `base_contact_id` = hồ sơ GIỮ LẠI (primary), `mergee_contact_id` = hồ sơ bị gộp và xóa.
- Trả về **object contact** của base contact sau khi gộp (shape `_contact.json.jbuilder`,
  KHÔNG bọc trong `payload`), status 200.
- Hai id trùng nhau → không làm gì, trả về chính contact đó.
- Contact không thuộc account → 404 (`{"error":"Resource could not be found"}`).
- Sự kiện realtime `contact.merged` bắn tới token account với payload push của base contact.

### 5. Sự kiện realtime mới

`conversation.mentioned` — bắn RIÊNG tới `pubsub_token` của user được nhắc, payload
= push data của conversation (giống `conversation.updated`). Dùng để hiện toast /
tăng badge tab Mentions.

---

## Bảng trace Ruby ↔ PHP

| Chatwoot | Yona | Ghi chú |
|---|---|---|
| `db/schema.rb` `conversation_participants`, `mentions` | `database/migrations/2026_09_06_600000_create_participants_and_mentions_tables.php` | đúng cột + `unique(user_id, conversation_id)` + 3 index đơn, `timestamps(6)` |
| `app/models/conversation_participant.rb` | `app/Models/ConversationParticipant.php` | `ensure_account_id` → hook `saving`; `ensure_inbox_access` chuyển thành cổng chung `Conversation::addParticipant()` |
| `app/models/mention.rb` | `app/Models/Mention.php` | `after_commit :notify_mentioned_user` → hook `saved` (create + update); scope `latest` |
| `app/models/mention.rb#last_user_message_at` | `Mention::scopeLastUserMessageAt` | dựa lại trên `Conversation::scopeLastUserMessageAt` đã port ở B8 |
| `participants_controller.rb` | `app/Http/Controllers/WebApi/Conversations/ParticipantsController.php` | show/create/update/destroy + `notify_unread_count_change` (gate 2 cờ) |
| `app/listeners/participation_listener.rb` | `app/Listeners/ParticipationListener.php` | assignee đổi → thành participant |
| `app/services/messages/mention_service.rb` | `app/Services/Messages/MentionService.php` | gọi từ `app/Listeners/NotificationListener.php#messageCreated` như gốc |
| `app/jobs/conversations/user_mention_job.rb` | `app/Jobs/Conversations/UserMentionJob.php` | tạo mới hoặc cập nhật `mentioned_at` |
| `conversation_finder.rb#filter_by_conversation_type` | `ConversationFinder::filterByConversationType()` | thay khung rỗng của B8 bằng truy vấn thật |
| `app/actions/contact_merge_action.rb` | `app/Actions/ContactMergeAction.php` | thứ tự gộp: conversations → messages → contact_inboxes → (notes: chưa có model) |
| `actions/contact_merges_controller.rb` | `app/Http/Controllers/WebApi/Actions/ContactMergesController.php` | đường dẫn `/actions/contact_merge` (KHÔNG phải `contacts/{id}/merge`) |

## Khác biệt cố ý

1. **`Mention` after_commit**: bản gốc bắn `conversation.mentioned` cho mọi lần
   commit — kể cả khi bản ghi bị xóa theo `destroy_async` lúc xóa user/hội thoại.
   Ở đây chỉ bắn khi tạo/cập nhật (`saved`); phát sự kiện "được nhắc" cho một hội
   thoại vừa bị xóa không có ý nghĩa nghiệp vụ nào.
2. **`ensure_inbox_access`**: gốc là validation trên model (raise `RecordInvalid`
   ở đường `create!`, im lặng ở `find_or_create_by`). Ở đây gom về một cổng duy
   nhất `Conversation::addParticipant()` trả `null` khi user không được phép; nơi
   cần báo lỗi (controller) tự validate trước và trả 422 như gốc.
3. **Thông báo `conversation_mention`** (`NotificationBuilder`) chưa port — model
   `Notification` thuộc nhóm D2. `MentionService` đã chừa đúng chỗ gọi.
4. **`merge_contact_notes`** bỏ: chưa có model `Note` (tính năng nhóm sau).
   `merge_calls` là EE nên bỏ hẳn.
5. **`FilteredCountInvalidator`** (`invalidate_filtered_unread_count_visibility`)
   không port — B8 đã chốt bỏ tầng cache Redis của bộ đếm.

## Bẫy đã trả giá

1. **Giao hội thoại tự tạo participant.** `ParticipationListener` chạy đồng bộ ở
   Yona (bản gốc qua `EventDispatcherJob.perform_later`, nên spec Rails không
   thấy). Hệ quả: test bộ lọc `participating` không còn "rỗng khi chưa thao tác"
   — mọi hội thoại đang gán cho mình đã nằm sẵn trong tab. Đây là hành vi ĐÚNG của
   bản gốc lúc chạy thật, chỉ khác ở môi trường test.
2. **`scope :latest` của Mention đụng `Builder::latest()`** có sẵn của Eloquent
   (scope thua method thật) — đổi tên thành `latestMentioned()`.
3. **`Account::feature_flags` không nằm trong `$fillable`** — bật cờ trong test
   phải dùng `forceFill([...])->save()`, `update()` im lặng bỏ qua.
4. **`jsonb` không giữ thứ tự khóa** — so `custom_attributes` sau merge phải so
   từng khóa, không so nguyên mảng.
5. **`Mention.last_user_message_at`** xếp `message_type` ASC rồi `created_at` ASC:
   hội thoại có tin cuối là *incoming cũ nhất* lên đầu, không phải mới nhất.

## Gate đã chạy (06/09)

- **Pest toàn suite trên DB riêng `yona_rw_test_b11`**: 805/805 (1859 assertion) — xanh.
  (Trước B11: 758 test. Thêm 47 test: participants 14, mention model 6, mention
  service 9, mention job 3, participation listener 3, merge action 6, merge
  controller 3, finder +3.)
- **`pint`** trên danh sách file của B11 — xanh.
- **`route:list`**: 4 route participants + 1 route `actions/contact_merge`.
- **curl thật** (token John, account 2, conversation display 4):
  - `GET participants` → `[]`; `POST {"user_ids":[6]}` → `[sam@acme.inc]`;
    `GET` → `[sam@acme.inc]`; `POST {"user_ids":[999]}` → 422
    `{"error":"Invalid participant IDs"}`; `DELETE` → 200, `GET` → `[]`.
  - note riêng của John `kiem thu B11 [@Samantha](mention://user/6/Samantha) xem giup`
    → bảng `mentions` có 1 dòng (user 6, conversation 4, account 2);
    `GET /conversations?conversation_type=mention` bằng token Samantha trả về
    hội thoại 4 (`meta.all_count = 1`); `conversation_type=participating` cũng trả về 4.
  - tạo 2 contact tạm (B11 Base có email, B11 Mergee có phone + 1 hội thoại) →
    `POST /actions/contact_merge` → trả về contact base kèm `phone_number` của
    mergee, mergee bị xóa, hội thoại + contact_inbox chuyển sang base.
  - Dọn sạch: xóa contact tạm (cascade hội thoại), xóa note thử, xóa `mentions` +
    `conversation_participants`, rồi `~/www/pixel-diff/reset-fixture.sh`
    (yona hội thoại [4]/5 tin ↔ oracle hội thoại [1]/5 tin).
- DB test riêng `yona_rw_test_b11` đã DROP sau khi xong.

## Nợ để lại cho nhóm sau

- Thông báo in-app `conversation_mention` (`NotificationBuilder`) — D2.
- `merge_contact_notes` — chờ model `Note`.
- Sắp xếp danh sách Mentions theo `last_user_message_at` chưa nối vào
  `ConversationFinder::SORT_OPTIONS` (bản gốc cũng chưa dùng ở dashboard).
