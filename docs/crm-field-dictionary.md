# CRM — Field Dictionary

> Tech-agnostic field catalog per core entity. Types are logical (not DB types). Drives schema design in Phase 1.
> Companion to [crm-domain-definition.md](crm-domain-definition.md).

Date: 2026-06-13 · Status: living

Legend — **Req**: ● required · ○ optional · ⚙ system-managed. Types: `string`, `text`, `email`, `phone`, `enum`, `int`, `decimal`, `bool`, `date`, `datetime`, `uuid`, `json`, `ref(Entity)`.

---

## System fields (on every tenant-scoped entity)

| Field | Type | Req | Notes |
|---|---|---|---|
| `id` | uuid | ⚙ | Primary identifier |
| `tenant_id` | ref(Tenant) | ⚙ | Hard isolation boundary — on every row |
| `owner_id` | ref(User) | ⚙● | Drives "own" visibility |
| `team_id` | ref(Team) | ⚙ | Drives "team" visibility |
| `custom_fields` | json | ○ | Tenant-defined fields (JSONB), validated against field registry |
| `created_at` | datetime | ⚙ | |
| `updated_at` | datetime | ⚙ | Used for optimistic concurrency |
| `created_by` / `updated_by` | ref(User) | ⚙ | Audit |
| `deleted_at` | datetime | ⚙ | Soft delete (null = active) |

> System fields omitted from per-entity tables below; assume present.

---

## Platform entities

### Tenant (root — the isolation boundary)

| Field | Type | Req | Notes |
|---|---|---|---|
| `name` | string | ● | Organization name |
| `base_currency` | enum | ● | ISO 4217; all money in this tenant is in this currency (BR-D05) |
| `default_pipeline_id` | ref(Pipeline) | ○ | |
| `status` | enum | ● | active, suspended |

### User

| Field | Type | Req | Notes |
|---|---|---|---|
| `email` | email | ● | Login identity, unique per tenant |
| `name` | string | ● | |
| `role` | enum | ● | admin, sales_manager, sales_rep, support_manager, support_agent, marketer, viewer |
| `team_id` | ref(Team) | ○ | Primary team (1 per user, BR-X02) |
| `status` | enum | ● | active, invited, deactivated (deactivate ⇒ reassign open records, BR-X03) |

### Team (hierarchy)

| Field | Type | Req | Notes |
|---|---|---|---|
| `name` | string | ● | |
| `parent_id` | ref(Team) | ○ | Tree structure; null = top-level. Manager visibility = own team + descendant subtree (BR-X02) |

---

## Lead

| Field | Type | Req | Notes |
|---|---|---|---|
| `first_name` / `last_name` | string | ○ | At least one of email/phone required (BR-L01) |
| `email` | email | ○ | Dedup key (BR-L02) |
| `phone` | phone | ○ | |
| `company_name` | string | ○ | Free text until account created |
| `title` | string | ○ | Job title |
| `source` | enum | ● | web, referral, event, ads, import, manual, … |
| `status` | enum | ● | new, working, qualified, unqualified, converted |
| `unqualified_reason` | enum | ○ | Required when status=unqualified |
| `score` | int | ⚙ | 0–100, advisory (BR-L05) |
| `converted_contact_id` | ref(Contact) | ○ | Set on conversion (BR-L06) |
| `converted_account_id` | ref(Account) | ○ | |
| `converted_deal_id` | ref(Deal) | ○ | |

## Contact

| Field | Type | Req | Notes |
|---|---|---|---|
| `first_name` | string | ● | |
| `last_name` | string | ● | |
| `email` | email | ○ | Unique-per-tenant recommended (BR-C02) |
| `phone` | phone | ○ | |
| `title` | string | ○ | |
| `account_id` | ref(Account) | ○ | 0..1 (BR-C01) |
| `lifecycle_stage` | enum | ○ | lead, mql, sql, customer, evangelist |
| `do_not_contact` | bool | ○ | Marketing/compliance flag |
| `last_activity_at` | datetime | ⚙ | Denormalized; updated on related activity insert |

## Account

| Field | Type | Req | Notes |
|---|---|---|---|
| `name` | string | ● | Company name |
| `domain` | string | ○ | Website / email domain (dedup hint) |
| `industry` | enum | ○ | |
| `size` | enum | ○ | employees band: 1-10, 11-50, … |
| `annual_revenue` | decimal | ○ | |
| `parent_account_id` | ref(Account) | ○ | Hierarchy (BR-A03, v1 optional) |
| `billing_address` | json | ○ | structured address |

## Deal

