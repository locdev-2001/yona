# Messaging Module (Inbox + Channel-Zalo + Billing)

Navigate messaging features. GĐ1 implements Phase 1 inbox: Zalo personal webhook inbound + outbound metering + entitlements.

## Feature Index

| Feature | Purpose | Module |
|---|---|---|
| [Zalo Personal Inbox](./zalo-personal-inbox.md) | Webhook inbound → Conversation + Message, broadcast realtime. | inbox + channel-zalo |
| [Outbound Send](./outbound-send.md) | Reply: circuit-breaker → rate-limit → bridge HTTP → persist + meter. | channel-zalo |
| [Conversation to Lead](./conversation-to-lead.md) | Convert conversation to Lead via `ContactService` phone dedup + `LeadService` (direct calls, no contract layer). | `ConversationLeadController` |
| [Conversation Metering](./conversation-metering.md) | Race-safe F1 metering per channel per month; no quota gate applied. Inbound never metered. | `App\Services\MeteringService` (concrete, no interface) |
| [Plan Entitlements & Grant](./plan-entitlements-grant.md) | Workspace purchases, admin grant/revoke, quota resolve. | `App\Services\{GrantPlanService,EntitlementService}` |
| [Channel-Account Architecture](./channel-account-architecture.md) | Account-keyed redesign (GĐ1 live): tách danh tính tài khoản khỏi session, 5 lớp, gap marker + fallback backfill, core mù session. Sửa #1 phân mảnh / #2 mất tin / #3 mở rộng. | inbox + channel-zalo |
| [zca Capability Map](./zca-capability-map.md) | Bề mặt zca-js (146 REST / 16 event) + adapter generic L1 (dispatcher/forwarder/allowlist reflection) — sở hữu 100% bề mặt, chống "miss" khả năng khi nâng version. | channel-zalo |
| [Message-State Pipeline](./message-state-pipeline.md) | P02/P03: undo/seen/delivered/reaction ĐI THEO messages (taxonomy 4 loại), pending bounded, UI tick/recalled/reactions/typing. | inbox core + channel-zalo |
| [Composer Media](./composer-media.md) | P04: gửi ảnh/file từ portal — private disk + signed URL (A3), bridge byte-cap + allowlist, dedup 2-msgId. | inbox + bridge |
| [Phone Enrichment](./phone-enrichment.md) | P05: SĐT từ danh thiếp (consent-by-conduct) + nhập tay verify — mở khóa rule #1 CDP. CẤM harvest. | inbox core |
| [Outbound Interactions](./outbound-interactions.md) | P06: quote-reply + reaction + sticker (caller đầu tiên dispatcher /zca) + seen-sync default OFF. | inbox + channel-zalo |
| [Inbox CRM Layer](./inbox-crm-layer.md) | P07: gán phụ trách, label (tags morph), note nội bộ, canned replies — channel-agnostic. | inbox core |
| [Channel Framework Contract](./channel-framework-contract.md) | **P11 — HỢP ĐỒNG ĐÓNG BĂNG:** thêm kênh = 1 driver, 0 dòng sửa core. Allowlist + DeliveryPipeline money-path + mock contract test. | contracts |

## Key Decisions (GĐ1)

- **Inbox Phase 1 = Zalo cá nhân (NOT Zalo OA):** QR login via zca-js bridge. OA deferred to Phase 2 (no test account).
- **Conversation = per-peer per-channel:** Same peer across Zalo + Messenger = 2 conversations (phone-based dedup only in CDP, Phase-08).
- **Metering = per-channel per-month:** 1 conversation = 1 meter when tenant replies first time in period (statistics only, no quota gate).
- **Inbound always accepted (F13/F20):** Never reject inbound by quota — preserve lead capture.
- **Rate limit = 7h–22h + ≤3/phone/day:** ToS compliance (Zalo commercial hours).
- **Circuit-breaker = ZaloHealthMonitor:** Track bridge health per connection; fail-fast if unhealthy (N retries → circuit open).

Link: [CLAUDE.md](../../../CLAUDE.md) § Key Decisions (GĐ1).

## Architecture

### Webhook → Inbound Flow

```
Bridge (Node zca-js)
  ↓ (message event)
POST /api/integrations/zalo-personal/webhook
  ↓ (HMAC-signed)
Webhook handler (F6 auth)
  ↓
TenantScope::bind(connection_id → workspace_id)  [F11: RLS scope, via ZaloConnection::workspaceForConnection()]
  ↓ resolve channel_account_id from connection_id (ZaloConnection::channelAccountIdForConnection())
IntakeService::ingest()
  ├─ upsertConversation() [F2: unique per (channel_account_id, peer_uid)]
  ├─ upsertMessage() [F14: idempotent source_id via message_source_aliases, default direction='in']
  ├─ meterReply() [fail-safe F1: inbound never counted]
  └─ BroadcastService::publish() [F16: atomic increment unread_count, then MessageReceived broadcast — Reverb PrivateChannel F22]
```

