# System Architecture — Yona (Traditional Laravel + Capability Modules)

> Domain architecture for an all-in-one, multi-tenant SaaS CRM on **Laravel 13 + PostgreSQL 16 + Eloquent + Inertia/React + Redis**. Living doc. Maps the domain docs (`crm-domain-definition`, `crm-business-rules`, `crm-field-dictionary`, `crm-actors-and-use-cases`) onto a concrete, Laravel-idiomatic design.
> Build order: **Sales-first**, but the model covers Support + Marketing from day one. Source of BR-* references: `crm-business-rules.md`.

Date: 2026-06-13 · Updated: 2026-07-26 · Status: Traditional Laravel + capability modules (Chat / Payment / Automation) · Owner: architecture

---

## 0. Status: Standard Laravel + Capability Modules (2026-07-26)

**Before (2026-06-27):** Custom modular framework (`module.json`, `ModuleServiceProvider`, `ModuleRegistry`, topo-sort loader, `ModuleAwareInertiaViewFinder`).

**2026-06-28:** Refactored to standard Laravel; the custom module system was replaced by the driver pattern (`Illuminate\Support\Manager`) hosted in a single catch-all `app/Modules/Integration/` module.

**Current state (2026-07-26):** That catch-all module is gone. Modules are split **by capability**: `app/Modules/Chat/`, `app/Modules/Payment/`, `app/Modules/Automation/`. `app/Http/` and `app/Models/` stay at the application root — a module holds domain logic only, never its own HTTP layer. Chat and Payment each expose a neutral contract in `Port/` and keep vendor specifics in `Adapter/<Vendor>/`; Automation keeps `Contracts/` + `Handlers/`. Everything else (CRM/CDP/Billing/Projects) is pure Laravel. The binding convention lives in [code-standards.md](code-standards.md) §0.

Core architecture principles remain unchanged; the driver pattern replaces the custom module system.

---

## 1. Summary

Greenfield CRM. The hard parts are **the Platform layer** (tenant isolation, RBAC, audit, custom-fields) and **transactional correctness** of money/state paths (deal stage, won/lost, lead conversion, ticket SLA). Everything workspace-scoped is enforced at the data-access layer **and** Postgres RLS (defense-in-depth). Reporting/scoring/activity-feed are eventually consistent; deal/ticket/ownership are strongly consistent.

## 2. Codebase Structure (Standard Laravel + Capability Modules)

### Directory Tree

