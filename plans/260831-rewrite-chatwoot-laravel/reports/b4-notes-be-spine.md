# B4 Realtime — ghi chú agent `b4-be-spine` (backend spine: Reverb thay ActionCable)

Ngày: 02/09/2026. Phạm vi: cài Reverb, khung event (EventType/DomainEvent), ActionCableListener + ActionCableBroadcastJob, kênh private + auth, OnlineStatusTracker (Redis), endpoint presence, hook dispatch trong Message/Conversation/Contact.

## Bảng trace Ruby ↔ PHP

| Ruby (refs/chatwoot) | PHP (yona) | Ghi chú |
|---|---|---|
| `lib/events/types.rb` | `app/Events/EventType.php` (enum string) | giá trị y hệt; bỏ `CAPTAIN_*`/`COPILOT_*` (EE); thêm `PRESENCE_UPDATE='presence.update'` vì RoomChannel bắn chuỗi thô (§0.6 đòi enum) |
| `lib/events/base.rb` + `Dispatcher.dispatch` | `app/Events/DomainEvent.php` (`DomainEvent::dispatch(EventType, array $data)`) | `methodName()` = `tr('.', '_')` |
| `SyncDispatcher` (Wisper publish theo method_name) | `ActionCableListener::handle()` → `Str::camel(methodName())` nếu method tồn tại | Đăng ký qua **event discovery** của Laravel (handle(DomainEvent)) — KHÔNG `Event::listen` thêm (xem bẫy 1) |
| `AsyncDispatcher` + `EventDispatcherJob` | chưa có — listener nhóm sau (webhook/automation/notification) tự đăng ký cùng cơ chế | |
| `app/listeners/base_listener.rb` | `app/Listeners/BaseListener.php` | bỏ `extract_notification_and_account` (D2) |
| `app/listeners/action_cable_listener.rb` | `app/Listeners/ActionCableListener.php` | đủ: account_cache_invalidated, message_created/updated, first_reply_created, conversation_created/read/status_changed/updated/typing_on/off, assignee_changed, team_changed, conversation_contact_changed, contact_created/updated/merged/deleted, conversation_mentioned. Để lại: notification_* + conversation_unread_count_changed (D2/B8) |
| `user_tokens` (agents ∪ administrators) | `userTokens()` | admin lấy qua `account->users()->wherePivot('role', ROLE_ADMINISTRATOR)` |
| `contact_tokens` / `contact_inbox_tokens` (hmac_verified) | `contactTokens()` / `contactInboxTokens()` | |
| `broadcast()` merge account_id + `performer` (Current.user.push_event_data) | `broadcast()` + `auth()->user()` → `UserResource::pushEventData` | |
| `app/jobs/action_cable_broadcast_job.rb` | `app/Jobs/ActionCableBroadcastJob.php` (queue `critical`) | `prepare_broadcast_data` re-read conversation cho 5 CONVERSATION_UPDATE_EVENTS (giống gốc: payload thay hoàn toàn → mất `performer`) |
| `ActionCable.server.broadcast(member, {event, data})` | `broadcast(new RealtimeBroadcast($member, $event, $data))` — `ShouldBroadcastNow`, `PrivateChannel($member)`, `broadcastAs()=event`, `broadcastWith()=data` | client nhận data phẳng, không bọc {event,data} |
| `RoomChannel#ensure_stream` (stream pubsub_token + account_{id}) | `routes/channels.php`: `account_{accountId}` (member) đăng ký TRƯỚC, `{pubsubToken}` catch-all SAU | auth = session web tại `POST /broadcasting/auth` |
| `RoomChannel#subscribed/update_presence` + `broadcast_presence` | `PresenceController@update` — `POST /api/v1/accounts/{account}/presence` (route do `b4-be-typing` thêm) | ghi presence rồi bắn `presence.update` về pubsub_token người gọi qua ActionCableBroadcastJob; trả luôn JSON `{account_id, users, contacts}` |
| `RoomChannel` cho Contact (widget, không có user_id) | chưa — widget (nhóm E) sẽ cần guard riêng cho kênh contact_inbox.pubsub_token | |
| `lib/online_status_tracker.rb` + `ONLINE_*` keys | `app/Support/OnlineStatusTracker.php` | key y gốc `ONLINE_PRESENCE::%d::USERS|CONTACTS`, `ONLINE_STATUS::%d`; thời hạn `config('yona.presence_duration')`=20s, `contact_presence_duration`=90s (ENV `PRESENCE_DURATION`/`CONTACT_PRESENCE_DURATION`); thêm `clearAccount()` cho test |
| `Internal::RemoveStaleRedisKeysService` | CHƯA — để nhóm scheduler | |
| `Pubsubable` | `User`/`ContactInbox` đã có `pubsub_token` (B1/B2) | không migration mới |
| `Message#dispatch_create_events` / `dispatch_update_event` / `send_update_event` | `Message::dispatchCreateEvents()` (trong hook `created`, đúng thứ tự reopen → activity → dispatch → contact activity) / hook `updated` → `sendUpdateEvent()` với `previous_changes` | Eloquent chỉ bắn `updated` khi có cột đổi = guard `previous_changes.blank?` |
| `Conversation#notify_conversation_creation` / `notify_conversation_updation` + `allowed_keys?` + `dispatcher_dispatch` | hook `created` → `CONVERSATION_CREATED`; hook `updated` → `notifyConversationUpdation()` (chỉ khi đổi `UPDATED_EVENT_KEYS` hoặc `additional_attributes.conversation_language`) | data: conversation, notifiable_assignee_change, changed_attributes, performed_by. `status_changed`/`assignee`/`team` events để B5/B6 |
| `Contact#dispatch_create_event/update_event/destroy_event` | hook `created`/`updated`/`deleted` | deleted gửi `contact_data` = pushEventData + account_id |
| `AvailabilityStatusable#contact_availability_status` | `Contact::availabilityStatus()` → `OnlineStatusTracker::getPresence(account_id,'Contact',id)` | |
| `User#push_event_data` | `app/Http/Resources/UserResource::pushEventData(User, ?Account)` | account mặc định = `request()->attributes['currentAccount']` (= Current.account) |
| `Contact#push_event_data` | `ContactResource::pushEventData` | `MessageResource::senderPushEventData` giờ ủy quyền cho 2 hàm trên (1 nguồn) |
| `Conversations::EventDataPresenter#push_data` | `ConversationResource::pushEventData` = jbuilder + `channel` + `contact_inbox` | |
| Rails `previous_changes` | `app/Events/PreviousChanges::of(Model)` = `{attr => [cũ, mới]}` | gọi trong hook `updated` (getOriginal còn giá trị cũ) |

