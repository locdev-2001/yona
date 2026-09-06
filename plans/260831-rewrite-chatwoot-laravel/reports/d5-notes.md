# D5 — Notifications (trung tâm thông báo, chuông + huy hiệu, cài đặt thông báo)

Agent `d5`, 06/09/2026. Nguồn: `refs/chatwoot` v4.17.1 (trừ `enterprise/`).

## Bảng trace Ruby ↔ PHP

| Chatwoot | Yona | Ghi chú |
|---|---|---|
| `db/schema.rb` `notifications` + `notification_settings` | `database/migrations/2026_09_06_920000_create_notifications_tables.php` | cùng cột, cùng tên index (`idx_notifications_performance`, `by_account_user`…); thêm khóa ngoại thật cho `account_id`/`user_id` theo quy ước repo, và backfill cài đặt mặc định cho thành viên có sẵn |
| `app/models/notification.rb` | `app/Models/Notification.php` | `NOTIFICATION_TYPES` là hằng `TYPES` (tên → số, cũng là vị trí bit của cài đặt); `push_event_data`, `push_message_title`, `push_message_body`, hook `created/updated/deleted` bắn `DomainEvent` |
| `app/models/notification_setting.rb` (gem FlagShihTzu) | `app/Models/NotificationSetting.php` + `App\Support\FlagBitmask` | hai cột bitmask sinh **từ chính** `Notification::TYPES`, không khai báo lại danh sách cờ |
| `MessageFormatHelper#transform_user_mention_content` (CommonMarker) + `String#truncate_words` | `App\Support\PlainTextContent` | markdown → chữ thuần cho nội dung xem trước |
| `app/builders/notification_builder.rb` | `app/Builders/NotificationBuilder.php` | cổng DUY NHẤT tạo `Notification`; giữ đủ 3 điều kiện chặn (chưa đăng ký `conversation_creation`, liên hệ bị chặn, không có quyền xem hội thoại) |
| `ConversationPolicy#show?` | `Conversation::isVisibleTo()` | **gộp một nguồn**: `Controller::fetchConversationForUser` (đã có từ B3) nay gọi cùng hàm này |
| `app/finders/notification_finder.rb` | `app/Finders/NotificationFinder.php` | 15 bản/trang, lọc `includes[]=read|snoozed`, `sort_order` |
| `app/listeners/notification_listener.rb` | `app/Listeners/NotificationListener.php` | mở rộng listener tối giản của C3: `conversation_created`, `conversation_bot_handoff`, `assignee_changed`, `message_created` — **một điểm quyết định**, rẽ nhánh theo tên event |
| `Messages::MentionService#generate_notifications_for_mentions` | `App\Services\Messages\MentionService` (bổ sung) | nhánh `conversation_mention` + chặn tự nhắc mình |
| `Messages::NewMessageNotificationService` | `App\Services\Messages\NewMessageNotificationService` | báo cho assignee + người tham gia, bỏ qua nếu đã có thông báo cho chính tin đó |
| `Notification::MarkConversationReadService` | `App\Services\Notification\MarkConversationReadService` | nối vào `conversations#update_last_seen` (trả nợ B8) |
| `Notification::{Email,Delete,RemoveDuplicate,RemoveOld,ReopenSnoozed}…Job` | `app/Jobs/Notification/*` | cùng hàng đợi (`default`/`low`/`purgable`); `RemoveOld` + `ReopenSnoozed` cắm vào `routes/console.php` đúng cron của `config/schedule.yml` |
| `Notification::EmailNotificationService` + `AgentNotifications::ConversationNotificationsMailer` | `App\Services\Notification\EmailNotificationService` + `App\Notifications\ConversationNotification` + `resources/views/mail/conversation-notification.blade.php` | đủ điều kiện gửi (chưa đọc, đã xác nhận email, có bật cờ email, agent không online với hai loại "tin mới"); tiêu đề lấy từ `lang/en/notifications.php` |
| `notifications_controller.rb` + `notification_settings_controller.rb` | `app/Http/Controllers/WebApi/NotificationsController.php`, `NotificationSettingsController.php` | 8 endpoint `notifications` + `resource :notification_settings` (số ít) |
| `notifications/index.json.jbuilder` | `app/Http/Resources/NotificationResource.php` | giữ nguyên cả `push_message_title` (tiêu đề) lẫn `push_message_body` |
| `action_cable_listener.rb#notification_{created,updated,deleted}` | `ActionCableListener` (ba method chừa sẵn từ B4 nay có thân) | payload `{notification, unread_count, count}`; nhánh deleted tính lại bộ đếm từ `NotificationFinder` |
| `account_user.rb#create_notification_setting` | `AccountUser::createNotificationSetting()` (hook `created`) | mặc định bật `email_conversation_assignment` + `push_conversation_assignment` |

## Bảng trace Vue ↔ React

