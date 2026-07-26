<?php

use App\Models\Conversation;
use App\Models\ConversationMember;
use App\Models\Profile;
use App\Models\ProfileIdentity;
use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceSequence;
use App\Modules\Identity\Merge\MergeProfilesService;
use Illuminate\Support\Str;

/**
 * Gộp hồ sơ là việc HẰNG NGÀY — mọi khách lạ đều có hồ sơ, gặp số trùng là gộp.
 * Vì vậy nó phải rẻ, và phải hoàn tác được.
 */
function mergeSetup(): Workspace
{
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    return $workspace;
}

function mergeProfile(Workspace $workspace, bool $identified = false): Profile
{
    $profile = Profile::create(['workspace_id' => $workspace->id, 'first_seen_at' => now(), 'last_seen_at' => now()]);

    if ($identified) {
        ProfileIdentity::create([
            'workspace_id' => $workspace->id,
            'profile_id' => $profile->id,
            'key' => 'phone',
            'value' => '09'.random_int(10000000, 99999999),
            'source' => 'manual',
        ]);
        $profile->forceFill(['is_identified' => true])->save();
    }

    return $profile->refresh();
}

it('gộp trỏ bí danh, hội thoại và thành viên sang hồ sơ thắng', function () {
    $workspace = mergeSetup();
    $winner = mergeProfile($workspace);
    $loser = mergeProfile($workspace);

    $identity = ProfileIdentity::create([
        'workspace_id' => $workspace->id, 'profile_id' => $loser->id,
        'key' => 'zalo_personal_uid', 'value' => 'uid_thua', 'source' => 'zalo_personal',
    ]);

    $conversation = Conversation::create([
        'workspace_id' => $workspace->id, 'channel' => 'widget',
        'sender_uid' => 'uid_thua', 'thread_kind' => 'direct',
        'profile_id' => $loser->id,
        'conversation_number' => WorkspaceSequence::next('conversation', $workspace->id),
    ]);

    $member = ConversationMember::create([
        'conversation_id' => $conversation->id, 'sender_uid' => 'uid_thua',
        'workspace_id' => $workspace->id, 'profile_id' => $loser->id,
    ]);

    app(MergeProfilesService::class)->merge($winner, $loser);

    expect($identity->fresh()->profile_id)->toBe($winner->id)
        ->and($conversation->fresh()->profile_id)->toBe($winner->id)
        ->and(ConversationMember::where('conversation_id', $conversation->id)->first()->profile_id)->toBe($winner->id);
});

it('gộp KHÔNG tạo chuỗi — A gộp B rồi B gộp C thì A trỏ thẳng C', function () {
    $workspace = mergeSetup();
    [$a, $b, $c] = [mergeProfile($workspace), mergeProfile($workspace), mergeProfile($workspace)];

    $merge = app(MergeProfilesService::class);
    $merge->merge($b, $a);   // A → B
    $merge->merge($c, $b);   // B → C, và A phải được kéo theo

    // Không có luật làm phẳng thì sau vài tháng, tra một hồ sơ phải lặp nhiều
    // vòng mới ra gốc — và không ai biết cần lặp bao nhiêu vòng.
    expect($a->fresh()->merged_into_id)->toBe($c->id)
        ->and($b->fresh()->merged_into_id)->toBe($c->id);
});

it('gộp không xóa hồ sơ thua — gộp nhầm thì hoàn tác được', function () {
    $workspace = mergeSetup();
    $winner = mergeProfile($workspace);
    $loser = mergeProfile($workspace);

    app(MergeProfilesService::class)->merge($winner, $loser);

    expect(Profile::find($loser->id))->not->toBeNull()
        ->and($loser->fresh()->merged_into_id)->toBe($winner->id);
});

it('gộp tính lại cờ đã-định-danh của hồ sơ thắng', function () {
    $workspace = mergeSetup();
    $winner = mergeProfile($workspace);
    $loser = mergeProfile($workspace, identified: true);

    expect($winner->is_identified)->toBeFalse();

    app(MergeProfilesService::class)->merge($winner, $loser);

    // Bí danh phone của kẻ thua nay thuộc kẻ thắng ⇒ kẻ thắng đã định danh.
    expect($winner->fresh()->is_identified)->toBeTrue();
});

it('hồ sơ đã định danh thắng hồ sơ chưa định danh', function () {
    $workspace = mergeSetup();
    $stranger = mergeProfile($workspace);
    $known = mergeProfile($workspace, identified: true);

    [$winner, $loser] = app(MergeProfilesService::class)->pickWinner($stranger, $known);

    expect($winner->id)->toBe($known->id)
        ->and($loser->id)->toBe($stranger->id);
});

it('gộp chính nó là việc không làm gì', function () {
    $workspace = mergeSetup();
    $profile = mergeProfile($workspace);

    app(MergeProfilesService::class)->merge($profile, $profile);

    expect($profile->fresh()->merged_into_id)->toBeNull();
});

it('luồng của hồ sơ đã gộp vẫn tra ra hồ sơ gốc', function () {
    $workspace = mergeSetup();
    $winner = mergeProfile($workspace);
    $loser = mergeProfile($workspace);

    ProfileIdentity::create([
        'workspace_id' => $workspace->id, 'profile_id' => $loser->id,
        'key' => 'zalo_personal_uid', 'value' => 'uid_'.Str::random(6), 'source' => 'zalo_personal',
    ]);

    app(MergeProfilesService::class)->merge($winner, $loser);

    expect($loser->fresh()->isMerged())->toBeTrue()
        ->and($winner->fresh()->isMerged())->toBeFalse();
});
