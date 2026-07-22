# CRM — Conversations / Omnichannel Inbox (live chat realtime)

> The **Conversations** bounded context: realtime omnichannel messaging between customers and agents — web chat widget, Zalo, Facebook Messenger, Email — in one unified inbox. **V1 core.** This is the "omnichannel inbox" from `crm-domain-definition.md` (Collaborative CRM).
> Mandates **Laravel Reverb** (WebSocket) — previously deferred, now v1 infra. Companion to [system-architecture.md](system-architecture.md), [crm-marketplace.md](crm-marketplace.md) (channels = integration items), [crm-business-rules.md](crm-business-rules.md).

Date: 2026-06-13 · Cập nhật: 2026-07-22 · Status: **thiết kế gốc — inbox ĐÃ BUILD** (GĐ1, kênh đầu = Zalo cá nhân, merge 2026-07-11; KHÔNG phải web widget/FB/Email như thiết kế). Hiện trạng theo code: [features/messaging/README.md](features/messaging/README.md)

## Scope (v1)

- **Channels**: web widget (built-in), Zalo, Facebook Messenger, Email — all normalize into one conversation/message model.
- **Realtime**: live messages, typing indicators, agent presence, unread — via Reverb.
- **Conversation ≠ Ticket** (decision): a Conversation is its own entity; an agent can **escalate** a conversation → create a Ticket (linked). They stay distinct.
- Assignment/routing reuses the ticket pattern (queue / round-robin / skill).

## Data model

All workspace-scoped (`workspace_id`, isolation as everywhere). `messages` is high-volume, append-only, partition-ready (like `activities`).

| Table | Notable columns | Notes |
|---|---|---|
| `inbox_channels` | `workspace_id, type(web_widget/zalo/facebook/email), name, integration_id, config jsonb, is_active` | A connected channel. Zalo/FB/Email reference `workspace_integrations` (marketplace integration items); web_widget is built-in. |
| `conversations` | `workspace_id, channel_id, contact_id (nullable), assignee_id, team_id, status(open/pending/snoozed/closed), subject, last_message_at, unread_count, external_thread_ref, ticket_id (nullable), first_response_at, closed_at` | `contact_id` null until visitor identified. `ticket_id` set on escalation. `last_message_at` denormalized for inbox sort (never scan messages). |
| `messages` | `workspace_id, conversation_id, sender_type(contact/agent/system), sender_id, body, direction(inbound/outbound), external_message_ref, delivery_status(queued/sent/delivered/read/failed), created_at` | Append-only (BR-T02 style). Attachments via polymorphic `attachments`. Partition-ready. `unique(workspace_id, channel external_message_ref)` for inbound idempotency. |
| `conversation_participants` | `workspace_id, conversation_id, user_id, role(assignee/collaborator)` | Agents on a conversation (collaboration, @mention). |
| `canned_responses` | `workspace_id, title, body, shortcut, scope(personal/team/workspace), owner_id` | Saved replies. |

Visitor (pre-identification): web-widget visitor metadata (name/email captured, browser/UTM) kept on the conversation until linked; on identify → link or create `Contact` (BR-L02 dedup applies).

## Realtime (Reverb)

- **Private + presence channels per workspace**, e.g. `private-ws.{workspace}.conversation.{id}`, `presence-ws.{workspace}.inbox`.
- **Channel authorization is a tenant-leak surface** (see system-architecture §11): a user may subscribe **only** to conversations within their workspace **and** their visibility scope (own/team/all, BR-X09/X15). Broadcast auth runs the same `Visibility` check — never broadcast cross-workspace.
- Events: `MessageCreated`, `ConversationAssigned`, `ConversationStatusChanged`, `TypingStarted`, `AgentPresenceChanged`. Fired **after commit**.
- Web widget visitor connects via a **scoped, signed token** (per BR-X10 pattern) — visitor only sees their own conversation.

## Inbound / outbound flow (per channel)

```
INBOUND:  provider webhook (Zalo/FB) | email parse | widget WS
   → verify signature + idempotency (external_message_ref)
   → normalize → find/create conversation (by external_thread_ref) + append message
   → broadcast (Reverb) + notify assigned agent (+routing if unassigned)
OUTBOUND: agent reply
   → persist message (status=queued) → broadcast to widget/agents
   → queued SendMessage job → provider Send API (retry/backoff) → update delivery_status
```

- **Idempotency**: inbound dedupes on `(workspace_id, channel, external_message_ref)`.
- **Routing**: unassigned conversation → inbox triage queue; auto-assign by round-robin/skill (reuse ticket routing).
- **Email channel** reuses the chosen email-two-way integration; threading via `external_thread_ref`.

## Escalate to Ticket

Action on a conversation → create `Ticket` (BR-S01) linked via `conversation.ticket_id`; conversation continues, ticket tracks SLA/resolution. Activities/timeline cross-link. Two entities, one customer thread.

## SLA / metrics

- Conversations track `first_response_at`. Live-chat first-response expectation is **minutes** (tighter than ticket SLA) — a separate light "response-time" target per workspace (config). Full ticket-style SLA only after escalation. (Detailed chat-SLA tuning deferred.)

## Consistency & scale

- Messages append-only, eventual for realtime fan-out; conversation **state** (assignment/status) strongly consistent.
- `messages` partition-ready (workspace_id/created_at); `last_message_at` + `unread_count` denormalized on conversation (monotonic update, BR-X08 style) so the inbox list never scans messages.

## Security

- Web widget endpoint: per-workspace **signed token** (never raw workspace_id), per-IP + per-workspace rate-limited, captcha-gated, input-validated (mirror BR-X10).
- Provider webhooks: signature verification (Zalo/FB), HMAC; idempotent.
- Broadcast channel auth = workspace + visibility scoped (the #1 realtime leak risk).
- PII in messages: erasable/exportable per BR-X07.

## Open questions

1. Web-widget chat: free in base, or a marketplace add-on? (Zalo/FB/email are integration items already.)
2. Visitor identity before contact: anonymous session lifetime / merge rules when they later become a Contact?
3. Bot/AI auto-reply on channels (system sender) — v1 manual only, AI deferred?
