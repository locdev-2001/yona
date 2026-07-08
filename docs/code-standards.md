# Code Standards & Conventions

Enforceable patterns for the Chó Rách CRM codebase. Extracted from Phase-04 bug-sweep findings + refactor to traditional Laravel (2026-06-28).

> **Nguyên tắc trục (đọc trước):** [Rule 16 — Layered Architecture](#16-layered-architecture--core-is-channel-agnostic-upper-knows-only-lower). Không hardcode logic của **một kênh/cá nhân/case cụ thể** vào lõi. Layer trên chỉ biết layer ngay dưới. Lõi trung tính kênh (channel-agnostic). Mọi rule khác phục vụ nguyên tắc này.

## Model Organization

### 1. All Models → `app/Models/` (Flat Namespace)

**Rule:** Every Eloquent model lives in `app/Models\`, regardless of domain. No per-domain subfolders.

```php
// ✅ Correct
namespace App\Models;
class Lead extends Model { ... }

// ❌ Wrong
namespace App\Modules\CrmSales\Models;
class Lead extends Model { ... }
```

**Reason:** Simplifies auto-discovery, matches Laravel convention, avoids namespace collision risks with cross-domain relationships.

---

## External Integration (Driver Pattern)

### 2. Driver Contract = `{X}Driver` in `app/Modules/Integration/Contracts/`

**Rule:** External integrations (payment providers, messaging channels) implement a formal contract (interface) in the Integration module's Contracts folder.

```php
// app/Modules/Integration/Contracts/ChannelDriver.php
interface ChannelDriver {
    public function send(string $peerId, string $message): void;
}

// app/Modules/Integration/Chat/ZaloPersonal/ZaloChannelDriver.php
class ZaloChannelDriver implements ChannelDriver {
    public function send(string $peerId, string $message): void { ... }
}
```

### 3. Register Drivers via `Manager::extend()` (Not Inheritance or Service Location)

**Rule:** Register drivers in `IntegrationServiceProvider` using `Illuminate\Support\Manager::extend()`. Do NOT use inheritance from the driver class or direct service location.

```php
// ✅ Correct (IntegrationServiceProvider)
$manager = new ChannelManager($app);
$manager->extend('zalo_personal', fn() => app(ZaloChannelDriver::class));

// Usage (core service — never hardcodes driver)
app('channels')->driver('zalo_personal')->send($peer, $msg);

// ❌ Wrong
class InboundMessageService extends ZaloChannelDriver { ... }  // No inheritance
app()->make('zalo_personal_driver');  // No direct service location
```

**Reason:** Drivers are pluggable; core logic must not couple to implementation.

---

## Services & Business Logic

### 4. `MeteringService` is CONCRETE (Not Interface + No-op Binding)

**Rule:** `MeteringService` is a concrete class in `app/Services/`, fully implemented. Send-path calls it directly via `app(MeteringService::class)`. NEVER use an interface-with-no-op pattern.

```php
// ✅ Correct (app/Services/MeteringService.php)
class MeteringService {
    public function assertCanSend(string $conversationId): void {
        if ($quotaExhausted) throw new QuotaExceededException();
    }
}

// Usage in ZaloSendService
$this->metering->assertCanSend($conversationId);  // Direct, no abstraction

// ❌ Wrong
interface MeteringGate {
    public function assertCanSend(string $conversationId): void;
}
// (causes "no-op binding" ambiguity in older phases)
```

**Reason:** Quota enforcement is critical correctness logic. Concrete class forces explicit implementation; no risk of silent no-op.

---

## Lead Restoration & Soft Delete

### 5. Restore Routes MUST Use `->withTrashed()`

**Rule:** Any route that restores a soft-deleted model MUST query with `->withTrashed()` to find the model in the first place.

```php
// ✅ Correct (LeadRestoreController)
public function restore(Lead $lead) {
    // Implicit: $lead is resolved via model binding,
    // but form must use withTrashed() in the query:
    $lead = Lead::withTrashed()->findOrFail($id);
    $lead->restore();
    return redirect('/leads/' . $lead->id);
}

// Or explicit (more readable):
$lead = Lead::withTrashed()->find($id);
if (! $lead || ! $lead->trashed()) {
    abort(404);
}
$lead->restore();

// ❌ Wrong
$lead = Lead::find($id);  // Ignores trashed; returns null
$lead->restore();  // Null error
```

**Reason:** Soft-deleted records are hidden by default. Finding them requires explicit `withTrashed()`.

---

## Cross-Namespace Compatibility Shims

### 6. Cross-Module Shims Use `class_alias()`, Never `extends`

**Rule:** If a model is refactored into a different namespace but old code still references the old FQCN, use `class_alias()` for backward compatibility. NEVER subclass the model with the old name.

```php
// app/Models/Lead.php — new canonical location
namespace App\Models;
class Lead extends Model {
    // Morph alias for polymorphic relationships
    protected $morphClass = 'lead';
}

// (In bootstrap/app.php or a compatibility shim file)
// ✅ Correct
if (! class_exists('App\Modules\CrmSales\Models\Lead', false)) {
    class_alias('App\Models\Lead', 'App\Modules\CrmSales\Models\Lead');
}

// ❌ Wrong (DO NOT DO THIS)
namespace App\Modules\CrmSales\Models;
class Lead extends \App\Models\Lead { }  // Subclassing → ClassMorphViolationException
```

**Reason:** Eloquent's morph alias registry maps class names to strings for polymorphic relations. If a model has two class definitions (parent + child), the morph registry breaks.

---

## Attachment Authorization

### 7. Attachment Create Authz Must Check `can('update', $parent)`

**Rule:** When attaching a file to a parent resource (Lead, Contact, Project, etc.), the user must have update permission on the parent, not just create permission on Attachment.

```php
// ✅ Correct (AttachmentController)
public function store(Request $request) {
    $parent = Lead::find($request->parent_id);
    $this->authorize('update', $parent);  // Check parent, not Attachment
    
    $attachment = Attachment::create([
        'attachable_id' => $parent->id,
        'attachable_type' => Lead::class,
        'path' => $file->store(...),
    ]);
    return $attachment;
}

// ❌ Wrong
$this->authorize('create', Attachment::class);  // Too permissive; ignores parent
```

**Reason:** Attachment is a detail of the parent; no separate authorization for "attach to resource". If you can edit the parent, you can attach files.

---

## Async & Queue Jobs (RLS Context)

### 8. Queue Jobs Must Establish `app.current_workspace` Before Querying Tenant Tables

**Rule:** When a queued job queries workspace-scoped models, it MUST call `TenantScope::set()` or bind `app('workspace')` before executing queries. Otherwise, RLS will default-deny all rows.

```php
// ✅ Correct (AnalyzeConversationJob)
class AnalyzeConversationJob implements ShouldQueue {
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;
    
    public function __construct(public Conversation $conversation) {}
    
    public function handle() {
        // Establish workspace context for RLS
        TenantScope::set($this->conversation->workspace_id);
        
        // Now query workspace tables safely
        $contacts = Contact::where('workspace_id', ...)->get();
        // ... analysis logic
    }
}

// ❌ Wrong
class AnalyzeConversationJob implements ShouldQueue {
    public function handle() {
        $contacts = Contact::all();  // RLS denies everything; query returns empty
    }
}
```

**Reason:** Queue jobs run in a separate process/transaction with no HTTP middleware context. RLS policy uses `current_user_id` (a Postgres role setting). Jobs must explicitly set workspace scope.

---

## Idempotent Webhook Processing

### 9. Webhook Upsert Paths Must Catch `QueryException 23505` (Unique Violation)

**Rule:** When receiving webhooks that create or update data with a unique constraint, use a `try/catch` block to handle race conditions (concurrent webhooks for same resource). Re-fetch on conflict (optimistic locking pattern).

```php
// ✅ Correct (InboundMessageService::upsertConversation)
public function upsertConversation($connectionId, $peerUid, ...) {
    try {
        DB::beginTransaction();
        
        // Attempt insert
        $conversation = Conversation::create([
            'zalo_connection_id' => $connectionId,
            'peer_uid' => $peerUid,
            'workspace_id' => $workspace->id,
        ]);
        
        DB::commit();
        return $conversation;
    } catch (QueryException $e) {
        if ($e->getCode() === '23505') {  // Unique violation
            DB::rollBack();
            // Conflict; fetch existing record
            return Conversation::where('zalo_connection_id', $connectionId)
                ->where('peer_uid', $peerUid)
                ->firstOrFail();
        }
        throw;
    }
}

// ❌ Wrong
Conversation::create([...]);  // Crashes on race condition; webhook rejected
```

**Reason:** Multiple webhook deliveries for the same event can arrive simultaneously. Unique constraints protect data integrity; handling the violation gracefully ensures idempotency.

### 10. Savepoint for Nested Transactions (Webhook Inside Outer TX)

**Rule:** If webhook upsert logic (try/catch QueryException 23505) is called inside an outer transaction, wrap the upsert in a `savepoint()` to prevent the outer TX from aborting.

```php
// ✅ Correct (if upsert is called within another TX)
public function ingest($payload) {
    DB::beginTransaction();
    
    try {
        // ... outer logic
        
        // Nested upsert in savepoint
        DB::transaction(
            fn() => $this->upsertConversation($payload),
            attempts: 1,
        );
        
        DB::commit();
    } catch (Throwable $e) {
        DB::rollBack();
        throw;
    }
}
```

**Reason:** PostgreSQL savepoints allow inner failures without aborting the outer TX. Idempotent webhook handlers need this to retry safely.

---

## Conversation Routing (Multi-Channel Design)

### 11. Conversation Unique Constraint = Per-Channel (NOT Cross-Channel Merge)

**Rule:** The unique constraint on Conversation is `unique(channel, workspace_id, peer_uid)` (not just per peer). Same peer across Zalo + Messenger = 2 separate conversations until CDP dedup is implemented (Phase-08+).

```php
// Correct schema (database/migrations/..._create_conversations_table.php)
Schema::create('conversations', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->uuid('workspace_id')->index();
    $table->string('channel');  // 'zalo_personal', 'messenger', etc.
    $table->string('peer_uid');
    $table->string('peer_phone')->nullable();
    $table->string('peer_name')->nullable();
    // ... other fields
    
    // Composite unique (but per-channel for now; multi-channel redesign in Phase-08)
    $table->unique(['workspace_id', 'channel', 'peer_uid']);
    // NOT: $table->unique(['workspace_id', 'peer_uid']);  // Would wrongly merge channels
});

