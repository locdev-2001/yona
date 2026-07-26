<?php

use App\Models\ChannelAccount;
use App\Models\Conversation;
use App\Models\User;
use App\Models\Workspace;
use App\Modules\Chat\Intake\IntakeService;

/**
 * P05 — GapMarkerService: dấu ngăn 'session_gap' chèn khi hội thoại
 * nhận tin post-gap ĐẦU TIÊN (platform_sent_at > channel_accounts.gap_started_at).
 * Idempotent, KHÔNG đụng metering/unread/preview.
 *
 * @group inbox-stream
 */
function makeGapAccount(Workspace $ws, ?string $gapStartedAt): ChannelAccount
{
    return ChannelAccount::create([
        'workspace_id' => $ws->id,
        'channel' => 'zalo_personal',
        'account_uid' => 'uid_gap_'.uniqid(),
        'status' => $gapStartedAt ? 'session_lost' : 'connected',
        'gap_started_at' => $gapStartedAt,
        'gap_open' => $gapStartedAt !== null,
    ]);
}

function gapPayload(string $channelAccountId, string $senderUid, ?string $platformSentAt, ?string $sourceId = null): array
{
    return [
        'channel' => 'zalo_personal',
        'channel_account_id' => $channelAccountId,
        'thread_uid' => $senderUid,
        'thread_type' => 0,
        'peer_name' => 'Peer Gap',
        'direction' => 'in',
        'type' => 'text',
        'body' => 'tin',
        'source_id' => $sourceId ?? 'src_'.uniqid(),
        'platform_sent_at' => $platformSentAt,
    ];
}

it('materializes a session_gap marker for the first post-gap message and increments stream_version', function () {
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($ws, $user);

    $account = makeGapAccount($ws, now()->subMinutes(10)->toDateTimeString());
    $conversation = Conversation::create([
        'channel' => 'zalo_personal',
        'channel_account_id' => $account->id,
        'sender_uid' => 'peer_gap_1',
        'thread_type' => 0,
        'conversation_number' => 1,
    ]);

    $payload = gapPayload($account->id, 'peer_gap_1', now()->toDateTimeString());

    $before = $conversation->fresh()->stream_version;

    $message = app(IntakeService::class)->ingest($payload);

    $events = DB::table('conversation_events')->where('conversation_id', $conversation->id)->get();
    expect($events)->toHaveCount(1);
    expect($events[0]->kind)->toBe('session_gap');

    // Marker phải nằm TRƯỚC message trong thứ tự chèn (id sinh trước) — kiểm qua created_at <= message.created_at
    expect($events[0]->created_at)->toBeLessThanOrEqual((string) $message->created_at);

    // stream_version: +1 cho message +1 cho event
    expect($conversation->fresh()->stream_version)->toBe($before + 2);
})->group('inbox-stream');

it('is idempotent — a second post-gap message does not duplicate the marker', function () {
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($ws, $user);

    $account = makeGapAccount($ws, now()->subMinutes(10)->toDateTimeString());
    $conversation = Conversation::create([
        'channel' => 'zalo_personal',
        'channel_account_id' => $account->id,
        'sender_uid' => 'peer_gap_2',
        'thread_type' => 0,
        'conversation_number' => 2,
    ]);

    $service = app(IntakeService::class);

    $p1 = gapPayload($account->id, 'peer_gap_2', now()->toDateTimeString(), 'src_gap_a');
    $service->ingest($p1);

    $p2 = gapPayload($account->id, 'peer_gap_2', now()->addSecond()->toDateTimeString(), 'src_gap_b');
    $service->ingest($p2);

    expect(DB::table('conversation_events')->where('conversation_id', $conversation->id)->count())->toBe(1);
})->group('inbox-stream');

it('does not create a marker when there is no gap window (gap_started_at null)', function () {
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($ws, $user);

    $account = makeGapAccount($ws, null);
    $conversation = Conversation::create([
        'channel' => 'zalo_personal',
        'channel_account_id' => $account->id,
        'sender_uid' => 'peer_no_gap',
        'thread_type' => 0,
        'conversation_number' => 3,
    ]);

    $payload = gapPayload($account->id, 'peer_no_gap', now()->toDateTimeString());

    app(IntakeService::class)->ingest($payload);

    expect(DB::table('conversation_events')->where('conversation_id', $conversation->id)->count())->toBe(0);
})->group('inbox-stream');

it('does not create a marker for a message BEFORE gap_started_at', function () {
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($ws, $user);

    $gapStartedAt = now();
    $account = makeGapAccount($ws, $gapStartedAt->toDateTimeString());
    $conversation = Conversation::create([
        'channel' => 'zalo_personal',
        'channel_account_id' => $account->id,
        'sender_uid' => 'peer_pre_gap',
        'thread_type' => 0,
        'conversation_number' => 4,
    ]);

    // Tin backfill/replay có platform_sent_at TRƯỚC gap_started_at (vd lịch sử group resync).
    $payload = gapPayload($account->id, 'peer_pre_gap', $gapStartedAt->clone()->subMinute()->toDateTimeString());

    app(IntakeService::class)->ingest($payload);

    expect(DB::table('conversation_events')->where('conversation_id', $conversation->id)->count())->toBe(0);
})->group('inbox-stream');