```
app/
├── Models/                       # ~50 models, all workspace-scoped or global
│   ├── Workspace.php            # Tenant root
│   ├── User.php, WorkspaceMember.php
│   ├── Client.php, Contact.php, Lead.php
│   ├── Conversation.php, Message.php, ZaloConnection.php
│   ├── Project.php, ProjectMilestone.php, Task.php, TaskTimer.php
│   ├── Activity.php, Note.php, Attachment.php, Comment.php
│   ├── Reminder.php, Tag.php, CustomFieldDefinition.php
│   ├── AuditLog.php, Pipeline.php, PipelineStage.php
│   ├── MarketplaceItem.php, WorkspacePurchase.php, ChannelUsage.php
│   └── ... (all in `App\Models\` flat namespace)
│
├── Http/
│   ├── Controllers/
│   │   ├── Identity/            # Auth, onboarding, member settings, Admin/ impersonation
│   │   ├── Tenancy/             # Workspace switching + workspace settings
│   │   ├── Announcements/       # Product announcements board (+ Admin/ authoring)
│   │   ├── Crm/                 # Client, Lead, pipeline settings
│   │   ├── Projects/            # Project, Milestone, Task, Timer
│   │   ├── Chat/                # ⭐ Conversation + message endpoints (was Inbox/)
│   │   │   ├── InboxController.php, ConversationStreamController.php, ...
│   │   │   ├── WidgetInboundController.php    # First-party channel intake
│   │   │   └── ZaloPersonal/                  # Connection lifecycle + bridge webhook
│   │   ├── Automation/          # Workflow builder
│   │   ├── Shared/              # Attachments, comments, notes, tags, reminders, notifications
│   │   ├── Email/               # Email template management
│   │   ├── Settings/            # Appearance
│   │   ├── Billing/Admin/       # Workspace plan management
│   │   └── Integration/         # Integration catalog screen (IntegrationController.php)
│   ├── Middleware/
│   │   ├── IdentifyWorkspace.php    # 1️⃣ Bind workspace from session/header
│   │   ├── ResetTenantContext.php   # 🔄 Clear workspace after request
│   │   └── ...
│   ├── Requests/                # Form validation (FormRequest::authorize())
│   ├── Support/                 # HTTP-edge adapters (RoutedMediaUrlFactory, ...)
│   └── ViewModels/              # Read-side shapes for Inertia props (IntegrationCatalog, ...)
│
├── Services/                    # Cross-cutting business logic, not owned by one module
│   ├── MeteringService.php      # ⭐ CONCRETE class (not interface); send-path calls directly
│   ├── EntitlementService.php   # Resolve workspace entitlements
│   ├── ContactService.php       # Dedup by phone (CDP Layer 1)
│   ├── LeadService.php          # Lead conversion, funnel logic
│   ├── TemplatedMailer.php, NotificationService.php
│   └── ...
│
├── Modules/Chat/                # ⭐ Messaging capability — core is channel-agnostic
│   ├── ChatServiceProvider.php  # Binds ChannelRegistry + MediaUrlFactory
│   ├── Port/                    # Neutral contract the core talks to
│   │   ├── ChannelDriver.php, AbstractChannelDriver.php, ChannelCapabilities.php
│   │   ├── ChannelRegistry.php  # extends Illuminate\Support\Manager
│   │   ├── Capability/          # Opt-in marker interfaces (SupportsReactions, ...)
│   │   └── Exception/UnsupportedCapabilityException.php
│   ├── Intake/                  # Inbound: IntakeService, DuplicateResolver, InboundEvent + Event/
│   ├── Delivery/                # Outbound: ComposeMessageService, DeliveryPipeline,
│   │                            #   InteractionPipeline, SeenSyncService, OutboundMessage,
│   │                            #   MediaUrlFactory (port) + Event/ + Exception/
│   ├── Store/                   # Persistence-side: GapMarkerService, SystemLineService,
│   │                            #   PhoneEnrichmentService, DedupConversation
│   ├── Status/MessageStatusService.php   # seen/delivered/undo/reaction on messages
│   ├── Timeline/                # MessageItemSerializer, TimelineCursor (keyset paging)
│   ├── Broadcast/BroadcastService.php    # Conversation cache + Reverb publish
│   └── Adapter/
│       ├── Widget/              # First-party channel — the floor of chat, never gated off
│       └── ZaloPersonal/        # ⭐ External plug-in, gated by config
│           ├── ZaloChannelDriver.php     # Implements ChannelDriver
│           ├── ZaloPersonalServiceProvider.php
│           ├── Delivery/        # ZaloSendService (policy → transport → persist),
│           │                    #   ZaloInteractionService
│           ├── Intake/          # ZaloStateEventParser, ZaloBackfillService
│           ├── Health/ZaloHealthMonitor.php   # Circuit breaker per connection
│           ├── Policy/SendRateLimiter.php     # 7h–22h + 3/phone/day on proactive sends
│           └── Exception/       # ZaloNotConnectedException, RateCapException, ...
│
├── Modules/Payment/             # ⭐ Same shape as Chat: Port/ contract, Adapter/ plug-ins
│   ├── PaymentServiceProvider.php
│   ├── Port/                    # PaymentDriver.php, PaymentRegistry.php
│   └── Adapter/Manual/          # ManualPaymentDriver + its provider (VNPay/MoMo land here)
│
├── Modules/Automation/          # ⭐ Workflow engine (see crm-automation-workflow.md)
│   ├── AutomationServiceProvider.php, WorkflowEngine.php
│   ├── NodeHandlerManager.php   # extends Illuminate\Support\Manager
│   ├── Contracts/NodeHandler.php
│   └── Handlers/                # Condition, Wait, Tag, SendMessage, CreateTask, ...
│
├── Policies/                    # Authorization (spatie RBAC + model policies)
├── Events/                      # Domain events (LeadConverted, MessageReceived, etc.)
├── Enums/                       # Type-safe enums (ConversationStatus, LeadSource, etc.)
├── Providers/                   # Per-feature providers (Tenancy, Identity, Billing, Inbox, ...)
│
database/
├── migrations/                  # Schema + RLS policies (audit_logs has RLS)
└── seeders/
    ├── DatabaseSeeder.php
    ├── FoundationSeeder.php     # Workspace + sample data
    ├── PlanSeeder.php, PlatformPermissionSeeder.php, AdminPermissionSeeder.php
    └── ...

resources/
├── js/
│   ├── pages/
│   │   ├── crm/               # Client, Contact, Lead pages
│   │   ├── projects/          # Project, Task pages
│   │   ├── inbox/             # Conversation, Message pages
│   │   ├── integration/       # Integration catalog + Zalo connection screen
│   │   ├── automation/        # Workflow builder
│   │   ├── billing/           # Purchases, usage display
│   │   ├── settings/          # Workspace settings, member management
│   │   └── admin/             # Platform admin panel
│   ├── components/
│   │   ├── inbox/             # Channel-agnostic thread UI (reused by every channel)
│   │   └── shared/, ui/       # Reusable primitives (Button, Modal, Select, etc.)
│   ├── layouts/               # app/, admin/, auth/, settings/ shells
│   ├── hooks/, lib/, types/   # Shared client helpers + generated types
│   └── app.tsx, ssr.jsx       # Inertia + React entry points
│
└── views/
    ├── app.blade.php          # HTML skeleton
    └── emails/                # Email templates (Blade)

services/
└── zalo-bridge/               # Node.js bridge process (zca-js); NOT part of the PHP app
    └── src/zca-adapter.mjs    # Allowlisted zca method reflection

routes/                        # Three façades over one core (code-standards.md §0.4)
├── web.php                    # Inertia screens + admin panel (web/admin guards)
├── web_api.php                # JSON called by this app's own FE (session auth)
├── api.php                    # Stable outside contract + inbound webhooks
├── channels.php               # Broadcast channel authorization
└── console.php                # Scheduler + console commands (no app/Console/Kernel.php)

config/
├── integrations.php           # ⭐ External plug-in toggles + first-party channel secret
│                              #    env INTEGRATION_ZALO_PERSONAL=true|false
│                              #    env INTEGRATION_PAYMENT_MANUAL=true|false
│                              #    env WIDGET_CHANNEL_INBOUND_SECRET (first-party channel,
│                              #    no on/off flag — chat cannot run without it)
├── database.php
├── queue.php
├── services.php               # Branding, bridge endpoint, etc.
└── ...
```

