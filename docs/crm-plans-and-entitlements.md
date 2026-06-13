# CRM — Plans & Entitlements

> The subscription/packaging layer: what a workspace pays for and what that unlocks. **Defined basic now, built to extend** (more plans, add-ons, usage-based, per-deal overrides) without schema churn.
> Lives in the **Billing** bounded context (Platform plane). Companion to [crm-authorization-model.md](crm-authorization-model.md) and [system-architecture.md](system-architecture.md).

Date: 2026-06-13 · Status: living

## Core idea (the extensibility hinge)

Two **separate** gates — never conflate:
- **RBAC** (role) = *is this user allowed to do X?* → spatie roles + Policies (auth-model doc).
- **Entitlement** (plan) = *does this workspace's plan permit X / have quota for X?* → this doc.

Both must pass. A `sales_rep` with `deal.create` permission still cannot create a deal if the workspace hit its plan's deal cap.

**Entitlements are data, not code.** A plan carries a JSONB map of entitlement `key → value`. Adding a new limit or feature later = a new key in data + one enforcement call — **no migration, no new table**. This is what "define basic, extend later" means concretely.

## Entitlement model

Two value kinds (extensible — add keys freely):
- **Limit** (int, `null` = unlimited): `max_seats`, `max_contacts`, `max_pipelines`, `max_custom_fields`, `storage_mb`, `api_rate_limit` …
- **Feature flag** (bool): `module.marketing`, `module.support`, `api_access`, `sso`, `audit_export`, `custom_branding` …

Keys live in a documented **entitlement registry** (PHP constants/enum) so they're discoverable and typo-safe; values live in plan data.

```jsonc
// plans.entitlements (example: "pro")
{
  "max_seats": 25, "max_contacts": 100000, "max_pipelines": 5,
  "max_custom_fields": 50, "module.marketing": true, "module.support": true,
  "api_access": true, "sso": false
}
```

## Tables (basic)

Plan catalog is **global** (Platform); subscription is **workspace-scoped**.

| Table | Columns | Notes |
|---|---|---|
| `plans` | `code (unique), name, description, price_cents, currency, interval(month/year), entitlements jsonb, is_active, is_public, sort` | Sellable tier catalog. Global (not workspace-scoped). `is_public=false` = custom/enterprise plan. |
| `subscriptions` | `workspace_id, plan_id, status, trial_ends_at, current_period_start, current_period_end, cancel_at_period_end, entitlement_overrides jsonb, external_ref` | One **active** per workspace (`unique(workspace_id) where status in (trialing,active,past_due)`). `external_ref` = future payment-provider id. |

- `status` enum: `trialing, active, past_due, canceled, expired`.
- `entitlement_overrides` (on subscription) = per-workspace tweaks for custom/enterprise deals. **Effective entitlement = `plan.entitlements` ⊕ `subscription.entitlement_overrides`** (override wins). This gives enterprise flexibility without new plans.
- Deferred (YAGNI, but the shape allows it): `add_ons`, `usage_counters` (metered billing), `invoices`, `coupons`. None now.

## Effective-entitlement resolution + enforcement

Single chokepoint — never check plan limits ad-hoc:

```
Entitlements::for(workspace)            // resolves plan ⊕ overrides, cached per workspace
  ->allows('module.marketing')         // feature flag
  ->limit('max_seats')                 // int|null(unlimited)
  ->remaining('max_seats')             // limit − current usage
```

- **Feature flag**: gate routes/UI/jobs (`module.marketing` off → marketing routes 403, nav hidden).
- **Limit**: checked **before** the creating action (invite member, create pipeline, add custom field). At/over limit → reject with an upgrade-prompt error, not a hard 500.
- **Usage count**: v1 = `count()` on the scoped table (cheap at our scale, indexed). Switch to maintained counters only if a count becomes hot (YAGNI).
- **Cache**: effective entitlements cached per workspace (Redis), busted on subscription/plan change.

## Lifecycle (basic)

- **Signup** → workspace gets a default plan (free or trial) — `subscriptions` row, `trialing`/`active`.
- **Upgrade/downgrade** → change `plan_id`; on downgrade, if current usage exceeds the new plan's limit, **block new creation** (don't delete data) until under limit; warn admin.
- **Trial expiry / past_due** → scheduler (`CheckSubscriptionStatus`) flips status; degrade gracefully (read-only or feature-restricted), never destroy data.
- **Grandfathering**: changing a public plan's price/entitlements should **version** the plan (new `code` or `version`) rather than mutate rows existing subscribers rely on. Keep plan rows stable; migrate subscribers explicitly.

## Who manages what

- **`billing_ops` / `super_admin`** (Platform plane): create/edit plans, assign/override subscriptions, handle dunning. (Already in auth-model.)
- **Workspace `admin`**: view current plan, usage vs limits, request upgrade; cannot self-grant entitlements (BR-X12 — server-controlled).

## Payment provider

Modeled **provider-agnostic** now (`subscriptions.external_ref`). Actual checkout/webhooks deferred — integrate later via the `payment-integration` skill (SePay/Stripe/Paddle/…). No payment code in v1; plans can be assigned manually by Platform staff.

## Open questions

1. Default plan on signup: free-forever tier, or time-boxed trial of `pro`? (Recommend 14-day `pro` trial → downgrade to `free`.)
2. Enforcement on downgrade overage: block-new (recommended) vs grace period? 
3. Seat counting: count active memberships only, or include invited? (Recommend active + invited.)