// Why: Same person (e.g., alice@company.com) has:
// - Zalo account: zalo_uid_123
// - Messenger UID: messenger_uid_456
// These are DIFFERENT peer_uids, so 2 conversations, even same workspace.
// Cross-channel dedup happens in CDP (Phase-08).
```

**Reason:** Phone-based dedup (CDP Layer 1) is planned for Phase-08. Until then, treat each channel independently to avoid forced merges that lose conversation history.

---

## Transaction Handling

### 12. Use `saveQuietly()` to Bypass Auto-Logging

**Rule:** When you want to update a model WITHOUT triggering auto-audit logging (e.g., internal state changes), use `saveQuietly()` instead of `save()`.

```php
// ✅ Correct
$conversation->last_metered_period = '2026-06';
$conversation->saveQuietly();  // Bypasses chatConversation::booted() auto-logging

// ❌ Wrong (will create unwanted audit entry)
$conversation->last_metered_period = '2026-06';
$conversation->save();  // Triggers AuditLog creation
```

**Reason:** Not every model update is significant. System fields (cache, meter timestamp) shouldn't pollute audit logs.

---

## Controller Authorization

### 13. Form Requests Enforce Authorization (Spatie `authorize()`)

**Rule:** Use `FormRequest::authorize()` (from spatie) to check permission before the controller method runs. Do NOT rely on inline `$this->authorize()` checks.

```php
// ✅ Correct (app/Http/Requests/UpdateLeadRequest.php)
class UpdateLeadRequest extends FormRequest {
    public function authorize(): bool {
        return $this->user()->can('update', $this->lead);
    }
    
