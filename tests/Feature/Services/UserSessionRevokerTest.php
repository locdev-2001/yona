<?php

use App\Models\User;
use App\Models\UserSession;
use App\Services\UserSessionRevoker;
use Tests\Support\StoredSessions;

it('destroys the revoked session on the configured session store, whatever the driver', function () {
    expect(config('session.driver'))->not->toBe('database');

    $user = User::factory()->create();
    $revoked = UserSession::factory()->for($user)->create(['client_id' => 'other-client']);
    StoredSessions::put('other-client');

    app(UserSessionRevoker::class)->revoke($revoked);

    expect(StoredSessions::exists('other-client'))->toBeFalse()
        ->and(UserSession::query()->find($revoked->id))->toBeNull();
});

it('revokes every session of the user and leaves other users untouched', function () {
    $user = User::factory()->create();
    $stranger = User::factory()->create();
    UserSession::factory()->for($user)->create(['client_id' => 'laptop']);
    UserSession::factory()->for($user)->create(['client_id' => 'phone']);
    UserSession::factory()->for($stranger)->create(['client_id' => 'stranger-laptop']);
    foreach (['laptop', 'phone', 'stranger-laptop'] as $clientId) {
        StoredSessions::put($clientId);
    }

    app(UserSessionRevoker::class)->revokeAll($user);

    expect($user->userSessions()->count())->toBe(0)
        ->and(StoredSessions::exists('laptop'))->toBeFalse()
        ->and(StoredSessions::exists('phone'))->toBeFalse()
        ->and($stranger->userSessions()->count())->toBe(1)
        ->and(StoredSessions::exists('stranger-laptop'))->toBeTrue();
});

it('revokes the session whose latest activity is the oldest', function () {
    $user = User::factory()->create();
    $recent = UserSession::factory()->for($user)->create([
        'client_id' => 'recent',
        'last_activity_at' => now()->subHour(),
    ]);
    // Chưa từng ghi hoạt động: tính theo created_at.
    $neverActive = UserSession::factory()->for($user)->create([
        'client_id' => 'never-active',
        'last_activity_at' => null,
        'created_at' => now()->subDays(3),
    ]);
    $older = UserSession::factory()->for($user)->create([
        'client_id' => 'older',
        'last_activity_at' => now()->subDay(),
    ]);
    StoredSessions::put('never-active');

    app(UserSessionRevoker::class)->revokeOldest($user);

    expect(UserSession::query()->find($neverActive->id))->toBeNull()
        ->and(StoredSessions::exists('never-active'))->toBeFalse()
        ->and(UserSession::query()->whereKey([$recent->id, $older->id])->count())->toBe(2);
});