## Spec ↔ Pest

| RSpec | Pest |
|---|---|
| `spec/lib/online_status_tracker_spec.rb` | `tests/Feature/Support/OnlineStatusTrackerTest.php` (+ getPresence/status/clearAccount) |
| `spec/listeners/action_cable_listener_spec.rb` (trừ notification_*, unread_count, agent bot) | `tests/Feature/Listeners/ActionCableListenerTest.php` |
| (không có spec job riêng) | `tests/Feature/Jobs/ActionCableBroadcastJobTest.php` — perform + prepare_broadcast_data + queue critical |
| `spec/channels/room_channel_spec.rb` | `tests/Feature/Events/BroadcastChannelAuthTest.php` (200/403 theo token, account member) + `tests/Feature/WebApi/PresenceControllerTest.php` |
| `spec/models/message_spec.rb` (dispatch) | `tests/Feature/Models/MessageTest.php` describe `dispatch events` |
| `spec/models/conversation_spec.rb` (after_create/after_update dispatch) | `tests/Feature/Models/ConversationTest.php` describe `dispatch events` |
| `spec/models/contact_spec.rb` (dispatch) | `tests/Feature/Models/ContactTest.php` describe `dispatch events` |

Gate: `vendor/bin/pest` 453 pass · `vendor/bin/pint --dirty` sạch · `make up` → `make status` reverb :8080 OK.

## Chứng minh broadcast thật (02/09 06:23)

Client WS thuần (node 22, script scratchpad `ws-proof.mjs`: connect `ws://localhost:8080/app/{KEY}`, subscribe `private-{pubsub_token John}` với auth HMAC secret), rồi `php artisan tinker`:

