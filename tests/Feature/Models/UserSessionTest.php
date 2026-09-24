<?php

use App\Models\User;
use App\Models\UserSession;
use Illuminate\Database\UniqueConstraintViolationException;

it('belongs to a user', function () {
    $session = UserSession::factory()->create();

    expect($session->user)->toBeInstanceOf(User::class);
});

it('rejects a duplicate client_id for the same user', function () {
    $user = User::factory()->create();
    UserSession::factory()->for($user)->create(['client_id' => 'abc']);

    UserSession::factory()->for($user)->create(['client_id' => 'abc']);
})->throws(UniqueConstraintViolationException::class);

it('allows the same client_id for different users', function () {
    UserSession::factory()->for(User::factory())->create(['client_id' => 'abc']);
    $other = UserSession::factory()->for(User::factory())->create(['client_id' => 'abc']);

    expect($other->exists)->toBeTrue();
});

it('knows whether it is the current session', function () {
    $session = UserSession::factory()->create(['client_id' => 'abc']);

    expect($session->isCurrent('abc'))->toBeTrue()
        ->and($session->isCurrent('xyz'))->toBeFalse()
        ->and($session->isCurrent(null))->toBeFalse();
});

it('updates activity only outside the throttle window', function () {
    $session = UserSession::factory()->make(['last_activity_at' => null]);
    expect($session->shouldUpdateActivity())->toBeTrue();

    $session->last_activity_at = now()->subMinutes(10);
    expect($session->shouldUpdateActivity())->toBeTrue();

    $session->last_activity_at = now()->subMinute();
    expect($session->shouldUpdateActivity())->toBeFalse();
});