`bootstrap/app.php` loads `web_api.php` **before** `web.php`: `GET /inbox/{conversation}` in
`web.php` is a catch-all that would otherwise swallow `GET /inbox/quick-replies`.
`bootstrap/providers.php` declares every provider directly — including `ChatServiceProvider`,
`WidgetServiceProvider`, `ZaloPersonalServiceProvider` and `PaymentServiceProvider`. There is no
`class_exists` guard: a defensive guard silently skips a provider the moment an FQCN moves.

### Key Decisions

1. **All models → `app/Models/`** (flat, no per-domain folders). ~50 models covering all entities (Workspace, User, Client, Contact, Lead, Conversation, Message, Project, Task, etc.). All carry `workspace_id` (enforced by `BelongsToWorkspace` trait).

2. **Controllers → `app/Http/Controllers/{Domain}/`** (organized by domain for clarity, but still in standard Laravel namespace). ~80+ controllers (CrmController, ProjectController, etc.).

3. **`app/Services/` holds only what no single module owns** (cross-cutting business logic, complex queries). Messaging logic moved into `app/Modules/Chat/`; payment driver plumbing into `app/Modules/Payment/`.
   - **`MeteringService` is CONCRETE** (not an interface with no-op binding). The send path calls `meterReply()` directly after transport succeeds. Tracks usage for analytics only (no quota enforcement).
   - `EntitlementService`, `ContactService`, `LeadService`, `TemplatedMailer`, `NotificationService`, etc.

