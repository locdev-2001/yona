<?php

use App\Models\ZaloConnection;
use App\Modules\Integration\IntegrationCatalog;
use Tests\TestCase;

uses(TestCase::class);

it('returns exactly one card with key zalo_personal', function () {
    $cards = app(IntegrationCatalog::class)->cards();

    expect($cards)->toHaveCount(1)
        ->and($cards[0]['key'])->toBe('zalo_personal')
        ->and($cards[0]['category'])->toBe('chat');
});

it('returns enabled=true when config is truthy', function () {
    config(['integrations.zalo_personal.enabled' => true]);

    $cards = app(IntegrationCatalog::class)->cards();

    expect($cards[0]['enabled'])->toBeTrue();
});

it('returns enabled=false when config is falsy', function () {
    config(['integrations.zalo_personal.enabled' => false]);

    $cards = app(IntegrationCatalog::class)->cards();

    expect($cards[0]['enabled'])->toBeFalse();
});

it('returns connected=false when no ZaloConnection rows exist', function () {
    // No rows seeded → ZaloConnection::query()->exists() = false
    $cards = app(IntegrationCatalog::class)->cards();

    expect($cards[0]['connected'])->toBeFalse();
});
