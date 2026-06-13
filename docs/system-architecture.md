# System Architecture — Beru CRM (Phase 1)

> Domain architecture for an all-in-one, multi-tenant SaaS CRM on **Laravel 12 + PostgreSQL 16 + Eloquent + Inertia/React + Redis**. Living doc. Maps the domain docs (`crm-domain-definition`, `crm-business-rules`, `crm-field-dictionary`, `crm-actors-and-use-cases`) onto a concrete, Laravel-idiomatic design.
> Build order: **Sales-first**, but the model covers Support + Marketing from day one. Source of BR-* references: `crm-business-rules.md`.

Date: 2026-06-13 · Status: Phase 1 design · Owner: architecture

---

## 1. Summary

Greenfield CRM. The hard parts are **the Platform layer** (tenant isolation, RBAC, audit, custom-fields) and **transactional correctness** of money/state paths (deal stage, won/lost, lead conversion, ticket SLA). Everything tenant-scoped is enforced at the data-access layer **and** Postgres RLS (defense-in-depth). Reporting/scoring/activity-feed are eventually consistent; deal/ticket/ownership are strongly consistent.

## 2. Bounded contexts

Cross-context communication happens through **domain events**, never direct table access into another context.

| Context | Owns | Key models |
|---|---|---|
| **Platform** | Tenancy, identity, RBAC, audit, custom-fields, pipeline config, reporting reads | Tenant, User, Team, Role/Permission, CustomFieldDefinition, AuditLog, Pipeline, Stage |
| **Sales** | Funnel + opportunities | Lead, Contact, Account, Deal, DealContactRole |
| **Engagement** (shared/collaborative) | Polymorphic touchpoints across contexts | Activity, Task |
| **Support** | Issue resolution + SLA | Ticket |
| **Marketing** | Campaigns, segments, scoring inputs | Campaign, Segment, CampaignRecipient |

**Invariant ownership**
- *Tenant isolation* (BR-X01/X11/X14/X18) → enforced by Platform (trait + middleware + RLS); every context inherits it.
- *Visibility* (BR-X02/X09/X15) → Platform `Visibility` resolver + Policies; each context's models declare ownership columns.
- *Money/forecast correctness* (BR-D04/D05) → Sales (Deal model).
- *SLA correctness* (BR-S02/S03) → Support (Ticket model + scheduler).
- *Audit immutability* (BR-X05/X07) → Platform (AuditLog, append-only).

**Cross-context seams (events)**
- `LeadConverted` → Sales creates Contact/Account/Deal (same TX, see §6).
- `ActivityLogged` → updates `last_activity_at` on parent (Sales/Support), feeds scoring (Marketing, async).
- `DealWon` → Support/onboarding hook (deferred consumer).
- `OwnerReassigned`, `*Audited` → Platform audit listener.

---

## 3. Data model

UUID PKs everywhere (`uuid` default). All tenant-scoped tables carry the **system columns** (BR field-dictionary §System): `tenant_id, owner_id, team_id, custom_fields jsonb, created_at, updated_at, created_by, updated_by, deleted_at`, plus `lock_version int` for optimistic concurrency (BR-X08).

### 3.1 Platform tables

| Table | Notable columns | Notes |
|---|---|---|
| `tenants` | `name, base_currency, default_pipeline_id, audit_retention, status` | Root boundary. NOT tenant-scoped itself. |
| `users` | `tenant_id, email, name, role, team_id, status` | `unique(tenant_id, email)`. `role` mirrors spatie role; server-controlled (BR-X12). |
| `teams` | `tenant_id, name, parent_id` | Tree (BR-X02). Cycle-guarded (BR-X13). |
| `team_closure` | `tenant_id, ancestor_id, descendant_id, depth` | Closure table for O(1) subtree reads (manager rollup). Maintained on team create/reparent. |
| `pipelines` | `tenant_id, name, is_default` | One default per tenant. |
| `stages` | `tenant_id, pipeline_id, name, order, probability, type(open/won/lost)` | `unique(pipeline_id, order)`. |
| `custom_field_definitions` | `tenant_id, entity, key, label, type, options jsonb, validation jsonb, version, is_active` | `unique(tenant_id, entity, key)`. Registry (§5). |
| `audit_logs` | `tenant_id, entity_type, entity_id, action, actor_id, changes jsonb, occurred_at` | Append-only (§7). |

spatie tables (`roles, permissions, model_has_roles, role_has_permissions, model_has_permissions`) configured **team-aware** with `teams.team_foreign_key = tenant_id` → roles scoped per tenant.

### 3.2 Sales tables

