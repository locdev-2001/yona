<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\InstallationConfig;
use App\Models\User;
use App\Services\Notification\VapidService;
use Minishlink\WebPush\VAPID;

// Port từ spec/lib/vapid_service_spec.rb.

beforeEach(function () {
    config(['webpush.vapid.public_key' => null, 'webpush.vapid.private_key' => null]);
});

function storedVapidConfigs()
{
    return InstallationConfig::query()->where('name', VapidService::CONFIG_NAME);
}

it('generates a key pair once and keeps it in installation configs', function () {
    $publicKey = (new VapidService)->publicKey();

    expect($publicKey)->not->toBeNull()
        ->and(storedVapidConfigs()->count())->toBe(1)
        ->and(storedVapidConfigs()->sole()->value['public_key'])->toBe($publicKey);

    $nextProcess = new VapidService;

    expect($nextProcess->publicKey())->toBe($publicKey)
        ->and($nextProcess->privateKey())->toBe(storedVapidConfigs()->sole()->value['private_key'])
        ->and(storedVapidConfigs()->count())->toBe(1);
});

it('generates keys a push service accepts', function () {
    $vapid = new VapidService;

    $validated = VAPID::validate([
        'subject' => 'https://yona.vn',
        'publicKey' => $vapid->publicKey(),
        'privateKey' => $vapid->privateKey(),
    ]);

    expect(strlen($validated['publicKey']))->toBe(65)
        ->and(strlen($validated['privateKey']))->toBe(32);
});

it('keeps the stored private key out of the editable Super Admin configs', function () {
    (new VapidService)->publicKey();

    expect(storedVapidConfigs()->sole()->locked)->toBeTrue()
        ->and(InstallationConfig::query()->editable()->where('name', VapidService::CONFIG_NAME)->exists())->toBeFalse();
});

it('uses the key pair from the environment when both keys are configured', function () {
    $configured = VAPID::createVapidKeys();
    config([
        'webpush.vapid.public_key' => $configured['publicKey'],
        'webpush.vapid.private_key' => $configured['privateKey'],
    ]);

    $vapid = new VapidService;

    expect($vapid->publicKey())->toBe($configured['publicKey'])
        ->and($vapid->privateKey())->toBe($configured['privateKey'])
        ->and(storedVapidConfigs()->exists())->toBeFalse();
});

it('ignores a half-configured environment and falls back to the stored pair', function () {
    InstallationConfig::query()->create([
        'name' => VapidService::CONFIG_NAME,
        'value' => ['public_key' => 'stored-public', 'private_key' => 'stored-private'],
    ]);
    config(['webpush.vapid.public_key' => 'only-public']);

    expect((new VapidService)->publicKey())->toBe('stored-public');
});

describe('sharing the public key with the dashboard', function () {
    it('gives signed-in pages the same public key the push job signs with', function () {
        $user = User::factory()->create();
        $account = Account::factory()->create();
        AccountUser::factory()->create(['account_id' => $account->id, 'user_id' => $user->id]);

        $this->actingAs($user)->get("/app/accounts/{$account->id}/profile/settings")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('globalConfig.vapidPublicKey', storedVapidConfigs()->sole()->value['public_key']));
    });

    it('neither reads nor generates keys for guest pages', function () {
        $this->get('/app/login')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('globalConfig.vapidPublicKey', null));

        expect(storedVapidConfigs()->exists())->toBeFalse();
    });
});
