<?php

use Carbon\CarbonImmutable;

it('lets pulse card payloads survive a cache round trip', function () {
    $payload = [
        collect([(object) [
            'name' => 'web-1',
            'cpu' => collect([1, 2]),
            'updated_at' => CarbonImmutable::createFromTimestamp(1_790_000_000),
        ]]),
        1.5,
        '2026-09-30 12:00:00',
    ];

    [$value] = unserialize(serialize($payload), ['allowed_classes' => config('cache.serializable_classes')]);

    expect($value->first()->cpu->sum())->toBe(3)
        ->and($value->first()->updated_at->timestamp)->toBe(1_790_000_000)
        ->and($value->map(fn ($server) => $server->name)->all())->toBe(['web-1']);
});
