<?php

use App\Exceptions\QuotaExceededException;
use App\Models\Conversation;
use App\Models\User;
use App\Models\WorkspaceSequence;
use App\Services\MeteringService;
use Illuminate\Support\Facades\DB;
use Modules\Billing\Models\ChannelUsage;
use Modules\Billing\Models\MarketplaceItem;
use Modules\Billing\Models\WorkspacePurchase;
use Modules\Billing\Services\EntitlementResolver;
use Modules\Tenancy\Models\Workspace;

/**
 * MeteringRaceTest — F1 race-safe metering + F5 canReplyOnExisting + quota gate.
 *
 * Test các invariant:
 *   F1: gọi meterReply 2 lần cùng kỳ → answered_count === 1 (compare-set chặn double).
 *   F5: conv đã metered kỳ này → canReplyOnExisting = true kể cả remaining = 0.
 *   Quota: conv mới + hết quota → assertCanSend ném QuotaExceededException.
 *   EntitlementResolver: workspace free → remaining = 50; allows theo gói.
 */

// ── F1: meterReply compare-set ────────────────────────────────────────────────

it('F1: meterReply called twice same period → answered_count === 1', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $conv = Conversation::create([
        'workspace_id' => $workspace->id,
        'channel' => 'zalo_personal',
        'peer_uid' => 'zalo_race_001',
        'thread_type' => 0,
        'conversation_number' => WorkspaceSequence::next('conversation', $workspace->id),
    ]);

    $meter = app(MeteringService::class);

    // Gọi 2 lần liên tiếp cùng kỳ (giả lập 2 request concurrent)
    $meter->meterReply($conv);
    $meter->meterReply($conv);

    $period = now('Asia/Ho_Chi_Minh')->format('Y-m');

    $usage = ChannelUsage::withoutGlobalScope('workspace')
        ->where('workspace_id', $workspace->id)
        ->where('channel', 'zalo_personal')
        ->where('period', $period)
        ->first();

    expect($usage)->not->toBeNull()
        ->and($usage->answered_count)->toBe(1); // F1: chỉ đếm 1 lần
});

it('F1: meterReply in different periods → counted separately', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $conv = Conversation::create([
        'workspace_id' => $workspace->id,
        'channel' => 'zalo_personal',
        'peer_uid' => 'zalo_period_002',
        'thread_type' => 0,
        'conversation_number' => WorkspaceSequence::next('conversation', $workspace->id),
    ]);

    $meter = app(MeteringService::class);

    // Giả lập kỳ tháng trước: set last_metered_period thủ công
    $previousPeriod = now('Asia/Ho_Chi_Minh')->subMonth()->format('Y-m');
    $conv->update(['last_metered_period' => $previousPeriod]);

    // Meter kỳ hiện tại (conv đã có kỳ cũ → compare-set thắng)
    $meter->meterReply($conv->fresh());

    $currentPeriod = now('Asia/Ho_Chi_Minh')->format('Y-m');

    // Phải có row channel_usage cho kỳ hiện tại
    $usage = ChannelUsage::withoutGlobalScope('workspace')
        ->where('workspace_id', $workspace->id)
        ->where('channel', 'zalo_personal')
        ->where('period', $currentPeriod)
        ->first();

    expect($usage)->not->toBeNull()
        ->and($usage->answered_count)->toBe(1);
});

// ── F5: canReplyOnExisting khi hết quota ──────────────────────────────────────

