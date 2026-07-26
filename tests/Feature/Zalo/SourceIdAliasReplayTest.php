<?php

use App\Models\Conversation;
use App\Models\Message;
use App\Models\MessageSourceAlias;
use App\Models\User;
use App\Models\Workspace;
use App\Modules\Chat\Intake\IntakeService;
use Illuminate\Support\Str;

/**
 * P06 (MAJOR) — spike #10: một message đã có alias đăng ký sẵn (P02e backfill —
 * mọi message legacy được mirror source_id vào message_source_aliases) — khi
 * inbound đến mang đúng giá trị đã alias (KHÔNG khớp messages.source_id hiện tại,
 * vd sau P02(d) merge conversation giữ lại source_id của bên kia), ingest phải
 * khớp qua alias, KHÔNG tạo message trùng, và KHÔNG ghi đè source_id gốc (bất biến).
 *
 * @group zalo-source-id
 */
it('spike #10: inbound whose source_id only matches an alias (not messages.source_id) dedupes via the alias, no duplicate', function () {
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($ws, $user);

    $channelAccountId = (string) Str::uuid();
    $conversation = Conversation::create([
        'channel' => 'zalo_personal',
        'channel_account_id' => $channelAccountId,
        'peer_uid' => 'peer_replay_1',
        'thread_type' => 0,
        'conversation_number' => 1,
    ]);

    // Message hiện tại — source_id CANONICAL, bất biến, không đổi qua replay.
    $existingMessage = Message::create([
        'conversation_id' => $conversation->id,
        'source_id' => 'zps-derived:canonical-value',
        'direction' => 'in',
        'type' => 'text',
        'body' => 'tin cũ',
        'platform_sent_at' => now()->subDay(),
    ]);

    // Alias: message này CŨNG được biết tới qua 1 giá trị source_id khác (vd từ P02e
    // backfill mirror, hoặc P02(d) merge giữ alias của conversation nguồn).
    MessageSourceAlias::create([
        'conversation_id' => $conversation->id,
        'message_id' => $existingMessage->id,
        'source_id' => 'zps-cli:zalo_personal:uid_account:peer_replay_1:cli-msg-999',
        'kind' => 'legacy',
    ]);

    // Inbound mang đúng giá trị đã alias — KHÔNG khớp messages.source_id trực tiếp.
    $payload = [
        'channel' => 'zalo_personal',
        'channel_account_id' => $channelAccountId,
        'peer_uid' => 'peer_replay_1',
        'thread_type' => 0,
        'direction' => 'in',
        'type' => 'text',
        'body' => 'tin cũ',
        'source_id' => 'zps-cli:zalo_personal:uid_account:peer_replay_1:cli-msg-999',
        'platform_sent_at' => now()->subDay()->toDateTimeString(),
    ];

    $replayed = app(IntakeService::class)->ingest($payload);

    // KHÔNG tạo message mới — trả về đúng row hiện có, tìm qua alias.
    expect($replayed->id)->toBe($existingMessage->id);
    expect(Message::where('conversation_id', $conversation->id)->count())->toBe(1);

    // source_id gốc bất biến — không bị ghi đè bởi giá trị vừa khớp qua alias.
    expect($existingMessage->fresh()->source_id)->toBe('zps-derived:canonical-value');
})->group('zalo-source-id');

it('a source_id matching neither messages nor aliases still creates a new message (no false negative)', function () {
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($ws, $user);

    $channelAccountId = (string) Str::uuid();
    $conversation = Conversation::create([
        'channel' => 'zalo_personal',
        'channel_account_id' => $channelAccountId,
        'peer_uid' => 'peer_replay_2',
        'thread_type' => 0,
        'conversation_number' => 2,
    ]);

    Message::create([
        'conversation_id' => $conversation->id,
        'source_id' => 'zps-derived:unrelated',
        'direction' => 'in',
        'type' => 'text',
        'body' => 'tin khác',
        'platform_sent_at' => now()->subDay(),
    ]);

    $payload = [
        'channel' => 'zalo_personal',
        'channel_account_id' => $channelAccountId,
        'peer_uid' => 'peer_replay_2',
        'thread_type' => 0,
        'direction' => 'in',
        'type' => 'text',
        'body' => 'tin mới hoàn toàn',
        'source_id' => 'zps-cli:zalo_personal:uid_account:peer_replay_2:cli-msg-brand-new',
        'platform_sent_at' => now()->toDateTimeString(),
    ];

    app(IntakeService::class)->ingest($payload);

    expect(Message::where('conversation_id', $conversation->id)->count())->toBe(2);
})->group('zalo-source-id');

it('spike #13: alias coverage — every message with a source_id has a matching alias after backfill-style insert', function () {
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($ws, $user);

    $conversation = Conversation::create([
        'channel' => 'zalo_personal',
        'peer_uid' => 'peer_coverage',
        'thread_type' => 0,
        'conversation_number' => 3,
    ]);

    $withSource = Message::create([
        'conversation_id' => $conversation->id,
        'source_id' => 'zps-derived:has-source',
        'direction' => 'in',
        'type' => 'text',
        'body' => 'a',
        'platform_sent_at' => now(),
    ]);

    Message::create([
        'conversation_id' => $conversation->id,
        'source_id' => null,
        'direction' => 'in',
        'type' => 'text',
        'body' => 'b',
        'platform_sent_at' => now(),
    ]);

    MessageSourceAlias::create([
        'conversation_id' => $conversation->id,
        'message_id' => $withSource->id,
        'source_id' => $withSource->source_id,
        'kind' => 'legacy',
    ]);

    $uncovered = Message::whereNotNull('source_id')
        ->where('conversation_id', $conversation->id)
        ->get()
        ->filter(fn ($m) => MessageSourceAlias::messageIdFor($m->conversation_id, $m->source_id) === null);

    expect($uncovered)->toHaveCount(0);
})->group('zalo-source-id');
