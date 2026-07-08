<?php

use App\Models\ChannelUsage;
use App\Models\MarketplaceItem;
use App\Models\Message;
use App\Models\Workspace;
use App\Models\WorkspacePurchase;
use App\Services\EntitlementService;
use App\Support\TenantScope;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * P09 spike/verify gate — bài học "per-sub-step xanh KHÔNG đủ" (integration-seam-end-to-end-verify):
 * MeteringRaceTest.php test MeteringService trực tiếp (gọi thẳng method); ZaloSendServiceTest.php
 * test ZaloSendService::send() (đường outbound). File này đóng nốt seam CÒN LẠI — đường
 * INBOUND thật qua webhook HTTP thật, KHÔNG mock MeteringService — xác nhận luật F13/F20
 * "luôn nhận inbound kể cả hết quota, không bao giờ đếm inbound vào answered_count" đúng
 * xuyên suốt webhook controller → InboundMessageService thật, không chỉ đúng ở tầng unit.
 *
 * @group channel-zalo
 * @group billing
 */
beforeEach(function () {
    TenantScope::forget();
    config(['services.zalo_bridge.webhook_secret' => 'test-webhook-secret-123']);
});

afterEach(function () {
    TenantScope::forget();
});

/**
 * Insert ZaloConnection qua pgsql_privileged (bypass RLS — bản sao cục bộ, tránh phụ
 * thuộc hàm cùng tên khai báo trong WebhookContractTest.php: file đó chỉ nạp khi chạy
 * full suite, chạy riêng file này sẽ "Call to undefined function" nếu dùng chung).
 */
function seamZaloConnection(string $workspaceId, string $personalUid): int
{
    $connId = (int) DB::connection('pgsql_privileged')
        ->selectOne("SELECT nextval('zalo_connection_id_seq') AS id")
        ->id;

    DB::connection('pgsql_privileged')->table('zalo_connections')->insert([
        'workspace_id' => $workspaceId,
        'connection_id' => $connId,
        'personal_uid' => $personalUid,
        'display_name' => 'Test Zalo Seam',
        'state' => 'connected',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    return $connId;
}

function exhaustQuota(Workspace $workspace, int $limit = 50): void
{
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
                'quotas' => ['quota.conversations.zalo_personal' => $limit],
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
        'id' => (string) Str::orderedUuid(),
        'workspace_id' => $workspace->id,
        'channel' => 'zalo_personal',
        'period' => $period,
        'answered_count' => $limit,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    app(EntitlementService::class)->forgetCache($workspace->id);
}

it('seam: 3 inbound webhook messages land in DB and are accepted (200) even with quota fully exhausted, answered_count stays 0', function () {
    $ws = Workspace::factory()->create();
    actingInWorkspace($ws);
    exhaustQuota($ws);

    $connId = seamZaloConnection($ws->id, 'uid_seam_inbound');
    $headers = ['X-Zalo-Personal-Bridge-Secret' => 'test-webhook-secret-123'];

    foreach (range(1, 3) as $i) {
        $this->postJson('/api/integrations/zalo-personal/webhook', [
            'type' => 'inbound',
            'connection_id' => $connId,
            'peer_uid' => 'peer_seam_quota_exhausted',
            'source_id' => "src_seam_inbound_{$i}",
            'is_self' => false,
            'direction' => 'in',
            'user' => ['name' => 'Khách Seam', 'avatar' => null],
            'platform_sent_at' => now()->timestamp * 1000,
            'inbound_kind' => 'text',
            'content' => "tin {$i} lúc hết quota",
        ], $headers)->assertStatus(200);
    }

    TenantScope::bind($ws->id);

    // Cả 3 tin phải được ghi thật — không bị chặn dù workspace hết quota (F13/F20).
    expect(Message::where('source_id', 'like', 'src_seam_inbound_%')->count())->toBe(3);

    // answered_count KHÔNG đổi — inbound không bao giờ đi qua gate meter.
    $period = now('Asia/Ho_Chi_Minh')->format('Y-m');
    $usage = ChannelUsage::withoutGlobalScope('workspace')
        ->where('workspace_id', $ws->id)
        ->where('channel', 'zalo_personal')
        ->where('period', $period)
        ->first();

    expect($usage->answered_count)->toBe(50); // giữ nguyên mức đã exhaust, không +3

    TenantScope::forget();
})->group('channel-zalo', 'billing');

it('seam: inbound direction=out (bridge echo of tenant reply) DOES increment answered_count exactly once per conversation-period', function () {
    $ws = Workspace::factory()->create();
    actingInWorkspace($ws);
    // Quota CÒN (không exhaust) — test riêng nhánh "có đếm" của cùng seam, đối chứng với test trên.
    $connId = seamZaloConnection($ws->id, 'uid_seam_outbound');
    $headers = ['X-Zalo-Personal-Bridge-Secret' => 'test-webhook-secret-123'];

    // Tin đầu: inbound thật từ khách (tạo conversation).
    $this->postJson('/api/integrations/zalo-personal/webhook', [
        'type' => 'inbound',
        'connection_id' => $connId,
        'peer_uid' => 'peer_seam_reply',
        'source_id' => 'src_seam_reply_in',
        'is_self' => false,
        'direction' => 'in',
        'user' => ['name' => 'Khách Seam Reply', 'avatar' => null],
        'platform_sent_at' => now()->timestamp * 1000,
        'inbound_kind' => 'text',
        'content' => 'khách hỏi',
    ], $headers)->assertStatus(200);

    // Bridge echo lại 2 tin tenant TRẢ LỜI (is_self=true → direction=out) cùng peer.
    foreach (['src_seam_reply_out_1', 'src_seam_reply_out_2'] as $sourceId) {
        $this->postJson('/api/integrations/zalo-personal/webhook', [
            'type' => 'inbound',
            'connection_id' => $connId,
            'peer_uid' => 'peer_seam_reply',
            'source_id' => $sourceId,
            'is_self' => true,
            'direction' => 'out',
            'platform_sent_at' => now()->timestamp * 1000,
            'inbound_kind' => 'text',
            'content' => 'shop trả lời',
        ], $headers)->assertStatus(200);
    }

    TenantScope::bind($ws->id);

    $period = now('Asia/Ho_Chi_Minh')->format('Y-m');
    $usage = ChannelUsage::withoutGlobalScope('workspace')
        ->where('workspace_id', $ws->id)
        ->where('channel', 'zalo_personal')
        ->where('period', $period)
        ->first();

    // 2 lần out cùng conversation cùng kỳ → compare-set chỉ đếm 1 (F1), không phải 2.
    expect($usage)->not->toBeNull()
        ->and($usage->answered_count)->toBe(1);

    TenantScope::forget();
})->group('channel-zalo', 'billing');
