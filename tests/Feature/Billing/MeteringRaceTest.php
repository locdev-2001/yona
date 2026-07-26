<?php

use App\Models\ChannelUsage;
use App\Models\Conversation;
use App\Models\MarketplaceItem;
use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspacePurchase;
use App\Models\WorkspaceSequence;
use App\Services\EntitlementService;
use App\Services\MeteringService;

/**
 * MeteringRaceTest — F1 race-safe metering (thống kê).
 *
 * Metering là THỐNG KÊ thuần — không có gate, không chặn ai (quyết định founder
 * 25/07/2026). Test các invariant còn lại:
 *   F1: gọi meterReply 2 lần cùng kỳ → answered_count === 1 (compare-set chặn double).
 *   F1: hai kỳ khác nhau → đếm riêng.
 *   EntitlementResolver: đọc limit/remaining cho mục đích HIỂN THỊ số liệu.
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
        'sender_uid' => 'zalo_race_001',
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
        'sender_uid' => 'zalo_period_002',
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

// ── EntitlementResolver: workspace free defaults ──────────────────────────────

it('EntitlementResolver: workspace without purchase uses free defaults (remaining 50)', function () {
    $workspace = Workspace::factory()->create();
    actingInWorkspace($workspace);

    $resolver = app(EntitlementService::class);
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

    $resolver = app(EntitlementService::class);
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
        'sender_uid' => 'zalo_atomic_f9_'.uniqid(),
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
