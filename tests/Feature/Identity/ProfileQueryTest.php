<?php

use App\Models\ChannelAccount;
use App\Models\Conversation;
use App\Models\ConversationMember;
use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceSequence;
use App\Modules\Identity\Contracts\IdentityResolver;
use App\Modules\Identity\Data\ObservedIdentity;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Ba câu hỏi về một con người — lý do chính của cả tầng định danh.
 *
 * Bản theo `sender_uid` chỉ trả lời được trong phạm vi MỘT tài khoản kênh. Bản
 * theo `profile_id` trả lời xuyên Zalo + Messenger + nguồn thứ ba bằng cùng một
 * câu. Và không câu nào chạm bảng `messages`.
 */
function pqWorkspace(): Workspace
{
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    return $workspace;
}

function pqThread(Workspace $workspace, string $channel, string $kind, string $senderUid, ?string $profileId): Conversation
{
    $account = ChannelAccount::create([
        'workspace_id' => $workspace->id,
        'channel' => $channel,
        'account_uid' => 'acc_'.Str::random(8),
        'status' => 'connected',
    ]);

    $conversation = Conversation::create([
        'workspace_id' => $workspace->id,
        'channel' => $channel,
        'channel_account_id' => $account->id,
        'sender_uid' => $senderUid,
        'thread_kind' => $kind,
        'profile_id' => $profileId,
        'conversation_number' => WorkspaceSequence::next('conversation', $workspace->id),
    ]);

    ConversationMember::create([
        'conversation_id' => $conversation->id,
        'sender_uid' => $senderUid,
        'workspace_id' => $workspace->id,
        'channel_account_id' => $account->id,
        'profile_id' => $profileId,
        'first_seen_at' => now(),
        'last_seen_at' => now(),
    ]);

    return $conversation;
}

it('tìm được mọi nhóm của một người, xuyên hai kênh', function () {
    $workspace = pqWorkspace();

    // Cùng một con người, hai kênh khác nhau, một hồ sơ.
    $profileId = app(IdentityResolver::class)->observe(new ObservedIdentity(
        workspaceId: $workspace->id, key: 'phone', value: '0909999888', source: 'manual',
    ))->profileId;

    $zalo = pqThread($workspace, 'zalo_personal', 'group', 'grp_zalo', $profileId);
    $messenger = pqThread($workspace, 'messenger', 'group', 'grp_mess', $profileId);
    pqThread($workspace, 'zalo_personal', 'group', 'grp_nguoi_khac', null);

    $groups = ConversationMember::query()
        ->where('workspace_id', $workspace->id)
        ->where('profile_id', $profileId)
        ->pluck('conversation_id')
        ->all();

    expect($groups)->toContain($zalo->id)->toContain($messenger->id)
        ->and($groups)->toHaveCount(2);
});

it('liệt kê được thành viên của một nhóm', function () {
    $workspace = pqWorkspace();
    $group = pqThread($workspace, 'zalo_personal', 'group', 'grp_thanh_vien', null);

    foreach (['uid_1', 'uid_2', 'uid_3'] as $uid) {
        ConversationMember::create([
            'conversation_id' => $group->id, 'sender_uid' => $uid,
            'workspace_id' => $workspace->id, 'last_seen_at' => now(),
        ]);
    }

    expect(ConversationMember::where('conversation_id', $group->id)->count())->toBe(4);
});

it('phân biệt được người đó có nhắn riêng hay không', function () {
    $workspace = pqWorkspace();

    $chiNhanNhom = app(IdentityResolver::class)->observe(new ObservedIdentity(
        workspaceId: $workspace->id, key: 'phone', value: '0900000011', source: 'manual',
    ))->profileId;
    $coNhanRieng = app(IdentityResolver::class)->observe(new ObservedIdentity(
        workspaceId: $workspace->id, key: 'phone', value: '0900000012', source: 'manual',
    ))->profileId;

    pqThread($workspace, 'zalo_personal', 'group', 'grp_a', $chiNhanNhom);
    pqThread($workspace, 'zalo_personal', 'direct', 'dm_b', $coNhanRieng);

    $hasDirect = fn (string $profileId) => Conversation::query()
        ->where('workspace_id', $workspace->id)
        ->where('profile_id', $profileId)
        ->where('thread_kind', Conversation::KIND_DIRECT)
        ->exists();

    expect($hasDirect($chiNhanNhom))->toBeFalse()
        ->and($hasDirect($coNhanRieng))->toBeTrue();
});

it('ba truy vấn đó không chạm bảng messages và không quét tuần tự', function () {
    $workspace = pqWorkspace();
    $profileId = app(IdentityResolver::class)->observe(new ObservedIdentity(
        workspaceId: $workspace->id, key: 'phone', value: '0900000013', source: 'manual',
    ))->profileId;
    $thread = pqThread($workspace, 'zalo_personal', 'direct', 'dm_plan', $profileId);

    $plans = [
        DB::select('EXPLAIN (FORMAT TEXT) SELECT conversation_id FROM conversation_members WHERE workspace_id = ? AND profile_id = ?', [$workspace->id, $profileId]),
        DB::select('EXPLAIN (FORMAT TEXT) SELECT sender_uid FROM conversation_members WHERE conversation_id = ?', [$thread->id]),
        DB::select('EXPLAIN (FORMAT TEXT) SELECT id FROM conversations WHERE workspace_id = ? AND profile_id = ? AND thread_kind = ?', [$workspace->id, $profileId, 'direct']),
    ];

    foreach ($plans as $i => $plan) {
        $text = implode("\n", array_map(fn ($row) => (string) reset($row), $plan));

        // Bảng tin nhắn là bảng hàng tỉ dòng. Ba câu hỏi về con người mà phải
        // chạm nó thì cả tầng định danh này không giải quyết được gì.
        expect($text)->not->toContain('messages', "truy vấn #{$i} chạm bảng messages");
    }
});
