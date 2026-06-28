<?php

use App\Events\MessageReceived;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use App\Services\InboundMessageService;
use App\Services\MeteringService;
use Illuminate\Support\Facades\Event;
use Mockery\MockInterface;
use Modules\Tenancy\Models\Workspace;

// ── Helper ────────────────────────────────────────────────────────────────────

function makeService(?MeteringService $meter = null): InboundMessageService
{
    return new InboundMessageService($meter ?? app(MeteringService::class));
}

function basePayload(string $peerUid = 'peer_001', int|string|null $connectionId = null): array
{
    // zalo_connection_id là bigint (global sequence, xem migration 700004)
    $connectionId ??= random_int(1_000_000, 9_999_999);
    return [
        'zalo_connection_id' => (string) $connectionId,
        'channel' => 'zalo_personal',
        'peer_uid' => $peerUid,
        'thread_type' => 0,
        'peer_name' => 'Nguyễn Test',
        'direction' => 'in',
        'type' => 'text',
        'body' => 'Xin chào!',
        'source_id' => 'zalo_msg_' . uniqid(),
        'platform_sent_at' => now()->toDateTimeString(),
    ];
}

// ── F13/F20: Inbound always-accept even when gate throws ─────────────────────

it('F13/F20: ingest ghi Conversation+Message và dispatch MessageReceived kể cả khi gate throw', function () {
    Event::fake([MessageReceived::class]);

    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($ws, $user);

    // Gate throw bất kỳ exception — simulates billing crash
    $throwingGate = mock(MeteringService::class, function (MockInterface $m) {
        $m->shouldReceive('meterReply')->andThrow(new \RuntimeException('Billing dead'));
        $m->shouldReceive('canStartNew')->andReturn(true);
        $m->shouldReceive('canReplyOnExisting')->andReturn(true);
    });

    $payload = basePayload();
    $payload['direction'] = 'out'; // direction=out → trigger meterReply path

    $service = makeService($throwingGate);
    $message = $service->ingest($payload);

    // Conversation và Message đã được ghi
    expect($message)->toBeInstanceOf(Message::class)
        ->and($message->id)->toBeString();

    $conv = Conversation::withTrashed()->where('id', $message->conversation_id)->first();
    expect($conv)->not->toBeNull();

    // MessageReceived được dispatch dù gate throw
    Event::assertDispatched(MessageReceived::class, function ($event) use ($message) {
        return $event->message->id === $message->id;
    });
});

// ── F14 Direction metering ────────────────────────────────────────────────────

it('F1/F14: direction=in → KHÔNG gọi meterReply', function () {
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($ws, $user);

    $gate = mock(MeteringService::class, function (MockInterface $m) {
        $m->shouldNotReceive('meterReply');
        $m->shouldReceive('canStartNew')->andReturn(true)->byDefault();
        $m->shouldReceive('canReplyOnExisting')->andReturn(true)->byDefault();
    });

    $payload = basePayload();
    $payload['direction'] = 'in';

    makeService($gate)->ingest($payload);
});

it('F1/F14: direction=out → gọi meterReply đúng 1 lần', function () {
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($ws, $user);

    $meterCallCount = 0;
    $gate = mock(MeteringService::class, function (MockInterface $m) use (&$meterCallCount) {
        $m->shouldReceive('meterReply')
            ->once()
            ->andReturnUsing(function () use (&$meterCallCount) {
                $meterCallCount++;
            });
        $m->shouldReceive('canStartNew')->andReturn(true)->byDefault();
        $m->shouldReceive('canReplyOnExisting')->andReturn(true)->byDefault();
    });

    $payload = basePayload();
    $payload['direction'] = 'out';

    makeService($gate)->ingest($payload);

    expect($meterCallCount)->toBe(1);
});

it('F14: direction=echo → KHÔNG gọi meterReply', function () {
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($ws, $user);

    $gate = mock(MeteringService::class, function (MockInterface $m) {
        $m->shouldNotReceive('meterReply');
        $m->shouldReceive('canStartNew')->andReturn(true)->byDefault();
        $m->shouldReceive('canReplyOnExisting')->andReturn(true)->byDefault();
    });

    $payload = basePayload();
    $payload['direction'] = 'echo'; // echo không meter

    makeService($gate)->ingest($payload);
});

