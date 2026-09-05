# B5 Vòng đời conversation — ghi chú agent `b5-be` (backend)

Ngày: 02/09/2026. Phạm vi: toggle_status / toggle_priority / update(priority) / mute / unmute, status events từ model, activity message (status + priority + mute), job reopen snoozed + scheduler, i18n backend `conversations.activity.*`.

## Bảng trace Ruby ↔ PHP

| Ruby (refs/chatwoot v4.17.1) | PHP (yona) | Ghi chú |
|---|---|---|
| `Conversation#toggle_status` | `Conversation::toggleStatus()` | open→resolved, còn lại→open; `save()` trả bool |
| `Conversation#toggle_priority(priority = nil)` | `Conversation::togglePriority(?string)` | `priority.presence` = `blank()` → null |
| `execute_after_update_commit_callbacks` (handle_resolved_status_change → notify_status_change → create_activity → invalidate_filtered_unread_count → notify_conversation_updation) | hook `updated`: waiting_since (B3) → `notifyStatusChange()` → `createActivity()` → `notifyConversationUpdation()` (B4) | đúng thứ tự; FilteredCountInvalidator để B8 |
| `notify_status_change` (OPENED/RESOLVED/STATUS_CHANGED theo `saved_change_to_status?`, READ theo `contact_last_seen_at`, CONTACT_CHANGED theo `contact_id`) | `notifyStatusChange()` dùng `wasChanged()` | data qua `dispatcherDispatch` (B4): conversation, notifiable_assignee_change, changed_attributes=null (Rails `status_change` sau commit = nil), performed_by |
| `ActivityMessageHandler#create_activity` → `handle_status_change` / `handle_priority_change` | `createActivity()` → `statusChangeActivity()` / `priorityChangeActivity()` | `determine_user_name` = `auth()->user()?->name`; nhánh label (B7) / SLA (EE) bỏ |
| `user_status_change_activity_content` | `userStatusChangeActivityContent()` | có user → `status.<name>`; không user + resolved → `auto_resolved_*` theo `account.settings.auto_resolve_after` (đọc trực tiếp jsonb, chưa có accessor — D6); nhánh `Current.contact` (widget, C) và `Current.executed_by` automation (D1) chưa port |
| `auto_resolve_message_key` | `autoResolveMessageKey()` | days / hours / minutes y gốc |
| `PriorityActivityMessageHandler#priority_change_activity` | `priorityChangeActivity()` | old = `PRIORITY_NAMES[getOriginal('priority')]`; added/updated/removed; nhánh AutomationRule (D1) bỏ |
| `activity_message_params` | `activityMessageParams()` | `message_type` = `Message::TYPE_ACTIVITY` (int), `content_attributes` chỉ khi có |
| `ConversationMuteHelpers#mute!/unmute!/muted?` | `mute()/unmute()/isMuted()` | **v4.17.1 KHÔNG dùng Redis**: `muted?` = `contact.blocked`; `CONVERSATION_MUTE_KEY` trong redis_keys.rb là khóa mồ côi. mute = `update(status resolved)` + `contact.update(blocked true)` + activity; thiếu contact → no-op |
| `create_mute_change_activity` | `createMuteChangeActivity()` | cần `auth()->user()`, không có → không tạo |
| `Conversations::ActivityMessageJob` (queue high) | `App\Jobs\Conversations\ActivityMessageJob` | `messages()->create($params)`; hook Message set `last_activity_at` như gốc |
| `Conversations::ReopenSnoozedConversationsJob` (queue low, `snoozed_until` 3 ngày trước..now, `open!`) | `App\Jobs\Conversations\ReopenSnoozedConversationsJob` | `chunkById(100)` + `update(status open)` → hook chạy đủ (OPENED + STATUS_CHANGED + UPDATED; không activity vì không user) |
| `TriggerScheduledItemsJob` cron `*/5 * * * *` (`config/schedule.yml`) | `routes/console.php`: `Schedule::job(new ReopenSnoozedConversationsJob)->cron('*/5 * * * *')` | không port TriggerScheduledItemsJob (campaign/notification/auto-resolve/whatsapp/automation là nhóm khác — mỗi job tự đăng ký cron) |
| `ConversationsController#toggle_status` + `set_conversation_status` + `handle_human_open` | `toggleStatus()` + `handleHumanOpen()` | bot_handoff bỏ (AgentBot); `with_lock` = `DB::transaction` + `lockForUpdate()`; agent (không administrator) → `assignee_id = user`; response y `toggle_status.json.jbuilder` (`meta: {}`) |
| `parse_date_time` (`DateRangeHelper`, epoch giây) | `App\Support\DateRangeHelper::parseDateTime()` | `Carbon::createFromTimestampUTC` |
| `#toggle_priority` (head :ok) | `togglePriority()` → `noContent(200)` | |
| `#update` + `permitted_update_params` (chỉ priority) | `update()` PUT/PATCH → `ConversationResource` | |
| `#mute` / `#unmute` (head :ok) | `mute()` / `unmute()` → `noContent(200)` | |
| `_conversation.json.jbuilder` `muted: conversation.muted?` | `ConversationResource` `'muted' => isMuted()` | thay `false` của B3 |
| `config/locales/en.yml` `conversations.activity.{status,priority,muted,unmuted}` | `lang/en/conversations.php` | placeholder `{user_name}` `{count}` `{new_priority}` `{old_priority}` (§17); namespace FE sinh ra sẽ là `CONVERSATIONS` (khác `CONVERSATION` của dashboard) — phiên chính chạy `i18n:generate` |