4. **3 modules: `app/Modules/{Chat,Payment,Automation}/`** — split by capability, not by "things that talk to the outside". A new channel or payment gateway is a new `Adapter/`, never an edit to the core.
   - `ChannelRegistry` and `NodeHandlerManager` extend `Illuminate\Support\Manager` (`PaymentRegistry` does NOT — it's a hand-rolled minimal registry, by its own `ponytail:` comment, since GĐ1 only ever has 1 payment driver).
   - Drivers/handlers register: `ChannelRegistry::extend('zalo_personal', fn() => app(ZaloChannelDriver::class))` / `NodeHandlerManager::extend('condition', fn() => new ConditionNodeHandler)`. Adapters attach via `callAfterResolving`, so declaration order in `bootstrap/providers.php` does not matter.
   - **Port/Adapter split:** the core resolves `App\Modules\Chat\Port\ChannelDriver` and never names a vendor. Channel-specific behaviour (circuit breaker, echo dedup, rate cap, outbox retry) stays inside the adapter.
   - **Toggle:** `config/integrations.php` feature flags (env vars) gate *external* plug-ins only; each adapter's own provider returns early when disabled. The first-party `Widget` channel has no flag — it is the floor chat stands on. Automation has no on/off flag either — it's designed as a core feature gated per-workspace by the `module.marketing` entitlement, planned for the permissions/entitlement phase, not yet enforced in the engine itself (docs/crm-automation-workflow.md §Permissions & entitlement).

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
   - Bridge process in `services/zalo-bridge/` (fetches QR, handles callback, maintains session) — a separate Node.js service, not PHP.
   - Bridge endpoint: `config('services.zalo_bridge.url')`, env `ZALO_BRIDGE_URL` (default: `http://127.0.0.1:8612`).
   - Webhook: `POST /api/integrations/zalo-personal/webhook` (declared in `routes/api.php`, handled by `app/Http/Controllers/Chat/ZaloPersonal/ZaloPersonalWebhookController`).
   - **Generic dispatcher (P11)**: `POST {bridge}/zca/:method` — allowlist reflection 146 method (`src/zca-adapter.mjs` + snapshot M1 gate), tier guard (send→409, 39 destructive→403 trừ elevated secret + `TenantPermission::ZaloDestructive`, media→415, deny→403). B1 isolation: RLS `zalo_connections` là control chính + token-từ-session `HMAC(connection_id + workspace)` verify với binding ghi lúc promote (persist qua slot meta).
   - **Relay forwarder**: subscribe 10 event zca chưa wired (né 5 bespoke + `cipher_key`) → `old_messages`/`undo` đi outbox durable, chatty fire-and-forget; Laravel (P02/P09 inbox-full-messaging): undo/seen/delivered/reaction ĐI THEO `messages` qua `App\Modules\Chat\Status\MessageStatusService`, typing broadcast-only, lạ → structured log (kho `relay_events` ĐÃ DROP). Outbound MỌI kênh đi `App\Modules\Chat\Delivery\DeliveryPipeline` (rate-limit + meterReply; quota gate removed 25/07). Flow docs: `features/messaging/{zalo-generic-dispatcher,message-state-pipeline,channel-framework-contract}.md`.

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
  └─ App\Modules\Chat\Intake\IntakeService::ingest()
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
InboxController::send(conversation, ...)  [POST /inbox/conversations/{conversation}/messages]
  ├─ Authorize: can('update', Conversation)
  ├─ ComposeMessageService::compose()  → OutboundMessage
  │  └─ Normalize text, resolve quoted message + attachment, reject invalid
  │     combinations (ComposeMessageException → 422 + error_code)
  └─ DeliveryPipeline::send(ChannelRegistry::driver($conversation->channel), …)
      ├─ 1. driver->sendMessage()  → ZaloSendService::send()
      │     ├─ resolveConnection(conversation)  [channel_account_id → connected slot]
      │     ├─ ZaloHealthMonitor::isCircuitOpen(connection_id)
      │     │  └─ If open → 422 (all send failures return 422, distinguished by error_code)
      │     ├─ SendRateLimiter::assertCanSend(workspace, target, isReply)
      │     │  └─ 7h–22h (Ho Chi Minh) + ≤3/day — PROACTIVE sends only; a reply
      │     │     inside the inbound window is exempt
      │     ├─ callBridge(connection_id, peer_id, text)  [HTTP POST to bridge, retry, timeout]
      │     ├─ persistMessage(conversation_id, direction='out', text)  [RLS enforced]
      │     ├─ increment(rate_limiter, target)  [proactive sends only]
      │     └─ ZaloHealthMonitor::reset()  [success indicator]
      ├─ 2. MeteringService::meterReply(conversation)
      │     └─ Race-safe: compare-set + ON CONFLICT upsert in single TX
      └─ 3. BroadcastService::publish()  [conversation cache + MessageReceived]
            └─ Fail-safe: the message already left the platform, so a publish
               error is reported, never surfaced to the sender
```

**Key:** every outbound message from every source (inbox UI, automation, future API) goes through
`DeliveryPipeline`. Calling `driver->sendMessage()` directly bypasses metering and broadcast — that
is exactly how automation once sent messages nobody could count. Metering lives in the pipeline,
not in the driver: the driver owns channel policy, transport and persistence only.

### 3.3 Metering (Statistics Only)

```
MeteringService::meterReply(conversation_id)
  → Race-safe atomic compare-set + upsert in single transaction
  → Tracks usage in channel_usage per (workspace_id, channel, period)
  → No quota gate applied; all sends allowed
  
  Usage data (channel_usage):
    ├─ answered_count per workspace/channel/month
    └─ Used for analytics and future billing policies only

WorkspacePurchase (billing entitlements)
  ├─ IF no active purchase → FREE_DEFAULTS (flags for free tier)
  └─ IF active → entitlements JSONB merged (union flags)

Cache (Redis, 5 min TTL):
  └─ EntitlementService::snapshot(workspace_id) → {flags} only
     (quotas removed; no longer used for gating)
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
| **Conversations** (Inbox) | Realtime omnichannel messaging (web/Zalo/FB/email), live chat, rate limiting | ChannelAccount, Conversation, ConversationEvent, Message, MessageReaction, ZaloConnection |

**Invariant ownership:**
- *Tenant isolation* (BR-X01/X11/X14/X18) → enforced by Platform (`BelongsToWorkspace` trait + middleware + RLS); every context inherits it.
- *Visibility* (BR-X02/X09/X15) → Platform `Visibility` resolver + Policies; each context's models declare ownership columns.
- *Money/forecast correctness* (BR-D04/D05) → Sales (Deal model).
- *SLA correctness* (BR-S02/S03) → Support (Ticket model + scheduler).
- *Audit immutability* (BR-X05/X07) → Platform (AuditLog, append-only, RLS-protected).
- *Metering correctness* (F1) → Billing `MeteringService` (concrete, transactionally correct).

---

## 5. Port / Adapter Driver Pattern

Each capability module owns a `Port/` — the neutral contract the core is allowed to know — and one
`Adapter/<Vendor>/` per plug-in. The channel registry uses `Illuminate\Support\Manager`, same as
Laravel's `StorageManager` / `CacheManager`.

### 5.1 Channel Driver (Zalo + future Messenger/TikTok)

```php
// app/Modules/Chat/Adapter/ZaloPersonal/ZaloChannelDriver.php
namespace App\Modules\Chat\Adapter\ZaloPersonal;

use App\Modules\Chat\Port\AbstractChannelDriver;

class ZaloChannelDriver extends AbstractChannelDriver {
    public function channelKey(): string { return 'zalo_personal'; }
    public function capabilities(): ChannelCapabilities { ... }   // reactions, stickers, seen, ...
    public function sendMessage(Conversation $c, array $payload): Message { ... }
    public function parseInbound(array $raw): array { ... }
}

// app/Modules/Chat/ChatServiceProvider.php — the registry exists even with zero plug-ins
$this->app->singleton(ChannelRegistry::class, fn ($app) => new ChannelRegistry($app));

// app/Modules/Chat/Adapter/ZaloPersonal/ZaloPersonalServiceProvider.php
public function register(): void {
    if (! config('integrations.zalo_personal.enabled')) {
        return;                       // plug-in gates itself; the core is untouched
    }
    $this->callAfterResolving(ChannelRegistry::class, function (ChannelRegistry $registry) {
        $registry->extend('zalo_personal', fn () => app(ZaloChannelDriver::class));
    });
}

// Usage in the core — resolved by the conversation's channel, never by a hardcoded vendor name
$driver = app(ChannelRegistry::class)->driver($conversation->channel);
// Unregistered channel → InvalidArgumentException → 422 'channel_unavailable'
```

Capabilities are opt-in marker interfaces under `Port/Capability/` (`SupportsReactions`,
`SupportsStickers`, `SupportsSeenReceipts`, `SupportsHistoryResync`,
`SupportsPhoneVerification`). Asking a driver for something it does not implement raises
`Port\Exception\UnsupportedCapabilityException` instead of a vendor-shaped `if` in the core.

The first-party `Adapter/Widget/` channel is registered by `WidgetServiceProvider` with no config
flag: it is the floor the chat module stands on, so chat is always testable end-to-end even with
every external plug-in disabled.

### 5.2 Payment Driver (Manual + future VNPay/MoMo)

```php
// app/Modules/Payment/Adapter/Manual/ManualPaymentDriver.php
class ManualPaymentDriver implements PaymentDriver {
    public function key(): string { return 'manual'; }
    public function createCheckout(string $workspaceId, string $itemId, array $payload = []): array { ... }
    public function verifyCallback(array $data): bool { ... }
    public function refund(string $purchaseId, int $amountCents): bool { ... }
}

// app/Modules/Payment/Adapter/Manual/ManualPaymentServiceProvider.php
$this->callAfterResolving(PaymentRegistry::class, function (PaymentRegistry $registry) {
    $registry->extend('manual', fn () => app(ManualPaymentDriver::class));
});

// Adding VnpayPaymentDriver / MomoPaymentDriver = a new Adapter/ + its provider, no core edit.
// Billing resolves by key: app(PaymentRegistry::class)->driver($method)
```

**Core stays vendor-blind:** the inbox and billing code paths name `Port\ChannelDriver` /
`Port\PaymentDriver` and the registries — never an adapter class. A missing driver is handled
gracefully (422), not assumed away.

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
| `pipeline_stages` | `workspace_id, pipeline_id, name, color, stage_order, probability, type (open/won/lost)` | `unique(workspace_id, pipeline_id, name)`. |
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
- **Scheduled jobs:** Reminders (`reminders:dispatch-due`), workflow resume (`workflow:resume-waiting`), transient-message pruning (`inbox:prune-transient`) — declared in `routes/console.php`.
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
