# B4 — cột sống realtime phía client (agent `b4-fe-spine`)

Phạm vi: thay `@rails/actioncable` bằng Laravel Echo + Reverb, store presence/typing, bus reconnect, banner mạng. Thư mục: `resources/js/dashboard/realtime/`.

## Trace Vue/JS ↔ TSX

| Gốc (refs/chatwoot/app/javascript) | Port | Ghi chú |
|---|---|---|
| `@rails/actioncable#createConsumer('/cable')` + `subscriptions.create({channel:'RoomChannel', pubsub_token, account_id, user_id})` | `realtime/echo.ts#createEcho` + `BaseActionCableConnector` constructor | `echo.private(pubsubToken)` + `echo.private('account_{id}')` (= `RoomChannel#ensure_stream`). Auth kênh qua `authorizer` → `postJson('/broadcasting/auth')` (tái dùng session + `X-XSRF-TOKEN` của `apiClient.ts`, không đọc cookie lần hai). `VITE_REVERB_*` từ `.env`. |
| `shared/helpers/BaseActionCableConnector.js` | `realtime/BaseActionCableConnector.ts` | Giữ `static isDisconnected`, `checkConnection` timer 1s, `onReconnect/onDisconnected`, `onReceived({event,data})`, `disconnect()`. `subscription.perform('update_presence')` → `POST /api/v1/accounts/{id}/presence` mỗi 20s **và ngay lần connected đầu** (gốc: `RoomChannel#subscribed` tự broadcast presence lần đầu). Trạng thái kết nối: `pusher.connection.bind('state_change')`; `unavailable|disconnected|failed` sau khi đã từng connected = disconnected. |
| `dashboard/helper/actionCable.js` (`ActionCableConnector`) | `realtime/ActionCableConnector.ts` | Map `events` đủ 21 tên như gốc (bỏ `voice_call.*`, `copilot.*`, `account.enrichment_completed` — EE). Không có Vuex: handler ghi `realtimeStore` (presence/typing) rồi `emitter.emit(<tên event Chatwoot>, data)`; page dùng `useRealtimeEvent`. `isAValidEvent` so `data.account_id`. `fetchConversationStats` = `emitter.emit('fetch_conversation_stats')` sau conversation.created/status_changed/updated, assignee.changed, contact.deleted. `user:logout` → `router.post('/app/logout')`; `page:reload` → reload. |
| `store/modules/conversationTypingStatus.js` (mutations ADD/REMOVE) + `CancelTyping` timer 30s | `realtime/store.ts#addTyping/removeTyping` + `ActionCableConnector#initTimer/clearTimer` | Dedupe theo `id + type`. |
| `agents.js#updatePresence` / `mutationHelpers.updatePresence` (vắng map → offline) | `store.ts#updateAgentsPresence` + `hooks.ts#useAgentAvailabilityStatus(id, fallback)` | Store giữ map + `hasReceivedPresence`; hook suy `offline` khi vắng map SAU lần nhận đầu, trước đó trả `fallback` (giá trị API). |
| `agents.js#updateSingleAgentPresence` | `store.ts#updateSingleAgentPresence` | Dùng cho optimistic update của SidebarProfileMenuStatus (fe-presence). |
| `contacts/*#updatePresence` (`UPDATE_CONTACTS_PRESENCE`) | `store.ts#updateContactsPresence` + `useContactPresence()` / `useContactAvailabilityStatus(id, fallback)` | |
| `auth.js#setCurrentUserAvailability` (chỉ áp khi payload có key user) / getter `getCurrentUserAvailability` | `store.ts#applyCurrentUserAvailability` + `hooks.ts#useCurrentUserAvailability` | Store mặc định `null` → hook rơi về `usePage().props.currentAccountUser.availability`; không cần seed, đổi account reset về null. |
| `dashboard/composables/emitter.js#useEmitter` | `hooks.ts#useRealtimeEvent(eventName, handler)` | handler qua ref, không re-subscribe. |
| `dashboard/helper/ReconnectService.js` | `realtime/ReconnectService.ts` | Giữ `MAX_DISCONNECT_SECONDS=10800` reload khi `online`, `DISCONNECT_DELAY_THRESHOLD=15`, `getSecondsSinceDisconnect()`. Không có store/router: page đăng ký `registerReconnectHandlers({fetchConversationsOnReconnect, fetchConversationMessagesOnReconnect, fetchNotificationsOnReconnect, revalidateCaches, setConversationLastMessageId})`; service await theo thứ tự gốc rồi emit `WEBSOCKET_RECONNECT_COMPLETED`. |
| `shared/constants/busEvents.js` (WEBSOCKET_*) | `shared/helpers/emitter.ts#BUS_EVENTS` | Thêm 3 hằng WEBSOCKET_DISCONNECT / RECONNECT / RECONNECT_COMPLETED. |
| `dashboard/App.vue` (`vueActionCable.init(store, pubsubToken)` + `new ReconnectService` → `window.reconnectService`) | `realtime/RealtimeProvider.tsx#ensureConnected` (singleton module-level) mount trong `dashboard/Dashboard.tsx` | Dashboard re-mount mỗi Inertia visit → connector/ReconnectService sống ở module scope; đổi account/user/token → disconnect + tạo mới + reset store. |
| `dashboard/components/NetworkNotification.vue` | `dashboard/components/NetworkNotification.tsx` | Class Tailwind giữ nguyên; `fluent-icon wifi/wifi-off` (đã có trong `dashboard-icons.json`); Button ghost/sm/amber `i-lucide-refresh-ccw` + `i-lucide-x`. `isAConversationRoute/isAInboxViewRoute(routeName, true)` → regex theo pathname (`/app/accounts/{id}` + conversations|inbox|team|label|mentions|unattended|participating|custom_view, `/inbox-view`). `<transition name="network-notification-fade">` → `transition-opacity` + `hidden`. |
| `i18n/locale/en/generalSettings.json` khối `NETWORK` | `lang/en/network.php` → `resources/js/i18n/generated/en.ts` | `php artisan i18n:generate --check` sạch. |
| `auth.user.pubsub_token` | `types/index.ts#AuthUser.pubsub_token` | Share bởi `HandleInertiaRequests` (be-typing). |

