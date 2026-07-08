# Conversation Metering (Billing & Quota Gate)

Module: `App\Services\MeteringService` (plain Laravel — concrete class, no interface/contract, no `modules/` directory) · Status: live (GĐ1) · Updated: 2026-07-04

## Purpose

Race-safe count of outbound conversations per channel per month (compare-set atomic UPDATE + upsert), allow existing conversations unlimited replies (F5), block brand-new conversations when over quota. Inbound is NEVER routed through this gate at all (F13/F20).

**Value:** Enables conversation-based billing without undercount race conditions, preserves lead capture under quota, and allows unlimited replies once a conversation has already been metered this period.

## Actors & permissions

- **System** (`ZaloSendService::send()`, `InboundMessageService::ingest()` for `direction='out'`) → calls `MeteringService` to check/meter conversations.
- **`EntitlementService`** → resolves workspace quota limits (cached 5 min) that `MeteringService` reads via `canStartNew()`.
- **PostgreSQL** → enforces race-safe metering via a compare-set `UPDATE` + `ON CONFLICT DO UPDATE` upsert, both in one transaction.

Link: No user-facing permissions; internal system service.

## Trigger / entry points

**`App\Services\MeteringService`** (concrete class — explicitly documented in its own docblock as "KHÔNG implement interface... billing là CORE" — there is no swappable/no-op implementation; metering is unconditionally active):
1. `assertCanSend(Conversation): void` — called by `ZaloSendService::send()` before the bridge HTTP call; throws `QuotaExceededException` if a brand-new-this-period conversation is over quota.
2. `canStartNew(string $channel): bool` — used internally by `assertCanSend()`; no external caller currently exists in `app/` (not called directly by any controller).
3. `canReplyOnExisting(Conversation): bool` — exists and is exercised in unit tests (mocked), but has no production caller anywhere in `app/` right now; always returns `true` by its own logic anyway (F5/F13 make it a no-op gate in practice).
4. `meterReply(Conversation): void` — called by `ZaloSendService::send()` after a successful bridge send, and by `InboundMessageService::ingest()` for `direction='out'` payloads (wrapped in try/catch there — a metering failure never blocks message persistence).
5. `currentPeriod(): string` — `now('Asia/Ho_Chi_Minh')->format('Y-m')`.

There is no separate `AllowAllMeteringGate`/no-op fallback — that pattern was explicitly removed; metering is always on.

## Operational flow (step-by-step)

```mermaid
stateDiagram-v2
    [*] --> ConvStarted: Inbound message arrives
    ConvStarted --> CheckMetered: Member clicks reply

    CheckMetered --> AlreadyMeteredThisPeriod: conv.last_metered_period<br/>== currentPeriod()?
    AlreadyMeteredThisPeriod --> AllowSend: YES (F5 — always pass)

    CheckMetered --> NewOrOldPeriod: NO (new or stale period)
    NewOrOldPeriod --> CheckQuota: canStartNew(channel)

    CheckQuota --> OverQuota: remaining <= 0
    OverQuota --> BlockSend: throw QuotaExceededException
    BlockSend --> [*]

    CheckQuota --> UnderQuota: remaining > 0
    UnderQuota --> AllowSend

    AllowSend --> SendBridge
    SendBridge --> BridgeSuccess: HTTP 2xx

    BridgeSuccess --> MeterReply: DB::transaction
    MeterReply --> UpdateConvLastMeteredPeriod: UPDATE conversations<br/>SET last_metered_period = ?<br/>WHERE id = ? AND (last_metered_period IS NULL OR != ?)
    UpdateConvLastMeteredPeriod --> RaceCheck: affected rows?

    RaceCheck --> RaceWon: == 1
    RaceWon --> UpsertChannelUsage: INSERT ... ON CONFLICT (workspace_id, channel, period)<br/>DO UPDATE answered_count = answered_count + 1
    UpsertChannelUsage --> CommitTransaction
    CommitTransaction --> [*]

    RaceCheck --> RaceLost: == 0 (already metered by a concurrent call)
    RaceLost --> EarlyReturn: no upsert — idempotent no-op
    EarlyReturn --> [*]

    note right of MeterReply
        F1: single transaction wraps both
        the compare-set UPDATE and the
        upsert. affected=0 short-circuits
        before ever touching channel_usage.
    end note

    note right of CheckMetered
        F5: a conversation already
        metered this period always
        passes assertCanSend(),
        even at 0 remaining.
    end note
```

**Steps (`assertCanSend` flow):**
1. `ZaloSendService::send()` calls `assertCanSend(conversation)` before the bridge call (inside `ZaloSendService`, not a separate gate class).
2. `MeteringService` checks `conversation.last_metered_period === currentPeriod()`:
   - YES → return immediately, no quota check at all (F5).
   - NO → falls through to `canStartNew($conversation->channel)`.
3. `canStartNew()` resolves `EntitlementService::remaining($workspaceId, "quota.conversations.{$channel}")`:
   - No workspace context (`currentWorkspace()` null) → fail-open, returns `true` (no reason to block without context).
   - `remaining > 0` → `true`; `remaining <= 0` → `false` → `assertCanSend()` throws `QuotaExceededException`.