    public function rules(): array {
        return ['title' => 'required|string'];
    }
}

// In controller
public function update(UpdateLeadRequest $request, Lead $lead) {
    // Request already authorized; no need to check again
    $lead->update($request->validated());
}

// ❌ Wrong (authorization forgotten)
class CreateTaskRequest extends FormRequest {
    public function rules(): array { ... }
    // Missing authorize() method → default true (insecure)
}
```

**Reason:** Spatie `FormRequest::authorize()` is the standard gate. Forgetting it is a common vulnerability.

---

## Naming Conventions

### 14. Use Explicit, Meaningful Names (Avoid `data`, `temp`, `cache`)

**Rule:** Variable, method, and class names must describe their purpose, not their type.

```php
// ✅ Correct
$conversationsByWorkspace = $this->fetchConversationsByWorkspace($workspaceId);
$remainingQuota = $entitlement->remaining_conversations;
public function extractContactFromPayload() { ... }

// ❌ Wrong
$data = $this->fetch($workspaceId);  // What data?
$cache = $quotaValue;  // Is it really cached?
$temp = $payload;  // Temporary what?
```

**Reason:** Code is read far more than written. Explicit names reduce cognitive load + prevent misuse.

---

## Testing & Verification

### 15. RLS Coverage Must Be Verified in Tests

**Rule:** Every workspace-scoped table must have a test asserting that RLS policies correctly deny cross-workspace queries.

```php
// ✅ Correct (tests/Feature/RlsPolicyCoverageTest.php)
public function test_leads_table_has_rls_policy() {
    $workspace1 = Workspace::factory()->create();
    $workspace2 = Workspace::factory()->create();
    
    $lead = Lead::factory()->for($workspace1)->create();
    
    TenantScope::set($workspace2->id);
    
    $result = Lead::where('id', $lead->id)->first();
    $this->assertNull($result);  // RLS denied; correct
}
```

**Reason:** RLS is a safety net. Tests verify it's not misconfigured.

---

## Layered Architecture

### 16. Layered Architecture — Core Is Channel-Agnostic, Upper Knows Only Lower

**Rule:** Kiến trúc chia lớp rõ ràng, đọc vào là hiểu. **Cấm cố định (hardcode) logic của một kênh/nhà cung cấp/cá nhân/case cụ thể vào lớp dùng chung hoặc lớp lõi.** Đặc thù cụ thể sống trong driver/adapter của nó; lõi chỉ nói chuyện qua contract trung tính.

**Hướng phụ thuộc:** mỗi lớp **chỉ được biết lớp ngay dưới** — không nhảy cóc, không phụ thuộc ngược. Danh tính "cứng dần" khi đi lên; chi tiết dễ bay (session, slot, token) bị chặn ở lớp dưới, không leo lên lõi.

```
L5 CRM/CDP  →  L4 Core (Conversation/Message)  →  L3 Chuẩn hoá (Driver.parse)  →  L2 Danh tính tài khoản  →  L1 Transport
   (chỉ thấy hộp thư + nội dung)      (chỉ thấy contract + account_id)         (chỉ thấy 1 kênh)         (chỉ thấy slot/session)
