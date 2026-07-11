<?php

use App\Events\MessageReceived;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use App\Models\Workspace;
use App\Services\InboundMessageService;
use App\Services\Inbox\MessagePublisher;
use App\Services\Inbox\MessageSourceResolver;
use App\Services\Inbox\MessageStateService;
use App\Services\Inbox\SessionGapMaterializer;
use App\Services\MeteringService;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Str;
use Mockery\MockInterface;

// ── Helper ────────────────────────────────────────────────────────────────────

function makeService(?MeteringService $meter = null): InboundMessageService
{
    return new InboundMessageService(
        $meter ?? app(MeteringService::class),
        app(SessionGapMaterializer::class),
        app(MessageSourceResolver::class),
        app(MessageStateService::class),
        app(MessagePublisher::class),
    );
}

function basePayload(string $peerUid = 'peer_001', ?string $channelAccountId = null): array
{
    // channel_account_id là uuid, không FK ràng buộc (xem migration 100002) — test không
    // cần channel_accounts row thật, chỉ cần cùng giá trị để mô phỏng "cùng account".
    $channelAccountId ??= (string) Str::uuid();

    return [
        'channel_account_id' => $channelAccountId,
        'channel' => 'zalo_personal',
        'peer_uid' => $peerUid,
        'thread_type' => 0,
        'peer_name' => 'Nguyễn Test',
        'direction' => 'in',
        'type' => 'text',
        'body' => 'Xin chào!',
        'source_id' => 'zalo_msg_'.uniqid(),
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
        $m->shouldReceive('meterReply')->andThrow(new RuntimeException('Billing dead'));
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

    $channelAccountId = (string) Str::uuid();
    $sourceId = 'zalo_dup_msg_001';

    $payload = basePayload('peer_idem', $channelAccountId);
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

it('replay upgrade: tin cũ type=text nhãn placeholder + replay mang type giàu hơn → nâng cấp type + media_meta', function () {
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($ws, $user);

    $channelAccountId = (string) Str::uuid();
    $sourceId = 'zalo_bankcard_upgrade_001';

    // Lần 1: bridge cũ chưa nhận ra bankcard → ghi text + nhãn, media_meta rỗng
    $legacy = basePayload('peer_upgrade', $channelAccountId);
    $legacy['source_id'] = $sourceId;
    $legacy['body'] = '[Tài khoản ngân hàng]';

    $service = makeService();
    $msg1 = $service->ingest($legacy);
    expect($msg1->type)->toBe('text');
    expect($msg1->media_meta)->toBe([]);

    // Lần 2 (deep sync replay): bridge mới resolve đủ thẻ → nâng cấp tại chỗ
    $bankCard = [
        'bank_name' => 'Ngân hàng Liobank by OCB',
        'bank_bin' => '963369',
        'account_number' => '012345678916',
        'account_holder' => 'Phước Lộc',
        'logo_url' => 'https://res-zalo.zadn.vn/logo.png',
        'qr_url' => 'https://group-qr.zdn.vn/qr.png',
    ];
    $replay = $legacy;
    $replay['type'] = 'bank_card';
    $replay['media_meta'] = ['bank_card' => $bankCard];

    $msg2 = $service->ingest($replay);

    expect($msg2->id)->toBe($msg1->id); // vẫn idempotent — không tạo row mới
    expect($msg2->type)->toBe('bank_card');
    // toEqual (==): jsonb PostgreSQL không giữ thứ tự key
    expect($msg2->media_meta['bank_card'])->toEqual($bankCard);
    expect($msg2->direction)->toBe('in'); // identity column không đổi (C-1)
});

it('replay upgrade: KHÔNG hạ cấp type khác về text và không đè media_meta đã có', function () {
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($ws, $user);

    $channelAccountId = (string) Str::uuid();
    $sourceId = 'zalo_no_downgrade_001';

    $rich = basePayload('peer_no_downgrade', $channelAccountId);
    $rich['source_id'] = $sourceId;
    $rich['type'] = 'sticker';
    $rich['media_meta'] = ['sticker' => ['url' => 'https://zalo.example/sticker.png']];

    $service = makeService();
    $msg1 = $service->ingest($rich);

    $replayAsText = basePayload('peer_no_downgrade', $channelAccountId);
    $replayAsText['source_id'] = $sourceId;
    $replayAsText['type'] = 'text';
    $replayAsText['body'] = '[Sticker]';

    $msg2 = $service->ingest($replayAsText);

    expect($msg2->id)->toBe($msg1->id);
    expect($msg2->type)->toBe('sticker'); // giữ nguyên, không downgrade
    expect($msg2->media_meta['sticker']['url'])->toBe('https://zalo.example/sticker.png');
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
    expect($channel)->toBeInstanceOf(PrivateChannel::class)
        ->and($channel->name)->toBe("private-workspace.{$message->workspace_id}.conversations");
});

// ── Conversation upsert: 2 ingest cùng peer → 1 Conversation ────────────────

it('ingest 2 tin từ cùng peer → 1 Conversation + 2 Message', function () {
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($ws, $user);

    $channelAccountId = (string) Str::uuid();
    $service = makeService();

    $p1 = basePayload('peer_dup', $channelAccountId);
    $p1['source_id'] = 'msg_a_001';
    $service->ingest($p1);

    $p2 = basePayload('peer_dup', $channelAccountId);
    $p2['source_id'] = 'msg_a_002';
    $service->ingest($p2);

    $convCount = Conversation::withTrashed()
        ->where('channel_account_id', $channelAccountId)
        ->where('peer_uid', 'peer_dup')
        ->count();

    expect($convCount)->toBe(1);

    $conv = Conversation::withTrashed()
        ->where('channel_account_id', $channelAccountId)
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

// ── Race: 2 webhook đồng thời cùng (channel_account_id, peer_uid) ────────────
//
// Trước fix: read-check-write không atomic → cả 2 miss first() → cả 2 INSERT →
// request thứ 2 hit conversations_channel_account_peer_unique → QueryException 23505 →
// caught upstream + 200 OK → message bị drop âm thầm (silent data loss).
//
// Mô phỏng race deterministic: một conversation conflicting ĐÃ tồn tại; subclass
// ép findConversation() lần ĐẦU trả null (cửa sổ race: request kia vừa INSERT mà
// request này chưa thấy) → service đi vào nhánh INSERT → đụng unique 23505 → catch
// → re-fetch THẬT (delegate parent) tìm thấy row → trả về existing, không duplicate.
it('upsertConversation: INSERT đụng unique (23505) → re-fetch existing, không throw, không duplicate', function () {
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($ws, $user);

    $channelAccountId = (string) Str::uuid();
    $peerUid = 'peer_race_001';

    // Conversation conflicting đã tồn tại (request "kia" tạo trước, trong cùng workspace).
    $existing = Conversation::create([
        'channel' => 'zalo_personal',
        'channel_account_id' => $channelAccountId,
        'peer_uid' => $peerUid,
        'thread_type' => 0,
        'conversation_number' => 999,
    ]);

    // Subclass: findConversation() lần đầu trả null (cửa sổ race), lần sau gọi thật.
    $racingService = new class(app(MeteringService::class), app(SessionGapMaterializer::class), app(MessageSourceResolver::class), app(MessageStateService::class), app(MessagePublisher::class)) extends InboundMessageService
    {
        private bool $firstLookup = true;

        protected function findConversation(?string $channelAccountId, string $peerUid): ?Conversation
        {
            if ($this->firstLookup) {
                $this->firstLookup = false;

                return null; // ép đi vào nhánh INSERT → đụng 23505
            }

            return parent::findConversation($channelAccountId, $peerUid); // re-fetch thật trong catch
        }
    };

    $payload = basePayload($peerUid, $channelAccountId);
    $payload['peer_name'] = 'Khách Race';
    $payload['source_id'] = 'msg_race_001';

    // Không được throw — catch 23505 → re-fetch
    $message = $racingService->ingest($payload);

    // Message gắn vào conversation đã tồn tại (re-fetched), KHÔNG tạo conversation mới
    expect($message->conversation_id)->toBe($existing->id);

    $convCount = Conversation::withTrashed()
        ->where('channel_account_id', $channelAccountId)
        ->where('peer_uid', $peerUid)
        ->count();

    expect($convCount)->toBe(1); // không duplicate

    // peer-info update của existing-row path được áp dụng sau re-fetch
    expect($existing->fresh()->peer_name)->toBe('Khách Race');
});

// ── Participants: hồ sơ thành viên nhóm per-sender (avatar/tên) ───────────────

it('participants: tin nhóm có sender profile → upsert vào conversations.participants', function () {
    Event::fake([MessageReceived::class]);

    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($ws, $user);

    $payload = basePayload('group_001');
    $payload['thread_type'] = 1;
    $payload['sender_uid'] = 'uid_a';
    $payload['sender_name'] = 'Phước Lộc';
    $payload['sender_avatar'] = 'https://s120.avatar.zalo.me/a.jpg';

    $message = makeService()->ingest($payload);
    $conv = Conversation::find($message->conversation_id);

    expect($conv->participants)->toBe([
        'uid_a' => ['name' => 'Phước Lộc', 'avatar' => 'https://s120.avatar.zalo.me/a.jpg'],
    ]);

    // Người gửi thứ hai → append entry, không ghi đè entry cũ
    $payload2 = basePayload('group_001', $payload['channel_account_id']);
    $payload2['thread_type'] = 1;
    $payload2['sender_uid'] = 'uid_b';
    $payload2['sender_name'] = 'Beru';
    $payload2['sender_avatar'] = 'https://s120.avatar.zalo.me/b.jpg';

    makeService()->ingest($payload2);

    expect($conv->fresh()->participants)->toBe([
        'uid_a' => ['name' => 'Phước Lộc', 'avatar' => 'https://s120.avatar.zalo.me/a.jpg'],
        'uid_b' => ['name' => 'Beru', 'avatar' => 'https://s120.avatar.zalo.me/b.jpg'],
    ]);
});

it('participants: tin backfill thiếu avatar KHÔNG xoá avatar đã có; tin không sender là no-op', function () {
    Event::fake([MessageReceived::class]);

    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($ws, $user);

    $payload = basePayload('group_002');
    $payload['thread_type'] = 1;
    $payload['sender_uid'] = 'uid_a';
    $payload['sender_name'] = 'Phước Lộc';
    $payload['sender_avatar'] = 'https://s120.avatar.zalo.me/a.jpg';

    $message = makeService()->ingest($payload);
    $conv = Conversation::find($message->conversation_id);

    // Backfill: chỉ có sender_uid + name, không avatar → giữ avatar cũ
    $backfill = basePayload('group_002', $payload['channel_account_id']);
    $backfill['thread_type'] = 1;
    $backfill['sender_uid'] = 'uid_a';
    $backfill['sender_name'] = 'Phước Lộc';

    makeService()->ingest($backfill);

    expect($conv->fresh()->participants['uid_a'])
        ->toBe(['name' => 'Phước Lộc', 'avatar' => 'https://s120.avatar.zalo.me/a.jpg']);

    // Tin 1-1 không sender_uid → participants không đổi
    $direct = basePayload('peer_solo', $payload['channel_account_id']);
    $directMessage = makeService()->ingest($direct);

    expect(Conversation::find($directMessage->conversation_id)->participants)->toBeNull();
});

it('participants: MessageReceived broadcast kèm sender_participant của người gửi', function () {
    Event::fake([MessageReceived::class]);

    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($ws, $user);

    $payload = basePayload('group_003');
    $payload['thread_type'] = 1;
    $payload['sender_uid'] = 'uid_a';
    $payload['sender_name'] = 'Phước Lộc';
    $payload['sender_avatar'] = 'https://s120.avatar.zalo.me/a.jpg';

    makeService()->ingest($payload);

    Event::assertDispatched(MessageReceived::class, function (MessageReceived $event) {
        return $event->broadcastPayload['sender_participant'] === [
            'name' => 'Phước Lộc',
            'avatar' => 'https://s120.avatar.zalo.me/a.jpg',
        ];
    });
});
