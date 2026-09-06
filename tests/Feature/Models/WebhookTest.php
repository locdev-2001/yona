<?php

use App\Models\Account;
use App\Models\Webhook;

it('tự sinh secret 24 ký tự khi tạo và giữ nguyên khi cập nhật', function () {
    $webhook = Webhook::factory()->create(['account_id' => Account::factory()->create()->id]);
    $secret = $webhook->secret;

    expect($secret)->toHaveLength(24);

    $webhook->update(['url' => $webhook->url.'?updated=1']);

    expect($webhook->refresh()->secret)->toBe($secret);
});

it('resetSecret đổi sang secret khác', function () {
    $webhook = Webhook::factory()->create();
    $secret = $webhook->secret;

    $webhook->resetSecret();

    expect($webhook->refresh()->secret)->not->toBe($secret)->toHaveLength(24);
});

it('scope accountType chỉ lấy webhook cấp account', function () {
    $account = Account::factory()->create();
    $accountWebhook = Webhook::factory()->create(['account_id' => $account->id]);
    Webhook::factory()->create(['account_id' => $account->id, 'webhook_type' => Webhook::TYPE_INBOX]);

    expect($account->webhooks()->accountType()->pluck('id')->all())->toBe([$accountWebhook->id]);
});
