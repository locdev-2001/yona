<?php

use App\Console\Commands\BuildLandingDemoAccount;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Channel\Zalo;
use App\Models\Contact;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    // Lệnh không được gọi ra cầu nối Zalo — kể cả lúc xoá kênh demo của lần chạy trước.
    Http::preventStrayRequests();
});

function landingDemoAccount(): Account
{
    return Account::query()
        ->where('custom_attributes->'.BuildLandingDemoAccount::MARKER_KEY, true)
        ->sole();
}

it('dựng account demo với hộp thư Zalo cá nhân thật, hộp thư Website và bảy hội thoại', function () {
    $this->artisan('landing:demo-account')->assertSuccessful();

    $account = landingDemoAccount();
    $zaloInbox = $account->inboxes()->where('channel_type', 'Channel::Zalo')->sole();
    $websiteInbox = $account->inboxes()->where('channel_type', 'Channel::WebWidget')->sole();
    $conversations = $account->conversations()->get();

    expect($account->inboxes()->count())->toBe(2)
        ->and($zaloInbox->name)->toBe('Zalo cá nhân')
        ->and($zaloInbox->channel)->toBeInstanceOf(Zalo::class)
        ->and($zaloInbox->channel->isConnected())->toBeTrue()
        ->and($websiteInbox->name)->toBe('Website')
        ->and($conversations)->toHaveCount(7)
        ->and($conversations->where('inbox_id', $zaloInbox->id))->toHaveCount(5)
        ->and($conversations->where('inbox_id', $websiteInbox->id))->toHaveCount(2)
        ->and($conversations->whereNotNull('assignee_id'))->toHaveCount(5)
        ->and($conversations->pluck('display_id')->sort()->values()->all())->toBe(range(1, 7))
        ->and($account->custom_attributes)->not->toHaveKey(Account::ONBOARDING_STEP_KEY);

    $conversations->each(function (Conversation $conversation) {
        expect($conversation->unreadMessages()->where('message_type', Message::TYPE_INCOMING)->count())->toBe(1);
    });
});

it('tạo agent demo đăng nhập được, là quản trị viên của account demo', function () {
    $this->artisan('landing:demo-account')
        ->expectsOutputToContain(BuildLandingDemoAccount::AGENT_PASSWORD)
        ->assertSuccessful();

    $agent = User::query()->where('email', BuildLandingDemoAccount::AGENT_EMAIL)->sole();

    expect(Hash::check(BuildLandingDemoAccount::AGENT_PASSWORD, $agent->password))->toBeTrue()
        ->and($agent->isConfirmed())->toBeTrue()
        ->and($agent->accounts()->sole()->id)->toBe(landingDemoAccount()->id)
        ->and(AccountUser::query()->where('user_id', $agent->id)->sole()->role)->toBe(AccountUser::ROLE_ADMINISTRATOR);
});

it('thông báo của agent demo đã đọc hết, tin khách vẫn chưa đọc', function () {
    $this->artisan('landing:demo-account')->assertSuccessful();

    $agent = User::query()->where('email', BuildLandingDemoAccount::AGENT_EMAIL)->sole();
    $notifications = Notification::query()->where('user_id', $agent->id);

    expect((clone $notifications)->count())->toBeGreaterThan(0)
        ->and((clone $notifications)->unread()->count())->toBe(0)
        ->and(landingDemoAccount()->conversations()->whereNotNull('agent_last_seen_at')->exists())->toBeFalse();
});

it('tin trả lời trên Zalo coi như đã gửi, không đẩy ra cầu nối', function () {
    $this->artisan('landing:demo-account')->assertSuccessful();

    $zaloInbox = landingDemoAccount()->inboxes()->where('channel_type', 'Channel::Zalo')->sole();
    $replies = Message::query()
        ->where('inbox_id', $zaloInbox->id)
        ->where('message_type', Message::TYPE_OUTGOING)
        ->get();

    expect($replies)->toHaveCount(3)
        ->and($replies->every(fn (Message $reply) => filled($reply->source_id)))->toBeTrue()
        ->and($replies->pluck('status')->unique()->all())->toBe([Message::STATUSES['sent']]);
});