## Spec ↔ Pest

| RSpec | Pest |
|---|---|
| `conversations_controller_spec.rb` PATCH update (348–397) | `WebApi/ConversationsControllerTest` describe `PATCH …/conversations/{id}` |
| toggle_status (545–677, bỏ 2 case agent bot) | describe `…/toggle_status` (+ case 422 status lạ, + case activity/event — thêm) |
| toggle_priority (678–743, bỏ case bot) | describe `…/toggle_priority` |
| mute / unmute (1118–1176) | describe `…/mute + unmute` (gộp, kiểm cả `muted` trong JSON show) |
| `conversation_spec.rb` `#toggle_status`, `#ensure_snooze_until_reset` | `Models/ConversationTest` describe `toggle_status` |
| `#toggle_priority` | describe `toggle_priority` (dataset 4 mức) |
| `.after_update` "creates conversation activities" (chỉ phần status) + "system auto resolution" | describe `activity messages` (+ câu chữ 4 status, priority added/updated/removed, không user → không activity, job persist thật) |
| `#mute!` / `#unmute!` / `#muted?` | describe `mute` |
| `notify_status_change` (không có spec riêng) | describe `status change events` |
| `reopen_snoozed_conversations_job_spec.rb` | `Jobs/ReopenSnoozedConversationsJobTest` (+ test scheduler cron) |

## Khác biệt cố ý

- `status`/`priority` không hợp lệ → **422** (`Rule::in`) thay vì ArgumentError 500 của enum Rails.
- `changed_attributes` của 5 status event = `null` (gốc `status_change` sau commit cũng nil); listener chỉ cần `conversation`.
- Không có Redis cho mute (theo đúng v4.17.1 — đề bài nhắc setex 6h là bản cũ).
- `handleHumanOpen` không có nhánh `ai_assignee = nil` (AgentBot chưa port).

## Gate (02/09)

- `vendor/bin/pest` **501/501** (1236 assertion); `pint --dirty` sạch; `route:list` có 5 route mới; `schedule:list` có job `*/5 * * * *`.
- Curl thật token John, conversation 4: snoozed (+snoozed_until epoch) → payload đúng jbuilder → open → toggle_priority high 200 → PATCH priority null trả partial. Worker chạy `ActivityMessageJob` (queue high) tạo 4 activity message đúng câu chữ ("Conversation was snoozed by John", "reopened", "set the priority to high", "removed the priority") + `ActionCableBroadcastJob` bắn realtime. Đã xóa 4 activity (id 22–25), khôi phục `last_activity_at`, status open, priority/assignee null.

## Bẫy / lưu ý

1. **Conversation 4 lúc tôi vào đã có 7 tin (id 4–7 + 20, 21)** — 2 tin "Dead is like the wind…" 06:52 không phải của tôi (agent khác/harness). Tôi không xóa; phiên chính quyết.
2. Job sync trong test (`QUEUE_CONNECTION=sync`): activity message được tạo NGAY trong `update()`; muốn assert job phải `Queue::fake()` SAU khi seed (bẫy B4).
3. `mute()` gọi `contact->update(blocked)` → Contact hook bắn `contact.updated`; test đếm DomainEvent phải lọc theo `type`.
4. `Account.settings.auto_resolve_after` đọc thẳng jsonb; khi D6 port accessor thì đổi 1 chỗ trong `userStatusChangeActivityContent()`.
