<?php

use App\Models\Account;
use App\Models\Inbox;
use App\Models\Integrations\Hook;

// Port từ spec/models/integrations/hook_spec.rb (bỏ phần enterprise: reauthorizable,
// crm/leadsquared, cloudflare realtimekit).

it('sinh access_token 24 ký tự khi tạo', function () {
    $hook = Hook::factory()->create();

    expect($hook->access_token)->toHaveLength(24);
});

it('mặc định là hook kiểu account và đang bật', function () {
    $hook = Hook::factory()->create();

    expect($hook->hookTypeName())->toBe('account')
        ->and($hook->isEnabled())->toBeTrue()
        ->and($hook->isDisabled())->toBeFalse();
});

it('disable() chuyển trạng thái sang tắt', function () {
    $hook = Hook::factory()->create();
    $hook->disable();

    expect($hook->refresh()->isDisabled())->toBeTrue();
});

it('tách được hook theo phạm vi account và inbox', function () {
    $account = Account::factory()->create();
    $inbox = Inbox::factory()->create(['account_id' => $account->id]);

    $accountHook = Hook::factory()->create(['account_id' => $account->id, 'app_id' => 'webhook']);
    $inboxHook = Hook::factory()->create([
        'account_id' => $account->id,
        'app_id' => 'dialogflow',
        'inbox_id' => $inbox->id,
        'hook_type' => Hook::TYPE_INBOX,
        'settings' => ['project_id' => 'test-project', 'credentials' => ['type' => 'service_account']],
    ]);

    expect(Hook::query()->accountHooks()->pluck('id')->all())->toContain($accountHook->id)
        ->not->toContain($inboxHook->id)
        ->and(Hook::query()->inboxHooks()->pluck('id')->all())->toContain($inboxHook->id)
        ->not->toContain($accountHook->id);
});

it('tra được mục danh mục ứng dụng của mình', function () {
    $hook = Hook::factory()->create(['app_id' => 'slack']);

    expect($hook->app()?->id())->toBe('slack')
        ->and(Hook::factory()->create(['app_id' => 'không_tồn_tại'])->app())->toBeNull();
});
