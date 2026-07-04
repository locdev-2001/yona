# zca-js Capability Map (phụ lục sống)

Module: messaging · Status: **reference** · Updated: 2026-07-04 · Nguồn: zca-js 2.1.2 (`services/zca-js-2.1.2/src/`, dist `.d.ts`) + LAB evidence (`plans/260704-inbox-multichannel-relayer/reports/lab-2026-07-04-generic-adapter-evidence.md`).

> Mục đích: theo dõi CHÍNH XÁC bề mặt zca-js ta sở hữu, chống "miss" khả năng khi nâng version. Với **adapter generic** (dispatcher + forwarder), nâng zca-js → method/event mới **tự lộ** qua reflection; bảng này là ảnh chụp để đối chiếu, KHÔNG phải allowlist thủ công.

## Số liệu (đo thật, không đoán) — trạng thái SAU build P10-P12 (2026-07-04)
| | Tổng | Hiện wire |
|---|---|---|
| **REST method** | **146** (`.d.ts` Factory imports == runtime `Object.getOwnPropertyNames(api)`) | **146** qua `POST /zca/:method` (allowlist reflection, `src/routes/zca-dispatch.mjs`) + ~22 method / 19 endpoint bespoke giữ nguyên (4 active) |
| **Listener event** | **16** | **15 = 5 bespoke + 10 forwarder generic** (`src/relay-forwarder.mjs`); `cipher_key` CỐ Ý không forward (key material — B6). Event chưa có handler product → lưu `relay_events` (RLS, KHÔNG metering), KHÔNG vứt |

**11 event trước bị VỨT nay đã phủ** (P12): `connected, disconnected, old_messages, undo, seen_messages, delivered_messages, reaction, old_reactions, upload_attachment, typing` forward về Laravel (`old_messages`/`undo` durable outbox; chatty fire-and-forget — H3); `cipher_key` chặn tại bridge. Snapshot tier: `src/zca-methods.snapshot.json` — test M1 (`src/zca-adapter.test.mjs`) fail build khi bump zca-js lộ method chưa phân tier. Flow chi tiết: [zalo-generic-dispatcher](./zalo-generic-dispatcher.md).

## REST method — phân tier (dùng cho security gate)
Nguồn chi tiết: `plans/260704-inbox-multichannel-relayer/research/researcher-01-zca-surface.md`.
| Tier | Count | Xử lý |
|---|---|---|
| **READ** (get*/fetch*/find*/search*/parse*/last*) | 67 | Dispatcher JSON, không gate quyền đặc biệt |
| **WRITE-SAFE** (send*/create*/add*/change*/update*/accept*/vote*…) | 54 | Dispatcher JSON; **outbound send tin giữ đường riêng** (xem dưới) |
| **DESTRUCTIVE** | **39** | **Gate RBAC ở Laravel** trước khi gọi bridge + DENY defense-in-depth ở bridge (elevated secret) |
| **MEDIA** (Buffer/file) | **6** + 1 binary | KHÔNG qua JSON dispatcher → route multipart riêng |

**DESTRUCTIVE (39) — gate quyền bắt buộc.** Đối chiếu ĐỦ 146 method qua `.lab/audit-classification.mjs` (liệt kê **MỌI mutation non-read**, KHÔNG dựa danger-regex — sửa sau re-review NEW-1) + `.lab/zca-methods.snapshot.json`. Nguyên tắc gate: **ảnh hưởng nhóm/người-khác / persistent-send / bất-khả-hồi**.
- *Xoá tài nguyên:* removeFriend, rejectFriendRequest, undoFriendRequest, deleteGroupInviteBox, deleteMessage, undo, deleteChat, deleteCatalog, deleteProductCatalog, deleteAutoReply, removeReminder, removeQuickMessage, removeUnreadMark, deleteAvatar.
- *Chiếm/khoá/cấu trúc nhóm:* disperseGroup, leaveGroup, removeUserFromGroup, addUserToGroup, inviteUserToGroups, removeGroupDeputy, addGroupDeputy, removeGroupBlockedMember, addGroupBlockedMember, changeGroupOwner, changeGroupName, updateGroupSettings, reviewPendingMemberRequest, enableGroupLink, disableGroupLink, upgradeGroupToCommunity, blockUser, unblockUser, blockViewFeed.
- *Persistent-send/mất-tin/ẩn:* createAutoReply, updateAutoReply, updateAutoDeleteChat, setHiddenConversations, resetHiddenConversPin, updateHiddenConversPin.

**Cố ý ĐỂ DISPATCH_OK (38 mutation, không gate)** — config CÁ NHÂN account (profile/bio/lang/setting/avatar, mute/pin/archive/label, quickMessage), poll/catalog/note/reminder (reversible phạm vi hẹp), self-join nhóm (`joinGroupLink`), signal (typing/seen/delivered), friend-request (rate-limit ở product layer). *(Bỏ phantom `deleteReminder`.)*

**MEDIA input (6) — multipart route:** uploadAttachment, uploadProductPhoto, sendVideo, sendVoice, changeAccountAvatar, changeGroupAvatar. **Binary output (1):** getFullAvatar (trả ArrayBuffer → stream riêng).

**DENY-list bridge (chặn cứng dù method thật):** `custom` (gọi REST Zalo tùy ý → SSRF/bypass allowlist), `getCookie`, `getContext` (lộ session/credentials).

## 16 Listener event
`connected · disconnected · closed · error · typing · message · old_messages · seen_messages · delivered_messages · reaction · old_reactions · upload_attachment · undo · friend_event · group_event · cipher_key`. Payload chi tiết: researcher-01 §3 + `zca-js/src/apis/listen.ts:36-53`.

## Typed catalog — cách sinh (deterministic)
```bash
DTS=services/zalo-bridge/node_modules/.pnpm/zca-js@2.1.2/node_modules/zca-js/dist/apis.d.ts
grep -oE "\{ ([a-zA-Z]+)Factory \}" "$DTS" | sed -E 's/\{ (.+)Factory \}/\1/' | sort   # 146 method
```
LAB xác nhận danh sách này == `Object.getOwnPropertyNames(api).filter(fn)` runtime (146 == 146). → sinh catalog cho Laravel/TS biết chính xác method gì tồn tại.

## Ranh giới kiến trúc (KHÔNG được phá)
- **Allowlist reflect OWN property của instance** (LAB: own=146, proto=1). Prototype-only = **rỗng, deny sạch** — SAI cho factory pattern zca 2.1.2.
- **Outbound gửi tin giữ đường `/personal-messages/send` riêng** (outbox durable + echo dedup + `source_id`), KHÔNG thay bằng dispatcher generic — vì send có side-effect metering/idempotency.
- `source_id` L3 KHÔNG khoá theo `connection_id` (`inbound-source-id.mjs`).

## Related
- Kiến trúc: [channel-account-architecture](./channel-account-architecture.md) · [README](./README.md)
- LAB + red-team: `plans/260704-inbox-multichannel-relayer/reports/`
