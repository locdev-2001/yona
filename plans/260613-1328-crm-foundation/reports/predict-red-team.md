# Prediction Report — CRM Domain & Scope Red-Team (Phase 1.5)

Date: 2026-06-13 · Tool: ck-predict (5-persona) · Inputs: crm-domain-definition, crm-business-rules, crm-field-dictionary, crm-actors-and-use-cases, discovery.md

## Verdict: **CAUTION**

Solid domain foundation. No unmitigable blocker, but **5 real holes** must be resolved in Phase 1 before schema is written. Two are near-STOP (audit↔GDPR contradiction; all-in-one scope risk).

---

## Agreements (all 5 personas align)

- Lead/Contact/Account/Deal separation + N:N buying committee = correct, hard to retrofit — keep.
- `tenant_id` everywhere + RLS backstop = right isolation baseline.
- Soft-delete + audit from day 1 = right call for CRM.
- Optimistic concurrency on Deal/Ticket = correct for money/SLA.
- Consistency posture table (strong vs eventual) = sound.

---

## Conflicts & Resolutions

| Topic | Architect | Security | Performance | UX | Devil's Advocate | Resolution |
|---|---|---|---|---|---|---|
| **All-in-one v1 (sales+support+marketing)** | 3 bounded contexts at once = high coupling risk | More attack surface (public forms, SLA, exports) | 3× schema/index surface | 3× UX surface to get right | Riskiest assumption — why not Sales-first? | **Phase the build:** Sales core first (Lead/Contact/Account/Deal/Activity/Task), Support & Marketing as later increments. Keep them in the *domain model* but not the *first build slice*. |
| **Polymorphic Activity/Task links** (`related_type`+`related_id`) | No FK integrity; cross-entity coupling | Child visibility undefined → leak risk | Highest-volume table; polymorphic queries need careful composite index | — | Explicit link tables simpler to reason about | Keep polymorphic (DRY) **but**: (a) child records inherit visibility from parent — define explicitly; (b) composite index `(tenant_id, related_type, related_id, occurred_at)`; (c) denormalize `last_activity_at` onto Deal/Contact. |
| **Custom-fields JSONB at scale** | Flexible, fits | Tenant-supplied regex = ReDoS; registry must be tenant-scoped | Filtering/sorting custom fields over ~1M rows = slow; GIN bloat | Dynamic form rendering complexity | Could defer engine (YAGNI) | Keep engine (hard to retrofit) but: no raw tenant regex (safe primitives + timeout); registry carries `tenant_id`; allow promoting hot custom fields to materialized columns later. |
| **Mid-market scale day 1** | Partitioning now = complexity | — | Premature if first customers are small | — | Designing for 1B rows before 1st customer = over-engineering | **Schema-ready, physically-deferred:** clean composite-index design now; implement partitioning/PgBouncer only when data justifies. Don't build 1B-row machinery for 10 customers. |
| **Audit immutability vs GDPR erasure** | — | **Direct contradiction:** BR-X05 keeps immutable before→after diffs (contain PII); BR-X07 requires PII erasure | — | — | — | Resolve in Phase 1: audit stores PII-minimized diffs (or field-references, not raw values); erasure tombstones PII everywhere incl. audit while retaining non-PII change metadata. **Update BR-X05/X07.** |

---

## Risk Summary

| Risk | Severity | Mitigation |
|---|---|---|
| Audit (immutable PII) vs GDPR erasure contradiction | **High** | Redefine audit to PII-minimized diffs; erasure tombstones; reconcile BR-X05/X07 |
| All-in-one v1 scope overload (from zero) | **High** | Phase build: Sales-first; Support/Marketing as increments |
| Tenant-supplied regex in custom-field validation → ReDoS/DoS | **High** | Disallow raw regex; safe validators + execution timeout |
| Child-record (activity/task/ticket) visibility not defined → cross-user/role leak | **High** | Define: children inherit parent's visibility; enforce at data-access layer |
| Multi-currency forecast summation undefined (deals carry per-deal currency; BR-D05 sums them) | **Medium** | Single tenant base currency + FX normalization at write, or block mixed-currency forecasts |
| Stall detection needs `last_activity_at` (not in field dict) | **Medium** | Add denormalized `last_activity_at` to Deal/Contact, updated on activity insert |
| Sharing/collaboration referenced ("explicitly shared/linked") but no mechanism | **Medium** | Define record-share model, or drop the phrase from rules for v1 |
| Team model underspecified (user↔team M:N? team hierarchy for manager rollup?) | **Medium** | Define Team + membership + manager-rollup semantics before RBAC code |
| Public lead-capture endpoint (tenant mapping, spam, injection) | **Medium** | Per-tenant form tokens, captcha, rate limit, validation |
| Tenant/User/Team/Campaign/Segment entities absent from field dictionary | **Low** | Add platform + marketing entities to dictionary |
| Account hierarchy deferred but reporting rollups may need it | **Low** | Acceptable (YAGNI); revisit if rollup reporting requested |

---

## Recommendations (carry into Phase 1)

1. **Reconcile audit ↔ GDPR (BR-X05/X07)** — highest-priority rule fix; defines audit data shape. Do before schema.
2. **Phase the build slice** — Sales-first. Domain model stays complete; first implementation increment excludes Support/Marketing. De-risks "from zero".
3. **Define child-record visibility** — activities/tasks/tickets inherit parent visibility; one rule, enforced at the data-access layer.
4. **Lock custom-fields safety + scale plan** — tenant-scoped registry, no raw regex, materialized-column escape hatch for hot fields.
5. **Add missing model pieces** — `last_activity_at`; Team/membership/rollup; Tenant/User entities; multi-currency forecast rule; resolve or drop record-sharing.
6. **Scale: schema-ready, physically-deferred** — design indexes for partitioning; don't implement partitioning/pooling until volume justifies.

## Unresolved questions for user / Phase 1
- Confirm **Sales-first phasing** (vs true all-in-one in first build) — affects plan structure.
- **Single tenant base currency**, or must one tenant transact in multiple currencies?
- Can a user belong to **multiple teams**? Is there a **team hierarchy** for manager rollup?
- Is **record sharing/co-selling** in v1, or role+ownership only?
