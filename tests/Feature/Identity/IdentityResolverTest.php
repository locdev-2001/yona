<?php

use App\Models\ChannelAccount;
use App\Models\Profile;
use App\Models\ProfileIdentity;
use App\Models\User;
use App\Models\Workspace;
use App\Modules\Identity\Contracts\IdentityResolver;
use App\Modules\Identity\Data\ObservedIdentity;
use App\Modules\Identity\Merge\ProfileIdentificationService;
use Illuminate\Support\Str;

/**
 * Một nguồn định danh duy nhất: `profiles` (con người) + `profile_identities`
 * (mọi bí danh). Bộ test này canh ba thứ dễ trôi nhất — hồ sơ không bị đẻ trùng,
 * cờ đã-định-danh không lệch, và phạm vi duy nhất của bí danh đúng loại.
 */
function idSetup(): Workspace
{
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    return $workspace;
}

function idAccount(Workspace $workspace, string $channel = 'zalo_personal'): ChannelAccount
{
    return ChannelAccount::create([
        'workspace_id' => $workspace->id,
        'channel' => $channel,
        'account_uid' => 'acc_'.Str::random(8),
        'status' => 'connected',
    ]);
}

function observed(Workspace $workspace, string $key, string $value, ?ChannelAccount $account = null, array $extra = []): ObservedIdentity
{
    return new ObservedIdentity(
        workspaceId: $workspace->id,
        key: $key,
        value: $value,
        source: $extra['source'] ?? 'zalo_personal',
        channelAccountId: $account?->id,
        displayName: $extra['displayName'] ?? null,
        avatarUrl: $extra['avatarUrl'] ?? null,
        channels: $extra['channels'] ?? [],
        attributes: $extra['attributes'] ?? [],
        isVerified: $extra['isVerified'] ?? false,
    );
}

it('tin đầu từ một uid lạ tạo hồ sơ và bí danh, chưa định danh', function () {
    $workspace = idSetup();
    $account = idAccount($workspace);

    $resolved = app(IdentityResolver::class)->observe(
        observed($workspace, 'zalo_personal_uid', 'uid_moi', $account, ['displayName' => 'Khách lạ'])
    );

    expect($resolved->profileId)->not->toBeEmpty()
        ->and($resolved->isIdentified)->toBeFalse()
        ->and($resolved->displayName)->toBe('Khách lạ');

    // Khách lạ CŨNG có hồ sơ — không có hồ sơ thì không có chỗ gắn số điện thoại
    // khi họ gửi danh thiếp ở tin thứ hai.
    expect(Profile::find($resolved->profileId))->not->toBeNull();
});

it('cùng một uid, tin thứ hai không đẻ hồ sơ mới', function () {
    $workspace = idSetup();
    $account = idAccount($workspace);
    $resolver = app(IdentityResolver::class);

    $first = $resolver->observe(observed($workspace, 'zalo_personal_uid', 'uid_lap', $account));
    $second = $resolver->observe(observed($workspace, 'zalo_personal_uid', 'uid_lap', $account));

    expect($second->profileId)->toBe($first->profileId)
        ->and(Profile::where('workspace_id', $workspace->id)->count())->toBe(1);
});

it('cùng một chuỗi uid trên hai tài khoản kênh là hai người khác nhau', function () {
    $workspace = idSetup();
    $resolver = app(IdentityResolver::class);

    // Cùng một psid có thể thuộc hai người khác nhau trên hai trang khác nhau —
    // uid chỉ duy nhất trong phạm vi MỘT tài khoản kênh.
    $a = $resolver->observe(observed($workspace, 'messenger_psid', 'psid_trung', idAccount($workspace, 'messenger')));
    $b = $resolver->observe(observed($workspace, 'messenger_psid', 'psid_trung', idAccount($workspace, 'messenger')));

    expect($b->profileId)->not->toBe($a->profileId);
});

it('một số điện thoại là một người trong cả workspace', function () {
    $workspace = idSetup();
    $resolver = app(IdentityResolver::class);

    // Khác tài khoản kênh, nhưng SĐT không có phạm vi tài khoản — đây chính là
    // quy tắc chống trùng theo số, không phải một cơ chế thứ hai.
    $a = $resolver->observe(observed($workspace, 'phone', '0901234567'));
    $b = $resolver->observe(observed($workspace, 'phone', '0901234567', null, ['source' => 'haravan']));

    expect($b->profileId)->toBe($a->profileId)
        ->and(ProfileIdentity::where('workspace_id', $workspace->id)->where('key', 'phone')->count())->toBe(1);
});