| Table | Notable columns | Notes |
|---|---|---|
| `leads` | `first_name,last_name,email,phone,company_name,title,source,status,unqualified_reason,score,converted_contact_id,converted_account_id,converted_deal_id` | Funnel-isolated. `status: new→working→qualified→unqualified→converted` (BR-L03/L06). |
| `accounts` | `name,domain,industry,size,annual_revenue,parent_account_id,billing_address jsonb` | Company. |
| `contacts` | `first_name,last_name,email,phone,title,account_id,lifecycle_stage,do_not_contact,last_activity_at` | Backbone. `account_id` 0..1 (BR-C01). |
| `deals` | `name,account_id,pipeline_id,stage_id,value,currency,expected_close_date,status(open/won/lost),loss_reason,probability,closed_at,last_activity_at,is_stalled` | Money/state core. `value ≥ 0` CHECK (BR-D04). |
| `deal_contact_roles` | `tenant_id,deal_id,contact_id,role(champion/decision-maker/influencer/blocker)` | N:N buying committee (BR-D01). `unique(deal_id, contact_id)`. |

### 3.3 Engagement tables (polymorphic, high-volume)

| Table | Notable columns | Notes |
|---|---|---|
| `activities` | `type,subject,body,occurred_at,direction,related_type,related_id` | Append-only (BR-T02). Partition-ready (§8). |
| `tasks` | `title,description,due_at,status(open/done/cancelled),priority,assignee_id,related_type,related_id` | `assignee_id` defaults to owner (BR-T04). |

### 3.4 Support / Marketing tables

| Table | Notable columns | Notes |
|---|---|---|
| `tickets` | `subject,description,contact_id,account_id,status,priority,sla_due_at,sla_paused,paused_total,first_response_at,resolved_at,csat_score` | `account_id` derived from contact (BR-S01). SLA fields (BR-S02). |
| `campaigns` | `name,type,status,started_at` | Marketing — modeled now, built later. |
| `segments` | `name,definition jsonb` | Saved filter over contacts/leads. |
| `campaign_recipients` | `campaign_id,contact_id,sent_at,opened_at` | Email log; partition-ready. |

### 3.5 Mapped queries → indexes (tenant_id-leading)

| Query | Index |
|---|---|
| My open deals by stage | `deals (tenant_id, owner_id, status, stage_id)` |
| Team pipeline board | `deals (tenant_id, team_id, status, stage_id)` |
| Stalled scan (read denormalized) | `deals (tenant_id, status, last_activity_at)` |
| Contact timeline | `activities (tenant_id, related_type, related_id, occurred_at desc)` |
| My tasks due | `tasks (tenant_id, assignee_id, status, due_at)` |
| Ticket queue by SLA | `tickets (tenant_id, status, sla_due_at)` |
| Lead dedup | `leads (tenant_id, lower(email)) where deleted_at is null` (partial) |
| Custom-field filter | GIN `... using gin (custom_fields jsonb_path_ops)` |
| Audit by entity | `audit_logs (tenant_id, entity_type, entity_id, occurred_at desc)` |

Migration safety: greenfield, no online-DDL concerns yet. Forward-only discipline applies once shipped.

---

## 4. Multi-tenant enforcement (defense-in-depth)

Three layers; no single point of failure (BR-X01/X11/X14/X18):

1. **App: `BelongsToTenant` trait** (global scope filters by `app('currentTenant')`, `creating` hook stamps `tenant_id`). On every tenant model. *(laravel skill → references/multi-tenancy.md)*
2. **Middleware `IdentifyTenant`** — derives tenant **server-side** from the authenticated session/org (never client input, BR-X14); binds `currentTenant`; `SET app.current_tenant` for RLS.
3. **Postgres RLS, default-deny** — every tenant-scoped table has `ENABLE ROW LEVEL SECURITY` + policy `tenant_id = current_setting('app.current_tenant')::uuid`. App DB role is non-owner. **CI test asserts every tenant table has a policy** (BR-X18).

Supporting invariants:
- **Same-tenant FKs** (BR-X11): every reference (incl. polymorphic `related_id`, `account_id`, `pipeline_id`, custom-field refs) validated to resolve in-tenant on write (FormRequest rule + DB composite FK `(tenant_id, id)` where practical).
- **No mass-assignment** of `tenant_id/owner_id/team_id/role` (BR-X12) — guarded; set only by server.
- **Unique constraints are composite** with `tenant_id`.

---

## 5. RBAC (role × record ownership)

Two layers (BR-X02), see laravel skill → references/rbac.md:

- **Feature gate = spatie roles**: `admin, sales_manager, sales_rep, support_manager, support_agent, marketer, viewer`. Permissions like `deal.create`, `export.bulk`.
- **Record gate = Policies + `Visibility` resolver**:
  - `own` (rep/agent) → `owner_id = me`
  - `team` (manager) → `team_id IN visibleTeamIds(me)` = own team + descendant subtree via `team_closure`
  - `all` (admin) → no extra filter
