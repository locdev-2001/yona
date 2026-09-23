<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\User;

// Port từ refs/chatwoot/app/controllers/api/v1/accounts/onboardings_controller.rb
// (complete_account_details). Khác gốc: website không bắt buộc — gốc chỉ đòi nó ở
// client để tạo inbox web-widget cho bước inbox_setup, bước mà bản này không chạy.

function onboardingAccountWithAdmin(array $customAttributes = []): array
{
    $account = Account::factory()->create([
        'custom_attributes' => ['onboarding_step' => 'account_details', ...$customAttributes],
    ]);
    $admin = User::factory()->create();
    AccountUser::factory()->administrator()->create(['account_id' => $account->id, 'user_id' => $admin->id]);

    return [$account, $admin];
}

it('passes the supported languages to the onboarding page', function () {
    config(['inertia.ssr.enabled' => false]);
    [$account, $admin] = onboardingAccountWithAdmin();

    $this->actingAs($admin)
        ->get("/app/accounts/{$account->id}/onboarding")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('dashboard/onboarding/Index')
            ->where('languages', config('yona.available_locales')));
});

it('finishes onboarding when the website is left empty', function () {
    [$account, $admin] = onboardingAccountWithAdmin();

    $this->actingAs($admin)
        ->post("/app/accounts/{$account->id}/onboarding", [
            'name' => 'Shop Hoa',
            'locale' => 'vi',
            'website' => '',
            'timezone' => 'Asia/Ho_Chi_Minh',
            'user_role' => 'owner',
            'industry' => 'fashion',
            'company_size' => '1-10',
            'referral_source' => 'zalo',
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect("/app/accounts/{$account->id}/dashboard");

    $account->refresh();
    expect($account->onboardingStep())->toBeNull()
        ->and($account->name)->toBe('Shop Hoa')
        ->and($account->locale)->toBe('vi')
        ->and($account->custom_attributes)->not->toHaveKey('website')
        ->and($account->custom_attributes)->toMatchArray([
            'timezone' => 'Asia/Ho_Chi_Minh',
            'user_role' => 'owner',
            'industry' => 'fashion',
            'company_size' => '1-10',
            'referral_source' => 'zalo',
        ]);
});

it('finishes onboarding when the website is not sent at all', function () {
    [$account, $admin] = onboardingAccountWithAdmin();

    $this->actingAs($admin)
        ->post("/app/accounts/{$account->id}/onboarding", ['name' => 'Shop Hoa'])
        ->assertSessionHasNoErrors()
        ->assertRedirect("/app/accounts/{$account->id}/dashboard");

    expect($account->refresh()->onboardingStep())->toBeNull();
});

it('keeps custom attributes already on the account', function () {
    [$account, $admin] = onboardingAccountWithAdmin(['industry' => 'Retail & E-commerce', 'brand_color' => '#ff0000']);

    $this->actingAs($admin)
        ->post("/app/accounts/{$account->id}/onboarding", ['website' => 'https://shophoa.vn'])
        ->assertRedirect("/app/accounts/{$account->id}/dashboard");

    expect($account->refresh()->custom_attributes)->toMatchArray([
        'industry' => 'Retail & E-commerce',
        'brand_color' => '#ff0000',
        'website' => 'https://shophoa.vn',
    ]);
});

it('accepts the legacy Asia/Saigon name some browsers report', function () {
    [$account, $admin] = onboardingAccountWithAdmin();

    $this->actingAs($admin)
        ->post("/app/accounts/{$account->id}/onboarding", ['timezone' => 'Asia/Saigon'])
        ->assertSessionHasNoErrors();

    expect($account->refresh()->custom_attributes['timezone'])->toBe('Asia/Saigon');
});

it('rejects invalid values and leaves onboarding where it was', function (array $payload, string $field) {
    [$account, $admin] = onboardingAccountWithAdmin();

    $this->actingAs($admin)
        ->from("/app/accounts/{$account->id}/onboarding")
        ->post("/app/accounts/{$account->id}/onboarding", $payload)
        ->assertSessionHasErrors($field);

    expect($account->refresh()->onboardingStep())->toBe('account_details');
})->with([
    'unknown time zone' => [['timezone' => 'Mars/Olympus'], 'timezone'],
    'unsupported language' => [['locale' => 'kl'], 'locale'],
    'website too long' => [['website' => 'https://'.str_repeat('a', 260).'.vn'], 'website'],
    'role that is not text' => [['user_role' => ['owner']], 'user_role'],
]);
