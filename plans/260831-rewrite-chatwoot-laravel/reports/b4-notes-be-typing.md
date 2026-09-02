# B4 Realtime — agent `b4-be-typing` (typing, presence status, contacts online, finder)

Ngày: 02/09/2026. Nhánh `rewrite/chatwoot-laravel`. Phối hợp: `b4-be-spine` (OnlineStatusTracker, DomainEvent/EventType, PresenceController), `b4-fe-spine` (đọc `auth.user.pubsub_token`), `b4-fe-conversation` (gọi toggle_typing_status).

## Trace Ruby ↔ PHP

| Ruby (refs/chatwoot) | PHP | Ghi chú |
|---|---|---|
| `app/services/conversations/typing_status_manager.rb` | `app/Services/Conversations/TypingStatusManager.php` | `toggleTypingStatus()` → `DomainEvent::dispatch(EventType::CONVERSATION_TYPING_ON/OFF, [conversation, user, is_private])`. `is_private` chuẩn hóa bool bằng `filter_var` (Ruby truyền thô). |
| `conversations_controller.rb#toggle_typing_status` (+ `config/routes.rb`) | `WebApi\ConversationsController::toggleTypingStatus` + `POST /api/v1/accounts/{account}/conversations/{id}/toggle_typing_status` (`routes/web_api.php`) | `head :ok` = `response()->noContent(200)`. Policy show qua `fetchConversationForUser` (admin / inbox member / team member). `typing_status` ngoài on|off → no-op vẫn 200 (y `case/when` gốc); `is_private` chuẩn hóa bool trong manager. |
| `config/routes.rb` presence | `POST /api/v1/accounts/{account}/presence` → `PresenceController@update` (controller của b4-be-spine) | Route do agent này thêm. |
| `concerns/availability_statusable.rb` (nhánh User) | `app/Models/Concerns/AvailabilityStatusable.php` | `onlinePresence()` public, `availabilityStatus()` y gốc: auto_offline tắt → cột; bật → presence ? (`getStatus ?? cột`) : `offline`. Nhánh Contact nằm trong `Contact::availabilityStatus()` (b4-be-spine). |
| `account_user.rb` `after_save :update_presence_in_redis, if: :saved_change_to_availability?` | `AccountUser::booted()` `static::saved` + `wasChanged('availability')` → `OnlineStatusTracker::setStatus(account_id, user_id, availabilityName())` | Khác nhỏ: Laravel `wasChanged` trên create = mọi attribute truyền vào; Rails chỉ khi khác default. Chỉ thừa 1 lần ghi Redis lúc tạo membership, vô hại. |
| `concerns/inbox_agent_availability.rb#available_agents` | `Inbox::availableAgents()` | Lọc `getAvailableUsers()` value `=== 'online'`, ép key string → int; trả `Collection<InboxMember>` (rỗng = `inbox_members.none`), `whereHas('user')` = `joins(:user)`. `member_ids_with_assignment_capacity` là móc EE — không port. |
| `contacts_controller.rb#active` | `ContactsController::active` | `whereIn('id', getAvailableContactIds)`; KHÔNG áp `resolvedContacts` (gốc `fetch_contacts` không lọc). Phân trang + meta dùng chung `paginatedContacts()` với `index` (DRY). |
| `contacts_controller.rb#destroy` + `en.yml contacts.online.delete` | `ContactsController::destroy` + `lang/en/contacts.php` `online.delete` | 422 `{message}` khi `getPresence(account,'Contact',id)`. Ruby `capitalize` = `ucfirst(mb_strtolower())`. Placeholder `{contact_name}` theo §17. Chưa chạy `i18n:generate` (b4-fe-spine chạy). |
| `profiles_controller.rb#availability` (`update!` → hook) | `ProfileAvailabilityController::availability` giữ nguyên (`update()` qua model → hook `saved` chạy) | Không đổi code; test mới khóa status Redis. |
| `_user.json.jbuilder` `pubsub_token` | `HandleInertiaRequests` `auth.user.pubsub_token` + `ProfilesController::profilePayload['pubsub_token']` | `pubsub_token` không nằm trong `$hidden` của User. |
| `conversation_finder.rb#filter_by_updated_at` (`updated_within` giây) | `ConversationFinder::fetchConversations()` | `updated_at > now - n` và KHÔNG phân trang, vẫn áp sort/filter. |
| `message_finder.rb` `after` | `MessageFinder` đã có sẵn từ B3 (`messagesAfter/messagesBetween`), `MessagesController` truyền `$request->all()` | Không sửa; test đã có `MessageFinderTest` (after / oversized / between). |