```php
$c = App\Models\Conversation::find(4);
$c->messages()->create(['account_id'=>2,'inbox_id'=>1,'content'=>'B4 realtime proof 2','message_type'=>1,'sender_type'=>'User','sender_id'=>1]);
broadcast(new App\Events\RealtimeBroadcast('iQ5SlucXMxkQCotxboUpdu3o', 'presence.update', ['account_id'=>2,'users'=>[1=>'online'],'contacts'=>[]]));
```

Client nhận:
```
pusher_internal:subscription_succeeded private-iQ5Sluc…
presence.update private-iQ5Sluc… {"account_id":2,"users":{"1":"online"},"contacts":[]}
message.created private-iQ5Sluc… {"id":11,"content":"B4 realtime proof 2","account_id":2,"inbox_id":1,"conversation_id":4,...}
```
(worker log: `ActionCableBroadcastJob … DONE`). Message 10/11 đã xóa, `last_activity_at` conversation 4 khôi phục về tin cuối.

## Bẫy đã trả giá

1. **Event discovery đăng ký listener 2 lần.** Laravel 11+ tự tìm `app/Listeners/*::handle(DomainEvent)`; thêm `Event::listen(DomainEvent::class, ActionCableListener::class)` trong AppServiceProvider → mỗi event bắn 2 job. Bỏ Event::listen, ghi rõ trong docblock listener.
2. **Worker cũ giữ `BROADCAST_CONNECTION=log`.** `queue:listen` spawn `queue:work --once` kế thừa env (Dotenv putenv) của lúc parent khởi động; đổi `.env` sang reverb mà không restart worker → job chạy xanh nhưng broadcast vào `laravel.log`. Sau khi đổi .env phải `kill worker` + `make up`.
3. **`install:broadcasting --reverb` sửa `resources/js/app.tsx`** (chèn `configureEcho`) dù `--without-node` — file của FE agent, đã `git checkout` lại. Và `reverb:install` thất bại khi `.env` đã `BROADCAST_CONNECTION=reverb` mà chưa có key (routes/channels.php boot lỗi) → tạm đặt `log`, chạy `reverb:install`, nó tự đặt lại `reverb`.
4. **`laravel/reverb` cần `guzzlehttp/psr7 ^2.6`** nhưng lock đang psr7 3.1 (guzzle 8) → `composer require laravel/reverb -W` hạ guzzle 7.x/psr7 2.x.
5. **Key map id → int.** `array_fill_keys(['12'], 'online')` cho key int 12 (PHP ép numeric string); JSON vẫn `{"12":"online"}` như gốc. Test so sánh key bằng int.
6. **Reverb `/app/{key}` trả 500 cho GET thường** (endpoint WebSocket) — health check dùng `GET /up` (200).
7. **Test listener phải `Queue::fake()` SAU khi seed** — model hook giờ tự bắn event → job; fake trước seed thì đếm sai.
8. `BROADCAST_CONNECTION=null` trong test → `NullBroadcaster::auth` bỏ qua callback kênh; test auth kênh bật `reverb` với key giả rồi `require routes/channels.php` lại (callback đăng ký lên driver mặc định lúc boot).
9. Test giờ chạm Redis thật (DB 4 qua `phpunit.xml`): `Contact::availabilityStatus()` đọc presence → Redis phải chạy khi test.
10. `performInsert` không `syncChanges()` → trong hook `created`, `wasChanged()` luôn false; Conversation gọi `syncChanges()` trước khi dispatch để `notifiable_assignee_change` thấy assignee gán lúc tạo như `saved_change_to_assignee_id?`.

## Khác biệt cố ý / còn nợ

- Presence heartbeat = HTTP POST (Reverb không có hook subscribe phía server) thay cho `RoomChannel#subscribed`; FE ping 20s.
- Kênh contact (widget) chưa có auth callback — `contact_inbox.pubsub_token` được tính trong token list nhưng chưa ai subscribe được (nhóm E widget).
- `RemoveStaleRedisKeysService` chưa port (nhóm scheduler).
- `MessageResource` emit `content_attributes: []` khi rỗng (jbuilder ra `{}`) — tồn tại từ B3, chưa đụng.
- `notification_*`, `conversation_unread_count_changed` (D2/B8); `conversation.status_changed`/`assignee.changed`/`team.changed` từ model (B5/B6) — listener đã sẵn method, chỉ cần dispatch.
