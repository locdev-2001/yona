<?php

use App\Channels\ChannelPlatform;
use App\Channels\DeclaresPlatform;
use App\Http\Resources\InboxResource;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Channel\Email;
use App\Models\Channel\TwilioSms;
use App\Models\Inbox;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\Contracts\Channels\ChannelCatalog;

// Logo nền tảng khai ở driver kênh: thêm kênh mới mà quên khai (hoặc quên tệp logo)
// thì test này đỏ ngay, lõi và UI không phải map theo channel_type.

beforeEach(function () {
    $this->account = Account::factory()->create();
    $this->administrator = User::factory()->create();
    AccountUser::factory()->administrator()->create([
        'account_id' => $this->account->id,
        'user_id' => $this->administrator->id,
    ]);
});

it('mọi kênh trong morph map đều tự khai nền tảng', function () {
    foreach (ChannelCatalog::morphMap() as $type => $class) {
        expect(new $class)->toBeInstanceOf(DeclaresPlatform::class, "{$type} chưa implement DeclaresPlatform");
    }
});

it('key đúng dạng, name không rỗng, tệp logo tồn tại', function () {
    foreach (ChannelCatalog::variants() as $type => $channel) {
        $platform = $channel->platform();

        expect($platform->key)->toMatch('/^[a-z0-9-]+$/', "{$type} khai key sai dạng")
            ->and($platform->name)->not->toBe('', "{$type} khai tên nền tảng rỗng")
            ->and(file_exists(public_path($platform->logoPath())))->toBeTrue("{$type} thiếu tệp {$platform->logoPath()}");
    }
});

it('Twilio quyết nền tảng theo medium', function () {
    expect((new TwilioSms(['medium' => 'sms']))->platform()->key)->toBe('sms')
        ->and((new TwilioSms(['medium' => 'whatsapp']))->platform()->key)->toBe('whatsapp');
});

it('Email quyết nền tảng theo nhà cung cấp hộp thư', function () {
    expect((new Email(['provider' => 'google']))->platform()->key)->toBe('gmail')
        ->and((new Email(['provider' => 'microsoft']))->platform()->key)->toBe('outlook')
        ->and((new Email(['imap_enabled' => true, 'imap_address' => 'imap.gmail.com']))->platform()->key)->toBe('gmail')
        ->and((new Email(['imap_enabled' => true, 'imap_address' => 'imap.yona.vn']))->platform()->key)->toBe('email');
});

it('hộp thư có kênh không khai nền tảng thì trả unknown và tệp unknown.svg có thật', function () {
    $inbox = new Inbox;
    $inbox->setRelation('channel', new class extends Model {});

    expect($inbox->platform()->key)->toBe('unknown')
        ->and(file_exists(public_path(ChannelPlatform::unknown()->logoPath())))->toBeTrue();

    $inbox->setRelation('channel', null);

    expect($inbox->platform()->key)->toBe('unknown');
});

it('toArray trả logo_url tuyệt đối trỏ đúng tệp', function () {
    $payload = ChannelPlatform::of('zalo', 'Zalo')->toArray();

    expect($payload['key'])->toBe('zalo')
        ->and($payload['name'])->toBe('Zalo')
        ->and($payload['logo_url'])->toStartWith('http')
        ->and($payload['logo_url'])->toEndWith('/brand-assets/platforms/zalo.svg');
});

// Hai mặt tiền (InboxResource của API và prop Inertia `inboxes` của sidebar) phải
// lộ cùng một danh tính hộp thư, nếu không UI hiện logo/avatar theo cái nào cũng lệch.
it('prop Inertia `inboxes` lộ đúng platform và avatar_url mà InboxResource lộ', function () {
    Storage::fake('public');
    $account = $this->account;
    $inbox = Inbox::factory()->zalo()->create(['account_id' => $account->id]);
    $inbox->replaceAvatarFromContents('png-bytes', 'a.png', 'image/png');
    $inbox->refresh();

    $resource = (new InboxResource($inbox, true))->toArray(request());

    expect($resource['platform']['key'])->toBe('zalo')
        ->and($resource['avatar_url'])->not->toBe('');

    $this->actingAs($this->administrator)->get("/app/accounts/{$account->id}/dashboard")
        ->assertInertia(fn ($page) => $page
            ->where('inboxes.0.id', $inbox->id)
            ->where('inboxes.0.platform', $resource['platform'])
            ->where('inboxes.0.avatar_url', $resource['avatar_url']));
});

it('prop Inertia `inboxes` trả avatar_url rỗng khi hộp thư chưa có ảnh', function () {
    $account = $this->account;
    Inbox::factory()->zalo()->create(['account_id' => $account->id]);

    $this->actingAs($this->administrator)->get("/app/accounts/{$account->id}/dashboard")
        ->assertInertia(fn ($page) => $page
            ->where('inboxes.0.avatar_url', '')
            ->where('inboxes.0.platform.key', 'zalo'));
});

it('prop `inboxes` không N+1 theo avatar hộp thư', function () {
    Storage::fake('public');
    $account = $this->account;

    foreach (range(1, 3) as $index) {
        Inbox::factory()->zalo()->create(['account_id' => $account->id, 'name' => "Zalo {$index}"])
            ->replaceAvatarFromContents('png-bytes', "{$index}.png", 'image/png');
    }

    DB::enableQueryLog();
    $this->actingAs($this->administrator)->get("/app/accounts/{$account->id}/dashboard")->assertOk();

    $inboxAvatarQueries = collect(DB::getQueryLog())
        ->filter(fn (array $query) => str_contains($query['query'], 'attachments')
            && in_array('Inbox', $query['bindings'], true));

    expect($inboxAvatarQueries)->toHaveCount(1);
});
