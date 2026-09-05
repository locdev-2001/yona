# B8 — Backend: bộ lọc + unread + tabs (agent `b8-be`)

## HỢP ĐỒNG API (chốt cho `b8-fe` — đọc mục này trước)

Tất cả dưới tiền tố `/api/v1/accounts/{accountId}` (mặt tiền `routes/web_api.php`).

| Endpoint | Method | Body vào | Trả về | Ghi chú |
|---|---|---|---|---|
| `/conversations/{displayId}/update_last_seen` | POST | — | `204 No Content` | Đánh dấu ĐÃ ĐỌC. Ghi `agent_last_seen_at`; ghi thêm `assignee_last_seen_at` khi người gọi CHÍNH LÀ assignee. **Có throttle**: không còn tin chưa đọc + mốc seen còn mới (< 1 giờ) ⇒ KHÔNG ghi DB, vẫn trả 204. |
| `/conversations/{displayId}/unread` | POST | — | `204 No Content` | Đánh dấu CHƯA ĐỌC. Đặt cả `agent_last_seen_at` lẫn `assignee_last_seen_at` = `created_at` của tin **incoming cuối** trừ 1 giây; không có tin incoming nào ⇒ đặt cả hai về `NULL`. |
| `/conversations/unread_counts` | GET | — | `200 {"payload":{"all_count":n,"inboxes":{"<id>":n},"labels":{"<id>":n},"teams":{"<id>":n}}}` | Bộ đếm badge sidebar. **403** `{"error":"Conversation unread counts feature not enabled for this account"}` khi account chưa bật cờ `conversation_unread_counts`. |

Tham số MỚI cho `GET /conversations` và `GET /conversations/meta` (giữ nguyên shape trả về của B3):

- `conversation_type` = `unattended` \| `mention` \| `participating`.
  `unattended` chạy thật (`first_reply_created_at IS NULL` **OR** `waiting_since IS NOT NULL`).
  `mention`/`participating` trả **rỗng** cho tới B11 (chưa có bảng `mentions` / `conversation_participants`) — đúng bằng kết quả bản gốc khi chưa có bản ghi nào.
  Bộ lọc này áp TRƯỚC khi đếm ⇒ `meta.all_count` bám theo tab đang chọn, giống gốc.
- `sort_by` thêm giá trị `unread` (nhiều tin chưa đọc nhất trước, tiebreak `last_activity_at DESC`). Danh sách đầy đủ: `last_activity_at_asc|desc`, `created_at_asc|desc`, `priority_asc|desc`, `waiting_since_asc|desc`, `priority_desc_created_at_asc`, `unread`, + alias cũ `latest`, `sort_on_created_at`, `sort_on_priority`, `sort_on_waiting_since`.

Realtime:

- Event `conversation.unread_count_changed`, payload `{ account_id }` (rỗng như gốc — FE tự gọi lại `/unread_counts`). Chỉ bắn khi account bật cờ `conversation_unread_counts`.
- KHÔNG có event nào khác khi mark read/unread: bản gốc ghi bằng `update_columns` nên không có `conversation.updated`. FE phải tự hạ `unread_count` của card về 0 tại chỗ (giống store Chatwoot) — đây là hành vi gốc, không phải thiếu sót.

**CẢNH BÁO pixel-diff cho `b8-fe`:** oracle account 1 KHÔNG bật `conversation_unread_counts` (đã kiểm: `enabled_features` không chứa key này; `config/features.php` mặc định `false` hai bên). Badge unread ở sidebar (inbox/nhãn/team) vì thế KHÔNG hiện bên oracle. FE phải gate đúng cờ đó (`account.features.conversation_unread_counts`) — hiện badge khi cờ tắt = pixel-diff đỏ. Badge unread trên TỪNG CARD (`unread_count` trong payload conversation) thì luôn có, không gate.

`unread_count` trong payload conversation **trần ở 10** (bản gốc `unread_incoming_messages` = `...last(10)` rồi đếm mảng; badge FE hiện `9+` khi > 9).

## Bảng trace Ruby ↔ PHP

