<?php

use App\Contracts\SendException;
use App\Exceptions\QuotaExceededException;
use App\Models\ChannelUsage;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspacePurchase;
use App\Modules\Integration\ChannelManager;
use App\Services\InboundMessageService;
use App\Services\Inbox\MessageSourceResolver;
use App\Services\Inbox\MessageStateService;
use App\Services\Inbox\OutboundSendPipeline;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\Support\MockChannelDriverA;
use Tests\Support\MockChannelDriverB;

/**
 * P11 — GOAL #4: khung omnichannel ĐÓNG BĂNG. Bộ test này chạy với 2 mock driver
 * policy TRÁI NGƯỢC, sống trong tests/Support/ — đăng ký kênh mới = 0 dòng sửa core.
 *
 * Money-path THẬT (BLK-4): mọi send đi OutboundSendPipeline → quota gate per-channel
 * TRƯỚC transport + meterReply SAU. Contract test chạm metering thật, không mock.
 *
 * Allowlist "core" (đóng băng): docs/features/messaging/channel-framework-contract.md
 */

// ── Helpers ──────────────────────────────────────────────────────────────────

function fwSetup(): array
{
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    return [$workspace, $user];
}

function fwIngest(string $channel, string $accountId, string $peerUid, string $sourceId, string $direction = 'in'): Message
{
    $driver = app(ChannelManager::class)->driver($channel);
    $normalized = $driver->parseInbound([
        'channel_account_id' => $accountId,
        'peer_uid' => $peerUid,
        'source_id' => $sourceId,
        'body' => 'tin từ '.$peerUid,
        'direction' => $direction,
        'platform_sent_at' => now()->toDateTimeString(),
    ]);

    return app(InboundMessageService::class)->ingest($normalized);
}