it('F14: thiếu direction field → default in → KHÔNG gọi meterReply', function () {
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($ws, $user);

    $gate = mock(MeteringService::class, function (MockInterface $m) {
        $m->shouldNotReceive('meterReply');
        $m->shouldReceive('canStartNew')->andReturn(true)->byDefault();
        $m->shouldReceive('canReplyOnExisting')->andReturn(true)->byDefault();
    });

    $payload = basePayload();
    unset($payload['direction']); // thiếu field

    $message = makeService($gate)->ingest($payload);

    expect($message->direction)->toBe('in'); // default 'in'
});

// ── F14 Idempotency: cùng source_id 2 lần → 1 Message ──────────────────────

it('F14: ingest cùng source_id 2 lần → chỉ tạo 1 Message (idempotent)', function () {
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($ws, $user);

    $connectionId = random_int(1_000_000, 9_999_999);
    $sourceId = 'zalo_dup_msg_001';

    $payload = basePayload('peer_idem', $connectionId);
    $payload['source_id'] = $sourceId;

    $service = makeService();

    $msg1 = $service->ingest($payload);
    $msg2 = $service->ingest($payload); // lần 2 cùng source_id

    expect($msg1->id)->toBe($msg2->id); // cùng 1 record

    $count = Message::where('conversation_id', $msg1->conversation_id)
        ->where('source_id', $sourceId)
        ->count();

    expect($count)->toBe(1);
});

// ── Broadcast: MessageReceived broadcastOn private workspace channel ──────────

it('MessageReceived broadcastOn private workspace.{id}.conversations channel', function () {
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($ws, $user);

    $payload = basePayload();
    $message = makeService()->ingest($payload);

    // Đặt thủ công workspace_id để verify channel name (đã set bởi BelongsToWorkspace)
    $event = new MessageReceived($message);

    $channels = $event->broadcastOn();
    expect($channels)->toHaveCount(1);

    $channel = $channels[0];
    expect($channel)->toBeInstanceOf(\Illuminate\Broadcasting\PrivateChannel::class)
        ->and($channel->name)->toBe("private-workspace.{$message->workspace_id}.conversations");
});

// ── Conversation upsert: 2 ingest cùng peer → 1 Conversation ────────────────

it('ingest 2 tin từ cùng peer → 1 Conversation + 2 Message', function () {
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($ws, $user);

    $connectionId = random_int(1_000_000, 9_999_999);
    $service = makeService();

    $p1 = basePayload('peer_dup', $connectionId);
    $p1['source_id'] = 'msg_a_001';
    $service->ingest($p1);

    $p2 = basePayload('peer_dup', $connectionId);
    $p2['source_id'] = 'msg_a_002';
    $service->ingest($p2);

    $convCount = Conversation::withTrashed()
        ->where('zalo_connection_id', $connectionId)
        ->where('peer_uid', 'peer_dup')
        ->count();

    expect($convCount)->toBe(1);

    $conv = Conversation::withTrashed()
        ->where('zalo_connection_id', $connectionId)
        ->where('peer_uid', 'peer_dup')
        ->first();

    $msgCount = Message::where('conversation_id', $conv->id)->count();
    expect($msgCount)->toBe(2);
});

// ── Channel auth callback unit test ──────────────────────────────────────────

it('channel auth: user với membership trả về true', function () {
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    seedMember($ws, $user, 'admin');

    $result = $user->membershipFor($ws->id);
    expect($result)->not->toBeNull();
});

it('channel auth: user không có membership trả về null (denied)', function () {
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    // KHÔNG seedMember

    $result = $user->membershipFor($ws->id);
    expect($result)->toBeNull();
});

it('channel auth: user của workspace khác bị denied', function () {
    $wsA = Workspace::factory()->create();
    $wsB = Workspace::factory()->create();
    $userA = User::factory()->create();
    seedMember($wsA, $userA, 'sales_rep');

    // userA có membership wsA nhưng không có wsB
    expect($userA->membershipFor($wsB->id))->toBeNull();
    expect($userA->membershipFor($wsA->id))->not->toBeNull();
});
