# System Architecture — Chó Rách Management (Phase 1)

> Domain architecture for an all-in-one, multi-tenant SaaS CRM on **Laravel 13 + PostgreSQL 16 + Eloquent + Inertia/React + Redis**. Living doc. Maps the domain docs (`crm-domain-definition`, `crm-business-rules`, `crm-field-dictionary`, `crm-actors-and-use-cases`) onto a concrete, Laravel-idiomatic design.
> Build order: **Sales-first**, but the model covers Support + Marketing from day one. Source of BR-* references: `crm-business-rules.md`.

Date: 2026-06-13 · Status: Phase 1 design · Owner: architecture

---

## 1. Summary

Greenfield CRM. The hard parts are **the Platform layer** (tenant isolation, RBAC, audit, custom-fields) and **transactional correctness** of money/state paths (deal stage, won/lost, lead conversion, ticket SLA). Everything workspace-scoped is enforced at the data-access layer **and** Postgres RLS (defense-in-depth). Reporting/scoring/activity-feed are eventually consistent; deal/ticket/ownership are strongly consistent.

## 2. Bounded contexts

Cross-context communication happens through **domain events**, never direct table access into another context.

| Context | Owns | Key models |
|---|---|---|
| **Platform** | Two-plane access control (admins + workspaces), identity, RBAC, audit, custom-fields, pipeline config, reporting reads | Workspace, User, Admin, Membership, Team, CustomFieldDefinition, AuditLog, Pipeline, Stage |
| **Sales** | Funnel + opportunities | Lead, Contact, Account, Deal, DealContactRole |
| **Engagement** (shared/collaborative) | Polymorphic touchpoints across contexts | Activity, Task |
| **Support** | Issue resolution + SLA | Ticket |
| **Marketing** | Campaigns, segments, scoring inputs | Campaign, Segment, CampaignRecipient |
| **Billing** | Marketplace (free base + add-ons, one-time/subscription), purchases, entitlements (Platform plane) | MarketplaceItem, WorkspacePurchase, Entitlements resolver — see [crm-marketplace.md](crm-marketplace.md) |
| **Conversations** (Inbox) | Realtime omnichannel messaging (web/Zalo/FB/email), live chat | Channel, Conversation, Message — see [crm-conversations-inbox.md](crm-conversations-inbox.md) |

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

UUID PKs everywhere (`uuid` default). All workspace-scoped tables carry the **system columns** (BR field-dictionary §System): `workspace_id, owner_id, team_id, custom_fields jsonb, created_at, updated_at, created_by, updated_by, deleted_at`, plus `lock_version int` for optimistic concurrency (BR-X08).

### 3.1 Platform tables

> **Access control = two planes (Platform staff + Workspace customers). Canonical spec: [crm-authorization-model.md](crm-authorization-model.md).** Terminology: **Workspace** = the customer / isolation boundary (was "tenant"); "multi-tenant" / "tenant isolation" remain the *pattern* names.

| Table | Notable columns | Notes |
|---|---|---|
| `workspaces` | `name, base_currency, default_pipeline_id, audit_retention, status` | Root boundary. NOT workspace-scoped itself. |
| `users` | `email, name, password, status, locale, timezone` | **Customer identity** (`web` guard, NOT workspace-scoped). `unique(email)` globally. No role/team here. |
| `admins` | `email, name, password, status, locale, timezone` | **Platform-staff identity** (`admin` guard, separate from `users`). Platform RBAC via spatie on guard `admin` (roles super_admin/support_engineer/billing_ops); god-mode via audited impersonation (auth-model doc). |
| `workspace_member` (membership) | `workspace_id, user_id, role, team_id, status, invited_at` | **The workspace-scoped membership.** `unique(workspace_id, user_id)`. `role`/`team_id` live here, server-controlled (BR-X12). A user joins N workspaces. Deactivate = membership.status (BR-X03), not user. |
| `teams` | `workspace_id, name, parent_id` | Tree (BR-X02). Cycle-guarded (BR-X13). |
| `team_closure` | `workspace_id, ancestor_id, descendant_id, depth` | Closure table for O(1) subtree reads (manager rollup). Maintained on team create/reparent. |
| `pipelines` | `workspace_id, name, is_default` | One default per workspace. |
| `stages` | `workspace_id, pipeline_id, name, order, probability, type(open/won/lost)` | `unique(pipeline_id, order)`. |
| `custom_field_definitions` | `workspace_id, entity, key, label, type, options jsonb, validation jsonb, version, is_active` | `unique(workspace_id, entity, key)`. Registry (§5). |
| `audit_logs` | `workspace_id, entity_type, entity_id, action, actor_id, changes jsonb, occurred_at` | Append-only (§7). |