it('F5: canReplyOnExisting = true even when remaining = 0 if conv already metered this period', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $period = now('Asia/Ho_Chi_Minh')->format('Y-m');

    $conv = Conversation::create([
        'workspace_id' => $workspace->id,
        'channel' => 'zalo_personal',
        'peer_uid' => 'zalo_f5_003',
        'thread_type' => 0,
        'last_metered_period' => $period, // conv đã metered kỳ này
        'conversation_number' => WorkspaceSequence::next('conversation', $workspace->id),
    ]);

    // Tạo channel_usage = 0 remaining (quota đã hết)
    DB::table('channel_usage')->insert([
        'id' => (string) \Illuminate\Support\Str::orderedUuid(),
        'workspace_id' => $workspace->id,
        'channel' => 'zalo_personal',
        'period' => $period,
        'answered_count' => 999999, // quota vượt mọi giới hạn
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $meter = app(MeteringService::class);

    // F5: conv đã tính kỳ này → canReplyOnExisting phải true kể cả hết quota
    expect($meter->canReplyOnExisting($conv))->toBeTrue();
});

// ── canStartNew: chặn hội thoại MỚI khi hết quota ───────────────────────────

it('canStartNew = false when remaining = 0', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);

    // Seed gói free với quota 50
    $freeItem = MarketplaceItem::where('code', 'plan.free')->first();
    if (! $freeItem) {
        $freeItem = MarketplaceItem::create([
            'code' => 'plan.free',
            'name' => 'Free',
            'type' => 'plan',
            'billing_type' => 'one_off',
            'price_cents' => 0,
            'currency' => 'VND',
            'is_active' => true,
            'entitlements' => [
                'flags' => ['module.inbox'],
                'quotas' => ['quota.conversations.zalo_personal' => 50],
            ],
        ]);
    }

    WorkspacePurchase::withoutGlobalScope('workspace')->create([
        'workspace_id' => $workspace->id,
        'item_id' => $freeItem->id,
        'status' => 'active',
        'quantity' => 1,
    ]);

    // Đã dùng hết 50 hội thoại kỳ này
    $period = now('Asia/Ho_Chi_Minh')->format('Y-m');
    DB::table('channel_usage')->insert([
        'id' => (string) \Illuminate\Support\Str::orderedUuid(),
        'workspace_id' => $workspace->id,
        'channel' => 'zalo_personal',
        'period' => $period,
        'answered_count' => 50,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    // Clear cache để resolver đọc lại
    app(EntitlementResolver::class)->forgetCache($workspace->id);

    $meter = app(MeteringService::class);

    expect($meter->canStartNew('zalo_personal'))->toBeFalse();
});

// ── EntitlementResolver: workspace free defaults ──────────────────────────────

it('EntitlementResolver: workspace without purchase uses free defaults (remaining 50)', function () {
    $workspace = Workspace::factory()->create();
    actingInWorkspace($workspace);

    $resolver = app(EntitlementResolver::class);
    $resolver->forgetCache($workspace->id);

    $remaining = $resolver->remaining($workspace->id, 'quota.conversations.zalo_personal');

    // No purchases, no usage → free defaults = 50; no usage → remaining = 50
    expect($remaining)->toBe(50);
});

it('EntitlementResolver: allows integration.zalo_personal for team plan', function () {
    $workspace = Workspace::factory()->create();
    actingInWorkspace($workspace);

    $teamItem = MarketplaceItem::where('code', 'plan.team')->first();
    if (! $teamItem) {
        $teamItem = MarketplaceItem::create([
            'code' => 'plan.team',
            'name' => 'Team',
            'type' => 'plan',
            'billing_type' => 'one_off',
            'price_cents' => 0,
            'currency' => 'VND',
            'is_active' => true,
            'entitlements' => [
                'flags' => ['module.inbox', 'integration.zalo_personal'],
                'quotas' => ['quota.conversations.zalo_personal' => 1000],
            ],
        ]);
    }

    WorkspacePurchase::withoutGlobalScope('workspace')->create([
        'workspace_id' => $workspace->id,
        'item_id' => $teamItem->id,
        'status' => 'active',
        'quantity' => 1,
    ]);

    $resolver = app(EntitlementResolver::class);
    $resolver->forgetCache($workspace->id);

    expect($resolver->allows($workspace->id, 'integration.zalo_personal'))->toBeTrue()
        ->and($resolver->limit($workspace->id, 'quota.conversations.zalo_personal'))->toBe(1000);
});

// ── F9-audit: meterReply atomic transaction ───────────────────────────────────

it('F9-audit: meterReply 2 lần cùng kỳ → last_metered_period set đúng (transaction wrap)', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $conv = Conversation::create([
        'workspace_id' => $workspace->id,
        'channel' => 'zalo_personal',
        'peer_uid' => 'zalo_atomic_f9_'.uniqid(),
        'thread_type' => 0,
        'conversation_number' => WorkspaceSequence::next('conversation', $workspace->id),
    ]);

    $meter = app(MeteringService::class);
    $period = $meter->currentPeriod();

    $meter->meterReply($conv);
    $meter->meterReply($conv); // idempotent — second call nop

    // last_metered_period phải đúng kỳ hiện tại (không rollback bởi double-call)
    $fresh = Conversation::withoutGlobalScope('workspace')->find($conv->id);
    expect($fresh->last_metered_period)->toBe($period);

    // answered_count phải = 1 (transaction đảm bảo step1+step2 cùng commit hoặc rollback)
    $usage = ChannelUsage::withoutGlobalScope('workspace')
        ->where('workspace_id', $workspace->id)
        ->where('channel', 'zalo_personal')
        ->where('period', $period)
        ->first();
    expect($usage)->not->toBeNull()
        ->and($usage->answered_count)->toBe(1);
});