function fwGrantQuota(Workspace $workspace, string $channel, int $limit): void
{
    // marketplace_items = bảng admin-plane (app role không có INSERT — đúng thiết kế)
    // → fixture qua privileged, committed; row idempotent theo code, để lại được.
    $priv = DB::connection('pgsql_privileged');
    $code = "plan.test.{$channel}.{$limit}";
    $itemId = $priv->table('marketplace_items')->where('code', $code)->value('id');
    if ($itemId === null) {
        $itemId = (string) Str::uuid();
        $priv->table('marketplace_items')->insert([
            'id' => $itemId,
            'code' => $code,
            'name' => 'Test '.$channel,
            'type' => 'plan',
            'billing_type' => 'one_off',
            'price_cents' => 0,
            'currency' => 'VND',
            'is_active' => true,
            'entitlements' => json_encode([
                'flags' => ['module.inbox'],
                'quotas' => ['quota.conversations.'.$channel => $limit],
            ]),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    WorkspacePurchase::withoutGlobalScope('workspace')->create([
        'workspace_id' => $workspace->id,
        'item_id' => $itemId,
        'status' => 'active',
        'quantity' => 1,
    ]);
}

/** @return array{0: ChannelManager, 1: MockChannelDriverA|MockChannelDriverB} */
function fwRegisterMock(string $key): array
{
    $manager = app(ChannelManager::class);
    $driver = $key === 'mock_a' ? new MockChannelDriverA : new MockChannelDriverB;
    $manager->extend($key, fn () => $driver);

    return [$manager, $driver];
}

// ── Contract: đăng ký kênh mới = 0 dòng sửa core ─────────────────────────────

it('mock driver đăng ký runtime resolve được + capabilities shape đầy đủ (không sửa file production nào)', function () {
    fwSetup();

    foreach (['mock_a', 'mock_b'] as $key) {
        [$manager] = fwRegisterMock($key);
        $driver = $manager->driver($key);

        expect($driver->channelKey())->toBe($key);
        $caps = $driver->capabilities()->toArray();
        foreach (['canSendMedia', 'canSendSticker', 'canQuoteReply', 'canReact', 'hasSeenReceipts', 'hasTyping', 'receiptGranularity'] as $flag) {
            expect($caps)->toHaveKey($flag);
        }
    }

    // 2 mock policy TRÁI NGƯỢC — khung không assume 1 kiểu kênh
    expect((new MockChannelDriverA)->capabilities()->hasSeenReceipts)->toBeFalse()
        ->and((new MockChannelDriverB)->capabilities()->hasSeenReceipts)->toBeTrue();
});

// ── Ingest account-keyed (core, channel-agnostic) ────────────────────────────

it('ingest account-keyed cho kênh mock: cùng (account, peer) → 1 conversation, khác account → tách', function () {
    fwSetup();
    fwRegisterMock('mock_a');

    $accountX = (string) Str::uuid();
    $accountY = (string) Str::uuid();

    fwIngest('mock_a', $accountX, 'peer_1', 'ma_1');
    fwIngest('mock_a', $accountX, 'peer_1', 'ma_2');
    fwIngest('mock_a', $accountY, 'peer_1', 'ma_3');

    expect(Conversation::where('channel', 'mock_a')->count())->toBe(2)
        ->and(Conversation::where('channel_account_id', $accountX)->sole()->messages()->count())->toBe(2);
});

// ── Money-path: metering per-channel + gate trước transport ──────────────────

it('send qua pipeline: meter PER-CHANNEL (mock_a usage +1, zalo_personal KHÔNG đổi)', function () {
    [$workspace] = fwSetup();
    fwGrantQuota($workspace, 'mock_a', 10);
    [, $driver] = fwRegisterMock('mock_a');

    $inbound = fwIngest('mock_a', (string) Str::uuid(), 'peer_meter', 'ma_in_1');
    $conversation = $inbound->conversation;

    $message = app(OutboundSendPipeline::class)->send($driver, $conversation, ['text' => 'trả lời khách']);

    expect($message->direction)->toBe('out');

    $usage = ChannelUsage::where('channel', 'mock_a')->sole();
    expect((int) $usage->answered_count)->toBe(1)
        ->and(ChannelUsage::where('channel', 'zalo_personal')->count())->toBe(0);
});

it('quota per-channel hết → pipeline chặn TRƯỚC transport (driver KHÔNG được gọi) — DoS #4 bất khả', function () {
    [$workspace] = fwSetup();
    fwGrantQuota($workspace, 'mock_a', 1);
    [, $driver] = fwRegisterMock('mock_a');
    $pipeline = app(OutboundSendPipeline::class);

    // Conv 1: dùng hết quota (limit 1)
    $conv1 = fwIngest('mock_a', (string) Str::uuid(), 'peer_q1', 'q1_in')->conversation;
    $pipeline->send($driver, $conv1, ['text' => 'reply 1']);

    // Conv 1 đã meter kỳ này → vẫn gửi tiếp được (F5 — hội thoại cũ không giới hạn).
    // refresh(): meterReply ghi last_metered_period qua compare-set DB (model in-memory stale).
    $pipeline->send($driver, $conv1->refresh(), ['text' => 'reply 2']);

    // Conv 2 MỚI → hết quota → chặn TRƯỚC khi driver chạm platform
    $conv2 = fwIngest('mock_a', (string) Str::uuid(), 'peer_q2', 'q2_in')->conversation;
    $sentBefore = count($driver->sentPayloads);

    expect(fn () => $pipeline->send($driver, $conv2, ['text' => 'reply 3']))
        ->toThrow(QuotaExceededException::class);

    expect(count($driver->sentPayloads))->toBe($sentBefore)
        ->and((int) ChannelUsage::where('channel', 'mock_a')->sole()->answered_count)->toBe(1);
});

it('LUÔN nhận inbound kể cả hết quota (F13/F20 — lead capture bất khả xâm phạm)', function () {
    [$workspace] = fwSetup();
    fwGrantQuota($workspace, 'mock_a', 0); // hết quota ngay từ đầu
    fwRegisterMock('mock_a');

    $message = fwIngest('mock_a', (string) Str::uuid(), 'peer_free', 'free_in_1');

    expect($message->exists)->toBeTrue()
        ->and($message->conversation->channel)->toBe('mock_a');
});

// ── Message-state channel-agnostic ───────────────────────────────────────────

it('state-events (recall/receipt/reaction) chạy nguyên trên kênh mock — core mù kênh', function () {
    fwSetup();
    fwRegisterMock('mock_b');

    $accountId = (string) Str::uuid();
    $inbound = fwIngest('mock_b', $accountId, 'peer_state', 'mb_state_1');
    $stateService = new MessageStateService(new MessageSourceResolver);

    // Recall
    expect($stateService->applyRecall($accountId, ['target_msg_id' => 'mb_state_1']))->toBe('applied')
        ->and($inbound->fresh()->recalled_at)->not->toBeNull();

    // Receipt trên tin outbound
    [, $driver] = fwRegisterMock('mock_b');
    $out = $driver->sendMessage($inbound->conversation, ['text' => 'ok']);
    $stateService->applyReceipts($accountId, [['target_msg_id' => (string) $out->source_id, 'kind' => 'seen']]);
    expect($out->fresh()->seen_at)->not->toBeNull();

    // Reaction
    $stateService->applyReactions($accountId, [[
        'target_msg_id' => 'mb_state_1', 'reactor_uid' => 'peer_state', 'icon' => '/-heart', 'reacted_at' => now(),
    ]]);
    expect($inbound->reactions()->count())->toBe(1);
});

// ── Policy driver-owned (không phải bộ field chung) ──────────────────────────

it('policy kênh do DRIVER quyết: mock_b chặn tin >100 ký tự, mock_a thì không', function () {
    [$workspace] = fwSetup();
    fwGrantQuota($workspace, 'mock_a', 10);
    fwGrantQuota($workspace, 'mock_b', 10);
    [, $driverA] = fwRegisterMock('mock_a');
    [, $driverB] = fwRegisterMock('mock_b');
    $pipeline = app(OutboundSendPipeline::class);
    $longText = str_repeat('x', 150);

    $convA = fwIngest('mock_a', (string) Str::uuid(), 'peer_pa', 'pa_in')->conversation;
    $convB = fwIngest('mock_b', (string) Str::uuid(), 'peer_pb', 'pb_in')->conversation;

    expect($pipeline->send($driverA, $convA, ['text' => $longText])->direction)->toBe('out');
    expect(fn () => $pipeline->send($driverB, $convB, ['text' => $longText]))
        ->toThrow(SendException::class);
});

// ── Grep gate: core KHÔNG rẽ nhánh theo kênh ─────────────────────────────────

it('grep gate: 0 chỗ if(channel === ...) trong core allowlist (flags là data, không phải branch)', function () {
    $coreFiles = array_merge(
        glob(base_path('app/Services/Inbox/*.php')) ?: [],
        [base_path('app/Services/InboundMessageService.php')],
        glob(base_path('app/Modules/Integration/Contracts/*.php')) ?: [],
        glob(base_path('resources/js/components/inbox/*.ts*')) ?: [],
    );

    $violations = [];
    foreach ($coreFiles as $file) {
        $content = (string) file_get_contents($file);
        if (preg_match('/if\s*\(\s*\$?[\w>-]*channel[\w>-]*\s*===?\s*[\'"]/i', $content)
            || preg_match('/(switch|match)\s*\(\s*\$?[\w>-]*channel/i', $content)) {
            $violations[] = basename($file);
        }
    }

    expect($violations)->toBe([]);
});