```

```php
// ❌ Sai — lõi biết Zalo, biết session slot
class ConversationService {
    public function reply(Conversation $c) {
        $slot = ZaloConnection::where('connection_id', $c->zalo_connection_id)->first(); // core coupling!
        Http::post($slot->bridge_url, ...);                                              // Zalo-specific in core!
    }
}

// ✅ Đúng — lõi gọi contract; driver tự resolve chi tiết kênh
class ConversationService {
    public function reply(Conversation $c, array $payload) {
        app('channels')->driver($c->channel)->sendMessage($c, $payload); // core mù kênh/mù session
    }
}
// Driver (module Zalo) tự map channel_account → slot đang connected. Thêm Messenger = thêm driver, KHÔNG sửa lõi.
```

**Ranh giới bắt buộc:**
- **Lõi (Models core, InboundMessageService, ConversationService, controllers inbox)** KHÔNG được import class/khái niệm của một kênh cụ thể (không `ZaloConnection`, không `connection_id`, không cookie/token).
- Cột đặc thù kênh KHÔNG nằm trong bảng core → dùng khoá trung tính (`channel_account_id`), chi tiết ở bảng module.
- Thêm một kênh mới **chỉ** = thêm một driver (L1–L3) + đăng ký `Manager::extend()`; **không** chạm L4/L5.
- Không `if ($channel === 'zalo') {...}` trong lõi. Rẽ nhánh theo kênh = mùi coupling → đẩy xuống driver.

**Reason:** Clean, maintainable, scalable. Lõi ổn định khi kênh thay đổi; một behavior đổi chỉ sửa một chỗ (DRY); người mới đọc theo lớp là hiểu. Viết như một senior: đặt logic đúng lớp, không tiện tay nhét vào lõi. Xem [Channel-Account Architecture](features/messaging/channel-account-architecture.md) làm ví dụ tham chiếu; củng cố Rule 2–3 (Driver Pattern) và Rule 11 (per-channel).

---

## Summary Table

| Pattern | Location | Reason |
|---------|----------|--------|
| Models flat in `app/Models/` | All Eloquent models | Simplifies discovery, matches Laravel |
| Driver interface in `Integration/Contracts/` | External integrations | Clear abstraction point |
| Drivers registered via `Manager::extend()` | `IntegrationServiceProvider` | Pluggable, testable |
| `MeteringService` concrete, not interface | `app/Services/` | Quota logic is critical; no ambiguity |
| Restore queries use `->withTrashed()` | Any restore route | Soft-deleted are hidden by default |
| Cross-namespace shims use `class_alias()` | Bootstrap or compatibility layer | Morph alias registry safety |
| Attachment authz checks parent | `AttachmentController` | Attachment is detail of parent |
| Queue jobs set workspace scope | Job `handle()` | RLS requires context to deny safely |
| Webhook upserts catch `QueryException 23505` | Webhook handlers | Idempotency under concurrency |
| Conversation unique per-channel | Schema | Avoid forced merges until Phase-08 CDP dedup |
| Use `saveQuietly()` for non-audit writes | Model updates | Prevent audit log pollution |
| Form requests enforce authorization | `FormRequest::authorize()` | Spatie pattern; prevents auth bypass |
| Meaningful variable names | All code | Readability, prevent misuse |
| RLS tested per table | Test suite | Verify isolation is configured |
| **Layered arch; core channel-agnostic; upper knows only lower** | **Toàn codebase** | **Không hardcode logic 1 kênh vào lõi; thêm kênh = thêm driver, không sửa lõi** |

---

## References

- [System Architecture](system-architecture.md) § Integration Driver Pattern, RLS.
- [CRM Authorization Model](crm-authorization-model.md) § Access control.
- [Feature: Zalo Personal Connect](features/integration/zalo-personal-connect.md) § Driver example.
- [Phase 4 Bug Sweep Report](plans/260628-traditional-laravel-refactor/reports/bug-sweep-findings.md) § Finding origins.