// ── F1-audit: assertCanSend enforce quota ─────────────────────────────────────

it('F1-audit: MeteringService::assertCanSend throws QuotaExceededException khi quota hết + conv mới', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $freeItem = MarketplaceItem::where('code', 'plan.free')->firstOrCreate(
        ['code' => 'plan.free'],
        [
            'name' => 'Free',
            'type' => 'plan',
            'billing_type' => 'one_off',
            'price_cents' => 0,
            'currency' => 'VND',
            'is_active' => true,
            'entitlements' => [
                'flags' => ['module.inbox'],
                'quotas' => ['quota.conversations.zalo_personal' => 50],
            ],
        ]
    );

    WorkspacePurchase::withoutGlobalScope('workspace')->create([
        'workspace_id' => $workspace->id,
        'item_id' => $freeItem->id,
        'status' => 'active',
        'quantity' => 1,
    ]);

    // Đã dùng hết 50 quota kỳ này
    $period = now('Asia/Ho_Chi_Minh')->format('Y-m');
    DB::table('channel_usage')->insert([
        'id' => (string) \Illuminate\Support\Str::orderedUuid(),
        'workspace_id' => $workspace->id,
        'channel' => 'zalo_personal',
        'period' => $period,
        'answered_count' => 50,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    app(EntitlementResolver::class)->forgetCache($workspace->id);

    // Conv MỚI (chưa metered kỳ này)
    $conv = Conversation::create([
        'workspace_id' => $workspace->id,
        'channel' => 'zalo_personal',
        'peer_uid' => 'zalo_quota_'.uniqid(),
        'thread_type' => 0,
        'conversation_number' => WorkspaceSequence::next('conversation', $workspace->id),
        // last_metered_period = null → conv mới kỳ này
    ]);

    $meter = app(MeteringService::class);

    // assertCanSend phải throw QuotaExceededException
    expect(fn () => $meter->assertCanSend($conv))
        ->toThrow(QuotaExceededException::class);
});

it('F1-audit: MeteringService::assertCanSend KHÔNG throw khi conv đã metered kỳ này (F5)', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $freeItem = MarketplaceItem::where('code', 'plan.free')->firstOrCreate(
        ['code' => 'plan.free'],
        [
            'name' => 'Free',
            'type' => 'plan',
            'billing_type' => 'one_off',
            'price_cents' => 0,
            'currency' => 'VND',
            'is_active' => true,
            'entitlements' => [
                'flags' => ['module.inbox'],
                'quotas' => ['quota.conversations.zalo_personal' => 50],
            ],
        ]
    );

    WorkspacePurchase::withoutGlobalScope('workspace')->create([
        'workspace_id' => $workspace->id,
        'item_id' => $freeItem->id,
        'status' => 'active',
        'quantity' => 1,
    ]);

    $period = now('Asia/Ho_Chi_Minh')->format('Y-m');
    DB::table('channel_usage')->insert([
        'id' => (string) \Illuminate\Support\Str::orderedUuid(),
        'workspace_id' => $workspace->id,
        'channel' => 'zalo_personal',
        'period' => $period,
        'answered_count' => 50, // hết quota
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    app(EntitlementResolver::class)->forgetCache($workspace->id);

    // Conv ĐÃ metered kỳ này (F5)
    $conv = Conversation::create([
        'workspace_id' => $workspace->id,
        'channel' => 'zalo_personal',
        'peer_uid' => 'zalo_f5_metered_'.uniqid(),
        'thread_type' => 0,
        'conversation_number' => WorkspaceSequence::next('conversation', $workspace->id),
        'last_metered_period' => $period, // đã tính kỳ này
    ]);

    $meter = app(MeteringService::class);

    // F5: không throw dù hết quota
    expect(fn () => $meter->assertCanSend($conv))->not->toThrow(QuotaExceededException::class);
});
