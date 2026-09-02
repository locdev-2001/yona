# Trace B4 — Realtime (Reverb thay ActionCable)

Ngày: 02/09/2026. Phiên đơn `yona-6d` (QA + e2e) + 5 agent song song: `b4-be-spine`, `b4-be-typing`, `b4-fe-spine`, `b4-fe-conversation`, `b4-fe-presence`. Bảng trace chi tiết từng vùng nằm trong 5 ghi chú agent (nguồn sự thật, không chép lại):

| Vùng | Ghi chú | Nội dung |
|---|---|---|
| Backend spine | [b4-notes-be-spine.md](b4-notes-be-spine.md) | Reverb, `EventType`/`DomainEvent`, `ActionCableListener`, `ActionCableBroadcastJob`, `RealtimeBroadcast`, kênh + auth, `OnlineStatusTracker`, `PresenceController`, hook dispatch Message/Conversation/Contact |
| Backend typing/availability | [b4-notes-be-typing.md](b4-notes-be-typing.md) | `TypingStatusManager` + `toggle_typing_status`, `AvailabilityStatusable` đọc presence, `AccountUser` → status Redis, `Inbox::availableAgents`, contacts `active` + chặn xóa khi online, `pubsub_token` share, `updated_within` |
| FE spine | [b4-notes-fe-spine.md](b4-notes-fe-spine.md) | Echo/pusher-js, `BaseActionCableConnector` + `ActionCableConnector`, store/hooks realtime, `ReconnectService`, `NetworkNotification`, i18n `NETWORK` |
| FE conversation | [b4-notes-fe-conversation.md](b4-notes-fe-conversation.md) | `realtimeReducers` (ADD_MESSAGE/UPDATE_CONVERSATION/getter lọc tab), reconnect sync, typing bubble + Editor `createTypingIndicator`, presence contact |
| FE presence | [b4-notes-fe-presence.md](b4-notes-fe-presence.md) | Menu availability optimistic, agents/teams/contacts phủ presence, sidebar permissions Reports/Campaigns |

## Kiến trúc chốt (khác 1:1 với ActionCable — có chủ đích)

| Chatwoot | Yona | Lý do |
|---|---|---|
| `RoomChannel#subscribed` stream `pubsub_token` + `account_{id}` | Echo `private(pubsub_token)` + `private('account_{id}')`; `routes/channels.php` đăng ký `account_{accountId}` TRƯỚC, `{pubsubToken}` catch-all SAU | tên kênh = đúng chuỗi token gốc, không prefix |
| `perform('update_presence')` mỗi 20s qua socket | `POST /api/v1/accounts/{id}/presence` mỗi 20s (+ ngay khi connected) → server ghi Redis rồi bắn `presence.update` về token người gọi | Reverb không có hook subscribe phía server |
| Wisper `SyncDispatcher.dispatch(name, time, data)` | `DomainEvent::dispatch(EventType::X, data)` — listener nhận `handle(DomainEvent)` qua event discovery, gọi method theo tên event | §0.6: enum định danh + payload |
| `ActionCable.server.broadcast(token, {event, data})` | `RealtimeBroadcast` (`ShouldBroadcastNow`, `broadcastAs` = tên event, payload phẳng) từ `ActionCableBroadcastJob` queue `critical` | client dùng `listenToAll` |
| Vuex store (agents/contacts/typing/auth) | `resources/js/dashboard/realtime/store.ts` (useSyncExternalStore) + `hooks.ts`; connector singleton module-level sống qua Inertia visit | không có store toàn cục |

## Spec ↔ Pest (tổng)

`online_status_tracker_spec` → `Support/OnlineStatusTrackerTest`; `action_cable_listener_spec` → `Listeners/ActionCableListenerTest`; `room_channel_spec` → `Events/BroadcastChannelAuthTest` + `WebApi/PresenceControllerTest`; model dispatch (message/conversation/contact spec) → `Models/*Test` describe `dispatch events`; `conversations_controller_spec` toggle_typing → `WebApi/ConversationsControllerTest`; `contacts_controller_spec` active/destroy online → `ContactsControllerTest`; `profiles_controller_spec` availability → `ProfilesControllerTest`; `conversation_finder_spec` updated_within → `Finders/ConversationFinderTest`; thêm `Jobs/ActionCableBroadcastJobTest`, `Models/AccountUserTest`, `Models/InboxTest`. Vitest: `realtime/store.test.ts`, `realtime/ActionCableConnector.test.ts`, `conversation/realtimeReducers.test.ts`, `sidebar/SidebarProfileMenuStatus.test.tsx`, `settings/agents/presence.test.ts`.

## Gate (phiên chính chạy 02/09)

