# B6 Assignment — ghi chú FE panel (agent `b6-fe`)

Nguồn: Chatwoot v4.17.1 (`refs/chatwoot`). Ngày: 06/09/2026. Phạm vi: khối **Assignee** (+ nút Self-assign) và **Team** trong accordion "Conversation Actions" của ContactPanel, cùng action gán agent/team trong `ConversationContext`.

## Trace Vue/JS ↔ TSX

| Nguồn Chatwoot | Đích yona | Ghi chú |
|---|---|---|
| `routes/dashboard/conversation/ConversationAction.vue` — khối Assignee + Team (`assignedAgent` get/set, `assignedTeam` get/set, `showSelfAssign`, `onSelfAssign`, `onClickAssignAgent/Team`, `teamsList`) | `conversation/conversationbox/contact/ConversationAction.tsx` + `contact/assignmentOptions.ts` | Thứ tự gốc giữ nguyên: Assignee → Team → Priority (→ Labels B7). Logic thuần tách sang `assignmentOptions.ts` cho vitest |
| `composables/useAgentsList.js` + `helper/agentHelper.js` + `store/modules/inboxAssignableAgents.js` | `dashboard/composables/useAgentsList.ts` (một file) | Store vuex → cache module-level `Map` + `useSyncExternalStore`; `useMapGetter('getSelectedChat')` → `useConversation()` (ConversationContext là store hội thoại của yona). `agentHelper.js` chưa tách file riêng vì mới có một nơi dùng — tách khi bulk/context-menu cần |
| `api/inbox/conversation.js#assignAgent/assignTeam` | `conversation/api.ts#assignAgent/assignTeam` | Cùng endpoint `POST …/assignments`. Thân trả về `"null"` là JSON hợp lệ; bọc `postAssignment` vẫn nuốt `SyntaxError` phòng backend đổi sang 200 rỗng |
| `store/modules/conversations/actions.js#assignAgent/setCurrentChatAssignee` + mutation `ASSIGN_AGENT` | `ConversationContext#assignAgent(agent, assigneeType)` + `applyConversationAssignee` | Lạc quan trước → POST → ghi đè bằng payload server (gốc dispatch `setCurrentChatAssignee` hai lần). `assignee_type` suy ra `'User'`/`null` khi không truyền, đúng 4 case spec `mutations.spec.js#ASSIGN_AGENT` |
| `…#assignTeam/setCurrentChatTeam` + mutation `ASSIGN_TEAM` | `ConversationContext#assignTeam(team)` + `applyConversationTeam` | Gỡ team = gửi `team_id: 0` (`team ? team.id : 0` của gốc) |
| `store/modules/teams` getter `getTeams` (nạp bởi `Sidebar.vue` dispatch `teams/get`) | `contact/useTeamsList.ts` — `GET /api/v1/accounts/{id}/teams`, sắp theo `id` tăng dần | **KHÔNG dùng shared prop Inertia `teams`**: prop đó là `getMyTeams` (chỉ team mình là member, cho sidebar). Dropdown gán team ở gốc thấy MỌI team của account |
| `shared/components/ui/MultiselectDropdown.vue` | `resources/js/shared/components/ui/MultiselectDropdown.tsx` | Dùng lại nguyên si từ B5, **không sửa một dòng nào** (kể cả props) |
| i18n `AGENT_MGMT.MULTI_SELECTOR.*` | `lang/en/agent_mgmt.php` (mới thêm) | 8 chuỗi: PLACEHOLDER, TITLE.AGENT/TEAM, LIST.NONE, SEARCH.NO_RESULTS.AGENT/TEAM, SEARCH.PLACEHOLDER.AGENT/TEAM/INPUT — copy y `agentMgmt.json`, đặt cuối khối như gốc. `CONVERSATION_SIDEBAR.ASSIGNEE_LABEL/TEAM_LABEL/SELF_ASSIGN`, `CONVERSATION.CHANGE_AGENT(_FAILED)/CHANGE_TEAM`, `TEAMS_SETTINGS.LIST.NONE` đã có sẵn |

## Contract backend đã dùng (khớp `b6-notes-be.md`)

`POST …/conversations/{displayId}/assignments` — `{assignee_id: <id\|null>, assignee_type: <'User'\|null>}` → agent hoặc `null`; `{team_id: <id\|0>}` → team hoặc `null`. `assignee_type` vẫn gửi kèm như gốc (backend bỏ qua, AgentBot chưa port).

Danh sách agent: `GET /api/v1/accounts/{id}/inboxes/{inboxId}/assignable_agents` (đã có từ B1, khớp `Inbox#assignable_agents` = member inbox + mọi administrator). **Không** dùng `GET /agents` (toàn account) — sẽ cho gán người không thuộc inbox, lệch gốc.

## Khác biệt cố ý / nợ