| Chatwoot | Yona | Ghi chú |
|---|---|---|
| `store/modules/notifications/*` (Vuex) | `dashboard/notifications/NotificationsContext.tsx` + `helpers.ts` | records + meta + cờ UI + hành động + 3 handler realtime |
| `api/notifications.js`, `api/userNotificationSettings.js` | `dashboard/notifications/api.ts` | gộp một file (cả cài đặt thông báo) |
| `routes/dashboard/inbox/InboxList.vue` | `dashboard/notifications/InboxList.tsx` | trang gốc: cột trái + `<router-view/>` thay bằng nhánh `conversationId ? <InboxView/> : <InboxEmptyState/>` đúng như `routes.js` |
| `routes/dashboard/inbox/InboxView.vue` | `dashboard/notifications/InboxView.tsx` | dùng lại `ConversationBox` (thêm prop `isInboxView` đúng bản gốc) + `ConversationSidebar` |
| `InboxEmptyState.vue`, `InboxListHeader.vue`, `InboxOptionMenu.vue`, `InboxDisplayMenu.vue`, `InboxContextMenu.vue`, `InboxItemHeader.vue`, `MenuItem.vue`, `PaginationButton.vue` | cùng tên trong `dashboard/notifications/` (+ `components/`) | |
| `components-next/Inbox/InboxCard.vue` | `dashboard/notifications/components/InboxCard.tsx` | `SLACardLabel` là EE nên bỏ |
| `components/ui/ContextMenu.vue` + `widgets/conversation/contextMenu/menuItem.vue` | `dashboard/components/ui/ContextMenu.tsx` + `.../contextMenu/MenuItem.tsx` | **tách khỏi** `ConversationContextMenu` của B8 để hai nơi dùng chung một khung |
| `composables/commands/useInboxHotKeys.js` | `dashboard/commands/useInboxHotKeys.ts` | nhánh `snooze_notification` của command bar, chỉ đăng ký khi ở trang inbox-view |
| `sidebar/Sidebar.vue` (`notifications/getUnreadCount`) | `dashboard/notifications/useUnreadCount.ts` + `menuItems.ts` | huy hiệu mục "My Inbox"; ba sự kiện realtime đều mang `unread_count` nên không phải gọi lại API |
| `settings/profile/NotificationPreferences.vue` + `NotificationCheckBox.vue` + `constants.js` | `dashboard/settings/profile/NotificationPreferences.tsx` | bảng email/push + công tắc quyền trình duyệt |
| `v-on-clickaway` | `dashboard/composables/useClickAway.ts` | |

## Gate

1. **Pest 1186/1186** (2743 assertion, DB riêng `yona_rw_test_d5`) · **vitest 404/404** (52 file) · `npx tsc` · `npm run build` · `pint` · `i18n:generate --check` — xanh.
   Test mới: `Models/NotificationTest` (15), `Builders/NotificationBuilderTest` (9), `Finders/NotificationFinderTest` (7), `Listeners/NotificationListenerTest` (9), `Listeners/ActionCableNotificationTest` (4), `WebApi/NotificationsControllerTest` (15), `WebApi/NotificationSettingsControllerTest` (6), `Services/NotificationServicesTest` (9), `Jobs/NotificationJobsTest` (5), `Support/PlainTextContentTest` (5); vitest `notifications/helpers.test.ts`, `notifications/useUnreadCount.test.tsx`, `notifications/components/InboxCard.test.tsx`.
2. Trace: file này (hai bảng ở trên).
3. **Pixel-diff** (harness `~/www/pixel-diff`, light + dark):
   - `/inbox-view` (một thông báo chưa đọc, huy hiệu "1" trên sidebar): thô 0.030%/0.030% → che vùng nhiễu chung **0.006%/0.006%** (đúng mức nền của các màn khác).
   - `/inbox-view/conversation/{id}`: thô 0.060%/0.113% → che **0.009%/0.009%**.
   - Khối "Notification preferences" trong hồ sơ (`d5-prefs-diff.mjs`, chụp riêng vì oracle còn 4 section chưa port): **0.000%/0.000%** cả hai chế độ.
   - Popover "Display" **0.057%/0.000%**, popover ⋮ **0.000%/0.000%** (`d5-menu-diff.mjs`).
   - Hồi quy: màn hội thoại che 0.006%/0.006%, dashboard 0.030%/0.030% — bằng mốc cũ.