1. Pest **453/453** (1118 assertion) · `npx tsc` · `npm run build` · vitest **34/34** · pint · `i18n:generate --check` — xanh.
2. Trace: file này + 5 note.
3. Pixel-diff (harness `~/www/pixel-diff`):
   - `realtime-diff.mjs typing` (Sam thấy "John is typing" + gif): thô 0.394%/0.448%; che 5 vùng thuộc nhóm khác (pill unread B8 `(835,160,985,192)`, `#display_id (590,24,620,40)`, logo `(5,5,35,32)`, dòng placeholder editor `(560,625,1020,650)`, frame gif `(940,525,975,545)`) → **0.013% / 0.013%**. Bong bóng typing + vị trí khớp pixel.
   - `realtime-diff.mjs agents` (Sam online): **0.030% / 0.030%** (trước B4: 0.052% — lệch chấm presence đã hết).
   - `realtime-diff.mjs menu` (menu profile John): 0.597%/0.544% — B4 phần "Online" đã khớp; lệch còn lại thuộc A3/F7: oracle có mục "Keyboard shortcuts" + "SuperAdmin console", "Change appearance" hai bên khác cách hiện (xem Khác biệt/nợ).
   - Hồi quy: dashboard 0.030%/0.030%; conversation/all/note/panel cùng số như B3 (unread pill B8 + placeholder + display_id).
4. Audit nút `audit-buttons.mjs` `/conversations/{id}` hai bên: khớp trừ **Resolve (B5)** và **mic (B9)** như B3. Audit làm bẩn oracle (Resolve thật + ⇥) — đã khôi phục: status open, xóa activity message, `last_activity_at` về tin cuối; ui_settings hai bên đều `conversation_display_type=expanded` (giữ giống nhau).
5. E2e trình duyệt (playwright headless, chạy cùng kịch bản hai bên):
   - `realtime-ui.mjs oracle|yona all`: tin inbound qua API token hiện **không reload** (cả 2 bên `shownWithoutReload: true`); typing John → Sam thấy "John is typing", ngừng 4s → mất (`clearedAfterIdle: true`); presence Sam offline → online sau khi mở dashboard (API agents `availability_status`).
   - `realtime-reconnect.mjs` (yona): kill Reverb → banner **Offline**; tin tạo lúc mất socket (broadcast job lỗi cURL 7 trong log) → bật lại → banner **Reconnected** → tin bù về qua `updated_within`/`after` → banner tự đóng.
   - Đổi availability trong menu → chấm đổi ngay, F5 giữ (`presence-ui.mjs`).
   - Dữ liệu test đã dọn: conversation 4 (yona) + 1 (oracle) còn đúng 5 tin, `last_activity_at` khôi phục.

## Khác biệt cố ý / nợ

- Presence heartbeat qua HTTP thay socket perform (xem bảng trên); server trả luôn JSON presence nhưng client chỉ dùng event như gốc.
- `laravel/reverb` đòi `guzzlehttp/psr7 ^2.6` → `composer require -W` hạ guzzle 8 → 7. Founder cần biết.
- Listener đăng ký bằng event discovery (thêm `Event::listen` tay = bắn 2 lần).
- Kênh contact/widget (contact_inbox.pubsub_token) chưa có auth callback — nhóm C; `RemoveStaleRedisKeysService` chờ scheduler; `notification_*`/`conversation_unread_count_changed` (D5/B8); `status_changed`/`assignee`/`team` dispatch từ model (B5/B6 — listener đã sẵn method); audio alert tin mới (D5); `markMessagesRead` khi sync (B8); revalidate cache label/inbox/team khi reconnect (B7).
- Sidebar: `Reports`/`Campaigns` giờ chỉ administrator (finding từ màn typing — sót từ A3). Menu profile còn thiếu "Keyboard shortcuts" (B10) và "SuperAdmin console" (F7); "Change appearance" yona hiện 3 icon inline, oracle 1 dòng — cần soi lại A3.
- Placeholder editor ProseMirror bên yona đậm/rộng hơn oracle ~1px mỗi chữ (đã có từ B3, không phải B4) — nợ B3.
- Test Pest chạm Redis thật (DB 4) → Redis phải chạy khi test.

## Bẫy đã trả giá (tổng hợp, chi tiết trong note)

1. Worker `queue:listen` kế thừa env lúc khởi động: đổi `BROADCAST_CONNECTION` xong phải kill worker + `make up`, không thì job "DONE" nhưng broadcast vào `laravel.log`.
2. `install:broadcasting --reverb --without-node` vẫn sửa `resources/js/app.tsx`; `reverb:install` lỗi khi `.env` đã là reverb mà chưa có key.
3. `listenToAll` của laravel-echo trả `.message.created` (tiền tố `.`), và `namespace: ''` làm cắt mất ký tự đầu — chuẩn hóa ở connector.
4. Store presence phải khởi tạo `null` + rơi về props Inertia; suy "vắng map → offline" chỉ sau `presence.update` đầu (gốc giữ giá trị API tới heartbeat đầu).
5. Pending message id âm: khớp theo `echo_id`; HTTP trả về và socket cùng đi qua `addMessage` để không nhân đôi.
6. Audit nút làm bẩn oracle (Resolve thật, activity message) — chạy sau pixel-diff và khôi phục bằng rails runner; harness reconnect phải poll banner song song với `make up` (banner "Reconnected" chỉ sống 2s).
7. Test `assertNotDispatched(DomainEvent)` phải lọc theo `type` vì hook model bắn event khác; `Queue::fake()` SAU khi seed.
