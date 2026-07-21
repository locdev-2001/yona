# System Architecture — Chó Rách Management (Traditional Laravel + Integration Module)

> Domain architecture for an all-in-one, multi-tenant SaaS CRM on **Laravel 13 + PostgreSQL 16 + Eloquent + Inertia/React + Redis**. Living doc. Maps the domain docs (`crm-domain-definition`, `crm-business-rules`, `crm-field-dictionary`, `crm-actors-and-use-cases`) onto a concrete, Laravel-idiomatic design.
> Build order: **Sales-first**, but the model covers Support + Marketing from day one. Source of BR-* references: `crm-business-rules.md`.

Date: 2026-06-13 · Updated: 2026-06-28 · Status: Refactored to Traditional Laravel (Phase-04 complete) · Owner: architecture

---

## 0. Status: Refactored to Traditional Laravel (2026-06-28)

**Before (2026-06-27):** Custom modular framework (`module.json`, `ModuleServiceProvider`, `ModuleRegistry`, topo-sort loader, `ModuleAwareInertiaViewFinder`).

**Current state (2026-06-28):** Refactored to **standard Laravel + exactly 1 Integration module**. All core (CRM/CDP/Inbox/Billing/Projects) is pure Laravel; extensibility via driver pattern (`Illuminate\Support\Manager`). This matches conventional Laravel practice and reduces framework-specific complexity.

Core architecture principles remain unchanged; integration driver pattern replaces the custom module system.

---

## 1. Summary

Greenfield CRM. The hard parts are **the Platform layer** (tenant isolation, RBAC, audit, custom-fields) and **transactional correctness** of money/state paths (deal stage, won/lost, lead conversion, ticket SLA). Everything workspace-scoped is enforced at the data-access layer **and** Postgres RLS (defense-in-depth). Reporting/scoring/activity-feed are eventually consistent; deal/ticket/ownership are strongly consistent.

## 2. Codebase Structure (Standard Laravel + 1 Integration Module)

### Directory Tree

