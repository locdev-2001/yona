# CRM — Business Config (defaults & seed values)

> The **business inputs** that code/seeders need but aren't architecture: default pipeline, enums, SLA targets, lead scoring, base entitlements, pricing. Marked **[PROPOSED]** (sensible default — adjust freely) or **[YOUR CALL]** (needs your decision; placeholder shown).
> Complements [crm-field-dictionary.md](crm-field-dictionary.md) (field types) and [crm-marketplace.md](crm-marketplace.md) (billing).

Date: 2026-06-13 · Status: draft — confirm before seeding

---

## 1. Default Sales pipeline & stages [PROPOSED]

Seeded per workspace on signup (`is_default = true`). B2B standard:

| Order | Stage | Probability | Type |
|---|---|---|---|
| 1 | New | 10% | open |
| 2 | Qualification | 20% | open |
| 3 | Discovery | 35% | open |
| 4 | Proposal | 55% | open |
| 5 | Negotiation | 75% | open |
| 6 | Closed Won | 100% | won |
| 7 | Closed Lost | 0% | lost |

- **Stall threshold** (BR-D06): **14 days** no activity → `is_stalled` [PROPOSED].

## 2. Enum value sets [PROPOSED]

| Enum | Values |
|---|---|
| Lead `source` | web, referral, event, ads, social, cold_call, partner, import, manual |
| Lead `unqualified_reason` | no_budget, no_need, bad_timing, wrong_contact, competitor, no_response, duplicate |
| Deal `loss_reason` | price, lost_to_competitor, no_budget, no_decision, bad_timing, lost_contact, other |
| Contact `lifecycle_stage` | lead, mql, sql, opportunity, customer, evangelist |
| Account `industry` | technology, finance, healthcare, retail, manufacturing, education, real_estate, fnb, logistics, services, other |
| Account `size` | 1-10, 11-50, 51-200, 201-500, 501-1000, 1000+ |
| Activity `type` | call, email, meeting, note, sms |
| Task `priority` | low, normal, high |
| Ticket `priority` | low, normal, high, urgent |

> Enums are workspace-extensible later via custom-fields; these are the system defaults.

## 3. Support SLA targets [YOUR CALL — defaults proposed]

Calendar 24/7 (BR-S02). Two clocks: first-response & resolution.

| Priority | First response | Resolution |
|---|---|---|
| urgent | 1h | 8h |
| high | 4h | 24h |
| normal | 8h | 48h |
| low | 24h | 96h |

(Support is a later build phase — confirm before then.)

## 4. Lead scoring [PROPOSED — advisory, tune later]

Score 0–100, advisory only (BR-L05). Simple additive v1:

- Firmographic: has company +10, target industry +10, size ≥51 +10, seniority title (C-level/VP/Director) +15.
- Contactability: valid email +10, valid phone +10.
- Behavior: activity in last 7d +15, ≥3 activities +10, opened campaign +5, replied +15.
- Decay: −10 if no activity 30d.
- Clamp 0–100. Recomputed async on activity (eventual).

## 5. Base (free) entitlements [YOUR CALL — defaults proposed]

What every new workspace gets free (BASE in [crm-marketplace.md](crm-marketplace.md)):

| Entitlement | Free base |
|---|---|
| `max_seats` | 3 |
| `max_contacts` | 1,000 |
| `max_pipelines` | 1 |
| `max_custom_fields` | 10 |
| `storage_mb` | 500 |
| `module.sales` | ✅ on |
| `module.support` | ❌ (add-on) |
| `module.marketing` | ❌ (add-on) |
| `api_access` | ❌ (add-on) |
| `sso` | ❌ (add-on) |

## 6. Marketplace starter items [YOUR CALL — prices TBD]

| Item (code) | Type | Billing | Grants | Price |
|---|---|---|---|---|
| `seats-pack-5` | quota | subscription | `max_seats +5` (stackable) | TBD |
| `contacts-50k` | quota | subscription | `max_contacts +50,000` | TBD |
| `module-support` | feature_module | subscription | `module.support` | TBD |
| `module-marketing` | feature_module | subscription | `module.marketing` | TBD |
| `api-access` | feature_module | subscription | `api_access` | TBD |
| `sso` | feature_module | subscription | `sso` | TBD |
| `onboarding` | service | one_time | — | TBD |

## 7. Workspace defaults [YOUR CALL]

- **`base_currency`**: default? (VND or USD) [YOUR CALL]
- **`timezone`**: default `Asia/Ho_Chi_Minh` [PROPOSED]
- **`locale`**: default `vi` [PROPOSED]
- **`audit_retention`**: default 365 days [PROPOSED]

---

## Decisions needed from you

1. SLA targets (§3) — accept proposed or set your own hours?
2. Base free entitlements (§5) — accept, or different free tier?
3. Marketplace items + **prices** (§6) — which to launch with, and pricing?
4. Default `base_currency` (§7) — VND or USD?
5. First integration(s) to build (Zalo / email / telephony / calendar)?