**Steps (`meterReply` flow — F1 race-safe):**
1. `ZaloSendService::send()` (after bridge success) or `InboundMessageService::ingest()` (for `direction='out'`, in a try/catch) calls `meterReply(conversation)`.
2. Everything below runs inside one `DB::transaction()`:
   - Compare-set: `UPDATE conversations SET last_metered_period = currentPeriod() WHERE id = ? AND (last_metered_period IS NULL OR last_metered_period != currentPeriod())`.
   - `affected === 0` → this conversation was already metered this period (by this call or a concurrent one) → **return immediately, never touches `channel_usage`** — idempotent, no double count.
   - `affected === 1` → this call won the race → `INSERT INTO channel_usage (...) VALUES (...) ON CONFLICT (workspace_id, channel, period) DO UPDATE SET answered_count = answered_count + 1`, same transaction.
3. If the upsert fails after the compare-set succeeds, the whole transaction rolls back — `last_metered_period` reverts too, so a retry later can still succeed (no permanent under-count).

## Data touched

**Models:**
- `Conversation`
  - Reads: `id`, `channel`, `workspace_id`, `last_metered_period`
  - Writes: `last_metered_period` (compare-set inside the `meterReply` transaction, via `withoutGlobalScope('workspace')`)
  - RLS: global scope normally enforced; explicitly bypassed here since `meterReply` needs to run regardless of the caller's bound workspace context

- `ChannelUsage` (`channel_usage` table, internal, no RLS)
  - Reads (via `EntitlementService::remaining()`): `answered_count` for the current period
  - Writes: `answered_count` via atomic `ON CONFLICT` upsert
  - Columns: `id` (uuid), `workspace_id`, `channel`, `period` (`YYYY-MM`), `answered_count`, `created_at`, `updated_at`
  - Unique constraint: `(workspace_id, channel, period)`

**RLS scoping:**
- `Conversation` writes in `meterReply()` use `withoutGlobalScope('workspace')` — the metering write must succeed regardless of which workspace context (if any) the calling request has bound.
- `ChannelUsage` is an internal table with no RLS policy; every query filters by `workspace_id` explicitly instead.

## State transitions

- **`Conversation.last_metered_period`:** `null` (new) → `'YYYY-MM'` (first successful metered reply this period) → stays that value until a `meterReply()` call in a later period updates it again.
- **`ChannelUsage` row:** doesn't exist → created with `answered_count=1` on first metered reply for that `(workspace_id, channel, period)` → incremented on each subsequent one.

## Business rules applied

- **F1 (Race-safe metering):** Single DB transaction, compare-set `UPDATE` + `ON CONFLICT` upsert. Only one concurrent call per conversation per period can ever increment `channel_usage`; the rest no-op. Prevents under-count under concurrency, by construction rather than by locking.
- **F5 (Existing conversation always allowed):** `conversation.last_metered_period === currentPeriod()` → `assertCanSend()` passes unconditionally, even at 0 remaining quota.
- **F13/F20 (Inbound always accepted):** Inbound (`direction='in'`) never calls into `MeteringService` at all — not "fail-safe," genuinely no code path. Only `direction='out'` calls `meterReply()`, and even that call is wrapped in a try/catch in `InboundMessageService` so a metering failure can never block message persistence.
- **F11 (Workspace isolation):** Every quota/usage query filters by `workspace_id` explicitly (since several call sites deliberately bypass the RLS global scope).

Link: [crm-business-rules.md](../crm-business-rules.md) § F1, F5, F11, F13, F20.

## Edge cases & error handling

| Scenario | Behavior |
|---|---|
| **Quota exceeded on a new conversation** | `assertCanSend()` throws `QuotaExceededException` → propagates up through `ZaloChannelDriver::sendMessage()` as a `SendException(quota_exceeded)`-equivalent (caught by class-name match in `InboxController::send()`, since `QuotaExceededException` isn't yet wrapped as a `SendException`) → uniform `422`, not `402`. See [outbound-send.md](./outbound-send.md). |
| **Conversation already metered this period** | `assertCanSend()` passes unconditionally (F5); a concurrent `meterReply()` call for it is a guaranteed no-op (race lost, `affected=0`). |
| **`meterReply()` called twice concurrently for the same conversation** | Exactly one wins the compare-set; the other returns immediately without touching `channel_usage` — both calls "succeed" from the caller's point of view, only one counts. |
| **`channel_usage` upsert fails mid-transaction** | Whole transaction rolls back, including the `last_metered_period` compare-set — safe to retry later. |
| **`currentPeriod()` crosses a month boundary** | `now('Asia/Ho_Chi_Minh')->format('Y-m')` evaluated fresh on every call — no caching of "current period" anywhere in this service. |
| **`EntitlementService` cache miss** | Falls through to a DB query for active purchases; see [plan-entitlements-grant.md](./plan-entitlements-grant.md). |
| **Workspace quota key resolves to `null`** | `EntitlementService::remaining()` returns `PHP_INT_MAX` → `canStartNew()` always `true`, never blocks. |
| **No workspace context bound (`currentWorkspace()` is null)** | `canStartNew()` fails open (`true`) — there is no workspace to check a quota against, so it doesn't block. |

## Related

- [outbound-send.md](./outbound-send.md) — calls `assertCanSend()` before the bridge call.
- [zalo-personal-inbox.md](./zalo-personal-inbox.md) — calls `meterReply()` (try/catch) for `direction='out'` payloads only; inbound never reaches this service.
- [plan-entitlements-grant.md](./plan-entitlements-grant.md) — `EntitlementService` quota source this service reads from.
- [../system-architecture.md](../system-architecture.md) § Billing + Metering.
- [crm-business-rules.md](../crm-business-rules.md) § F1, F5, F11, F13, F20.