```
app/
├── Models/                       # ~50 models, all workspace-scoped or global
│   ├── Workspace.php            # Tenant root
│   ├── User.php, WorkspaceMember.php
│   ├── Client.php, Contact.php, Lead.php
│   ├── Conversation.php, Message.php, ZaloConnection.php
│   ├── Project.php, ProjectMilestone.php, Task.php, TaskTimer.php
│   ├── Ticket.php, Activity.php, Note.php, Attachment.php, Comment.php
│   ├── Reminder.php, Tag.php, CustomFieldDefinition.php
│   ├── AuditLog.php, Pipeline.php, Stage.php
│   ├── Marketplace.php, WorkspacePurchase.php, ChannelUsage.php
│   └── ... (all in `App\Models\` flat namespace)
│
├── Http/Controllers/
│   ├── Identity/                # Auth, password reset, onboarding
│   ├── Tenancy/                 # Workspace CRUD, switching
│   ├── Admin/                   # Platform staff (impersonation, oversight)
│   ├── Platform/                # RBAC, teams, custom fields, audit log, announcements
│   ├── Crm/                     # Client, Contact, Lead, Pipeline CRUD
│   ├── Projects/                # Project, Milestone, Task, Timer
│   ├── Inbox/                   # Conversation, Message views
│   ├── Shared/                  # Attachments, comments, notes, tags, reminders
│   ├── Email/                   # Email template management
│   ├── Billing/                 # Marketplace, purchases, entitlements
│   └── Integration/             # ⭐ Integration drivers (Zalo connect, payment webhook)
│       ├── ZaloPersonalWebhookController.php
│       ├── IntegrationController.php
│       └── ...
│
├── Services/
│   ├── MeteringService.php      # ⭐ CONCRETE class (not interface); send-path calls directly
│   ├── EntitlementService.php   # Resolve workspace entitlements + quotas
│   ├── ContactService.php       # Dedup by phone (Phase-08 CDP Layer 1)
│   ├── LeadService.php          # Lead conversion, funnel logic
│   ├── InboundMessageService.php # Webhook ingestion, upsert idempotency
│   ├── ZaloSendService.php      # Outbound send chain: health → quota → rate-limit → bridge
│   ├── ChannelManager.php       # Registry: extend('zalo_personal', ...) driver pattern
│   ├── PaymentManager.php       # Registry: extend('manual', ...) + manual driver
│   ├── TemplatedMailer.php, NotificationService.php
│   └── ...
│
├── Modules/Integration/         # ⭐ ONLY PRODUCTION MODULE (driver registration point)
│   ├── IntegrationServiceProvider.php  # Boot: register drivers conditionally
│   ├── IntegrationCatalog.php          # Hardcoded catalog: Zalo, later Messenger/TikTok
│   ├── Contracts/
│   │   ├── ChannelDriver.php      # send(peer_id, message): void
│   │   └── PaymentDriver.php      # charge(amount), verify(ref), cancel(ref)
│   │
│   ├── Chat/
│   │   └── ZaloPersonal/
│   │       ├── ZaloChannelDriver.php        # Implements ChannelDriver
│   │       ├── ZaloSendService.php          # Outbound chain (calls app(MeteringService))
│   │       ├── ZaloHealthMonitor.php        # Circuit breaker per connection
│   │       ├── SendRateLimiter.php          # 7h–22h + 3/phone/day enforcement
│   │       ├── QrSession.php                # QR login state machine
│   │       └── routes/                      # Zalo-specific: QR, auth callback
│   │
│   └── Payment/Manual/
│       ├── ManualPaymentDriver.php          # Implements PaymentDriver (Phase-07 only)
│       └── routes/
│           └── manual-payment-callback.php  # Phase-08: VNPay/MoMo drivers extend here
│
├── Policies/                    # Authorization (spatie RBAC + model policies)
├── Events/                      # Domain events (LeadConverted, DealWon, etc.)
├── Enums/                       # Type-safe enums (ConversationStatus, LeadSource, etc.)
├── Middleware/
│   ├── IdentifyWorkspace.php    # 1️⃣ Bind workspace from session/header
│   ├── ResetTenantContext.php   # 🔄 Clear workspace after request
│   └── ...
├── Http/Requests/              # Form validation (spatie FormRequest::authorize())
├── Providers/
│   ├── AppServiceProvider.php   # Register IntegrationServiceProvider conditionally
│   └── RouteServiceProvider.php
│
database/
├── migrations/                  # Schema + RLS policies (audit_logs has RLS)
└── seeders/
    ├── DatabaseSeeder.php
    ├── WorkspaceSeeder.php      # Test workspace + sample data
    └── ...

resources/
├── js/
│   ├── pages/
│   │   ├── crm/               # Client, Contact, Lead pages
│   │   ├── projects/          # Project, Task pages
│   │   ├── inbox/             # Conversation, Message pages
│   │   ├── billing/           # Purchases, quota display
│   │   ├── settings/          # Workspace settings, member management
│   │   └── admin/             # Platform admin panel
│   ├── components/
│   │   └── shared/            # Reusable (Button, Modal, Select, etc.)
│   ├── services/
│   │   ├── zalo-bridge/       # Bridge client (WebSocket + HTTP to Node.js backend)
│   │   └── api/               # HTTP client (Axios)
│   └── app.tsx, ssr.jsx       # Inertia + React entry points
│
└── views/
    ├── app.blade.php          # HTML skeleton
    └── emails/                # Email templates (Blade)

routes/
├── web.php                    # Customer-facing routes (web guard, RLS via TenantScope)
├── api.php                    # API routes (api guard, webhook routes)
└── admin.php                  # Admin panel routes (admin guard)

config/
├── integrations.php           # ⭐ Toggle integration drivers (ONLY feature flags for Integration)
│                              #    env INTEGRATION_ZALO_PERSONAL=true|false
│                              #    env INTEGRATION_PAYMENT_MANUAL=true|false
│                              #    (core: inbox, billing, crm ALWAYS on)
├── database.php
├── queue.php
├── services.php               # Branding, bridge endpoint, etc.
└── ...
```

### Key Decisions

1. **All models → `app/Models/`** (flat, no per-domain folders). ~50 models covering all entities (Workspace, User, Client, Contact, Lead, Conversation, Message, Project, Task, etc.). All carry `workspace_id` (enforced by `BelongsToWorkspace` trait).

2. **Controllers → `app/Http/Controllers/{Domain}/`** (organized by domain for clarity, but still in standard Laravel namespace). ~80+ controllers (CrmController, ProjectController, etc.).

3. **Services → `app/Services/`** (business logic, external integration calls, complex queries).
   - **`MeteringService` is CONCRETE** (not an interface with no-op binding). Send-path calls `app(MeteringService)->assertCanSend()` directly. Replaces the Phase-0 "topo-sort safety" concern — now it's the service's responsibility to be correct.
   - `EntitlementService`, `ContactService`, `LeadService`, `ChannelManager`, `PaymentManager`, etc.

