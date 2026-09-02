# B4 — presence/availability ngoài trang conversation (agent `b4-fe-presence`)

Phạm vi: nơi hiển thị chấm trạng thái agent/contact và menu đổi availability của chính mình. Nguồn state: `resources/js/dashboard/realtime/{hooks,store,types}.ts` (của `b4-fe-spine`).

## Trace Vue ↔ TSX

| Gốc (refs/chatwoot/app/javascript/dashboard) | Port | Ghi chú |
|---|---|---|
| `components-next/sidebar/SidebarProfileMenuStatus.vue` + `store/modules/auth.js#updateAvailability` | `components-next/sidebar/SidebarProfileMenuStatus.tsx` | Availability đọc `useCurrentUserAvailability()` (getter `getCurrentUserAvailability`). Đổi: `realtimeStore.setCurrentUserAvailability` (optimistic) → `POST /api/v1/accounts/{id}/profile/availability` → `realtimeStore.updateSingleAgentPresence(currentUserId, status)` (`agents/updateSingleAgentPresence`); lỗi → set lại trạng thái cũ, im lặng (như action gốc). Bỏ nhánh `isImpersonating` (EE/super-admin, chưa port). |
| `components-next/sidebar/SidebarProfileMenu.vue` (Avatar `:status="currentUserAvailability"`) | `SidebarProfileMenu.tsx` | Avatar status đọc hook thay props Inertia tĩnh → đổi trong menu là chấm đổi ngay. |
| `shared/helpers/vuex/mutationHelpers.js#updatePresence` + `store/modules/agents.js#UPDATE_AGENTS_PRESENCE` | `components-next/avatar/presence.ts#overlayPresence` + `settings/agents/presence.ts#mergeAgentPresence` / `useAgentsWithPresence` | Gốc ghi đè TOÀN BỘ records mỗi presence.update: agent vắng map → `'offline'`. Port: chỉ ghi đè sau khi `useHasReceivedPresence()` = true, trước đó giữ `availability_status` của API (gốc chưa chạy mutation thì records cũng còn giá trị API). |
| `routes/dashboard/settings/agents/Index.vue` (Avatar `:status="agent.availability_status"` + `hide-offline-status`; EditAgent `:availability`) | `settings/agents/Index.tsx` | `agents = useAgentsWithPresence(fetchedAgents)` — cả Avatar lẫn EditAgent (radio disabled theo trạng thái hiện tại) đọc danh sách đã phủ presence như store gốc. Không thêm chấm ở đâu ngoài Avatar sẵn có. |
| `routes/dashboard/settings/teams/AgentSelector.vue` (Avatar `:status` + `hide-offline-status`) | `settings/teams/AgentSelector.tsx` | Phủ presence ngay trong AgentSelector → AddAgents/EditAgents không phải sửa. |
| `store/modules/contacts/mutations.js#UPDATE_CONTACTS_PRESENCE` + `components-next/Contacts/Pages/ContactsList.vue` → `ContactsCard.vue` | `components-next/Contacts/Pages/ContactsList.tsx#mergeContactPresence` | Contact vắng map → `null` (gốc), chấm ẩn vì `hideOfflineStatus`. `Contact.availabilityStatus` nới thành `string \| null` (`contacts/types.ts`). |
| `components/widgets/UserAvatarWithName.vue` | — | Gốc chỉ dùng ở reports (SLA/CSAT, nhóm C) → chưa tạo. |
| `dashboard/store/modules/agents.js#getAgentStatus` | — | Chỉ dùng cho báo cáo (C). |

## Bẫy / quyết định
1. **Gốc không bao giờ hiện toast lỗi**: `updateAvailability` nuốt lỗi trong action (revert im lặng), `try/catch` ở component bao `dispatch` async nên không bắt được → port cũng revert im lặng, KHÔNG toast `SET_AVAILABILITY_ERROR` (coordinator chốt khớp gốc 100%).
2. **`hasReceivedPresence`**: nếu ép "vắng map → offline" ngay từ đầu, trang agents sẽ tắt chấm của mọi agent trong ≤20s đầu (khác oracle, vốn giữ giá trị API tới heartbeat đầu). Adapter duy nhất: `components-next/avatar/presence.ts`.
3. **Store seed**: bản đầu `realtimeStore` mặc định `'offline'` → avatar sidebar hiện offline sai DB, F5 mất trạng thái (tái hiện bằng playwright). fe-spine chốt: store `null` + `useCurrentUserAvailability()` rơi về `currentAccountUser.availability` của props; đổi account reset store về null nên tự seed lại.
4. Dropdown status trong test cần bọc `<DropdownContainer>` (DropdownItem đọc context) và `vi.hoisted` cho mock — `vi.mock` được hoist nên biến top-level thường không truy cập được.
5. `Contact.availabilityStatus` sau presence có thể `null` → mọi consumer mới của type phải chấp nhận null (ContactsCard đã nhận `string | null`).

