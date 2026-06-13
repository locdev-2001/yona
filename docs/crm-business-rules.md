# CRM — Business Rules

> Tech-agnostic. The domain rules that govern behavior. These drive validation, state machines, and invariants in Phase 1.
> Companion to [crm-domain-definition.md](crm-domain-definition.md).

Date: 2026-06-13 · Status: living

Rule IDs (`BR-XXX`) are stable references for plans, code comments, and tests.

---

## 1. Lead rules

- **BR-L01 Capture** — a lead requires at least one contact channel (email *or* phone). Name optional but recommended.
- **BR-L02 Dedup** — on create, flag a possible duplicate if **normalized** email (lowercased, trimmed) matches an existing **active** (not soft-deleted) lead/contact in the tenant. Do not auto-merge; surface for review.
- **BR-L03 Status flow** — `new → working → qualified → unqualified`. `qualified` is terminal-for-lead (triggers conversion). `unqualified` records a reason.
- **BR-L04 Assignment** — every lead has an owner. Routing strategies: manual, round-robin, or rule-based (by source/region/score). If routing fails → assign to a fallback queue/owner, never null.
- **BR-L05 Scoring** — score (0–100) derived from attributes (firmographic) + behavior (activity). Score is advisory, never blocks actions.
- **BR-L06 Conversion** — qualifying a lead creates a Contact, optionally an Account and a Deal, in one transaction. The original lead becomes read-only (`converted`), linked to the created records. Lead custom fields map to the new Contact where keys match. No data loss.
- **BR-L07 Convert idempotency & dedup** — conversion is **idempotent**: guard on `lead.status` (a second/concurrent convert no-ops and returns the existing records — prevents double Contact/Deal). At convert time, if the lead's normalized email matches an existing active Contact, **prompt the rep** to link to the existing Contact or create new (do not silently auto-link).

## 2. Contact & Account rules

- **BR-C01 Account link** — a Contact may belong to 0 or 1 Account. (Person can exist before company is known.)
- **BR-C02 Contact uniqueness** — email unique per tenant is *recommended*, not enforced hard (same person, different roles happens). Duplicates flagged, mergeable.
- **BR-A01 Account–Contact** — one Account has many Contacts (1:N).
- **BR-A02 Merge** — merging two contacts/accounts: keep one survivor, re-point **all** relations (deals, activities, tickets, **and any lead `converted_*` links**) to survivor, retain merged record's history, log in audit. Conflicting custom fields → admin chooses survivor's value. If both records hold a role on the same deal, **dedup the deal-contact role** (keep the higher-privilege role).
- **BR-A03 Hierarchy (optional)** — Accounts may have a parent Account (subsidiaries). Out of v1 unless needed (YAGNI).

## 3. Deal & Pipeline rules

- **BR-D01 Required links** — a Deal must reference one Account (or be flagged "no account yet"); at least one related Contact (buying committee via `deal_contact_roles`).
- **BR-D02 Stage validity & pipeline reassignment** — a Deal's stage must belong to its assigned Pipeline. Reassigning pipeline requires an **explicit stage remap**; if no equivalent target stage, default to the target pipeline's first open stage. The change is logged (audit). A Pipeline/Stage still referenced by open deals **cannot be deleted** — migrate or close those deals first (no orphaned stage).
- **BR-D03 Forward/backward** — deals can move backward (with a logged reason) — reality isn't linear. Every stage change writes an audit entry + timestamp (for stage-duration analytics).
- **BR-D04 Win/Lost & value** — terminal states. Deal `value` must be **≥ 0**; negative is rejected. `Won` requires **value > 0** + close date. `Lost` requires a loss reason (enum). Terminal deals are read-only except by manager/admin (reopen logs audit; resets `closed_at`, re-includes in forecast).
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
- **BR-S02 SLA** — SLA target derived from priority, measured in **calendar 24/7 time** (no business-hours calendar in v1). Clock starts at creation; **pauses** while status = `waiting_on_customer`; resumes on customer reply. Accumulate paused time in `paused_total` — running time = elapsed − paused_total; breach when running time exceeds target. Changing priority recomputes `sla_due_at` from start using the new target (logged).
- **BR-S03 Status flow** — `new → open → pending → waiting_on_customer → resolved → closed`. Reopen allowed from resolved/closed (logs audit). **Reopen policy:** SLA resumes from where it stopped (running time preserved), not reset.
- **BR-S04 Assignment** — every active ticket has an owner; routing by queue/skill/round-robin. Unassigned tickets sit in a triage queue, surfaced to managers.
- **BR-S05 CSAT** — on resolution, a satisfaction request may be sent; response stored against ticket + contact.

## 6. Cross-cutting rules (apply to all entities)

- **BR-X01 Tenant isolation** — every tenant-scoped record carries `tenant_id`. No query/operation ever crosses tenants. Enforced at the data-access layer (and DB-level RLS as backstop).
- **BR-X02 Ownership & visibility** — every record has `owner_id` + `team_id`. Teams form a **hierarchy** (`team.parent_id`). Visibility resolves by role:
  - Sales Rep / Support Agent → records they **own**.
  - Manager → records owned by anyone in **their team subtree** (their team + all descendant teams — manager rollup).
  - Admin → **all** records in the tenant.
  - v1 has **no manual record sharing** (role + ownership only). Co-selling/sharing is deferred.
  - **Per-entity resolution** — visibility is computed per record, **not inherited across links**. Seeing an Account does **not** grant access to Deals/Contacts on it that the user doesn't own (no Account→Deal bleed).
