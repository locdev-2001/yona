<?php

use App\Events\MessageReceived;
use App\Models\Message;
use App\Models\User;
use App\Models\Workspace;
use App\Modules\Integration\Chat\ZaloPersonal\ZaloChannelDriver;
use App\Services\InboundMessageService;
use App\Services\Inbox\SessionGapMaterializer;
use App\Services\MeteringService;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Str;

/**
 * P01a — platform_meta.zca_message: driver trích 14-field subset từ listener_data,
 * ingest persist vào message mới, echo merge vào row outbound đã tạo (Codex BLK-1).
 */

// ── Helpers ──────────────────────────────────────────────────────────────────

function platformMetaService(): InboundMessageService
{
    return new InboundMessageService(app(MeteringService::class), app(SessionGapMaterializer::class));
}

function sampleListenerData(string $msgId = 'msg_777'): array
{
    return [
        'actionId' => '9999',       // KHÔNG thuộc subset — phải bị loại
        'msgId' => $msgId,
        'cliMsgId' => '1751600000000',
        'uidFrom' => '111222333',
        'idTo' => '0',
        'msgType' => 'webchat',
        'dName' => 'Nguyễn Test',   // KHÔNG thuộc subset
        'ts' => '1751600000123',
        'status' => 1,              // KHÔNG thuộc subset
        'content' => 'xin chào',
        'notify' => '1',            // KHÔNG thuộc subset
        'ttl' => 0,
        'propertyExt' => ['color' => 0, 'size' => 0],
        'st' => 3,
        'at' => 0,
        'cmd' => 501,
        'realMsgId' => $msgId,
    ];
}

function inboundPayloadWithMeta(string $peerUid, string $accountId, string $msgId): array
{
    return [
        'channel_account_id' => $accountId,
        'channel' => 'zalo_personal',
        'peer_uid' => $peerUid,
        'thread_type' => 0,
        'direction' => 'in',
        'type' => 'text',
        'body' => 'xin chào',
        'source_id' => $msgId,
        'platform_sent_at' => now()->toDateTimeString(),
        'platform_meta' => ['zca_message' => sampleListenerData($msgId)],
    ];
}

// ── Driver extraction ────────────────────────────────────────────────────────

it('parseInbound trích đủ 14 field zca_message từ listener_data, loại field thừa', function () {
    $driver = app(ZaloChannelDriver::class);

    $normalized = $driver->parseInbound([
        'peer_uid' => '111222333',
        'thread_id' => '111222333',
        'thread_type' => 0,
        'inbound_kind' => 'text',
        'content' => 'xin chào',
        'source_id' => 'msg_777',
        'direction' => 'in',
        'listener_data' => sampleListenerData(),
    ]);

    $zca = $normalized['platform_meta']['zca_message'];

    // 14 field: 13 từ listener_data + threadId/threadType từ payload
    foreach (['msgId', 'cliMsgId', 'uidFrom', 'idTo', 'msgType', 'ts', 'ttl', 'content', 'propertyExt', 'st', 'at', 'cmd', 'realMsgId', 'threadId', 'threadType'] as $field) {
        expect($zca)->toHaveKey($field);
    }
    expect($zca['msgId'])->toBe('msg_777')
        ->and($zca['cliMsgId'])->toBe('1751600000000')
        ->and($zca['threadId'])->toBe('111222333')
        ->and($zca['threadType'])->toBe(0)
        ->and($zca)->not->toHaveKeys(['actionId', 'dName', 'status', 'notify']);
});

it('parseInbound không có listener_data (backfill/legacy) → platform_meta rỗng', function () {
    $driver = app(ZaloChannelDriver::class);

    $normalized = $driver->parseInbound([
        'peer_uid' => '111222333',
        'inbound_kind' => 'text',
        'content' => 'tin backfill',
        'source_id' => 'msg_old',
    ]);

    expect($normalized['platform_meta'])->toBe([]);
});

// ── Ingest persist ───────────────────────────────────────────────────────────

it('ingest lưu platform_meta vào message mới', function () {
    Event::fake([MessageReceived::class]);
    $ws = Workspace::factory()->create();
    actingInWorkspace($ws, User::factory()->create());

    $message = platformMetaService()->ingest(
        inboundPayloadWithMeta('peer_meta_1', (string) Str::uuid(), 'msg_777')
    );

    expect($message->platform_meta['zca_message']['cliMsgId'])->toBe('1751600000000');
    expect($message->fresh()->platform_meta['zca_message']['msgId'])->toBe('msg_777');
});

// ── Echo merge (outbound portal row chỉ có source_id) ────────────────────────

it('echo cùng source_id merge platform_meta vào row outbound, không tạo row mới, không lật direction', function () {
    Event::fake([MessageReceived::class]);
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($ws, $user);

    $service = platformMetaService();
    $accountId = (string) Str::uuid();

    // Conversation có sẵn (tạo qua 1 tin inbound trước)
    $inbound = $service->ingest(inboundPayloadWithMeta('peer_echo_1', $accountId, 'msg_in_1'));
    $conversation = $inbound->conversation;

    // Row outbound như ZaloSendService::persistMessage — chỉ source_id, platform_meta rỗng
    $outbound = Message::create([
        'workspace_id' => $ws->id,
        'conversation_id' => $conversation->id,
        'direction' => 'out',
        'type' => 'text',
        'body' => 'shop trả lời',
        'source_id' => 'msg_out_9',
        'platform_sent_at' => now(),
        'sent_by' => $user->id,
    ]);
    expect($outbound->platform_meta ?? [])->toBe([]);

    // Echo self-listen quay về cùng source_id, mang listener_data đầy đủ
    $echoPayload = inboundPayloadWithMeta('peer_echo_1', $accountId, 'msg_out_9');
    $echoPayload['direction'] = 'echo';
    $echoPayload['platform_meta'] = ['zca_message' => sampleListenerData('msg_out_9')];

    $merged = $service->ingest($echoPayload);

    expect($merged->id)->toBe($outbound->id)
        ->and($merged->direction)->toBe('out')
        ->and($merged->platform_meta['zca_message']['cliMsgId'])->toBe('1751600000000');
    expect(Message::where('source_id', 'msg_out_9')->count())->toBe(1);
});

it('echo replay KHÔNG ghi đè platform_meta đã có', function () {
    Event::fake([MessageReceived::class]);
    $ws = Workspace::factory()->create();
    actingInWorkspace($ws, User::factory()->create());

    $service = platformMetaService();
    $accountId = (string) Str::uuid();

    $first = $service->ingest(inboundPayloadWithMeta('peer_replay_1', $accountId, 'msg_r1'));
    $originalCliMsgId = $first->platform_meta['zca_message']['cliMsgId'];

    $replay = inboundPayloadWithMeta('peer_replay_1', $accountId, 'msg_r1');
    $replay['platform_meta'] = ['zca_message' => ['msgId' => 'msg_r1', 'cliMsgId' => 'KHAC_HAN']];

    $replayed = $service->ingest($replay);

    expect($replayed->id)->toBe($first->id)
        ->and($replayed->platform_meta['zca_message']['cliMsgId'])->toBe($originalCliMsgId);
});
