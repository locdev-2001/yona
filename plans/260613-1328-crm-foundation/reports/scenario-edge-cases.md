# Scenario Report — CRM Domain Edge Cases (Phase 1.5)

Date: 2026-06-13 · Tool: ck-scenario · Goal: harden business rules before architecture (no code)

Dimensions analyzed: User Types, Input Extremes, Timing/Concurrency, Scale, State Transitions, Authorization, Data Integrity, Compliance, Business Logic.
Skipped: Environment (UI deferred), Integration (no third-party in v1), Error Cascades (infra — Phase 1 reliability, not domain rules).

Focus = **gaps the current rules (BR-*) do NOT yet cover.** ✅ = already covered, ⚠️ = NEW gap → needs a rule.

---

## Critical

| # | Dimension | Scenario | Status | Expected behavior / rule needed |
|---|---|---|---|---|
| C1 | Data Integrity | **Team reparenting creates a cycle** (team A→parent B, then B→parent A) | ⚠️ | Reject any reparent that makes a node its own ancestor. Validate acyclic on every parent change. **New rule.** |
| C2 | Authorization | Polymorphic `related_id` (activity/task) points to a record in **another tenant** | ⚠️ | Reject: related record must share `tenant_id`. Cross-tenant ref = hard error. **New rule.** |
| C3 | Timing | **Double-convert** a lead (double-click / two reps) → 2 Contacts + 2 Deals | ⚠️ | Convert is idempotent: guard on `lead.status=converted`, one transaction, second attempt no-ops/returns existing. **New rule.** |
| C4 | Authorization | User edits own profile to escalate `role` (rep→admin) | ⚠️ | Role changes only by admin; self role-change forbidden. **New rule.** |
| C5 | Compliance | GDPR erasure targets a **User (employee)** who is an actor in audit / owner of records | ⚠️ | Distinguish customer-PII (erasable) from actor identity (retained for audit integrity); employee offboarding = deactivate + reassign, not erase audit actor. **New rule.** |

## High

