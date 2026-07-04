# Message-State Pipeline — undo / seen / delivered / reaction / typing

Module: messaging · Status: **LIVE BE (P02 — inbox-full-messaging-framework)** · Updated: 2026-07-04

## Purpose
5 event trạng-thái-tin từ Zalo ngừng nằm kho `relay_events`, đi thẳng vào đích theo **taxonomy 4 loại**: trạng thái tin → đi theo `messages` · phù du (typing) → broadcast-only · lạ → structured log. Diệt "tin ma" (khách thu hồi mà CRM vẫn hiện), nhân viên thấy khách đã nhận/đã xem.

## Flow
```mermaid
flowchart TD
    BR[Bridge relay-forwarder] -->|"relay_event envelope"| WH[ZaloPersonalWebhookController::handleRelayEvent]
    WH -->|undo · durable| P[ZaloStateEventParser::parseUndo<br/>target = content.globalMsgId]
    WH -->|seen/delivered · chatty| P2[parseReceipts<br/>target = item.data.msgId · LOẠI nhóm]
    WH -->|reaction/old_reactions · chatty| P3[parseReactions<br/>target = content.rMsg[].gMsgID]
    WH -->|typing| T[broadcast ConversationTyping<br/>KHÔNG DB]
    WH -->|lạ| L[log warning redacted + 200]
    P --> S[MessageStateService]
    P2 --> S
    P3 --> S
    S -->|recalled_at set-once| M[(messages)]
    S -->|delivered_at/seen_at set-once, chỉ 1-1 + direction out| M
    S -->|upsert unique reactor, reacted_at monotonic| R[(message_reactions)]
    S -->|miss undo| PD[(pending_message_states<br/>bounded 48h + prune)]
    S -->|broadcast| E[MessageStateChanged → FE]
    ING[InboundMessageService::createMessage] -->|"tin về sau: applyPendingFor(source_id)"| PD
```

## Điểm dễ sai NHẤT (red-team BLK — đã vá, đừng regress)
| Vấn đề | Giải pháp trong code |
|---|---|
| Target mỗi event nằm ở field LỒNG KHÁC NHAU — `data.msgId` của undo/reaction là id của HÀNH ĐỘNG, không phải tin đích | `ZaloStateEventParser` per-event: undo→`content.globalMsgId`, reaction→`content.rMsg[].gMsgID`, seen/delivered→`item.data.msgId` (đối chiếu `services/zca-js-2.1.2/src/models/{Undo,Reaction,SeenMessage,DeliveredMessage}.ts`) |
| Event đến TRƯỚC tin | undo → `pending_message_states` (unique + TTL 48h + `inbox:prune-transient` daily) rồi 200; ingest quét `applyPendingFor` áp lại. Chatty (seen/delivered/reaction) → **drop-on-miss CÓ CHỦ ĐÍCH, có test chứng minh** — KHÔNG phải "idempotent tuyệt đối" |
| Group receipt per-member (`seenUids`) — scalar seen_at SAI cho nhóm | Guard 2 tầng: parser loại item type=1/groupId; service bỏ qua `thread_type=1`. Receipt chỉ áp tin `direction != 'in'` |
| Resolve tin không có conversation_id trong event | `MessageSourceResolver::findForAccount(channel_account_id, msgId)` — msgId duy nhất per-account, né hẳn semantics threadId mơ hồ; alias-aware (multi_send/legacy) |
| Race echo-về-trước-portal-persist (23505) | `ZaloSendService::persistMessage` catch 23505 → merge vào row echo, không bump stream_version lần 2, không ném lỗi ra user |

## Idempotency (không kho)
- recall: **set-once** `whereNull(recalled_at)` — replay noop.
- receipts: **set-once** mốc đầu (event zca không mang ts cho seen 1-1); seen tự set delivered nếu thiếu.
- reaction: unique `(message_id, reactor_uid)` + `reacted_at` **monotonic** — đổi icon = update, `rIcon=''` (NONE) = delete, NONE out-of-order KHÔNG xoá (chống cảm xúc ma).

## HTTP contract (bridge outbox)
undo (durable): 200 `undo_applied|undo_pending|undo_noop` · 422 payload hỏng · 503 DB transient (retry).
Chatty lane: **luôn 200**, lỗi swallow + report. Typing: 200, không DB. Lạ: 200 + `logger()->warning` redacted (event_type + payload_keys, KHÔNG payload thô — spec đầy đủ rate-limit/alert ở P09).

## Broadcast
- `MessageStateChanged` {conversation_id, message_id, state: recalled|delivered|seen|reaction, recalled_at, delivered_at, seen_at, reactions[]} — channel `workspace.{id}.conversations`.
- `ConversationTyping` {conversation_id, typist_uid} — ShouldBroadcastNow, FE tự ẩn sau 8s (P03).

## LAB còn nợ (runtime evidence P12 — semantics, KHÔNG phải shape)
Shape parser lấy từ SOURCE zca-js (bridge forward nguyên class instance — không đoán wire format). Còn phải verify trên tài khoản thật: undo → recalled_at ≤5s; seen 1-1 bắn khi nào; reaction NONE thực tế.

## Files
- Core: `app/Services/Inbox/{MessageStateService,MessageSourceResolver}.php`, `app/Events/{MessageStateChanged,ConversationTyping}.php`
- Driver: `app/Modules/Integration/Chat/ZaloPersonal/ZaloStateEventParser.php`
- Wiring: `ZaloPersonalWebhookController::handleRelayEvent`, `InboundMessageService` (resolver + applyPendingFor)
- Tests: `tests/Feature/Inbox/MessageStateTest.php` (16), `tests/Feature/ChannelZalo/RelayEventWebhookTest.php` (contract mới)