## Test
- `resources/js/dashboard/components-next/sidebar/SidebarProfileMenuStatus.test.tsx`: optimistic → POST → `updateSingleAgentPresence(7,'busy')`; POST lỗi → revert `'online'` im lặng, không đụng presence map.
- `resources/js/dashboard/settings/agents/presence.test.ts`: `mergeAgentPresence` / `mergeContactPresence` — giữ API trước heartbeat đầu; sau đó vắng map → `'offline'` / `null`.
- Gate: `npx tsc --noEmit` ✅, `npm run build` ✅, `npm test` ✅ (6 file / 14 test).

## E2E (playwright headless, `~/www/pixel-diff/presence-ui.mjs`, yona :8000, john@acme.inc)
Kịch bản: login → menu profile → chọn Busy → đọc class chấm avatar → F5 → đọc lại → trả về Online.

| Lần chạy | initial | sau chọn Busy | sau F5 | Ghi chú |
|---|---|---|---|---|
| Trước khi `RealtimeProvider` mount | offline/none | **busy** (optimistic OK) | offline/none | store chưa seed từ props (bẫy 3) |
| Sau khi fe-spine mount provider (hook rơi về props khi store `null`) | online | **busy** | **busy** | **PASS** — trả về Online xong, state sạch. Reverb :8080 không chạy lúc đo (kịch bản này không cần socket); chấm đổi theo presence.update của người khác chờ phiên e2e chính có Reverb. |

## Finding pixel-diff (Sam = agent): sidebar hiện Reports/Campaigns — đã sửa
**Cơ chế gốc (xác minh):** `components-next/sidebar/provider.js#isAllowed(to)` → `resolvePermissions(to)` đọc `meta.permissions` của route đích (qua `navigationPath` nếu có) → `usePolicy#shouldShow` → `checkPermissions`: mảng rỗng = cho phép, ngược lại `hasPermissions(required, userPermissions)` (some-match với role/custom permissions). `SidebarGroup.vue` render leaf `v-if="isAllowed(child.to)"`, nhóm ẩn khi `!hasAccessibleChildren`. Port yona: `sidebar/permissions.ts#filterMenuByRole` (item có `permissions` chỉ hiện với role đó; nhóm bị lọc sạch con thì ẩn) — cùng ngữ nghĩa, khác chỗ khai báo (menuItems thay vì route meta).

| Nhóm | meta gốc | Sửa `menuItems.ts` |
|---|---|---|
| Reports (mọi route `reports.routes.js`) | `['administrator', 'report_manage']` — `report_manage` = custom role EE | `permissions: ['administrator']` ở nhóm |
| Campaigns (`campaigns.routes.js`) | `['administrator']` | `permissions: ['administrator']` ở nhóm |
| Portals (4 leaf `navigationPath` → `portals_*_index` dùng meta chung) | `['administrator', 'agent', 'knowledge_base_manage']` | không sửa — agent thấy đủ 4 leaf như oracle |
| Contacts / Conversation / Inbox | có `agent` | không sửa |
| Settings Macros / Canned | `[...ROLES, ...CONVERSATION_PERMISSIONS]` | không sửa (đã đúng: không permissions) |
| Settings còn lại | `['administrator']` | đã có từ A3 |

**E2E** `~/www/pixel-diff/sidebar-roles.mjs` (login John/Sam, đọc innerText `aside`): John → Conversations, Contacts, Reports, Campaigns, Help Center, Settings; Sam → Conversations, Contacts, Help Center, Settings → **PASS**. Gate tsc/build/test xanh.
