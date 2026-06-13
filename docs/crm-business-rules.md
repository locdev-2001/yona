# CRM — Business Rules

> Tech-agnostic. The domain rules that govern behavior. These drive validation, state machines, and invariants in Phase 1.
> Companion to [crm-domain-definition.md](crm-domain-definition.md).

Date: 2026-06-13 · Status: living

Rule IDs (`BR-XXX`) are stable references for plans, code comments, and tests.

---

## 1. Lead rules

- **BR-L01 Capture** — a lead requires at least one contact channel (email *or* phone). Name optional but recommended.
- **BR-L02 Dedup** — on create, flag a possible duplicate if email matches an existing lead/contact in the tenant. Do not auto-merge; surface for review.
- **BR-L03 Status flow** — `new → working → qualified → unqualified`. `qualified` is terminal-for-lead (triggers conversion). `unqualified` records a reason.
- **BR-L04 Assignment** — every lead has an owner. Routing strategies: manual, round-robin, or rule-based (by source/region/score). If routing fails → assign to a fallback queue/owner, never null.
- **BR-L05 Scoring** — score (0–100) derived from attributes (firmographic) + behavior (activity). Score is advisory, never blocks actions.
- **BR-L06 Conversion** — qualifying a lead creates a Contact, optionally an Account and a Deal, in one transaction. The original lead becomes read-only (`converted`), linked to the created records. No data loss.

## 2. Contact & Account rules

- **BR-C01 Account link** — a Contact may belong to 0 or 1 Account. (Person can exist before company is known.)
- **BR-C02 Contact uniqueness** — email unique per tenant is *recommended*, not enforced hard (same person, different roles happens). Duplicates flagged, mergeable.
- **BR-A01 Account–Contact** — one Account has many Contacts (1:N).
- **BR-A02 Merge** — merging two contacts/accounts: keep one survivor, re-point all relations (deals, activities, tickets) to survivor, retain merged record's history, log in audit. Conflicting custom fields → admin chooses survivor's value.
- **BR-A03 Hierarchy (optional)** — Accounts may have a parent Account (subsidiaries). Out of v1 unless needed (YAGNI).

## 3. Deal & Pipeline rules

- **BR-D01 Required links** — a Deal must reference one Account (or be flagged "no account yet"); at least one related Contact (buying committee via `deal_contact_roles`).
- **BR-D02 Stage validity** — a Deal's stage must belong to its assigned Pipeline. Reassigning pipeline requires remapping stage.
- **BR-D03 Forward/backward** — deals can move backward (with a logged reason) — reality isn't linear. Every stage change writes an audit entry + timestamp (for stage-duration analytics).
- **BR-D04 Win/Lost** — terminal states. `Won` requires value + close date. `Lost` requires a loss reason (enum). Terminal deals are read-only except by manager/admin (reopen logs audit).
- **BR-D05 Forecast** — weighted forecast = Σ(deal value × stage probability) over open deals in range. Forecast category (commit/best-case/pipeline) derived from stage. **Currency:** one base currency per tenant (`tenant.base_currency`); all deal values are stored and summed in that currency — no per-deal FX in v1. (`deal.currency` exists but equals the tenant base; multi-currency + FX is deferred — YAGNI.)
- **BR-D06 Stall detection** — a deal with no activity for N days (configurable per tenant, default 14) is flagged `stalled`. Computed from a denormalized `last_activity_at` on the Deal (updated on every related activity insert) — never by scanning the activity table.
- **BR-D07 Next action** — open deals should have an open Task (next step). Surfaced as a warning if missing (soft rule, not blocking).

## 4. Activity & Task rules

- **BR-T01 Polymorphic link** — an Activity/Task attaches to exactly one of Lead/Contact/Account/Deal/Ticket.
- **BR-T02 Immutable history** — logged Activities are append-only; edits keep prior version in audit. (History must be trustworthy.)
- **BR-T03 Task lifecycle** — `open → done | cancelled`. Overdue = open with `due_at` in the past. Completing a task may auto-suggest a follow-up.
- **BR-T04 Ownership** — a Task has an assignee (defaults to the record owner).

## 5. Support / Ticket rules

