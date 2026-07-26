<?php

use App\Contracts\SendException;
use App\Models\ChannelUsage;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspacePurchase;
use App\Modules\Chat\Delivery\DeliveryPipeline;
use App\Modules\Chat\Delivery\OutboundMessage;
use App\Modules\Chat\Intake\DuplicateResolver;
use App\Modules\Chat\Intake\IntakeService;
use App\Modules\Chat\Port\ChannelRegistry;
use App\Modules\Chat\Status\MessageStatusService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\Support\MockChannelDriverA;
use Tests\Support\MockChannelDriverB;

/**
 * P11 — GOAL #4: khung omnichannel ĐÓNG BĂNG. Bộ test này chạy với 2 mock driver
 * policy TRÁI NGƯỢC, sống trong tests/Support/ — đăng ký kênh mới = 0 dòng sửa core.
 *
 * Money-path THẬT (BLK-4): mọi send đi DeliveryPipeline → quota gate per-channel
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
    $driver = app(ChannelRegistry::class)->driver($channel);
    $normalized = $driver->parseInbound([
        'channel_account_id' => $accountId,
        'peer_uid' => $peerUid,
        'source_id' => $sourceId,
        'body' => 'tin từ '.$peerUid,
        'direction' => $direction,
        'platform_sent_at' => now()->toDateTimeString(),
    ]);

    return app(IntakeService::class)->ingest($normalized);
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

/** @return array{0: ChannelRegistry, 1: MockChannelDriverA|MockChannelDriverB} */
function fwRegisterMock(string $key): array
{
    $manager = app(ChannelRegistry::class);
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
    [$workspace, $user] = fwSetup();
    fwGrantQuota($workspace, 'mock_a', 10);
    [, $driver] = fwRegisterMock('mock_a');

    $inbound = fwIngest('mock_a', (string) Str::uuid(), 'peer_meter', 'ma_in_1');
    $conversation = $inbound->conversation;

    $message = app(DeliveryPipeline::class)->send(
        $driver,
        $conversation,
        OutboundMessage::text('trả lời khách'),
    );

    expect($message->direction)->toBe('out');

    $usage = ChannelUsage::where('channel', 'mock_a')->sole();
    expect((int) $usage->answered_count)->toBe(1)
        ->and(ChannelUsage::where('channel', 'zalo_personal')->count())->toBe(0);
});

it('hết hạn mức KHÔNG chặn gửi — chỉ thống kê (quyết định founder 25/07)', function () {
    [$workspace] = fwSetup();
    fwGrantQuota($workspace, 'mock_a', 1);
    [, $driver] = fwRegisterMock('mock_a');
    $pipeline = app(DeliveryPipeline::class);

    // Conv 1 dùng hết hạn mức danh nghĩa (limit 1)
    $conv1 = fwIngest('mock_a', (string) Str::uuid(), 'peer_q1', 'q1_in')->conversation;
    $pipeline->send($driver, $conv1, OutboundMessage::text('reply 1'));

    // Conv 2 MỚI, đã vượt hạn mức → VẪN gửi được, và vẫn được đếm.
    $conv2 = fwIngest('mock_a', (string) Str::uuid(), 'peer_q2', 'q2_in')->conversation;
    $message = $pipeline->send($driver, $conv2, OutboundMessage::text('reply 2'));

    expect($message->direction)->toBe('out')
        ->and(count($driver->sentPayloads))->toBe(2)
        ->and((int) ChannelUsage::where('channel', 'mock_a')->sole()->answered_count)->toBe(2);
});

it('LUÔN nhận inbound kể cả hết quota (F13/F20 — lead capture bất khả xâm phạm)', function () {
    [$workspace, $user] = fwSetup();
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
    $stateService = new MessageStatusService(new DuplicateResolver);

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
    [$workspace, $user] = fwSetup();
    fwGrantQuota($workspace, 'mock_a', 10);
    fwGrantQuota($workspace, 'mock_b', 10);
    [, $driverA] = fwRegisterMock('mock_a');
    [, $driverB] = fwRegisterMock('mock_b');
    $pipeline = app(DeliveryPipeline::class);
    $longText = str_repeat('x', 150);

    $convA = fwIngest('mock_a', (string) Str::uuid(), 'peer_pa', 'pa_in')->conversation;
    $convB = fwIngest('mock_b', (string) Str::uuid(), 'peer_pb', 'pb_in')->conversation;

    expect($pipeline->send($driverA, $convA, OutboundMessage::text($longText))->direction)->toBe('out');
    expect(fn () => $pipeline->send($driverB, $convB, OutboundMessage::text($longText)))
        ->toThrow(SendException::class);

    // Review MED-5: transport FAIL → KHÔNG meter (meterReply chỉ sau thành công) — khoá bằng test
    expect(ChannelUsage::where('channel', 'mock_b')->count())->toBe(0);
});

// ── Grep gate: core KHÔNG rẽ nhánh theo kênh ─────────────────────────────────

it('grep gate: 0 chỗ rẽ nhánh theo kênh trong core allowlist (flags là data, không phải branch)', function () {
    // Review MED-3: file list KHỚP allowlist doc channel-framework-contract.md
    //
    // Mỗi mẫu phải khớp ÍT NHẤT một file: `glob()` trả [] cho thư mục không tồn
    // tại, nên một đợt di dời quét qua sẽ làm gate này xanh rỗng thay vì đỏ.
    $patterns = [
        'app/Modules/Chat/Broadcast/*.php',
        'app/Modules/Chat/Delivery/*.php',
        'app/Modules/Chat/Intake/*.php',
        'app/Modules/Chat/Port/*.php',
        'app/Modules/Chat/Port/Capability/*.php',
        'app/Modules/Chat/Status/*.php',
        'app/Modules/Chat/Store/*.php',
        'app/Modules/Chat/Timeline/*.php',
        'app/Http/Controllers/Inbox/*.php',
        'resources/js/components/inbox/*.ts*',
        'resources/js/pages/inbox/*.tsx',
    ];

    $coreFiles = [];
    foreach ($patterns as $pattern) {
        $matched = glob(base_path($pattern)) ?: [];
        expect($matched)->not->toBeEmpty("Mẫu không khớp file nào (đường dẫn đã đổi?): {$pattern}");
        $coreFiles = array_merge($coreFiles, $matched);
    }

    $violations = [];
    foreach ($coreFiles as $file) {
        $content = (string) file_get_contents($file);
        if (preg_match('/if\s*\(\s*\$?[\w>-]*channel[\w>-]*\s*[!=]==?\s*[\'"]/i', $content)   // if (channel ===/!== '...')
            || preg_match('/(switch|match)\s*\(\s*\$?[\w>-]*channel/i', $content)              // switch/match theo channel
            || preg_match('/\?\?\s*[\'"]zalo_/i', $content)                                    // fallback CHANNEL KEY im lặng (MED-1) — 'Zalo' label hiển thị thì hợp lệ
            || preg_match('/channel[\w>-]*\s*[!=]==?\s*[\'"]zalo/i', $content)) {              // so sánh trực tiếp tên kênh
            $violations[] = basename($file);
        }
    }

    expect($violations)->toBe([]);
});