## Bẫy / quyết định
1. **`listenToAll` của laravel-echo trả tên event có tiền tố `.`** cho event ngoài namespace `App.Events` (`.message.created`) — `normalizeEchoEventName` cắt tiền tố. KHÔNG đặt `namespace: ''`: `EventFormatter`/`listenToAll` khi namespace rỗng làm `t.startsWith('')` = true → cắt mất ký tự đầu của tên event (bug thư viện, xem `echo.common.js` class `l.listenToAll`).
2. Echo tự đọc `meta[name=csrf-token]` → header `X-CSRF-TOKEN`; yona không có meta đó nên dùng `authorizer` gọi `postJson` (đã có `X-XSRF-TOKEN` từ cookie). Không chỉnh `Echo.options.auth.headers` để tránh duplicate logic đọc cookie.
3. pusher-js tự reconnect (backoff) — không cần tự nối lại; `checkConnection` chỉ poll `connection.state === 'connected'` mỗi 1s để phát `WEBSOCKET_RECONNECT` như gốc. Chỉ coi là "disconnected" khi đã từng `connected` (tránh bắn DISCONNECT lúc khởi động khi Reverb chưa lên).
4. Repo dùng **pnpm** (`pnpm-lock.yaml`, `node_modules/.pnpm`) — `npm i` vỡ (`edgesOut null`). `laravel-echo 2.4.0` + `pusher-js 8.6.0` pin exact.
5. Store mặc định `currentUserAvailability = null` (không phải `'offline'`) — bản đầu `'offline'` làm chấm sidebar sai DB tới khi effect chạy (fe-presence tái hiện bằng playwright).
6. `useAgentAvailabilityStatus`/`useContactAvailabilityStatus` cần `fallback` = giá trị API để ≤20s đầu (chưa có heartbeat) không tắt chấm của mọi agent như oracle.
7. `user:logout`: gốc gọi `AuthAPI.logout()` (DELETE devise) → yona `router.post('/app/logout')` (route name `logout`, Inertia tự gửi CSRF) — cùng cách SidebarProfileMenu.

## Test
- `realtime/store.test.ts` (4): dedupe typing id+type, presence map/number key/hasReceivedPresence, applyCurrentUserAvailability chỉ khi có key, listener.
- `realtime/ActionCableConnector.test.ts` (6, mock `./echo` + `apiClient`, fake timers): subscribe 2 kênh; lọc sai `account_id` + chuẩn hóa `.message.created`; typing auto-off 30s; presence.update → store; heartbeat ngay khi connected + mỗi 20s; unavailable → DISCONNECT, timer 1s → RECONNECT.
- Gate: `npx tsc --noEmit` ✅, `pnpm build` ✅, `pnpm test` ✅ (9 file / 34 test toàn repo), `php artisan i18n:generate --check` ✅.

## E2E
(cập nhật bên dưới khi Reverb :8080 chạy)
Script `~/www/pixel-diff/realtime-ws.mjs` (login john@acme.inc, bắt frame websocket + response). Reverb chạy tạm `timeout 40 php artisan reverb:start --port=8080` trong cùng lệnh (tự tắt).

| Kiểm | Kết quả |
|---|---|
| WebSocket URL | `ws://localhost:8080/app/iqhdczf8hjxisbt1f129?protocol=7&client=js&version=8.6.0` |
| `POST /broadcasting/auth` | 200, 200 (2 kênh) |
| `pusher_internal:subscription_succeeded` | `private-iQ5SlucXMxkQCotxboUpdu3o` (pubsub_token), `private-account_2` |
| Heartbeat `POST /api/v1/accounts/2/presence` ngay khi connected | 200 |
| Lỗi console | 1 × `409 Conflict` = Inertia đổi asset version sau `pnpm build` (X-Inertia-Location reload), không liên quan realtime |

**PASS** — kết nối + subscribe + heartbeat đầu đúng như `RoomChannel#subscribed`. Chưa đo presence.update/message.created end-to-end (cần phiên e2e chính với Reverb + worker chạy nền).