## Trace spec ↔ Pest

| RSpec | Pest |
|---|---|
| `conversations_controller_spec.rb` toggle_typing_status: unauthenticated 401, agent on/is_private false, is_private true | `tests/Feature/WebApi/ConversationsControllerTest.php` describe `toggle_typing_status` (+ thêm: off, typing_status lạ → 200 không dispatch, agent không phải member → 401 không dispatch). Nhánh agent_bot bỏ (AgentBot chưa port). |
| `contacts_controller_spec.rb` active: no one online / online returns contact | `ContactsControllerTest.php` describe `contacts/active` (mock `get_available_contact_ids` thay bằng Redis thật `updatePresence`). |
| `contacts_controller_spec.rb` destroy "does not delete the contact if online" | `ContactsControllerTest.php` describe `DELETE ... while online` — kiểm cả chuỗi `John doe is Online, please try again later`. |
| `profiles_controller_spec.rb` availability → `OnlineStatusTracker.get_status == 'busy'` | `ProfilesControllerTest.php` describe `profile/availability` (route yona nằm dưới `/accounts/{id}` — account_id lấy từ URL thay body `profile.account_id`). |
| `account_user_spec.rb` (không có spec presence) | `tests/Feature/Models/AccountUserTest.php`: 4 case (cột khi auto_offline off; offline không presence; status Redis khi có presence; hook saved ghi status). |
| `inbox_agent_availability` (không có spec CE riêng) | `tests/Feature/Models/InboxTest.php` describe `availableAgents`. |
| `conversation_finder_spec.rb` "with updated_within" (50 conv, 28 cập nhật → 29) | `ConversationFinderTest.php` describe `updated_within` (40 conv, 28 cập nhật → 29, kiểm sort created_at asc). |
| `message_finder_spec.rb` after | đã có từ B3 (`MessageFinderTest.php`). |

## Bẫy đã gặp

- `Conversation::update(['updated_at' => …])` bị mass-assignment bỏ qua im lặng (không fillable) → test `updated_within` trả 1 thay vì 29. Dùng `forceFill()->save()`.
- `blank(false)` Laravel ≠ `present?` Ruby: `is_private` đi qua `filter_var` trong manager, không dùng `filled()`.
- Key Redis KHÔNG tự ghép trong test: dùng `OnlineStatusTracker::clearAccount($accountId)` (xóa `ONLINE_PRESENCE::{id}::USERS|CONTACTS` + `ONLINE_STATUS::{id}`) trước mỗi test — id account lặp lại giữa các lần chạy test nên status cũ có thể rò.
- `getAvailableUsers()` trả key user id dạng STRING (Redis) → ép `(int)` trước khi `whereIn`.
- Ruby `String#capitalize` hạ thường phần còn lại — `ucfirst()` thuần không đủ.
- `getAvailableUsers()` chỉ liệt kê user CÓ presence (sorted set) rồi mới tra status; `setStatus` đơn lẻ không đủ để `availableAgents()` thấy — test phải `updatePresence` trước.
- `Event::assertNotDispatched(DomainEvent::class)` không dùng được: hook model bắn DomainEvent khác (conversation.created…) — phải lọc theo `type`.

## Gate đã chạy (02/09)

- `vendor/bin/pest`: 409 pass / 1020 assertions. `vendor/bin/pint --dirty`: sạch.
- `php artisan route:list | grep -E 'typing|presence'`: 2 route.
- curl thật `POST /api/v1/accounts/2/conversations/4/toggle_typing_status` header `api_access_token` John, body on/off + is_private → HTTP 200 rỗng.

## Khác biệt cố ý

- Test `contacts/active` + `destroy online` dùng Redis thật thay `allow(OnlineStatusTracker)` mock.