- **BR-X03 Reassignment** — changing owner is a logged action; visibility recomputes immediately. The reassignment **target must be within the actor's visibility scope** (a manager cannot reassign outside their subtree). Deactivating a user **blocks until** their open records are reassigned (bulk reassignment is batched + atomic-per-record + audited; target owner must be active). Restoring a soft-deleted record whose owner is now deactivated requires assigning a valid owner.
- **BR-X04 Soft delete** — deletes set `deleted_at`; records are hidden, not destroyed. Hard delete only via admin purge (GDPR/PII erasure), logged.
- **BR-X05 Audit log** — every create/update/delete/owner-change/stage-change on core entities writes an immutable audit entry: who, action, when, and a **PII-minimized** before→after diff. The diff stores changed *field keys* + non-PII values directly; **PII values (name/email/phone) are referenced, not copied verbatim**, so they can be erased at source without rewriting audit history (reconciles with BR-X07). **Append-only: no update/delete path** in the application; audit writes use a separated privilege. Beyond core-entity CRUD, also audit **security-sensitive events**: login, role/permission/team changes, data export, GDPR erasure, and custom-field schema changes. Retained per `tenant.audit_retention` (default policy set per tenant).
- **BR-X06 Custom fields** — tenant-defined fields validate against their declared type & rules (required, options, numeric min/max, length). Stored per-entity (JSONB); registry is **tenant-scoped** (`tenant_id`); unknown keys rejected; custom `key` **may not collide with a core field name** (reserved). **No tenant-supplied raw regex** (ReDoS) — safe primitives only (type, enum options, min/max/length); any pattern matching runs through a vetted, timeout-bounded validator. **Caps**: bounded number of fields per entity/tenant and bounded payload size per record. **Lifecycle**: definitions are versioned — type change creates a new version (old values preserved read-only, never destructively coerced); removing an enum option deactivates it (historical values retained/displayed, not selectable for new); disabling a field keeps its data and hides it from new input/filters.
- **BR-X07 PII handling** — PII fields (name/email/phone) are exportable/erasable per data-subject request. Erasure **tombstones PII at the source record and everywhere it is referenced (incl. audit refs from BR-X05)**, while preserving non-PII change metadata and aggregate/report integrity. The erasure action itself is **logged by stable subject id** (never re-storing the erased PII). Distinguish **customer PII** (erasable) from **actor/employee identity** in audit (retained for integrity — employee offboarding = deactivate + reassign, not audit erasure).
- **BR-X08 Concurrency** — last-write-wins is unacceptable; use optimistic concurrency (version/`updated_at` check) on **all core mutable entities** (Lead, Contact, Account, Deal, Ticket, Task). Stale write → reject + reload. Denormalized `last_activity_at` updates monotonically (`GREATEST(existing, new)`), never blind overwrite.
- **BR-X09 Child-record visibility** — Activities, Tasks, and Tickets **inherit the visibility of their parent record** (the Lead/Contact/Account/Deal they attach to). A user who cannot see the parent cannot see its children. A soft-deleted parent hides its children too; restoring the parent restores them. Enforced at the data-access layer, not per-screen. (Closes the polymorphic-leak hole.)
- **BR-X10 Public lead capture** — inbound lead-capture endpoints are per-tenant, authenticated by a tenant-scoped **signed form token** (never raw `tenant_id` from the client), per-IP **and** per-tenant rate-limited, captcha-gated, and input-validated. Captured leads land in a `new`/quarantine state. They may only create Leads in their bound tenant.

## 6b. Tenant isolation, access control & platform (security-hardening)

> Added from Phase 1.5 red-team (predict/scenario/security). These are invariants the data-access layer and Phase 1 architecture must enforce.

- **BR-X11 Same-tenant references** — every foreign reference (incl. polymorphic `related_id`, `account_id`, `pipeline_id`, custom-field id refs) must resolve **within the same tenant**. Cross-tenant references are rejected on write.
- **BR-X12 No privilege escalation** — `tenant_id`, `owner_id`, `team_id`, `role` are **server-controlled**; never bound from request bodies (no mass-assignment). Role, team membership, and team-hierarchy changes are **admin-only**; a user can never change their own role or widen their own visibility.
- **BR-X13 Team hierarchy integrity** — teams form a tree; any reparent that would create a **cycle** (a team becoming its own ancestor) is rejected. Recursion is depth-bounded. Only admins modify team structure.
- **BR-X14 Server-derived tenant context** — the active `tenant_id` is derived from the authenticated session/org server-side. Any client-supplied tenant identifier is ignored/rejected. (Anti tenant-spoofing.)
- **BR-X15 Scoped reads + non-enumeration** — every read passes through a tenant + visibility-scoped data-access layer; an `id` alone never resolves a row. A record the caller may not see returns **404 (not 403)** to avoid existence enumeration (IDOR defense).
- **BR-X16 Reporting & search scoping** — reports, aggregates, search, and autocomplete enforce `tenant_id` + visibility as non-optional filters; no unscoped/raw query path. Eventual-consistency read stores are tenant-partitioned.
- **BR-X17 Export control** — data export is **audited every time**, rate-limited, and volume-capped per request. Reps may export within their own/team visibility up to a row threshold; **bulk/over-threshold exports are admin-gated**. Anomalous export volume triggers alerting. (Anti mass-PII-exfiltration.)
- **BR-X18 Default-deny isolation** — DB row-level security is **default-deny**; every tenant-scoped table must have an enforced policy (CI-checked). App-layer scoping is belt-and-suspenders, not the only line of defense.

## 6c. Forecasting & analytics notes

- **Stage-probability changes** recompute forecasts **live** (current stage probability × value). No per-deal forecast snapshots in v1; historical forecast accuracy, if needed later, is derived from the audit trail of stage changes (YAGNI now).

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