### Outbound → Send Flow

```
Member reply (UI)
  ↓
InboxController::send()  [POST /inbox/conversations/{conversation}/messages]
  ↓ ComposeMessageService::compose() → OutboundMessage [validate + normalize payload, media URL]
  ↓ DeliveryPipeline::send(ChannelRegistry::driver($conversation->channel), …)
  ↓ ZaloChannelDriver::sendMessage()
ZaloSendService::send()  [channel policy + transport + persist only]
  ├─ resolveConnection() [account→slot via channel_account_id]
  ├─ ZaloHealthMonitor::isCircuitOpen() [F3: fail-fast]
  ├─ SendRateLimiter::assertCanSend() [F8: 7h-22h + 3 msg/phone/day]
  ├─ callBridge() [F4]
  │  └─ HTTP POST bridge /personal-messages/send
  ├─ persistMessage() [direction='out', RLS enforced]
  ├─ increment(rate_limiter) [Redis INCR if enabled, else memory]
  └─ ZaloHealthMonitor::reset() [success indicator]
  ↑ back in DeliveryPipeline (core-owned, never per-driver)
  ├─ meterReply() [F1 race-safe: compare-set + upsert]
  └─ BroadcastService::publish() [message already left the platform → publish errors stay internal]
```
Every failure path above is wrapped into a `SendException` and surfaces as a uniform HTTP `422` with a distinguishing `error_code` — see [outbound-send.md](./outbound-send.md).

### Entitlements + Metering (Statistics)

```
Request entry (middleware/controller)
  ↓
TenantScope::bind(workspace_id)
  ↓
EntitlementService::snapshot(workspace_id)
  ├─ Redis cache hit (5 min TTL) → return cached
  ├─ OR Query WorkspacePurchase (active)
  │   ├─ No active → FREE_DEFAULTS
  │   └─ Yes → merge entitlements (flags only)
  │       └─ Cache 5 min
  ├─ Query ChannelUsage (current period, NOT cached)
  │   └─ answered_count per channel
  └─ Return {flags, usage}
        ↓
    Inertia::share('entitlements', ...)
        ↓
    FE renders usage badges (informational, no gates)
```

## Related Concepts

- **CDP (Customer Data Platform):** Contact dedup by phone (Phase-08). See [crm-domain-definition.md](../../crm-domain-definition.md) § Contact.
- **Contact dedup:** `ContactService::resolveOrCreateFromPeer()` resolves/creates a Contact by phone directly (no contract/interface layer). See [Conversation to Lead](./conversation-to-lead.md).
- **Driver pattern:** Business modules live under `app/Modules/{Automation,Chat,Payment}/`. Channel drivers register on `App\Modules\Chat\Port\ChannelRegistry` (an `Illuminate\Support\Manager`); payment drivers register on `App\Modules\Payment\Port\PaymentRegistry`. See [system-architecture.md](../../system-architecture.md) § Architecture.
- **RLS (Row-Level Security):** PostgreSQL enforces workspace isolation; TenantScope binds workspace before queries. See [../../system-architecture.md](../../system-architecture.md) § RLS.
- **Realtime:** Reverb broadcasts message events to subscribed LiveWire components (F22). See [../platform/announcements.md](../platform/announcements.md) (similar pattern).

## Troubleshooting

### Webhook signature 401 Unauthorized

- **Cause:** HMAC X-Zalo-Personal-Bridge-Secret header invalid or missing (`VerifyZaloBridgeSecret` middleware).
- **Fix:** Verify bridge config `services.zalo_bridge.webhook_secret` matches webhook controller secret. Check bridge logs.

### Conversation thread shows old peer_name/phone

- **Cause:** Conversation record cached or peer info not updated on webhook.
- **Fix:** IntakeService updates peer info on each message. Clear browser cache; refresh conversation.

### Quota exceeded but user can still send

- **Cause:** Likely conversation already metered this period (F5: existing conv always allowed).
- **Fix:** Query conversation.last_metered_period == current period? If yes, behavior correct. If no, check EntitlementService::remaining().

### Circuit breaker stuck open

- **Cause:** Bridge health monitor error count exceeded threshold.
- **Fix:** Check bridge logs for 503/429/403 errors. Restart bridge if session lost. Circuit resets on successful send.

### Rate limiter blocking valid send

- **Cause:** Timestamp outside 7h–22h (Ho Chi Minh time) OR 3 messages already sent to peer today.
- **Fix:** Wait until next day (0h UTC+7) or send from different phone number. UI should show "can only send 7h-22h" message.

### Metering stuck (conversation not counted)

- **Cause:** meterReply() transaction rolled back (upsert failed after compare-set).
- **Fix:** Check PostgreSQL error logs. Retry send; idempotent meterReply() should succeed on retry.

---

For system architecture overview, see [../../system-architecture.md](../../system-architecture.md).