| Field | Type | Req | Notes |
|---|---|---|---|
| `name` | string | ● | |
| `account_id` | ref(Account) | ○ | Required unless "no account yet" (BR-D01) |
| `pipeline_id` | ref(Pipeline) | ● | |
| `stage_id` | ref(Stage) | ● | Must belong to pipeline (BR-D02) |
| `value` | decimal | ● | Deal amount |
| `currency` | enum | ● | ISO 4217 |
| `expected_close_date` | date | ○ | Required to forecast |
| `status` | enum | ● | open, won, lost |
| `loss_reason` | enum | ○ | Required when status=lost (BR-D04) |
| `probability` | int | ⚙ | From stage; override allowed |
| `closed_at` | datetime | ⚙ | Set on won/lost |
| `last_activity_at` | datetime | ⚙ | Denormalized; updated on related activity insert. Feeds stall detection (BR-D06) |
| `is_stalled` | bool | ⚙ | Derived from `last_activity_at` (BR-D06) |
| _join_ `deal_contact_roles` | — | — | N:N Deal↔Contact: `contact_id`, `role` (champion, decision-maker, influencer, blocker) |

## Pipeline / Stage

| Pipeline field | Type | Req | Notes |
|---|---|---|---|
| `name` | string | ● | |
| `is_default` | bool | ● | One default per tenant |

| Stage field | Type | Req | Notes |
|---|---|---|---|
| `pipeline_id` | ref(Pipeline) | ● | |
| `name` | string | ● | e.g. Qualified, Proposal, Negotiation |
| `order` | int | ● | Sort position |
| `probability` | int | ● | 0–100, feeds forecast |
| `type` | enum | ● | open, won, lost (terminal stages) |

## Activity

| Field | Type | Req | Notes |
|---|---|---|---|
| `type` | enum | ● | call, email, meeting, note, sms |
| `subject` | string | ● | |
| `body` | text | ○ | |
| `occurred_at` | datetime | ● | |
| `direction` | enum | ○ | inbound, outbound (for call/email) |
| `related_type` | enum | ● | Lead, Contact, Account, Deal, Ticket |
| `related_id` | uuid | ● | Polymorphic target (BR-T01) |

## Task

| Field | Type | Req | Notes |
|---|---|---|---|
| `title` | string | ● | |
| `description` | text | ○ | |
| `due_at` | datetime | ○ | Overdue = open + past due |
| `status` | enum | ● | open, done, cancelled |
| `priority` | enum | ○ | low, normal, high |
| `assignee_id` | ref(User) | ● | Defaults to record owner |
| `related_type` / `related_id` | enum / uuid | ○ | Polymorphic link |

## Ticket (support)

| Field | Type | Req | Notes |
|---|---|---|---|
| `subject` | string | ● | |
| `description` | text | ○ | |
| `contact_id` | ref(Contact) | ● | Inherits account (BR-S01) |
| `account_id` | ref(Account) | ⚙ | Derived from contact |
| `status` | enum | ● | new, open, pending, waiting_on_customer, resolved, closed |
| `priority` | enum | ● | low, normal, high, urgent |
| `sla_due_at` | datetime | ⚙ | From priority; pausable (BR-S02) |
| `sla_paused` | bool | ⚙ | True while waiting_on_customer |
| `first_response_at` | datetime | ⚙ | SLA metric |
| `resolved_at` | datetime | ⚙ | |
| `csat_score` | int | ○ | 1–5, post-resolution (BR-S05) |

---

## Custom-fields registry (per tenant)

Defines tenant-added fields validated into `custom_fields` json.

| Field | Type | Notes |
|---|---|---|
| `entity` | enum | Which core entity it extends |
| `key` | string | Stable machine name |
| `label` | string | Display name |
| `type` | enum | string, number, date, bool, enum, multi-enum |
| `options` | json | For enum/multi-enum |
| `required` | bool | |
| `validation` | json | regex/min/max |
| `is_active` | bool | Soft-disable keeps historical data (BR-X06) |

## Audit entry

| Field | Type | Notes |
|---|---|---|
| `entity_type` / `entity_id` | enum / uuid | Target record |
| `action` | enum | create, update, delete, restore, reassign, stage_change, merge |
| `actor_id` | ref(User) | Who (or System) |
| `changes` | json | before → after diff |
| `occurred_at` | datetime | Immutable (BR-X05) |

---

**Related:** [crm-domain-definition.md](crm-domain-definition.md) · [crm-actors-and-use-cases.md](crm-actors-and-use-cases.md) · [crm-business-rules.md](crm-business-rules.md)