it('đặt dòng thời gian theo mốc --at', function () {
    $this->artisan('landing:demo-account', ['--at' => '2026-09-20 15:30 +07:00'])->assertSuccessful();

    $latest = landingDemoAccount()->conversations()->orderByDesc('last_activity_at')->first();

    expect($latest->contact->name)->toBe('Bùi Thanh Trúc')
        ->and($latest->last_activity_at->toDateTimeString())->toBe('2026-09-20 07:56:00')
        ->and($latest->messages()->sole()->created_at->toDateTimeString())->toBe('2026-09-20 07:56:00');
});

it('từ chối mốc --at ở tương lai', function () {
    $this->artisan('landing:demo-account', ['--at' => now()->addDay()->toIso8601String()])->assertFailed();

    expect(User::query()->where('email', BuildLandingDemoAccount::AGENT_EMAIL)->exists())->toBeFalse();
});

it('chạy lần hai dựng lại từ đầu, không nhân đôi', function () {
    $this->artisan('landing:demo-account')->assertSuccessful();
    $firstAccountId = landingDemoAccount()->id;

    $this->artisan('landing:demo-account')->assertSuccessful();
    $account = landingDemoAccount();

    expect($account->id)->not->toBe($firstAccountId)
        ->and(Account::query()->whereKey($firstAccountId)->exists())->toBeFalse()
        ->and(User::query()->where('email', BuildLandingDemoAccount::AGENT_EMAIL)->count())->toBe(1)
        ->and(Conversation::query()->count())->toBe(7)
        ->and(Contact::query()->count())->toBe(7)
        ->and(Inbox::query()->count())->toBe(2)
        ->and(Zalo::query()->count())->toBe(1);
});

it('không đụng account, hộp thư Zalo và người dùng khác', function () {
    $other = Account::factory()->create(['name' => 'Cửa hàng thật']);
    $owner = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $other->id, 'user_id' => $owner->id]);
    $inbox = Inbox::factory()->zalo()->create(['account_id' => $other->id]);
    $conversation = Conversation::factory()->create(['account_id' => $other->id, 'inbox_id' => $inbox->id]);
    Message::factory()->create(['account_id' => $other->id, 'conversation_id' => $conversation->id]);

    $this->artisan('landing:demo-account')->assertSuccessful();
    $this->artisan('landing:demo-account')->assertSuccessful();

    expect($other->fresh())->not->toBeNull()
        ->and($owner->fresh())->not->toBeNull()
        ->and($inbox->fresh()->channel)->toBeInstanceOf(Zalo::class)
        ->and($conversation->fresh()->messages()->count())->toBe(1)
        ->and($other->fresh()->custom_attributes ?? [])->not->toHaveKey(BuildLandingDemoAccount::MARKER_KEY);
});

it('dừng lại khi email agent demo đang thuộc một account không phải demo', function () {
    $other = Account::factory()->create();
    $user = User::factory()->create(['email' => BuildLandingDemoAccount::AGENT_EMAIL]);
    AccountUser::factory()->create(['account_id' => $other->id, 'user_id' => $user->id]);

    $this->artisan('landing:demo-account')->assertFailed();

    expect($user->fresh())->not->toBeNull()
        ->and($user->fresh()->accounts()->sole()->id)->toBe($other->id)
        ->and(Account::query()->where('custom_attributes->'.BuildLandingDemoAccount::MARKER_KEY, true)->exists())
        ->toBeFalse();
});

it('từ chối chạy trên production', function () {
    app()->detectEnvironment(fn () => 'production');

    $this->artisan('landing:demo-account')->assertFailed();

    expect(Account::query()->count())->toBe(0)
        ->and(User::query()->where('email', BuildLandingDemoAccount::AGENT_EMAIL)->exists())->toBeFalse();
});