| Nguồn Chatwoot v4.17.1 | Đích Laravel | Ghi chú |
|---|---|---|
| `conversation.rb#unread_messages` / `#assignee_unread_messages` | `Conversation::unreadMessages()` / `assigneeUnreadMessages()` | Đã có từ B3, giữ nguyên: mốc `agent_last_seen_at` / `assignee_last_seen_at`; mốc NULL ⇒ mọi tin đều chưa đọc |
| `conversation.rb#unread_incoming_messages` (`...incoming.last(10)`) | `Conversation::unreadIncomingMessages()` + `unreadIncomingMessagesCount()` | `last(10)` của Ruby trả MẢNG nên jbuilder đếm tối đa 10 → `min(10, count)`. Hằng số `UNREAD_INCOMING_MESSAGES_LIMIT` |
| `conversation.rb` scope `unattended` | `Conversation::scopeUnattended()` | `first_reply_created_at IS NULL OR waiting_since IS NOT NULL` |
| `conversation.rb` scope `sort_on_unread` | `Conversation::scopeSortOnUnread()` | Bỏ qua hướng truyền vào đúng như gốc (`\|_direction\|`); tiebreak `last_activity_at DESC` |
| `conversation.rb#unread_messages_count_arel` + `#unread_messages_condition` | `Conversation::unreadMessagesCountSql()` | Subquery tương quan (Arel → SQL chuỗi). Nguồn DUY NHẤT của điều kiện "chưa đọc" phía SQL: sort unread và bộ đếm sidebar cùng gọi |
| `conversation.rb` scope `last_user_message_at` + `sort_handler.rb#last_messaged_conversations` / `#sort_on_last_user_message_at` | `Conversation::scopeLastUserMessageAt()` | `DISTINCT ON (conversation_id)` + `ORDER BY message_type, created_at ASC`. Thêm `select('conversations.*')` vì Laravel không tự giới hạn cột khi join (Rails có) |
| `conversation_finder.rb#filter_by_conversation_type` | `ConversationFinder::filterByConversationType()` | `unattended` chạy thật; `mention`/`participating` là khung (B11) |
| `conversation_finder.rb` SORT_OPTIONS | `ConversationFinder::SORT_OPTIONS` | Đủ 10 + 4 alias cũ — bổ sung `unread` (nợ từ B3). `last_user_message` KHÔNG có trong SORT_OPTIONS bản gốc (scope chỉ phục vụ danh sách Mentions) |
| `conversations_controller.rb#update_last_seen` + `#should_update_last_seen?` + `#update_last_seen_on_conversation` + `#assignee?` | `ConversationsController::updateLastSeen()`, `shouldUpdateLastSeen()`, `markSeenAt()`, `isAssignee()` | `update_columns` → `newModelQuery()->toBase()->update()` (không hook, không đụng `updated_at`), rồi đồng bộ lại attribute trên model đang giữ |
| `conversations_controller.rb#unread` | `ConversationsController::unread()` | Tin incoming cuối theo `id DESC` (Rails `.last` cũng theo khóa chính) trừ 1 giây; không có tin incoming ⇒ cả hai mốc về NULL |
| `conversations/unread_counts_controller.rb#index` | `ConversationsController::unreadCounts()` | Cùng cổng cờ `conversation_unread_counts`, cùng câu lỗi 403 (đã đối chiếu curl với oracle: chuỗi trùng từng ký tự) |
| `services/conversations/unread_counts/{builder,counter,store,...}.rb` (16 file) | `App\Services\Conversations\UnreadCounts\Counter` (1 file) | Xem "Khác biệt cố ý" #1 |
| `services/conversations/unread_counts/notifier.rb` | `ConversationsController::notifyUnreadCountChanged()` | Xem "Khác biệt cố ý" #2 |
| `action_cable_listener.rb#conversation_unread_count_changed` + `broadcast_scope.rb` | `ActionCableListener::conversationUnreadCountChanged()` | Payload rỗng + `account_id`, gửi cho thành viên inbox + admin; gate cùng cờ tính năng. Nhánh `conversation_data` (hội thoại đã xoá) chưa cần vì chưa có endpoint xoá |
| `config/locales/en.yml` `errors.conversations.unread_counts.feature_not_enabled` | chuỗi tại chỗ trong controller | Theo đúng lối các lỗi sẵn có của controller này (`source_id should be unique`); không đụng `lang/**` của agent `yona-i18n` |

## Khác biệt cố ý

