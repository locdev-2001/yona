<?php

use App\Models\ChannelAccount;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceSequence;
use App\Models\ZaloConnection;
use App\Modules\Chat\Delivery\SeenSyncService;
use App\Services\SettingsService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

/**
 * P06b — seen-sync: DEFAULT OFF (A4), debounce, batch qua dispatcher, chỉ 1-1.
 */
function ssSetup(string $role = 'admin'): array
{
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, $role);

    $account = ChannelAccount::create([
        'workspace_id' => $workspace->id,
        'channel' => 'zalo_personal',
        'account_uid' => 'uid_ss_'.uniqid(),
        'status' => 'connected',
    ]);
    ZaloConnection::create([
        'workspace_id' => $workspace->id,
        'connection_id' => ZaloConnection::nextConnectionId(),
        'channel_account_id' => $account->id,
        'state' => 'connected',
        'lock_version' => 0,
    ]);

    $conversation = Conversation::create([
        'workspace_id' => $workspace->id,
        'channel' => 'zalo_personal',
        'channel_account_id' => $account->id,
        'peer_uid' => 'peer_ss_'.uniqid(),
        'thread_type' => 0,
        'conversation_number' => WorkspaceSequence::next('conversation', $workspace->id),
    ]);

    Message::create([
        'workspace_id' => $workspace->id,
        'conversation_id' => $conversation->id,
        'direction' => 'in',
        'type' => 'text',
        'body' => 'khách nhắn',
        'source_id' => 'ss_in_'.uniqid(),
        'platform_sent_at' => now(),
        'platform_meta' => ['zca_message' => [
            'msgId' => 'ss_m1', 'cliMsgId' => '999888', 'uidFrom' => $conversation->peer_uid,
            'idTo' => '0', 'msgType' => 'webchat', 'st' => 3, 'at' => 0, 'cmd' => 501, 'ts' => '1751600000000',
        ]],
    ]);

    return [$workspace, $user, $conversation];
}

it('DEFAULT OFF: mở thread KHÔNG bắn call nào (A4 founder)', function () {
    [, , $conversation] = ssSetup();
    Http::fake();

    app(SeenSyncService::class)->syncOnThreadOpen($conversation);

    Http::assertNothingSent();
});

it('ON: mở thread → dispatcher sendSeenEvent nhận batch đúng field; debounce lần 2 trong 4s không bắn', function () {
    [, , $conversation] = ssSetup();
    app(SettingsService::class)->set(SeenSyncService::SETTING_KEY, true);
    Cache::flush();

    Http::fake(['*zca/sendSeenEvent*' => Http::response(['ok' => true, 'result' => ['status' => 0]], 200)]);

    $service = app(SeenSyncService::class);
    $service->syncOnThreadOpen($conversation);
    $service->syncOnThreadOpen($conversation); // trong cửa sổ debounce

    Http::assertSentCount(1);
    Http::assertSent(function ($request) {
        $messages = $request['args'][0] ?? [];

        return str_contains($request->url(), '/zca/sendSeenEvent')
            && count($messages) === 1
            && $messages[0]['msgId'] === 'ss_m1'
            && $messages[0]['cliMsgId'] === '999888'
            && ($request['args'][1] ?? null) === 0;
    });
});

it('ON nhưng NHÓM (thread_type=1) → không bắn (per-member, v1 bỏ)', function () {
    [$workspace] = ssSetup();
    app(SettingsService::class)->set(SeenSyncService::SETTING_KEY, true);
    Cache::flush();

    $group = Conversation::create([
        'workspace_id' => $workspace->id,
        'channel' => 'zalo_personal',
        'peer_uid' => 'group_ss',
        'thread_type' => 1,
        'conversation_number' => WorkspaceSequence::next('conversation', $workspace->id),
    ]);

    Http::fake();
    app(SeenSyncService::class)->syncOnThreadOpen($group);
    Http::assertNothingSent();
});

it('toggle endpoint: admin bật/tắt OK; sales_rep (không có tenant.zalo.manage) → 403', function () {
    ssSetup();

    $this->putJson(route('inbox.settings.seen-sync'), ['enabled' => true])
        ->assertOk()->assertJsonPath('enabled', true);
    expect(app(SeenSyncService::class)->enabled())->toBeTrue();

    // Member thường
    [$ws2] = [Workspace::factory()->create()];
    $rep = User::factory()->create();
    actingInWorkspace($ws2, $rep);
    seedMember($ws2, $rep, 'sales_rep');

    $this->putJson(route('inbox.settings.seen-sync'), ['enabled' => true])->assertForbidden();
});

it('watermark: sau lần sync thành công, mở lại (hết debounce) không gửi lại tin cũ', function () {
    [, , $conversation] = ssSetup();
    app(SettingsService::class)->set(SeenSyncService::SETTING_KEY, true);
    Cache::flush();

    Http::fake(['*zca/sendSeenEvent*' => Http::response(['ok' => true], 200)]);
    $service = app(SeenSyncService::class);

    $service->syncOnThreadOpen($conversation);
    Cache::forget('seen-sync:'.$conversation->id); // hết cửa sổ debounce
    $service->syncOnThreadOpen($conversation);     // không có tin mới sau watermark

    Http::assertSentCount(1);
});
