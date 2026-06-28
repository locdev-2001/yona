# Messaging Module (Inbox + Channel-Zalo + Billing)

Navigate messaging features. GĐ1 implements Phase 1 inbox: Zalo personal webhook inbound + outbound metering + entitlements.

## Feature Index

| Feature | Purpose | Module |
|---|---|---|
| [Zalo Personal Inbox](./zalo-personal-inbox.md) | Webhook inbound → Conversation + Message, broadcast realtime. | inbox + channel-zalo |
| [Outbound Send](./outbound-send.md) | Reply: circuit-breaker → quota → rate-limit → bridge HTTP → persist + meter. | channel-zalo |
| [Conversation to Lead](./conversation-to-lead.md) | Convert conversation to Lead via CDP dedup (contract Phase-07, impl Phase-08). | inbox + crm-sales |
| [Conversation Metering](./conversation-metering.md) | Race-safe F1 metering; F5 existing conv unlimited; inbound never blocked. | billing (MeteringGate contract) |
| [Plan Entitlements & Grant](./plan-entitlements-grant.md) | Workspace subscriptions, admin grant, quota resolve. | billing |

## Key Decisions (GĐ1)

- **Inbox Phase 1 = Zalo cá nhân (NOT Zalo OA):** QR login via zca-js bridge. OA deferred to Phase 2 (no test account).
- **Conversation = per-peer per-channel:** Same peer across Zalo + Messenger = 2 conversations (phone-based dedup only in CDP, Phase-08).
- **Metering = per-channel per-month:** 1 conversation = 1 meter when tenant replies first time in period. Existing conversation = unlimited replies (F5).
- **Inbound always accepted (F13/F20):** Never reject inbound by quota — preserve lead capture.
- **Rate limit = 7h–22h + ≤3/phone/day:** ToS compliance (Zalo commercial hours).
- **Circuit-breaker = AccountHealthMonitor:** Track bridge health per connection; fail-fast if unhealthy (N retries → circuit open).

Link: [CLAUDE.md](../../CLAUDE.md) § Key Decisions (GĐ1).

## Architecture

### Webhook → Inbound Flow

```
Bridge (Node zca-js)
  ↓ (message event)
POST /api/integrations/zalo-personal/webhook
  ↓ (HMAC-signed)
Webhook handler (F6 auth)
  ↓
TenantScope::bind(connection_id → workspace_id)  [F11: RLS scope]
  ↓
InboundMessageService::ingest()
  ├─ upsertConversation() [F2: unique per (connection_id, peer_uid)]
  ├─ upsertMessage() [F14: idempotent source_id, default direction='in']
  ├─ updateConversationCache() [F16: atomic increment unread_count]
  ├─ meterReply() [fail-safe F1: inbound never counted]
  └─ Event: MessageReceived broadcast [Reverb PrivateChannel F22]
```

### Outbound → Send Flow

```
Member reply (UI)
  ↓
OutboundMessageController::store()
  ↓
ZaloSendService::send()
  ├─ HealthMonitor::isCircuitOpen() [F3: fail-fast]
  ├─ MeteringGate::assertCanSend() [F1/F5: quota or unlimited if existing]
  ├─ SendRateLimiter::assertCanSend() [F8: 7h-22h + 3 msg/phone/day]
  ├─ callBridge() [retry 2×200ms, timeout 15s, F4]
  │  └─ HTTP POST bridge /personal-messages/send
  ├─ persistMessage() [direction='out', RLS enforced]
  ├─ meterReply() [F1 race-safe: compare-set + ON CONFLICT upsert]
  ├─ increment(rate_limiter) [Redis INCR if enabled, else memory]
  └─ HealthMonitor::reset() [success indicator]
```

### Entitlements → Gate Flow

```
Request entry (middleware/controller)
  ↓
TenantScope::bind(workspace_id)
  ↓
EntitlementResolver::snapshot(workspace_id)
  ├─ Redis cache hit (5 min TTL) → return cached
  ├─ OR Query WorkspacePurchase (active)
  │   ├─ No active → FREE_DEFAULTS
  │   └─ Yes → merge entitlements
  │       └─ Cache 5 min
  ├─ For each quota:
  │   ├─ Query ChannelUsage (current period)
  │   └─ remaining = limit - answered_count
  └─ Return {flags, quotas, remaining}
        ↓
    Inertia::share('entitlements', ...)
        ↓
    FE renders quota badges + feature gates
```

## Related Concepts

- **CDP (Customer Data Platform):** Contact dedup by phone (Phase-08). See [crm-domain-definition.md](../crm-domain-definition.md) § Contact.
- **IdentityResolver contract:** Resolve/create Contact from peer (Phase-07: no-op; Phase-08: real dedup). See [Conversation to Lead](./conversation-to-lead.md).
- **Modular architecture:** Each module provides contract interface; others depend on contract, not impl. See [modular-architecture.md](../modular-architecture.md).
- **RLS (Row-Level Security):** PostgreSQL enforces workspace isolation; TenantScope binds workspace before queries. See [../system-architecture.md](../system-architecture.md) § RLS.
- **Realtime:** Reverb broadcasts message events to subscribed LiveWire components (F22). See [../platform/announcements.md](../platform/announcements.md) (similar pattern).

## Troubleshooting

### Webhook signature 403 Unauthorized

- **Cause:** HMAC X-Zalo-Personal-Bridge-Secret header invalid or missing.
- **Fix:** Verify bridge config `services.zalo_bridge.webhook_secret` matches webhook controller secret. Check bridge logs.

### Conversation thread shows old peer_name/phone

- **Cause:** Conversation record cached or peer info not updated on webhook.
- **Fix:** InboundMessageService updates peer info on each message. Clear browser cache; refresh conversation.

### Quota exceeded but user can still send

- **Cause:** Likely conversation already metered this period (F5: existing conv always allowed).
- **Fix:** Query conversation.last_metered_period == current period? If yes, behavior correct. If no, check EntitlementResolver::remaining().

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

For system architecture overview, see [../system-architecture.md](../system-architecture.md).