- **BR-S01 Creation** — a Ticket links to a Contact (and inherits its Account). Priority defaults from rules (keyword/customer-tier) or manual.
- **BR-S02 SLA** — SLA target derived from priority. SLA clock starts at creation; **pauses** while status = `waiting_on_customer`; resumes on customer reply. Breach when running time exceeds target.
- **BR-S03 Status flow** — `new → open → pending → waiting_on_customer → resolved → closed`. Reopen allowed from resolved/closed (logs audit, may reset/extend SLA per policy).
- **BR-S04 Assignment** — every active ticket has an owner; routing by queue/skill/round-robin. Unassigned tickets sit in a triage queue, surfaced to managers.
- **BR-S05 CSAT** — on resolution, a satisfaction request may be sent; response stored against ticket + contact.

## 6. Cross-cutting rules (apply to all entities)

- **BR-X01 Tenant isolation** — every tenant-scoped record carries `tenant_id`. No query/operation ever crosses tenants. Enforced at the data-access layer (and DB-level RLS as backstop).
- **BR-X02 Ownership & visibility** — every record has `owner_id` + `team_id`. Teams form a **hierarchy** (`team.parent_id`). Visibility resolves by role:
  - Sales Rep / Support Agent → records they **own**.
  - Manager → records owned by anyone in **their team subtree** (their team + all descendant teams — manager rollup).
  - Admin → **all** records in the tenant.
  - v1 has **no manual record sharing** (role + ownership only). Co-selling/sharing is deferred.
- **BR-X03 Reassignment** — changing owner is a logged action; visibility recomputes immediately. Deactivating a user requires reassigning their open records first (or bulk-reassign to manager).
- **BR-X04 Soft delete** — deletes set `deleted_at`; records are hidden, not destroyed. Hard delete only via admin purge (GDPR/PII erasure), logged.
- **BR-X05 Audit log** — every create/update/delete/owner-change/stage-change on core entities writes an immutable, append-only audit entry: who, action, when, and a **PII-minimized** before→after diff. The diff stores changed *field keys* + non-PII values directly; **PII values (name/email/phone) are referenced, not copied verbatim**, so they can be erased at source without rewriting audit history (reconciles with BR-X07). Retained for compliance.
- **BR-X06 Custom fields** — tenant-defined fields validate against their declared type & rules (required, options, numeric min/max, length). Stored per-entity (JSONB); registry is **tenant-scoped** (`tenant_id`); unknown fields rejected. **No tenant-supplied raw regex** (ReDoS risk) — validation uses safe primitives only (type, enum options, min/max/length); any pattern matching runs through a vetted, timeout-bounded validator. Field definitions are versioned (renames/disable keep historical data).
- **BR-X07 PII handling** — PII fields (name/email/phone) are exportable/erasable per data-subject request. Erasure **tombstones PII at the source record and everywhere it is referenced (incl. audit refs from BR-X05)**, while preserving non-PII change metadata and aggregate/report integrity.
- **BR-X08 Concurrency** — last-write-wins is unacceptable for money/stage; use optimistic concurrency (version/updated_at check) on Deal & Ticket. Stale write → reject + reload.
- **BR-X09 Child-record visibility** — Activities, Tasks, and Tickets **inherit the visibility of their parent record** (the Lead/Contact/Account/Deal they attach to). A user who cannot see the parent cannot see its children. Enforced at the data-access layer, not per-screen. (Closes the polymorphic-leak hole.)
- **BR-X10 Public lead capture** — inbound lead-capture endpoints are per-tenant, authenticated by a tenant-scoped form token (never raw `tenant_id` from the client), rate-limited, captcha-gated, and input-validated. They may only create Leads in their bound tenant.

---

## 7. Consistency posture (strong vs eventual) — for Phase 1

| Area | Posture | Why |
|---|---|---|
| Deal stage/value, Won/Lost | **Strong** | Money & forecast correctness |
| Ticket status/SLA | **Strong** | SLA commitments |
| Ownership/visibility | **Strong** | Security boundary |
| Lead scoring | Eventual | Advisory, recomputable |
| Reports/dashboards/analytics | Eventual | Read-optimized, can lag |
| Activity feed aggregation | Eventual | High volume, append-only |

---

**Related:** [crm-domain-definition.md](crm-domain-definition.md) · [crm-actors-and-use-cases.md](crm-actors-and-use-cases.md) · [crm-field-dictionary.md](crm-field-dictionary.md)