| # | Dimension | Scenario | Status | Expected behavior / rule needed |
|---|---|---|---|---|
| H1 | Data Integrity | **Convert-time dedup**: lead email matches an existing Contact | ⚠️ | On convert, if email matches active contact → link to existing (don't create dup) or surface choice. BR-L02 only dedups at lead *create*. **Extend BR-L06.** |
| H2 | Data Integrity | Lead dedup is **case/whitespace sensitive** (`Foo@X.com` vs `foo@x.com`) | ⚠️ | Normalize email (lowercase, trim) before dedup + uniqueness. **New rule / field note.** |
| H3 | State Transition | **Pipeline reassignment** to a pipeline with fewer/different stages — no equivalent target stage | ⚠️ | Define stage-remap: explicit mapping required, default to first open stage, log change. BR-D02 says "remap" but not how. **Extend BR-D02.** |
| H4 | Business Logic | Deal `value` is **negative or zero** | ⚠️ | Reject negative; zero allowed only for non-Won; Won requires value > 0. **Extend BR-D04.** |
| H5 | Data Integrity | Custom-field **type change** (string→number) with existing unparseable data | ⚠️ | Type change = new field version; old values preserved read-only or migrated with validation; block destructive coerce. **Extend BR-X06.** |
| H6 | Data Integrity | Custom-field **enum option removed** while records still use it | ⚠️ | Removed option becomes inactive but historical values retained/displayed; not selectable for new. **Extend BR-X06.** |
| H7 | Data Integrity | Custom-field `key` **collides with a core field** name | ⚠️ | Reserve core names; reject colliding custom keys. **Extend BR-X06.** |
| H8 | Timing | Concurrent activity inserts both update `last_activity_at` → lost update | ⚠️ | Use `GREATEST(existing, new)` / monotonic update, never blind overwrite. **Note on BR-D06.** |
| H9 | Authorization | **Manager reassigns** a record to a user **outside their subtree** | ⚠️ | Reassign target must be within actor's visibility scope. **Extend BR-X03.** |
| H10 | State Transition | **Soft-deleted parent** with live child activities — child visibility via BR-X09 | ⚠️ | Children of soft-deleted parent are hidden with it; restoring parent restores children visibility. **Extend BR-X09.** |
| H11 | Concurrency | Optimistic concurrency defined only for Deal/Ticket — **Lead/Contact/Account** concurrent edits | ⚠️ | Extend optimistic concurrency to all core mutable entities (or state why not). **Extend BR-X08.** |
| H12 | Compliance | **SLA business-hours vs calendar-time** — ticket opened Friday 6pm | ⚠️ | Define SLA basis: calendar 24/7 vs business-hours calendar (per tenant). Big behavioral fork. **New rule.** |
| H13 | State Transition | Ticket **repeated pause/resume** — paused time must accumulate | ⚠️ | Track `paused_total`; SLA = elapsed − paused. Single `sla_paused` bool is insufficient. **Field + rule.** |

## Medium

| # | Dimension | Scenario | Status | Expected behavior / rule needed |
|---|---|---|---|---|
| M1 | State Transition | Dedup/uniqueness vs **soft-deleted** records (deleted lead email blocks new lead) | ⚠️ | Uniqueness/dedup ignores soft-deleted rows. **Rule note.** |
| M2 | Business Logic | Admin changes a **stage probability** after deals sit in it → forecast shifts retroactively | ⚠️ | Decide: live recompute (accept) vs snapshot forecast for history. **New rule.** |
| M3 | Data Integrity | **Merge** where one contact is a lead's `converted_contact_id` | ⚠️ | Merge re-points lead conversion links to survivor. **Extend BR-A02.** |
| M4 | Data Integrity | Merge two contacts that hold **different roles on the same deal** | ⚠️ | Role dedup on merge: keep highest-privilege role, drop duplicate. **Extend BR-A02.** |
| M5 | State Transition | **Restore** soft-deleted record whose `owner` is now deactivated | ⚠️ | Restore reassigns to a valid owner (actor or manager); never restore with dangling owner. **Rule note.** |
| M6 | Scale | Deactivate user owning **10k+ records** → bulk reassign | ⚠️ | Reassignment is async/batched + atomic-per-record + audited; block deactivation completion until done. **Rule note.** |
| M7 | Authorization | **Viewer** role export / **Marketer** export scope not in permission matrix | ⚠️ | Complete the matrix: viewer = no export; define marketer export = segments only. **Doc fix.** |
| M8 | Data Integrity | Delete a **Pipeline/Stage** still referenced by open deals | ⚠️ | Block delete (or require migrating deals first); never orphan a deal's stage. **New rule.** |
| M9 | Input Extremes | Field **length/format limits** unspecified (name, subject) — unicode/emoji/RTL/very long | ⚠️ | Define max lengths + accept unicode; reject control chars. **Field dictionary note.** |
| M10 | Business Logic | Round-robin routing when **all reps in target team deactivated** | ✅/⚠️ | BR-L04 fallback exists; extend to "all-inactive → escalate to manager/admin queue". |

## Low

| # | Dimension | Scenario | Status | Expected |
|---|---|---|---|---|
| L1 | Compliance | Audit-log **retention period** undefined | ⚠️ | Set a tenant/default retention policy. |
| L2 | UX/State | Report/filter references a **disabled custom field** | ⚠️ | Hide from new filters; keep historical column readable. |
| L3 | Scale | Pagination boundary on 1M-row lists (cursor stability under inserts) | ⚠️ | Cursor-based pagination, stable sort key. (Phase 1 index design.) |

---

## Summary
- **Critical: 5** · **High: 13** · **Medium: 10** · **Low: 3** · **Total: 31** across 9 dimensions
- Most gaps cluster in: **convert/merge integrity**, **custom-field lifecycle**, **team-hierarchy authz**, **SLA time semantics**, **concurrency coverage**.

## Proposed rule additions (to apply before Phase 1)
- **BR-A04** Team reparent must stay acyclic (C1).
- **BR-X11** Polymorphic/related refs must be same-tenant (C2).
- **BR-L07** Convert is idempotent + convert-time dedup (C3, H1).
- **BR-X12** Role changes admin-only; no self-escalation (C4); reassignment target must be in actor scope (H9).
- **BR-X13** Customer-PII vs actor-identity erasure distinction (C5).
- **BR-X06+** custom-field type-change/enum-removal/key-collision/disable-with-data semantics (H5–H7, L2).
- **BR-D02+** explicit stage-remap on pipeline reassignment (H3); **BR-D04+** value ≥ 0 rules (H4); pipeline/stage delete guard (M8).
- **BR-S06** SLA time basis (calendar vs business-hours) + `paused_total` accumulation (H12, H13).
- **BR-X08+** optimistic concurrency on all core entities (H11); `last_activity_at` monotonic update (H8).
- Email normalization for dedup (H2); dedup ignores soft-deleted (M1); merge re-points conversion links + role dedup (M3, M4).
- Complete permission matrix for viewer/marketer export (M7).

## Unresolved questions for user
1. **SLA basis: 24/7 calendar time, or business-hours calendar** (per tenant)? — biggest behavioral fork.
2. Stage-probability change → **live forecast recompute** (simpler) or **snapshot history** (auditable)?
3. Convert-time email match → **auto-link to existing contact** or **prompt the rep**?