4. **Audit nút** (`audit-buttons.mjs`) hai bên:
   - `/inbox-view`: cả hai bên đúng 2 nút (Display, ⋮), cùng toạ độ/kích thước, cùng phản ứng.
   - `/inbox-view/conversation/{id}`: danh sách OK/DEAD trùng oracle sau khi sửa nút "Delete notification" (xem bẫy #7); khác biệt còn lại là **mic** (nợ B9) như mọi màn hội thoại khác.
5. **E2e** (`d5-e2e.mjs`, John + Samantha cùng lúc): John gán hội thoại cho Samantha → Samantha (đang mở `/inbox-view`) thấy **huy hiệu "1" và thẻ thông báo mà không tải lại trang** → bấm thẻ mở đúng `/inbox-view/conversation/4` với đủ nội dung khung chat → huy hiệu về 0 → **F5 giữ nguyên** → bật bộ lọc "Read" thấy lại thẻ → chuột phải chọn "Mark as unread" → huy hiệu quay lại "1".
   Dữ liệu thử đã xoá sạch hai bên (`Notification` = 0, `ui_settings.inbox_filter_by` gỡ khỏi John/Samantha) và chạy `reset-fixture.sh`.

## Harness thêm

`d5-e2e.mjs` (vòng e2e trọn gói), `d5-menu-diff.mjs {display|options}`, `d5-prefs-diff.mjs`, `d5-smoke.mjs`, `d5-geom.mjs` (đo hình học cột chi tiết).

## Khác biệt cố ý / nợ

1. **Web push (FCM + service worker)**: `notification_subscriptions`, `PushNotificationJob`, `push_test`, service worker chưa port — cột "Push notification" vẫn lưu cờ thật (backend đọc), nhưng chưa có kênh đẩy. Công tắc quyền trình duyệt chỉ xin `Notification.requestPermission()`. Roadmap D5 ghi rõ "FCM để sau nếu chưa cần mobile".
2. **Audio alerts** (`AudioNotifications.vue`, `DashboardAudioNotificationHelper`): chưa port — repo chưa có tệp âm thanh (nợ đã ghi từ C3).
3. **Email**: gửi thật qua Laravel Notification + Blade thay layout Liquid của bản gốc (`{% for %}`/`{% if %}` vượt khả năng `App\Support\LiquidTemplate` hiện tại). Nội dung + điều kiện gửi + hàng đợi đúng bản gốc; **giao diện email không so pixel**. `within_email_rate_limit?` của gốc chỉ có tác dụng trên bản cloud nên bỏ.
4. **SLA (3 loại `sla_missed_*`)**: enum + cột giữ nguyên để bảng cờ khớp bản gốc, nhưng không có nơi phát sinh (SLA là EE) — bảng trong hồ sơ chỉ hiện 5 dòng, đúng như oracle khi cờ SLA tắt.
5. `Notification::PRIMARY_ACTORS` chỉ có `Conversation` như bản gốc; thông báo cũ trỏ vào `Message` (đã bị migration `remove_notifications_with_message_primary_actor` của gốc dọn) không port.
6. `blank()` của Laravel coi `false` là **không rỗng** (khác `false.blank?` của Ruby) — nhánh `assignee_changed` phải so sánh giá trị đúng nghĩa, nếu để `blank()` thì tự gán cho mình cũng bắn thông báo.

## Bẫy đã trả giá

1. **Quan hệ `assignee` đã nạp từ trước**: listener chạy sau hook nên `$conversation->assignee` trả giá trị CŨ (null) → không tạo thông báo. Dùng chung `Conversation::currentAssignee()` (đổi từ private sang public) — cùng hàm mà activity message của B6 đang dùng.
2. **`User` đã có quan hệ `notifications()` từ trait `Notifiable`** và file `User.php` import sẵn `Illuminate\Notifications\Notification` → `hasMany(Notification::class)` trỏ nhầm lớp. Phải chỉ đích danh `\App\Models\Notification::class`.
3. **Hàm helper trong file test Pest là hàm toàn cục**: trùng tên với file test khác làm cả suite chết bằng fatal error, không phải test đỏ. Đặt tên riêng theo tính năng.
4. **`RemoveDuplicateNotificationJob` chạy đồng bộ trong test** (`QUEUE_CONNECTION=sync`): mỗi (user, hội thoại) chỉ còn MỘT thông báo → dữ liệu test phải mỗi thông báo một hội thoại.
5. Trang `/inbox-view` của bản gốc dựng `InboxEmptyState` (chuỗi `LIST.NOTE`), chỉ `/inbox-view/:type/:id` mới dựng `InboxView` (chuỗi `NO_MESSAGES_AVAILABLE`) — dựng nhầm một component là lệch chữ ngay màn đầu.
6. `audit-buttons.mjs` bấm thật nút "Delete notification" → xoá dữ liệu đo của cả hai bên; phải seed lại trước mỗi lần đo.
7. **Nút "Delete notification" phải luôn quay về danh sách**: bản gốc `router.replace({name:'inbox_view'})` chạy vô điều kiện, kể cả khi thông báo của hội thoại đang mở đã rời bộ lọc (mở hội thoại là đánh dấu đã đọc). Bản đầu của mình `return` sớm → audit chấm DEAD trong khi oracle OK.
8. **`ConversationBox` trong inbox-view phải nhận `class="flex-1 [&.conversation-details-wrap]:!border-0"`** như `InboxView.vue`; thiếu nó thì viền trái 1px đẩy toàn bộ cột chat lệch.
9. **Mục sidebar "My Inbox" cần `activeOn`** (`inbox_view` + `inbox_view_conversation` của bản gốc): thiếu thì khi mở một thông báo, mục này mất trạng thái active → lệch chữ đậm.
10. **`now()` của Postgres là giờ địa phương** còn ứng dụng ghi UTC — set mốc thời gian bằng SQL để đo phải dùng `now() at time zone 'UTC'`, nếu không thẻ hiện "in 7 hours".
11. Trên oracle, **id `#profile-settings-notifications` xuất hiện hai lần** (Audio alerts dùng lại) — kịch bản chụp phải lấy `.last()`.
