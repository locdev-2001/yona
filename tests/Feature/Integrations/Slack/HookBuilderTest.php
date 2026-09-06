<?php

use App\Models\Account;
use App\Models\Inbox;
use App\Models\Integrations\Hook;
use App\Services\Integrations\Slack\HookBuilder;
use Illuminate\Support\Facades\Http;

// Port từ spec/lib/integrations/slack/hook_builder_spec.rb.

it('tạo hook TẮT với access_token đổi từ code OAuth', function () {
    $account = Account::factory()->create();

    Http::fake([
        'https://slack.com/api/oauth.v2.access' => Http::response(['ok' => true, 'access_token' => 'xoxb-token-123']),
    ]);

    $hooksCount = $account->hooks()->count();

    $hook = (new HookBuilder($account, 'auth-code'))->perform();

    expect($account->hooks()->count())->toBe($hooksCount + 1)
        ->and($hook->access_token)->toBe('xoxb-token-123')
        ->and($hook->isDisabled())->toBeTrue()
        ->and($hook->app_id)->toBe('slack');

    Http::assertSent(fn ($request) => $request->url() === 'https://slack.com/api/oauth.v2.access'
        && $request['code'] === 'auth-code');
});

it('gắn inbox_id khi tạo hook kiểu inbox', function () {
    $account = Account::factory()->create();
    $inbox = Inbox::factory()->create(['account_id' => $account->id]);

    Http::fake(['https://slack.com/api/oauth.v2.access' => Http::response(['ok' => true, 'access_token' => 'xoxb-token-456'])]);

    $hook = (new HookBuilder($account, 'auth-code', $inbox->id))->perform();

    expect($hook->inbox_id)->toBe($inbox->id)
        ->and(Hook::query()->count())->toBe(1);
});