- **Per-entity, no link bleed** (BR-X02): visibility computed per record; seeing an Account never grants its Deals/Contacts.
- **Child inherits parent** (BR-X09): Activity/Task/Ticket visibility = parent's; enforced in data layer (scope joins to parent), not per-screen.
- **Non-enumeration** (BR-X15): list queries pass the visibility scope; single-record fetch that fails visibility returns **404, not 403**.
- **Reporting/search** (BR-X16): tenant + visibility filters are non-optional; no raw unscoped path.

`Visibility::scopeFor($query, $user)` is the single chokepoint; collections use it, single records use Policies. Both run **inside** the already-tenant-scoped query.

---

## 6. Transaction & consistency boundaries

| Write path | TX scope | Lock / guard | Idempotency | Failure mode |
|---|---|---|---|---|
| **Lead conversion** (BR-L06/L07) | `DB::transaction`: create Contact (+opt Account, Deal) + set lead `converted` + links | `lockForUpdate` on lead row; **guard on `lead.status`** (already converted → no-op, return existing) | lead.status terminal = idempotency key | TX atomic; if commit ok, fire `LeadConverted` event after commit |
| **Deal stage change** (BR-D02/D03) | TX: update deal + write audit | optimistic `lock_version` check; stage∈pipeline validation | (`deal_id`, target `stage_id`, `lock_version`) | stale → reject + reload; audit in same TX |
| **Won/Lost** (BR-D04) | TX: set status/closed_at + audit | `value>0` (won) / `loss_reason` (lost) CHECK + app validation | terminal status guard | reopen = manager/admin, logged, resets closed_at |
| **Account/Contact merge** (BR-A02) | TX: repoint deals/activities/tickets/lead-links to survivor + dedup deal-contact roles + audit | `lockForUpdate` on both records | survivor id | large repoint → chunked inside TX or queued compensating job if huge |
| **Owner reassignment / deactivation** (BR-X03) | per-record TX, batched | target must be active + in actor scope | record + new owner | batched atomic-per-record + audited; partial batch is safe (each record independent) |
| **Activity insert** → `last_activity_at` (BR-D06/X08) | single statement | `last_activity_at = GREATEST(existing, new)` (monotonic) | — | eventually consistent for feed; denorm update best-effort |
| **Ticket SLA recompute** (BR-S02) | field update on status change | running = elapsed − paused_total | — | scheduler recomputes breach flag |

**Posture** (BR §7): Strong → deal stage/value, won/lost, ticket status/SLA, ownership/visibility. Eventual → lead scoring, reports/dashboards, activity-feed aggregation.

No TX wraps an HTTP/queue/Redis call. Events dispatched **after commit** (`DB::afterCommit`).

---

## 7. Audit, soft-delete, concurrency

- **Audit** (BR-X05/X07): `audit_logs` append-only; writes use a **separate DB privilege** (no update/delete path in app). `changes` diff stores changed field **keys + non-PII values**; PII (name/email/phone) referenced by stable id, never copied verbatim → erasable at source without rewriting history. Audited: core CRUD + owner/stage change + security events (login, role/team change, export, GDPR erasure, custom-field schema change). Retained per `tenant.audit_retention`.
- **Soft delete** (BR-X04): `deleted_at` everywhere; admin purge = hard delete (GDPR), logged. Soft-deleted parent hides children (BR-X09); restore requires valid active owner (BR-X03).
- **PII erasure** (BR-X07): tombstone PII at source + all references; log by stable subject id; preserve non-PII metadata + aggregates. Customer PII erasable; employee/actor identity retained (offboard = deactivate + reassign).
- **Concurrency** (BR-X08): optimistic `lock_version` on Lead/Contact/Account/Deal/Ticket/Task; stale write rejected.

---

## 8. Custom-fields engine (BR-X06)

- **Registry**: `custom_field_definitions` (tenant-scoped, versioned). Type ∈ {string, number, date, bool, enum, multi-enum}.
- **Storage**: `custom_fields jsonb` on each core entity; values validated against the active registry version on write. Unknown keys rejected; custom `key` may **not** collide with a reserved core field name.
- **Validation**: safe primitives only — type, enum options, min/max/length. **No tenant-supplied raw regex** (ReDoS); any pattern via a vetted timeout-bounded validator. **Caps**: bounded field count per entity/tenant + bounded payload per record.
- **Lifecycle**: definition versioned — type change = new version (old values read-only, never destructively coerced); removing an enum option deactivates it (historical retained, not selectable); disabling a field keeps data, hides from input/filters.
- **Indexing**: GIN `jsonb_path_ops` per entity; add expression index on a specific hot key when a filter is heavy.

---

## 9. Async / queue / scheduler (Redis + Horizon)