- **Toast lỗi:** gốc nuốt lỗi trong store action rồi vẫn bắn toast SUCCESS. Yona revert giá trị cũ + throw; panel bắn `CONVERSATION.CHANGE_AGENT_FAILED` (khóa có sẵn trong gốc). Team **không có** khóa FAILED trong Chatwoot → thất bại chỉ revert im lặng, không bịa chuỗi mới.
- **Nhánh AgentBot** (avatar badge `i-lucide-bot`, tên `-`) chưa hiện được: `Avatar.tsx` chưa có slot `badge`, backend chưa có `AgentBot`. Logic đã port sẵn (`filterVerifiedAgents(includeAgentBots)`, `buildAgentsList` đổi tên rỗng thành `-`, so khớp theo `assignee_type`) — chỉ thiếu phần hiển thị. **Nợ D4.**
- `onSelfAssign` gốc dựng object từ `currentUser` (có `accounts[]`). Yona lấy `availability_status`/`role` từ shared prop `currentAccountUser`, `available_name` = `display_name || name`; giá trị lạc quan này bị payload server ghi đè ngay sau đó nên không lệch hiển thị.
- `ConversationBox.vue` watch `currentChat.inbox_id` để nạp assignable agents; yona đặt lệnh nạp trong chính `useAgentsList` (ranh giới file của B6 không cho sửa `ConversationBox`). Hành vi giống nhau, có chống gọi trùng theo `recordKey`.
- Card danh sách + header: gốc chỉ hiện tên assignee khi `showAssignee` (dùng ở màn search/bulk), `ConversationHeader.vue` KHÔNG hiện assignee → yona không thêm gì, đúng gốc.
- Auto-assign khi gán team (`allow_auto_assign`) đổi assignee ở backend; FE nhận qua realtime `assignee.changed` (đã cắm ở B4) — không tự đoán ở FE, không nhân đôi.

## Bẫy

1. **Shared prop `teams` ≠ danh sách gán team.** Prop Inertia là `getMyTeams` (member-only, cho sidebar); dùng nhầm sẽ giấu mất team mà agent không phải member. Phải gọi `GET /teams`.
2. `AgentMeta.availability_status` là `string`, còn `MultiselectOption`/`Avatar` đòi `'online'|'busy'|'offline'|null` → `AssignableAgent` thu hẹp lại kiểu này; đừng nới `MultiselectOption` (khối Priority của B5 đang phụ thuộc).
3. Mục **None** của agent là một option THẬT (`id: 0`), không phải `null`: chọn nó → gửi `assignee_id: 0`, `hasValue` = false (0 falsy) nên nút hiện placeholder "None". Mục None chỉ xuất hiện khi hội thoại ĐANG có assignee (`isAgentSelected`).
4. Mục **None** của team cũng vậy (`id: 0`, chỉ chèn khi đang có team) nhưng đến từ `TEAMS_SETTINGS.LIST.NONE`, không phải `AGENT_MGMT.MULTI_SELECTOR.LIST.NONE`.
5. `getAgentsByUpdatedPresence` chỉ ghi đè trạng thái cho chính mình khi `assignee_type` là `User` — AgentBot trùng id không bị đụng.

## Gate (06/09)

- `npx tsc --noEmit` ✓ · `npm run build` ✓ · `npm test` 16 file / 89 test ✓ (của B6-fe: `composables/useAgentsList.test.ts` 7 test, `conversationbox/contact/assignmentOptions.test.ts` 14 test).
- **E2E headless `~/www/pixel-diff/b6-assign-e2e.mjs`** (yona, John, account 2, conversation 4, `__noReloadMarker` giữ nguyên suốt): nhãn `["Assigned Agent","Assigned Team","Priority"]` ✓ · nút "Assign to me" hiện khi chưa gán ✓ · dropdown agent = `["John","Samantha"]` (John online đứng trước) ✓ → chọn **Samantha**: toast "Conversation Assignee changed", activity "Assigned to Samantha by John" hiện KHÔNG reload, nút Self-assign vẫn hiện (gán người khác) ✓ → **F5 vẫn giữ Samantha** ✓ → dropdown team = `["support"]` → chọn: toast "Conversation team changed" + activity "Assigned to support by John" ✓ → dropdown agent giờ có `["None","John","Samantha"]` → **None**: activity "Conversation unassigned by John" ✓ → dropdown team `["None","support"]` → **None**: cả ba nút về "None" ✓.
- **E2E `~/www/pixel-diff/b6-selfassign-e2e.mjs`**: bấm "Assign to me" → toast + activity "John self-assigned this conversation" không reload, nút đổi thành "John", nút Self-assign **biến mất** ✓; gỡ lại bằng None ✓.
- **Pixel-diff oracle↔yona `~/www/pixel-diff/b6-assign-diff.mjs`** (cắt bounding box từng khối, light + dark):
  - chưa gán: `agent-closed` 287×66 **0.000%/0.000%** · `agent-open` 287×182 **0.000%/0.000%** · `team-closed` 287×66 **0.000%/0.000%** · `team-open` 287×138 **0.000%/0.000%**.
  - đã gán (Samantha + support, set bằng `update_column`/`DB::table` để không đẻ activity): `agent-closed` **0.000%/0.000%** · `team-closed` **0.000%/0.000%** (avatar chữ cái + emoji icon team khớp).
  - gán chính John: dark **0.000%**; light **0.143% (27 px)** = **chấm presence** trên avatar (oracle bắt được John "online" từ heartbeat, yona chụp lúc đã "offline") — trạng thái sống, không phải lệch code; cả hai bên đều ẩn nút "Assign to me" ✓.
- Dọn sạch hai bên: xóa mọi activity test (yona id > 7, oracle id > 5), `assignee_id`/`team_id` = NULL, `last_activity_at` = `2026-09-01 06:11:52`, conversation còn đúng 5 tin; `ui_settings` John hai bên trùng nhau (`is_contact_sidebar_open=false`, không còn `is_conv_actions_open`).

## Cảnh báo cho phiên QA

- Conversation 4 (yona) là **fixture dùng chung** với `b6-fe-bulk`: lần chấm pixel đầu bị nhiễm vì bulk gán Samantha ngay lúc chụp (`agent-closed` 2.677%), chụp lại là 0.000%. Chấm lại phải xác nhận `assignee_id`/`team_id` NULL ngay trước khi chụp.
- Inbox 1 hai bên đang bật `enable_auto_assignment` và b6-be đã cắm auto-assignment ("Assigned to John by Default Policy" từng xuất hiện) — trước khi đo phải kiểm hội thoại chưa bị chính sách gán lại.