it('có bí danh phone hoặc email thì hồ sơ thành đã định danh, chỉ uid thì không', function () {
    $workspace = idSetup();
    $resolver = app(IdentityResolver::class);

    $viaUid = $resolver->observe(observed($workspace, 'zalo_personal_uid', 'uid_chua', idAccount($workspace)));
    expect($viaUid->isIdentified)->toBeFalse();

    foreach ([['phone', '0900000001'], ['email', 'a@example.com']] as [$key, $value]) {
        $resolved = $resolver->observe(observed($workspace, $key, $value));
        expect($resolved->isIdentified)->toBeTrue("bí danh {$key} phải làm hồ sơ thành đã định danh");
    }
});

it('số hồ sơ chỉ cấp khi đã định danh', function () {
    $workspace = idSetup();
    $resolver = app(IdentityResolver::class);

    // Cấp cho cả khách lạ thì số nhảy tới hàng trăm nghìn vì spam.
    $stranger = $resolver->observe(observed($workspace, 'zalo_personal_uid', 'uid_spam', idAccount($workspace)));
    expect(Profile::find($stranger->profileId)->profile_number)->toBeNull();

    $known = $resolver->observe(observed($workspace, 'phone', '0900000002'));
    expect(Profile::find($known->profileId)->profile_number)->not->toBeNull();
});

it('học được số điện thoại của một hồ sơ đã biết thì hai hồ sơ được gộp', function () {
    $workspace = idSetup();
    $resolver = app(IdentityResolver::class);

    // Đang nhắn với một uid...
    $viaUid = $resolver->observe(observed($workspace, 'zalo_personal_uid', 'uid_gop', idAccount($workspace)));
    // ...và số này đã từng thấy ở một nguồn khác, dưới một hồ sơ khác.
    $viaPhone = $resolver->observe(observed($workspace, 'phone', '0900000003', null, ['source' => 'haravan']));
    expect($viaPhone->profileId)->not->toBe($viaUid->profileId);

    // Khách gửi danh thiếp: giờ ta biết uid đó và số đó là một người.
    $linked = $resolver->link($viaUid->profileId, observed($workspace, 'phone', '0900000003'));

    expect(Profile::find($viaUid->profileId)->merged_into_id ?? $viaUid->profileId)->toBe($linked->profileId);
    expect($linked->isIdentified)->toBeTrue();
});

it('làm mới bí danh không xóa thứ đã biết', function () {
    $workspace = idSetup();
    $account = idAccount($workspace);
    $resolver = app(IdentityResolver::class);

    $resolver->observe(observed($workspace, 'zalo_personal_uid', 'uid_ten', $account, [
        'displayName' => 'Anh Tuấn', 'channels' => ['zalo_personal'],
    ]));

    // Nhà cung cấp trả thiếu trường là chuyện thường; mất tên là mất thứ người
    // dùng nhìn thấy trên màn hình.
    $again = $resolver->observe(observed($workspace, 'zalo_personal_uid', 'uid_ten', $account));

    expect($again->displayName)->toBe('Anh Tuấn');
});

it('lệnh đối soát sửa được cờ đã lệch', function () {
    $workspace = idSetup();
    $resolved = app(IdentityResolver::class)->observe(observed($workspace, 'phone', '0900000004'));

    // Ghi cờ sai thủ công, đúng như một đợt backfill hỏng để lại.
    Profile::where('id', $resolved->profileId)->update(['is_identified' => false]);
    expect(Profile::find($resolved->profileId)->is_identified)->toBeFalse();

    $fixed = app(ProfileIdentificationService::class)->reconcileWorkspace($workspace->id);

    expect($fixed)->toBeGreaterThan(0)
        ->and(Profile::find($resolved->profileId)->is_identified)->toBeTrue();
});

it('gặp lại mà không có avatar thì KHÔNG xóa avatar đang có', function () {
    $workspace = idSetup();
    $account = idAccount($workspace);
    $resolver = app(IdentityResolver::class);

    $resolver->observe(observed($workspace, 'zalo_personal_uid', 'uid_avatar', $account, [
        'displayName' => 'Beru',
        'avatarUrl' => 'https://s120.avatar.zalo.me/beru.jpg',
        'channels' => ['zalo_personal'],
    ]));

    // Kéo lịch sử về không mang theo tên/avatar. Trước đây mỗi lần bấm "đồng bộ
    // tin nhắn" là avatar của cả nhóm biến mất — vì hồ sơ theo kênh bị ghi đè
    // nguyên khối bằng hai giá trị rỗng.
    $resolver->observe(observed($workspace, 'zalo_personal_uid', 'uid_avatar', $account, [
        'channels' => ['zalo_personal'],
    ]));

    $identity = ProfileIdentity::where('value', 'uid_avatar')->sole();

    expect($identity->channel_profiles['zalo_personal']['avatar'])->toBe('https://s120.avatar.zalo.me/beru.jpg')
        ->and($identity->channel_profiles['zalo_personal']['name'])->toBe('Beru')
        ->and($identity->display_name)->toBe('Beru');
});