4. **2 modules: `app/Modules/Integration/`** (driver pattern point) **and `app/Modules/Automation/`** (workflow node-handler registry, docs/crm-automation-workflow.md).
   - `ChannelManager` and `NodeHandlerManager` extend `Illuminate\Support\Manager` (`PaymentManager` does NOT — it's a hand-rolled minimal registry, by its own `ponytail:` comment, since GĐ1 only ever has 1 payment driver).
   - Drivers/handlers register: `Manager::extend('zalo_personal', fn() => app(ZaloChannelDriver::class))` / `Manager::extend('condition', fn() => new ConditionNodeHandler)`.
   - **Internal-first:** core (inbox, billing) NEVER reference the managers. Instead, they resolve from container + gracefully handle absence (422 on missing driver).
   - **Toggle:** `config/integrations.php` feature flags (env vars) for Integration. Automation has no on/off flag — it's designed as a core feature gated per-workspace by the `module.marketing` entitlement instead, planned for the permissions/entitlement phase, not yet enforced in the engine itself (docs/crm-automation-workflow.md §Permissions & entitlement).

5. **RLS + Tenant isolation:**
   - `IdentifyWorkspace` middleware (1️⃣) binds `app('workspace')` from session/header.
   - `BelongsToWorkspace` trait adds `where workspace_id = current()` to all queries (Laravel global scope).
   - **PostgreSQL RLS:** Tables carry `workspace_id` column; RLS policy `USING workspace_id = current_user_id::uuid` (stored as role/setting).
   - `ResetTenantContext` middleware (🔄) clears workspace after request (pool safety).

6. **Inertia + React:**
   - Standard `resolvePageComponent('./pages/'+name)` (no custom module loader).
   - Pages under `resources/js/pages/{domain}/`.
   - Shared components under `resources/js/components/shared/`.

7. **Zalo bridge lives outside modules:**
   - Bridge client in `services/zalo-bridge/` (fetches QR, handles callback, maintains session).
   - Bridge endpoint: env `ZALO_BRIDGE_ENDPOINT` (default: `http://localhost:3456`).
   - Webhook: `POST /api/integrations/zalo-personal/webhook` (handled by `app/Http/Controllers/Integration/ZaloPersonalWebhookController`).
   - **Generic dispatcher (P11)**: `POST {bridge}/zca/:method` — allowlist reflection 146 method (`src/zca-adapter.mjs` + snapshot M1 gate), tier guard (send→409, 39 destructive→403 trừ elevated secret + `TenantPermission::ZaloDestructive`, media→415, deny→403). B1 isolation: RLS `zalo_connections` là control chính + token-từ-session `HMAC(connection_id + workspace)` verify với binding ghi lúc promote (persist qua slot meta).
   - **Relay forwarder (P12)**: subscribe 10 event zca chưa wired (né 5 bespoke + `cipher_key`) → `old_messages`/`undo` đi outbox durable, chatty (typing/seen/delivered/…) fire-and-forget; Laravel lưu `relay_events` (RLS, KHÔNG metering — H1 no-silent-drop). Flow doc: `docs/features/messaging/zalo-generic-dispatcher.md`.

---

## 3. Data Flows

### 3.1 Inbound Message (Webhook)

```
Bridge (Node.js zca-js)
  ↓ detects message from peer
POST /api/integrations/zalo-personal/webhook
  (HMAC-signed: X-Zalo-Personal-Bridge-Secret)
  ↓
ZaloPersonalWebhookController::__invoke()
  ├─ Verify HMAC
  ├─ TenantScope::bind(connection_id → workspace_id)  [RLS scope, via ZaloConnection::workspaceForConnection()]
  ├─ Resolve channel_account_id from connection_id (ZaloConnection::channelAccountIdForConnection())
  └─ InboundMessageService::ingest()
      ├─ upsertConversation(channel_account_id, peer_uid, peer_phone, peer_name)
      │  └─ Unique (channel_account_id, peer_uid) per channel (stable across reconnects)
      ├─ upsertMessage(conversation_id, direction='in', text, source_id)
      │  └─ Idempotent on (conversation_id, source_id)
      ├─ updateConversationCache()
      │  └─ atomic increment unread_count
      ├─ meterReply() [fail-safe; inbound never counts quota]
      └─ Event: MessageReceived broadcast [Reverb PrivateChannel]
         └─ FE receives realtime update, UI refreshes
```

**Key:** `meterReply()` only counts when TENANT replies (outbound). Inbound is always accepted (F13: preserve lead capture).

### 3.2 Outbound Send (Reply)

```
Member UI: Click "Reply" → Type message
  ↓
InboxController::send(conversation_id, text)  [POST /inbox/conversations/{conversation}/messages]
  ├─ Authorize: can('update', Conversation)
  └─ ChannelManager::driver()->sendMessage() → ZaloSendService::send()
      ├─ resolveConnection(conversation)  [channel_account_id → connected slot]
      ├─ ZaloHealthMonitor::isCircuitOpen(connection_id)
      │  └─ If open → 422 (all send failures return 422, distinguished by error_code)
      ├─ MeteringService::assertCanSend(conversation_id)
      │  ├─ Exists in current period? → allowed
      │  └─ New? → check quota
      ├─ SendRateLimiter::assertCanSend(peer_phone)
      │  └─ 7h–22h (Ho Chi Minh) + ≤3/day
      ├─ callBridge(connection_id, peer_id, text)
      │  └─ HTTP POST to bridge, retry 2×200ms, timeout 15s
      ├─ persistMessage(conversation_id, direction='out', text)  [RLS enforced]
      ├─ meterReply(conversation_id, current_period)
      │  └─ Race-safe: compare-set + ON CONFLICT upsert in single TX
      ├─ increment(rate_limiter, peer_phone)  [Redis or memory]
      └─ ZaloHealthMonitor::reset()  [success indicator]
```

**Key:** `MeteringService` is injected directly (app()); no manager wrapper.

### 3.3 Metering (Quota Gate)

```
MeteringService::assertCanSend(conversation_id) 
  → THROWS QuotaExceededException if:
      ├─ Conversation created AFTER current period started AND
      ├─ answered_count ≥ plan quota
      └─ (already metered this period)
  
  ✅ ALLOWS if:
      ├─ Conversation created BEFORE current period (F5: existing unlimited)
      └─ OR answered_count < quota

WorkspacePurchase (billing)
  ├─ IF no active purchase → FREE_DEFAULTS (50 conv/month, 3 seats)
  └─ IF active → entitlements JSONB merged (max quotas, union flags)

Cache (Redis, 5 min TTL):
  └─ EntitlementResolver::snapshot(workspace_id) → {flags, quotas, remaining}
```

---

## 4. Bounded Contexts & Invariants

Cross-context communication happens through **domain events**, never direct table access into another context.

| Context | Owns | Key models |
|---|---|---|
| **Platform** | Two-plane access control (admins + workspaces), identity, RBAC, audit, custom-fields, pipeline config, reporting reads | Workspace, User, Admin, Membership, Team, CustomFieldDefinition, AuditLog, Pipeline, PipelineStage |
| **Sales** | Funnel + client relationships | Lead, Client, Contact, LeadSource |
| **Projects** | Dự án + công việc + timesheet | Project, ProjectMilestone, Task, TaskTimer |
| **Engagement** (shared/collaborative) | Polymorphic touchpoints across contexts | Activity, Note, Attachment, Tag, Comment, Reminder |
| **Support** | Issue resolution + SLA | Ticket |
| **Marketing** | Campaigns, segments, scoring inputs | Campaign, Segment, CampaignRecipient |
| **Automation** | Trigger→condition→action workflow execution (serves inbox auto-reply + Marketing); never writes into other contexts' tables | Workflow, WorkflowRun, WorkflowRunLog — schema + engine built (Phase 01-02); trigger wiring, action handlers, permissions/entitlement gate, and UI still in progress, see [crm-automation-workflow.md](crm-automation-workflow.md) |
| **Billing** | Marketplace (free base + add-ons, one-time/subscription), purchases, entitlements; MeteringService | MarketplaceItem, WorkspacePurchase, ChannelUsage, MeteringService |
| **Conversations** (Inbox) | Realtime omnichannel messaging (web/Zalo/FB/email), live chat, rate limiting | Channel, Conversation, Message, ZaloConnection, SendRateLimiter |

**Invariant ownership:**
- *Tenant isolation* (BR-X01/X11/X14/X18) → enforced by Platform (`BelongsToWorkspace` trait + middleware + RLS); every context inherits it.
- *Visibility* (BR-X02/X09/X15) → Platform `Visibility` resolver + Policies; each context's models declare ownership columns.
- *Money/forecast correctness* (BR-D04/D05) → Sales (Deal model).
- *SLA correctness* (BR-S02/S03) → Support (Ticket model + scheduler).
- *Audit immutability* (BR-X05/X07) → Platform (AuditLog, append-only, RLS-protected).
- *Metering correctness* (F1) → Billing `MeteringService` (concrete, transactionally correct).

---

## 5. Integration Driver Pattern

Drivers use `Illuminate\Support\Manager` — same as Laravel's `StorageManager`, `CacheManager`, etc.

### 5.1 Channel Driver (Zalo + future Messenger/TikTok)

```php
// In app/Modules/Integration/Chat/ZaloPersonal/ZaloChannelDriver.php
class ZaloChannelDriver implements ChannelDriver {
    public function send(string $peerId, string $message): void {
        // HTTP to bridge, retry logic, RLS-scoped persist
    }
}

// In app/Modules/Integration/IntegrationServiceProvider.php
protected function register() {
    $this->app->singleton(ChannelManager::class, function ($app) {
        $manager = new ChannelManager($app);
        
        if (config('integrations.zalo_personal.enabled')) {
            $manager->extend('zalo_personal', 
                fn() => app(ZaloChannelDriver::class)
            );
        }
        
        return $manager;
    });
}

// Usage in inbox (core)
$send = app('channels')->driver('zalo_personal')->send($peer, $msg);
// If driver missing → DriverNotFoundException → handle in controller (422)
```

### 5.2 Payment Driver (Manual + future VNPay/MoMo)

```php
// In app/Modules/Integration/Payment/Manual/ManualPaymentDriver.php
class ManualPaymentDriver implements PaymentDriver {
    public function charge(float $amount, string $ref): PaymentResult { ... }
    public function verify(string $ref): PaymentResult { ... }
    public function cancel(string $ref): PaymentResult { ... }
}

// Phase-08: Add VnpayPaymentDriver + MomoPaymentDriver, register same way
// Core (billing) always calls app('payments')->driver($plan->payment_method)
```

**Internal-first:** Inbox + Billing are in `app/Services` and NEVER import `Integration\*`. They resolve drivers from container or handle gracefully.

---

## 6. Data Model (Simplified)

UUID PKs everywhere (`uuid()` default). All workspace-scoped tables carry the **system columns**: `workspace_id, owner_id, team_id, custom_fields jsonb, created_at, updated_at, created_by, updated_by, deleted_at`, plus `lock_version int` for optimistic concurrency.

### 6.1 Platform Tables (Abbreviated)

| Table | Notable columns | Notes |
|---|---|---|
| `workspaces` | `name, base_currency, default_pipeline_id, audit_retention, status` | Root boundary. NOT workspace-scoped itself. |
| `users` | `email, name, password, status, locale, timezone` | **Customer identity** (`web` guard, NOT workspace-scoped). `unique(email)` globally. |
| `workspace_members` | `workspace_id, user_id, role, team_id, status, invited_at` | **Workspace membership.** `unique(workspace_id, user_id)`. |
| `teams` | `workspace_id, name, parent_id` | Tree (cycle-guarded). Closure table for O(1) subtree reads. |
| `pipelines` | `workspace_id, name, is_default` | One default per workspace. |
| `stages` | `workspace_id, pipeline_id, name, order, probability, type` | `unique(pipeline_id, order)`. |
| `custom_field_definitions` | `workspace_id, entity, key, label, type, options jsonb, validation jsonb, version, is_active` | `unique(workspace_id, entity, key)`. |
| `audit_logs` | `workspace_id, entity_type, entity_id, action, actor_id, changes jsonb, occurred_at` | **RLS-protected.** Append-only. |

### 6.2 CRM Tables (Abbreviated)

| Table | Notable columns | Unique constraints |
|---|---|---|
| `clients` | `workspace_id, name, phone, email, source, status, custom_fields, tags, ...` | None (name can repeat) |
| `contacts` | `workspace_id, first_name, last_name, phone, email, client_id (nullable), custom_fields, ...` | None (soft-deleted to preserve CDP) |
| `leads` | `workspace_id, title, phone, pipeline_id, stage_id, assigned_to, source, status, custom_fields, ...` | None |

### 6.3 Inbox Tables (New in GĐ1)

| Table | Notable columns | Unique constraints |
|---|---|---|
| `channel_accounts` | `workspace_id, channel, account_uid (stable OwnId), display_name, avatar_url, status (needs_qr/connected/session_lost — `session_lost` defined in schema but not currently written by any app code path; session-loss is tracked instead via `gap_started_at`/`gap_open`), gap_started_at, gap_open` | `unique(workspace_id, channel, account_uid)` — stable account identity across reconnects |
| `zalo_connections` | `workspace_id, connection_id (bigint, global unique), channel_account_id (FK), personal_uid, display_name, avatar_url, state (disconnected/qr_waiting/connected/session_lost), session_lost_reason, last_connected_at, last_qr_at, lock_version, created_at` | **Partial unique `(channel_account_id) WHERE state='connected' AND deleted_at IS NULL`** — exactly 1 live slot per account. Circuit-breaker state (error count, open/closed) is cache-based (`ZaloHealthMonitor`, Redis key `zalo_circuit:{connectionId}:*`), NOT a DB column. |
| `conversations` | `workspace_id, channel_account_id (FK, no enforce), peer_uid, peer_phone, peer_name, channel, unread_count, last_metered_period, stream_version, ...` | `unique(channel_account_id, peer_uid) WHERE deleted_at IS NULL` — account-keyed, stable across reconnects |
| `conversation_events` | `workspace_id, conversation_id (FK), kind (session_gap), gap_started_at, gap_ended_at, stream_at, stream_rank, created_at` | `unique(conversation_id, kind, gap_started_at)` — idempotent gap markers. `stream_at`/`stream_rank` are the shared sort key with `messages` for the unified keyset cursor (P05). |
| `message_source_aliases` | `workspace_id, conversation_id (FK), message_id (FK → messages), source_id, kind (default 'legacy'), created_at` | `unique(conversation_id, source_id)` — maps a legacy/pre-rekey source_id to the message row it now resolves to |
| `messages` | `workspace_id, conversation_id, direction (in/out), text, media, source_id, created_at, ...` | `unique(conversation_id, source_id)` idempotency |
| `channel_usage` | `workspace_id, channel, period (YYYY-MM), answered_count` | `unique(workspace_id, channel, period)` |

### 6.4 Billing Tables (New in GĐ1)

| Table | Notable columns | Unique constraints |
|---|---|---|
| `marketplace_items` | `slug (zalo, seats, email, support), type, name, description, entitlements jsonb, pricing jsonb` | `unique(slug)` global |
| `workspace_purchases` | `workspace_id, marketplace_item_id, purchased_at, ended_at (nullable), quantity` | `unique(workspace_id, item_id)` soft-delete via ended_at |

---

## 7. Security & Isolation

**Three-layer isolation:**

1. **Application layer:** `BelongsToWorkspace` trait auto-scopes queries to `workspace_id = current()`.
2. **Middleware:** `IdentifyWorkspace` binds workspace; `ResetTenantContext` clears it after request.
3. **Database layer:** PostgreSQL RLS policies enforce `workspace_id` matches authenticated role (stored as setting).

**Authentication:**
- **Customer (`web` guard):** Session-based, user identity per workspace (roles/teams in `workspace_members`).
- **Admin (`admin` guard):** Separate from customer; platform staff (super_admin, support_engineer, billing_ops). Impersonation audited.

**Authorization:**
- **RBAC:** Spatie roles + permissions; middleware enforces feature-gates.
- **Record-level:** Model policies (owns_to, team_visibility); queries respect `Visibility` resolver.

---

## 8. Asynchronous Work

- **Queue:** Laravel `queue:work` (configured: database or Redis driver).
- **Events:** Domain events → event listeners (e.g., `LeadConverted` → update parent, notify assignee).
- **Scheduled jobs:** Reminders, SLA checks, daily reporting (defined in `app/Console/Kernel.php`).
- **Realtime:** Reverb broadcasts for live chat (Conversation message events).

---

## 9. Testing Strategy

- **Unit tests:** Service logic, validation, policy authorization.
- **Integration tests:** End-to-end flows (lead conversion, metering, RLS scope).
- **Pest suite:** 600+ tests covering Platform + CRM + Inbox + Billing (Phase-07 + Phase-04 bug-sweep).
- **Feature tests:** Controller routes, middleware chain, Inertia props.
- **RLS audit:** `RlsPolicyCoverageTest` verifies every workspace-scoped table has a policy.

---

## Related Documentation

- **Domain:** [crm-domain-definition.md](crm-domain-definition.md), [crm-business-rules.md](crm-business-rules.md)
- **Authorization:** [crm-authorization-model.md](crm-authorization-model.md)
- **Inbox:** [features/messaging/README.md](features/messaging/README.md), [features/messaging/zalo-personal-inbox.md](features/messaging/zalo-personal-inbox.md)
- **Billing:** [crm-marketplace.md](crm-marketplace.md)
- **Code standards:** [code-standards.md](code-standards.md)
