# CRM — Marketplace & Entitlements

> How a workspace gains capabilities: a **free base** + à-la-carte **marketplace items** (add-ons). Each item is billed **one-time** or as a **subscription**. Designed basic now, extensible (new items/types = data, no schema churn).
> Billing bounded context (Platform plane). Companion to [crm-authorization-model.md](crm-authorization-model.md), [system-architecture.md](system-architecture.md).
> **Entitlements as module gate:** See [docs/modular-architecture.md](modular-architecture.md) — marketplace items (with `type: feature_module`) are the **per-workspace mechanism to enable/disable feature modules** (complementing `module.json` system-level flag). This aligns with target architecture.

Date: 2026-06-13 · Status: living

## Model in one picture

```
Workspace capabilities = BASE (free, auto on signup)
                       ⊕ Σ active purchases (marketplace items)
                       ⊕ subscription.entitlement_overrides   (enterprise custom)
```

Capability resolution stays **entitlement-as-data** (JSONB) — the extensibility hinge. Adding an item, limit, or feature later = new catalog row / new key, **no migration**.

## Two gates — never conflate

- **RBAC** (role) = *is this user allowed?* → spatie + Policies (auth-model doc).
- **Entitlement** (marketplace) = *has this workspace bought / does base include this?* → this doc.

Both must pass.

## Item types (all four)

| Type | Grants | Billing typical | Notes |
|---|---|---|---|
| `feature_module` | feature-flag entitlement (`module.marketing`, `module.inbox`, `module.support`, …) | subscription | **Per-workspace module enablement**. Complements system-level `module.json` flag: module must be enabled globally AND entitled per-workspace. |
| `quota` | adds to a limit (`max_seats +10`, `max_contacts +50k`), **stackable by `quantity`** | subscription | |
| `integration` | feature flag `integration.<provider>` + enables a connector instance (OAuth/config) | subscription or one-time | |
| `service` | **nothing** (onboarding, import, training) — pure transaction | one-time | |

## Tables

Catalog is **global** (Platform); purchases are **workspace-scoped**.

| Table | Notable columns | Notes |
|---|---|---|
| `marketplace_items` | `code (unique), name, description, type(feature_module/quota/integration/service), billing_type(one_time/subscription), price_cents, currency, interval(month/year, null for one-time), entitlements jsonb, provider_key, is_active, is_public, sort` | Catalog. `entitlements` = what it grants (flags / quota increments). `service` items have empty entitlements. `provider_key` for integrations. |
| `workspace_purchases` | `workspace_id, item_id, billing_type, status, quantity, purchased_at, current_period_start, current_period_end, cancel_at_period_end, external_ref` | A workspace's owned/active items. `quantity` for stackable quota. `external_ref` = payment-provider id (future). |
| `workspace_integrations` | `workspace_id, item_id, provider_key, status, config jsonb, connected_at` | Connected instance for `integration` items (OAuth tokens/config). Modeled now; detail per provider deferred. |

- `workspace_purchases.status`: `owned` (one-time), `trialing/active/past_due/canceled/expired` (subscription).
- **Base** = a config-defined free entitlement set (or a `code=base` item auto-granted on signup). Free starter; purchases stack on top.

## Effective entitlements

Resolved at one chokepoint, cached per workspace (Redis), busted on any purchase/subscription change:

```
Entitlements::for(workspace)
  ->allows('module.marketing')   // feature flag: base OR any active purchase grants → true (union)
  ->limit('max_seats')           // base + Σ(active quota purchases × quantity); null = unlimited
  ->remaining('max_seats')       // limit − current usage
```

- **Feature flags** → union (granted if base or any active item grants).
- **Quota limits** → base + sum of active stackable quota purchases.
- **`service`** items → ignored for entitlements (transaction only).
- **`integration`** items → grant `integration.<provider>` flag; actual connection lives in `workspace_integrations`.
- **Subscription lapse** (`past_due`/`expired`/`canceled`) → that item's entitlements drop out at period end. **Graceful**: block new creation over the reduced limit; never delete data (consistent with downgrade rule).

## Enforcement

- Feature flag → gate routes/UI/jobs (`module.marketing` off ⇒ 403 + upgrade prompt, nav hidden).
- Limit → checked **before** the creating action (invite seat, add record); at/over ⇒ reject with upgrade-prompt error, not 500.
- Usage = `count()` on the scoped table v1 (indexed, cheap at our scale); maintained counters only if a count becomes hot (YAGNI).

## Lifecycle

- **Signup** → base granted.
- **Purchase (one-time)** → `owned`, entitlement granted immediately (until refunded).
- **Subscribe** → granted while `active`; scheduler `CheckPurchaseStatus` flips `past_due/expired`; lapse revokes entitlement (block-new, keep data).
- **Cancel** → `cancel_at_period_end`; entitlement until period end.

## Who manages

- **Platform `super_admin`/`billing_ops`** — manage catalog (items, prices, entitlements), comp/grant purchases, refunds, dunning.
- **Workspace `admin`** — browse marketplace, purchase, view owned items + usage; **cannot self-grant** entitlements (BR-X12, server-controlled).

## Payment

Provider-agnostic now (`external_ref`). One-time **and** subscription both supported later via the `payment-integration` skill (SePay/Stripe/Paddle/…). No checkout code v1 — Platform staff can grant/assign manually. Webhooks reconcile `status` when integrated.

## Open questions

1. Integrations v1: first-party curated only, or open 3rd-party SDK? (Recommend **first-party curated** v1; SDK later.)
2. Quota stacking: free `quantity` multiples vs fixed bundles (e.g. +10/+50 seat packs)? (Recommend bundles for cleaner pricing.)
3. Refunds/proration on mid-period cancel — defer to payment integration.