spatie tables (`roles, permissions, model_has_roles, role_has_permissions, model_has_permissions`) configured **team-aware** with `teams.team_foreign_key = workspace_id` → roles scoped per workspace.

### 3.2 Sales tables

| Table | Notable columns | Notes |
|---|---|---|
| `leads` | `first_name,last_name,email,phone,company_name,title,source,status,unqualified_reason,score,converted_contact_id,converted_account_id,converted_deal_id` | Funnel-isolated. `status: new→working→qualified→unqualified→converted` (BR-L03/L06). |
| `accounts` | `name,domain,industry,size,annual_revenue,parent_account_id,billing_address jsonb` | Company. |
| `contacts` | `first_name,last_name,email,phone,title,account_id,lifecycle_stage,do_not_contact,last_activity_at` | Backbone. `account_id` 0..1 (BR-C01). |
| `deals` | `name,account_id,pipeline_id,stage_id,value,currency,expected_close_date,status(open/won/lost),loss_reason,probability,closed_at,last_activity_at,is_stalled` | Money/state core. `value ≥ 0` CHECK (BR-D04). |
| `deal_contact_roles` | `workspace_id,deal_id,contact_id,role(champion/decision-maker/influencer/blocker)` | N:N buying committee (BR-D01). `unique(deal_id, contact_id)`. |

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

### 3.5 Mapped queries → indexes (workspace_id-leading)

| Query | Index |
|---|---|
| My open deals by stage | `deals (workspace_id, owner_id, status, stage_id)` |
| Team pipeline board | `deals (workspace_id, team_id, status, stage_id)` |
| Stalled scan (read denormalized) | `deals (workspace_id, status, last_activity_at)` |
| Contact timeline | `activities (workspace_id, related_type, related_id, occurred_at desc)` |
| My tasks due | `tasks (workspace_id, assignee_id, status, due_at)` |
| Ticket queue by SLA | `tickets (workspace_id, status, sla_due_at)` |
| Lead dedup | `leads (workspace_id, lower(email)) where deleted_at is null` (partial) |
| Custom-field filter | GIN `... using gin (custom_fields jsonb_path_ops)` |
| Audit by entity | `audit_logs (workspace_id, entity_type, entity_id, occurred_at desc)` |

Migration safety: greenfield, no online-DDL concerns yet. Forward-only discipline applies once shipped.

### 3.6 Billing / Marketplace tables

**Free base + à-la-carte marketplace** (add-ons billed one-time or subscription). Item catalog is **global** (Platform); purchases are **workspace-scoped**. Entitlements are **JSONB data** (extend by adding items/keys, no migration). Full spec + enforcement: [crm-marketplace.md](crm-marketplace.md).

| Table | Notable columns | Notes |
|---|---|---|
| `marketplace_items` | `code (unique), name, type(feature_module/quota/integration/service), billing_type(one_time/subscription), price_cents, currency, interval, entitlements jsonb, provider_key, is_active, is_public, sort` | Catalog (global). `entitlements` = flags / quota increments; `service` items grant none. |
| `workspace_purchases` | `workspace_id, item_id, billing_type, status, quantity, purchased_at, current_period_start, current_period_end, cancel_at_period_end, external_ref` | Owned/active items. `quantity` = stackable quota. `external_ref` = future payment provider. |
| `workspace_integrations` | `workspace_id, item_id, provider_key, status, config jsonb, connected_at` | Connected instance for `integration` items (OAuth/config). |

**Effective entitlements** = BASE (free) ⊕ Σ(active purchases) ⊕ overrides. **Entitlement gate ≠ RBAC gate**: workspace quota/feature is checked *in addition to* user role permission. Single resolver `Entitlements::for(workspace)`; cached in Redis, busted on purchase/subscription change.