| Job / task | Trigger | Queue | Idempotency / notes |
|---|---|---|---|
| `ScoreLead` (BR-L05) | `ActivityLogged`, lead update | `low` | advisory; recomputable; re-run safe |
| `RouteLead` (BR-L04) | lead create | `default` | round-robin/rule; fallback owner, never null |
| `RecomputeStallFlags` (BR-D06) | scheduler hourly | `default` | reads denormalized `last_activity_at`; **never scans activities** |
| `CheckSlaBreaches` (BR-S02) | scheduler every 5 min | `high` | per-tenant loop; re-bind tenant in handler |
| `SendCsatRequest` (BR-S05) | `TicketResolved` | `default` | dedupe per ticket |
| `RebuildReportRollups` | scheduler nightly | `low` | eventual; tenant-partitioned read store |
| `BulkReassign` (BR-X03) | deactivation | `default` | batched, atomic-per-record, audited |

Jobs carry `tenant_id` explicitly and re-bind `currentTenant` at `handle()` start (no request context). All handlers idempotent. `withoutOverlapping` on scheduled scans.

---

## 10. Scale posture

- Volume: ~1,000s tenants × ~1M records/tenant (~1B rows). DB is the bottleneck, not PHP.
- **Hottest tables**: `activities`, `campaign_recipients`, `audit_logs`, `tasks` — append-heavy. **Partition-ready** (UUID PK + `tenant_id`/`created_at` available), but **physical partitioning deferred** until volume justifies (red-team: avoid over-engineering pre-customers).
- Denormalized `last_activity_at` kills the stall-scan N+1 (BR-D06).
- Composite `(tenant_id, …)` indexes mandatory; `paginate`/`lazyById`/`cursor` for large sets; query-builder/raw for reports.
- Search: v1 = Postgres (ILIKE + GIN/trigram); Meilisearch deferred.
- PgBouncer added when worker+web connection count justifies — not now.

---

## 11. Anti-pattern audit

- **Tenant leak** → 3-layer enforcement + RLS default-deny + CI policy check; cache keys/broadcast channels/search will be tenant-prefixed.
- **Unbounded query** → no `Model::all()`; visibility scope + pagination mandatory.
- **Polling instead of events** → stall/SLA are the *only* scheduled scans, and they read denormalized columns, not raw event tables.
- **Race on shared state** → optimistic `lock_version`; `GREATEST` for monotonic denorm; `lockForUpdate` on conversion/merge.
- **TX over network** → events fire `afterCommit`; no HTTP/queue inside TX.
- **Observer cascade** → conversion/merge are explicit service actions in one TX, not observer chains.
- **God service** → logic lives on fat models; services only for conversion, merge, reassignment, SLA (multi-aggregate/transactional).
- **Link-bleed visibility** → per-entity resolution + child-inherits-parent, enforced in data layer.

---

## 12. Implementation order (Phase 2 will detail)

1. **Platform foundation**: Tenant, User, Team(+closure), `BelongsToTenant` trait, `IdentifyTenant` middleware, RLS migration + CI check, spatie setup, `Visibility` resolver, AuditLog + observer, optimistic-concurrency trait.
2. **Custom-fields engine**: registry + JSONB validation + GIN.
3. **Sales core**: Account, Contact, Deal, Pipeline/Stage, DealContactRole; stage-change + won/lost + forecast.
4. **Lead + conversion**: Lead, scoring, routing, conversion TX (BR-L06/L07).
5. **Engagement**: Activity, Task (polymorphic + `last_activity_at` denorm).
6. **Support**: Ticket + SLA scheduler.
7. **Marketing** (later): Campaign, Segment, recipients.

---

## 13. Open questions (confirm before Phase 2)

1. **Auth scaffold**: Breeze (lighter, Inertia-React) vs Jetstream (teams built-in)? Recommend **Breeze + spatie + custom team model** (Jetstream teams ≠ our tenant model; avoid fighting it).
2. **Team subtree**: closure table (proposed, O(1) reads, write cost on reparent) vs recursive CTE (simpler, slower deep reads). Recommend **closure table** given manager rollup is a hot read path. Confirm?
3. **`tenants`/`users` global identity**: is login global (one email → many tenants) or strictly per-tenant (`unique(tenant_id,email)`)? Field-dictionary says per-tenant — confirm no cross-tenant SSO in v1.
4. **Reporting read store**: v1 compute-on-read from primary (with indexes) vs nightly rollup tables now? Recommend **on-read v1**, add rollups when slow (YAGNI). Confirm.
5. **Polymorphic FKs + RLS**: `activities.related_id` can't have a normal composite FK across entity types. Enforce same-tenant via app validation + RLS on `activities` itself — acceptable? (No native DB FK on polymorphic target.)