1. **Không bê tầng cache Redis của unread counts.** Bản gốc dựng sổ thành viên trong Redis (`Builder`/`Store`/`StoreKeys`/`Refresher`/`Listener`/`BroadcastScope` + 8 file `FilteredCount*`) rồi cộng set theo key. Ở đây `Counter` đếm thẳng bằng SQL: 3 truy vấn GROUP BY (inbox / nhãn / team) trên cùng điều kiện "chưa đọc" của `Conversation::unreadMessagesCountSql()`. Cùng shape trả về, cùng phạm vi quyền, KHÔNG có nguy cơ sổ lệch dữ liệu và không cần job dựng lại. Đánh đổi: mỗi lần gọi là 3 truy vấn thay vì đọc Redis — chấp nhận được ở quy mô hiện tại, muốn cache thì bọc thêm về sau mà không đổi hợp đồng.
2. **`Notifier` rút gọn.** Bản gốc hỏi `Refresher` xem sổ Redis có thực sự đổi không rồi mới bắn event. Không còn sổ ⇒ bắn ngay khi mốc đã xem vừa được ghi, vẫn gate cùng cờ `conversation_unread_counts`. Client nhận tín hiệu rỗng rồi tự gọi lại `/unread_counts` nên kết quả cuối giống hệt.
3. **Bỏ `FilteredCounter` / `FilteredCountInvalidator` / `FilteredCountInstrumentation`** (bộ đếm `mentions_count`/`participating_count`/`unattended_count`/`folders` sau cờ `unread_count_for_filters`, mặc định tắt cả hai bên): phụ thuộc mentions/participants (B11) và custom view (E1).
4. **Bộ đếm nhãn đọc bảng `taggings` thay vì `cached_label_list`.** Bản gốc tách chuỗi cache rồi tra id; ở đây join thẳng khoá ngoại thật (B7) — cùng tập kết quả, không lệ thuộc cache chuỗi.
5. **`permission_mode` theo custom role (EE) bỏ hẳn** — CE chỉ có admin/agent, tương đương nhánh `:base` + phạm vi inbox của `assignedInboxes()`.
6. **`Notification::MarkConversationReadService`** trong `update_last_seen` chưa gọi được (model `Notification` thuộc D2/D5) — xem mục Nợ.

## Nợ để lại

- `conversation_type=mention|participating`: đang trả rỗng, B11 nối bảng `mentions` + `conversation_participants` vào `ConversationFinder::filterByConversationType()` (mỗi nhánh 1 dòng `whereIn`). Danh sách Mentions của B11 dùng `Conversation::scopeLastUserMessageAt()` đã port sẵn.
- `Notification::MarkConversationReadService` (đánh dấu đã đọc các notification trỏ tới hội thoại) + `notification.updated` khi mở hội thoại: chờ model `Notification` (D2/D5). Chỗ cắm là đầu `ConversationsController::updateLastSeen()`.
- Nhánh hội thoại đã xoá của `BroadcastScope` (`conversation_data`) — chờ endpoint `DELETE /conversations/{id}`.
- `~/www/pixel-diff/reset-fixture.sh` KHÔNG reset `agent_last_seen_at` / `assignee_last_seen_at`. Từ B8 hai mốc này đã điều khiển badge/pill unread thật, nên khi chấm pixel cần đưa hai bên về cùng trạng thái đã-đọc (hiện tại: cả oracle conv 1 lẫn yona conv 4 đều `unread_count = 0`). Đề nghị phiên chính bổ sung 2 cột đó vào script.
- Bộ đếm `/unread_counts` chưa có cache; nếu account lớn thì bọc cache theo `account_id + user_id` (TTL ngắn) — không đổi hợp đồng.

## Gate đã chạy

- `DB_DATABASE=yona_rw_test_b8 vendor/bin/pest`: **758/758 xanh** (1766 assertion) — DB test riêng, đã drop sau khi xong.
- `vendor/bin/pint --dirty`: pass.
- `php artisan route:list --path=conversations`: 3 route mới đúng chỗ (`unread_counts` đứng trước `{conversationId}`).
- curl thật (token John, yona account 2 / conversation 4 ↔ oracle account 1 / conversation 1):
  - `GET /conversations/meta` → `{"mine_count":0,"assigned_count":0,"unassigned_count":1,"all_count":1}`.
  - `GET /conversations/4` → `unread_count: 2` khi chưa xem.
  - `POST .../update_last_seen` → 204, sau đó `unread_count: 0`, `agent_last_seen_at` có giá trị.
  - `POST .../unread` → 204, `agent_last_seen_at = assignee_last_seen_at = tin incoming cuối − 1s`, `unread_count` quay lại 1 (đúng ngữ nghĩa gốc: chỉ tin incoming cuối trở thành chưa đọc, không phải toàn bộ).
  - `GET /conversations/unread_counts` → 403 kèm đúng câu lỗi của oracle (đối chiếu trực tiếp).
  - `?conversation_type=unattended`, `?conversation_type=mention`, `?sort_by=unread` → meta + payload trùng oracle từng số.
- `~/www/pixel-diff/reset-fixture.sh` đã chạy sau khi thử: hai bên còn đúng 5 tin, không nhãn/assignee/priority.