### 3.6b Conversations / Inbox tables (live chat, omnichannel)

V1 core. `messages` is high-volume, append-only, partition-ready. Full spec: [crm-conversations-inbox.md](crm-conversations-inbox.md).

| Table | Notable columns | Notes |
|---|---|---|
| `inbox_channels` | `workspace_id, type(web_widget/zalo/facebook/email), name, integration_id, config jsonb, is_active` | Zalo/FB/email ref `workspace_integrations`; web_widget built-in. |
| `conversations` | `workspace_id, channel_id, contact_id(nullable), assignee_id, team_id, status, subject, last_message_at, unread_count, external_thread_ref, ticket_id(nullable), first_response_at, closed_at` | `ticket_id` set on escalate. `last_message_at` denormalized for inbox sort. |
| `messages` | `workspace_id, conversation_id, sender_type, sender_id, body, direction, external_message_ref, delivery_status, created_at` | Append-only. `unique(workspace_id, channel, external_message_ref)` (inbound idempotency). Attachments via `attachments`. |
| `conversation_participants` | `workspace_id, conversation_id, user_id, role` | Collaboration / @mention. |
| `canned_responses` | `workspace_id, title, body, shortcut, scope, owner_id` | Saved replies. |

### 3.7 Platform foundation tables (cross-cutting)

| Table | Notable columns | Notes |
|---|---|---|
| `attachments` | `workspace_id, related_type, related_id, filename, mime, size, storage_key, uploaded_by, created_at, deleted_at` | Polymorphic file on any entity. S3-compatible disk; inherits parent visibility (BR-X09); download via short-lived signed URLs. |
| `notifications` | `workspace_id, user_id, type, data jsonb, read_at, created_at` | In-app feed (Laravel notifications convention). Indexed `(workspace_id, user_id, read_at)`. |
| `notification_preferences` | `workspace_id, user_id, type, channel(in_app/email/push), enabled` | Per-user opt-in/out per event type × channel. |
| `webhook_endpoints` | `workspace_id, url, event_types jsonb, secret, is_active` | Outbound subscriptions per workspace. |
| `webhook_deliveries` | `workspace_id, endpoint_id, event, payload jsonb, status, attempts, response_code, next_retry_at` | Delivery log; queued + retried. Partition-ready. |
| `workspace_sequences` | `workspace_id, entity, next_value` | Human-readable per-workspace counters (Deal #1234). Atomic increment under row lock. |
| `announcements` | `id uuid PK, title, slug unique, body, body_html, category(feature/improvement/fix/announcement/maintenance), status(draft/published), published_at, audience jsonb, cover_image, created_by, updated_by, deleted_at` | **Product changelog / "What's New"** — Platform-authored, **GLOBAL** (no `workspace_id`, no RLS, no `BelongsToWorkspace`). `slug` unique. `body_html` = XSS-safe CommonMark output (server-computed). `audience` v1 = `{type:all}`; extensible (by_plan / by_entitlement / workspace_filter) without schema change. Index: `(status, published_at)`. |
| `announcement_reads` | `id uuid PK, announcement_id FK, user_id FK, read_at` | Per-user read state → unread badge. **GLOBAL** (no `workspace_id`, no RLS). `unique(announcement_id, user_id)`. Read-state is shared across workspaces — once read in any context the badge clears everywhere. `$guarded = ['*']`; only written via `AnnouncementReadService::markRead()`. |

> **Global-table exception**: `announcements` and `announcement_reads` intentionally have **no `workspace_id`** and **no RLS policies**. The existing `RlsPolicyCoverageTest` scans only tables that have a `workspace_id` column — these global tables are excluded by that query and cause no policy-coverage failure. See [features/platform/announcements.md](../docs/features/platform/announcements.md).

API tokens reuse Sanctum's `personal_access_tokens` (+ `abilities` for scopes, bound to a `workspace_member`).

---

## 4. Multi-tenant enforcement (defense-in-depth)

Three layers; no single point of failure (BR-X01/X11/X14/X18):

1. **App: `BelongsToWorkspace` trait** (global scope filters by `app('currentWorkspace')`, `creating` hook stamps `workspace_id`). On every workspace model. *(laravel skill → references/multi-tenancy.md)*
2. **Middleware `IdentifyWorkspace`** — resolves the **active tenant server-side** from the session (never client input, BR-X14), **validates the authenticated user has an active `workspace_member` membership** in it (else 403), binds `currentWorkspace` + `currentMembership`; `SET app.current_workspace` for RLS. Multi-tenant users pick/switch active tenant; session holds it.
3. **Postgres RLS, default-deny** — every workspace-scoped table has `ENABLE ROW LEVEL SECURITY` + policy `workspace_id = current_setting('app.current_workspace')::uuid`. App DB role is non-owner. **CI test asserts every tenant table has a policy** (BR-X18).

Supporting invariants:
- **Same-workspace FKs** (BR-X11): every reference (incl. polymorphic `related_id`, `account_id`, `pipeline_id`, custom-field refs) validated to resolve in-workspace on write (FormRequest rule + DB composite FK `(workspace_id, id)` where practical).
- **No mass-assignment** of `workspace_id/owner_id/team_id/role` (BR-X12) — guarded; set only by server.
- **Unique constraints are composite** with `workspace_id`.
- **Owner/assignee must be members** — `owner_id`, `team_id`, `assignee_id`, `created_by` reference global `users`, but the referenced user must have an active `workspace_member` membership in the record's tenant (validated on write; reassignment target check in BR-X03).

---

## 5. RBAC (role × record ownership)

> This is the **Workspace plane**. The **Platform plane** (internal staff, platform roles, god-mode impersonation) is specified in [crm-authorization-model.md](crm-authorization-model.md).

Two layers (BR-X02), see laravel skill → references/rbac.md:

- **Feature gate = spatie roles, scoped per workspace via membership**: `admin, sales_manager, sales_rep, support_manager, support_agent, marketer, viewer`. spatie teams feature with `team_foreign_key = workspace_id` → the same global user holds different roles in different tenants (role lives on `workspace_member`). Permissions like `deal.create`, `export.bulk`.
- **Record gate = Policies + `Visibility` resolver**:
  - `own` (rep/agent) → `owner_id = me`
  - `team` (manager) → `team_id IN visibleTeamIds(me)` = own team + descendant subtree via `team_closure`
  - `all` (admin) → no extra filter
- **Per-entity, no link bleed** (BR-X02): visibility computed per record; seeing an Account never grants its Deals/Contacts.
- **Child inherits parent** (BR-X09): Activity/Task/Ticket visibility = parent's; enforced in data layer (scope joins to parent), not per-screen.
- **Non-enumeration** (BR-X15): list queries pass the visibility scope; single-record fetch that fails visibility returns **404, not 403**.
- **Reporting/search** (BR-X16): tenant + visibility filters are non-optional; no raw unscoped path.

`Visibility::scopeFor($query, $user)` is the single chokepoint; collections use it, single records use Policies. Both run **inside** the already-workspace-scoped query.

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

- **Registry**: `custom_field_definitions` (workspace-scoped, versioned). Type ∈ {string, number, date, bool, enum, multi-enum}.
- **Storage**: `custom_fields jsonb` on each core entity; values validated against the active registry version on write. Unknown keys rejected; custom `key` may **not** collide with a reserved core field name.
- **Validation**: safe primitives only — type, enum options, min/max/length. **No workspace-supplied raw regex** (ReDoS); any pattern via a vetted timeout-bounded validator. **Caps**: bounded field count per entity/tenant + bounded payload per record.
- **Lifecycle**: definition versioned — type change = new version (old values read-only, never destructively coerced); removing an enum option deactivates it (historical retained, not selectable); disabling a field keeps data, hides from input/filters.
- **Indexing**: GIN `jsonb_path_ops` per entity; add expression index on a specific hot key when a filter is heavy.

---

## 9. Async / queue / scheduler (Redis + Horizon)

| Job / task | Trigger | Queue | Idempotency / notes |
|---|---|---|---|
| `ScoreLead` (BR-L05) | `ActivityLogged`, lead update | `low` | advisory; recomputable; re-run safe |
| `RouteLead` (BR-L04) | lead create | `default` | round-robin/rule; fallback owner, never null |
| `RecomputeStallFlags` (BR-D06) | scheduler hourly | `default` | reads denormalized `last_activity_at`; **never scans activities** |
| `CheckSlaBreaches` (BR-S02) | scheduler every 5 min | `high` | per-workspace loop; re-bind tenant in handler |
| `SendCsatRequest` (BR-S05) | `TicketResolved` | `default` | dedupe per ticket |
| `RebuildReportRollups` | scheduler nightly | `low` | eventual; workspace-partitioned read store |
| `BulkReassign` (BR-X03) | deactivation | `default` | batched, atomic-per-record, audited |
| `SendNotification` | domain events | `default` | per-recipient channels (in_app/email); respects preferences |
| `DispatchWebhook` | domain events | `default` | HMAC-signed, retry+backoff, logs `webhook_deliveries`, idempotent |
| `ScanAttachment` | file upload | `low` | virus scan (deferred); quarantine on fail |
| `IngestInboundMessage` | channel webhook (Zalo/FB/email) | `high` | normalize + idempotent (external_message_ref); broadcast + route |
| `SendOutboundMessage` | agent reply | `high` | provider Send API, retry/backoff, update delivery_status |

Jobs carry `workspace_id` explicitly and re-bind `currentWorkspace` at `handle()` start (no request context). All handlers idempotent. `withoutOverlapping` on scheduled scans.

---

## 9b. Frontend (Inertia 2 + React)

**Why Inertia (not a separate SPA/API in v1):** the CRM is an internal, behind-login, CRUD + dashboard app — Inertia's sweet spot. Routing, auth, CSRF, and **RBAC/visibility scoping stay server-side** (frontend is never a trust boundary; aligns with §4–5). No separate API to build/maintain.

**Tradeoff (accepted):** Inertia is not a full SPA and gives no general-purpose API. A future **mobile app or 3rd-party API** (domain docs mention API/Webhooks/AI agents) must be added via Sanctum. **Safeguard (mandatory):** business logic lives in Action/Service classes, never in controllers (§11) — so an API controller can later call the *same* services. Inertia controllers and a future API are thin doors onto one core. **Realtime: Laravel Reverb is v1 infra** (mandated by live-chat/Inbox — see [crm-conversations-inbox.md](crm-conversations-inbox.md)); the React client uses Laravel Echo over Reverb for messages/presence/typing, and Inertia polling for lighter live updates (pipeline/ticket). Broadcast channel auth is workspace + visibility scoped (§11 leak surface).

**UI stack**

| Need | Library | Note |
|---|---|---|
| Components | **shadcn/ui** (Radix + Tailwind v4) | skill `ui-styling` |
| Data grids | **TanStack Table v8** + **TanStack Virtual** | always server-side pagination (1M rows/tenant); virtualize long lists |
| Kanban pipeline | **dnd-kit** | not react-beautiful-dnd (deprecated) |
| Forms | **React Hook Form + Zod** | client validation; Zod schema mirrors BE validation |
| Charts | **Recharts** (default) / **Tremor** (fast dashboards) | forecast, pipeline, activity |
| Misc | **lucide-react**, **sonner** (toast), **cmdk** (command palette), **date-fns**, **nuqs** (table state in URL) | |

**Integration rules**
- No React Router — Inertia owns routing; a page = component receiving Laravel-controller props.
- Inertia `useForm` for page submits (CSRF + Laravel validation errors auto-mapped); RHF+Zod for client-side pre-validation. Complementary.
- **TanStack Query only for client-driven async widgets** (typeahead, polling, infinite scroll) — never for primary page data (Inertia owns it). Biggest over-engineering trap.
- Use Inertia 2 deferred props (heavy tables load after paint), prefetch (hover), polling (light realtime) before reaching for WebSocket.
- State: Inertia props + React state/context; add **Zustand** only for genuinely complex client state. No Redux.

## 9c. Cross-cutting foundations

Defined basic now (data model above §3.7), built incrementally. All workspace-scoped, audited where relevant.

- **Attachments** — polymorphic file on any entity; S3-compatible disk (Laravel filesystem), tenant-prefixed keys. Upload validated (mime/size, entitlement quota `storage_mb`); virus scan = queued job (deferred). Visibility **inherits parent** (BR-X09); downloads via short-lived signed URLs scoped to the viewer. Delete = soft (recoverable), purge on parent hard-delete.
- **Notifications** — Laravel Notification, **queued**. Channels: `in_app` (DB feed, v1) + `email` + `push` (later); per-user `notification_preferences` (type × channel). Driven by domain events: `TaskDue`, `DealAssigned`, `OwnerReassigned`, `SlaBreaching`, `Mentioned`, `TicketUpdated`. Digest/batching deferred. Notifications are per-recipient, never cross-workspace.
- **Time & locale** — **store all datetimes in UTC**; `workspace.timezone`+`locale` defaults, overridable per `workspace_member`. Inputs (due date, close date) entered in the user's tz → converted to UTC; display converts back. **Overdue/SLA computed in UTC** (SLA stays calendar-24/7, BR-S02). Money already one base currency/workspace (BR-D05).
- **Human-readable numbers** — per-workspace sequential ref (`Deal #1234`, `Ticket #5678`) via `workspace_sequences` (atomic increment under row lock; `unique(workspace_id, entity, number)`). UUID stays the PK; the number is display/lookup only.
- **API & Webhooks** (posture now; full build deferred) —
  - *Inbound*: Sanctum tokens scoped to a `workspace_member` with `abilities` (= permissions) + RLS; per-workspace rate limit. Same authorization path as the web app (no privileged bypass).
  - *Outbound*: `webhook_endpoints` subscribe to event types; the **domain-event bus** is the single source → a queued `DispatchWebhook` job signs (HMAC via endpoint `secret`), delivers, **retries with backoff**, logs to `webhook_deliveries`; consumer dedupes on event id (idempotent). Reuses the same events that drive notifications/audit — one event stream, many consumers.
- **Product announcements / changelog** (customer-facing "What's New") — Platform staff (super_admin / a `product` platform role) publish global `announcements` targeted by `audience` (all / plan / entitlement / workspace filter). Customers see an **in-app feed + unread badge** (read state per user); publishing optionally fans out a `Notification` and/or email. Distinct from the developer `project-changelog.md`. Optional public changelog page deferred (YAGNI).

## 10. Scale posture

- Volume: ~1,000s tenants × ~1M records/tenant (~1B rows). DB is the bottleneck, not PHP.
- **Hottest tables**: `activities`, `campaign_recipients`, `audit_logs`, `tasks` — append-heavy. **Partition-ready** (UUID PK + `workspace_id`/`created_at` available), but **physical partitioning deferred** until volume justifies (red-team: avoid over-engineering pre-customers).
- Denormalized `last_activity_at` kills the stall-scan N+1 (BR-D06).
- Composite `(workspace_id, …)` indexes mandatory; `paginate`/`lazyById`/`cursor` for large sets; query-builder/raw for reports.
- Search: v1 = Postgres (ILIKE + GIN/trigram); Meilisearch deferred.
- PgBouncer added when worker+web connection count justifies — not now.

---

## 11. Anti-pattern audit

- **Tenant leak** → 3-layer enforcement + RLS default-deny + CI policy check; cache keys/broadcast channels/search will be workspace-prefixed.
- **Unbounded query** → no `Model::all()`; visibility scope + pagination mandatory.
- **Polling instead of events** → stall/SLA are the *only* scheduled scans, and they read denormalized columns, not raw event tables.
- **Race on shared state** → optimistic `lock_version`; `GREATEST` for monotonic denorm; `lockForUpdate` on conversion/merge.
- **TX over network** → events fire `afterCommit`; no HTTP/queue inside TX.
- **Observer cascade** → conversion/merge are explicit service actions in one TX, not observer chains.
- **God service** → logic lives on fat models; services only for conversion, merge, reassignment, SLA (multi-aggregate/transactional).
- **Link-bleed visibility** → per-entity resolution + child-inherits-parent, enforced in data layer.

---

## 12. Implementation order (Phase 2 will detail)

1. **Platform foundation**: Workspace, User(global)+Membership, Team(+closure), `BelongsToWorkspace` trait, `IdentifyWorkspace` middleware, RLS migration + CI check, spatie setup, `Visibility` resolver, AuditLog + observer, optimistic-concurrency trait, **time/locale (UTC) base**, **workspace_sequences** (record numbers).
2. **Custom-fields engine**: registry + JSONB validation + GIN.
3. **Cross-cutting platform**: attachments, notifications (+preferences), domain-event bus (feeds notifications/webhooks/audit), **Reverb realtime infra** (channel auth = workspace+visibility scoped).
4. **Sales core**: Account, Contact, Deal, Pipeline/Stage, DealContactRole; stage-change + won/lost + forecast.
5. **Lead + conversion**: Lead, scoring, routing, conversion TX (BR-L06/L07).
6. **Engagement**: Activity, Task (polymorphic + `last_activity_at` denorm).
7. **Support**: Ticket + SLA scheduler.
8. **Conversations / Inbox** (v1 core): channels, conversations, messages (realtime via Reverb), web widget first → Zalo/FB/email; routing; escalate→Ticket.
9. **Marketplace + entitlements**: items, purchases, `Entitlements` resolver + enforcement.
10. **Later**: Marketing (Campaign/Segment/recipients), product announcements, outbound Webhooks, inbound API (Sanctum), import.

---

## 13. Resolved decisions (2026-06-13)

All Phase 1 open questions locked — user directive: "best for the long term".

1. **Auth scaffold** → **Breeze + spatie + custom team model**. Jetstream teams ≠ our workspace model; Breeze is a minimal owned scaffold.
2. **Team subtree** → **closure table** (`team_closure`). O(1) subtree reads for manager rollup (hot path); pay write cost on reparent.
3. **Identity** → **Global identity + membership** (NOT per-workspace). Global `users` (unique email) + `workspace_member` membership carrying role/team/status. Enables one user across many tenants, agencies, future cross-org SSO. Chosen over the simpler per-workspace model because retrofitting it later is prohibitively expensive. (Supersedes the earlier discovery per-workspace note.)
4. **Reporting** → **compute-on-read v1**, through a repository/query layer so rollup tables can slot in later without changing callers. No premature rollups (YAGNI).
5. **Polymorphic FKs** → enforce same-workspace via **app validation + RLS** on the polymorphic table (`activities`/`tasks`). No native DB FK on a polymorphic target; if a relation becomes hot/critical, denormalize to a typed FK column.
6. **Access model** → **two planes** (Platform staff + Workspace customers). "Workspace" is the customer/isolation entity (renames "tenant"; pattern still called multi-tenant). Full spec: [crm-authorization-model.md](crm-authorization-model.md).
7. **Internal access** → **god-mode** (super_admin sees all workspaces' data) **but mediated**: time-boxed impersonation (RLS still scopes to one workspace) + cross-workspace reads via an audited privileged path. Every internal data access is audited (extends BR-X05); designed so it can tighten to consent-based later without rework.

### 13a. Implementation decisions (Module 1 build, 2026-06-13)

8. **ID strategy = hybrid (deviation from "UUID everywhere").** `users.id` stays **bigint** — the Breeze starter shipped it with real rows and the supreme DB-safety rule forbids a destructive conversion. **All other platform/workspace/domain tables use UUID PKs** (ordered UUIDs via `HasUuids`). FKs referencing users (`owner_id`, `created_by`, `updated_by`, `assignee_id`, `member.user_id`, `actor_id`) are **bigint**; `workspace_id` and all domain FKs are **uuid**. The field-dictionary `user.id uuid` line is superseded by this.
9. **RLS enforcement = two Postgres roles + two connections.** Runtime/web/tests connect as the non-superuser **`cho_rach_app`** (so RLS policies actually bind — superusers/owners bypass RLS). Migrations (DDL), append-only audit writes, and cross-workspace platform reads use the **`pgsql_privileged`** connection (owner `cho_rach_owner`). Policies are **default-deny** via `nullif(current_setting('app.current_workspace', true), '')::uuid` (unset/empty → NULL → no rows) with `FORCE ROW LEVEL SECURITY`. Setup: `database/sql/setup-roles.sql` (`make db-roles`).
10. **Tenant-context bootstrap without a privileged read.** `IdentifyWorkspace` sets `app.current_user_id`; the `workspace_member` RLS policy's `USING` clause allows `workspace_id = <active> OR user_id = <caller>`, so a user can read their **own** membership rows during request bootstrap — the active workspace is resolved on the normal RLS-scoped connection (no per-request privileged query). `WITH CHECK` stays strict (`workspace_id = <active>`) to block self-membership escalation (S4).
