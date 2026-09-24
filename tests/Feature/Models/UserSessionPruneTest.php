<?php

use App\Models\User;
use App\Models\UserSession;
use Illuminate\Console\Scheduling\Event;
use Illuminate\Console\Scheduling\Schedule;

const THIRTY_DAYS_IN_MINUTES = 43200;

beforeEach(function () {
    config(['session.lifetime' => THIRTY_DAYS_IN_MINUTES]);
    $this->user = User::factory()->create();
});

function pruneUserSessions(): void
{
    test()->artisan('model:prune', ['--model' => [UserSession::class]])->assertSuccessful();
}

it('prunes rows whose session expired on the store and keeps live ones', function () {
    $expired = UserSession::factory()->for($this->user)->create(['last_activity_at' => now()->subDays(31)]);
    $live = UserSession::factory()->for($this->user)->create(['last_activity_at' => now()->subDays(29)]);

    pruneUserSessions();

    expect(UserSession::query()->find($expired->id))->toBeNull()
        ->and(UserSession::query()->find($live->id))->not->toBeNull();
});

it('falls back to the creation time when no activity was ever recorded', function () {
    $neverActive = UserSession::factory()->for($this->user)->create([
        'last_activity_at' => null,
        'created_at' => now()->subDays(31),
    ]);

    pruneUserSessions();

    expect(UserSession::query()->find($neverActive->id))->toBeNull();
});

it('keeps rows inside the activity write throttle past the session lifetime', function () {
    $justPastLifetime = UserSession::factory()->for($this->user)->create([
        'last_activity_at' => now()->subMinutes(THIRTY_DAYS_IN_MINUTES + 3),
    ]);

    pruneUserSessions();

    expect(UserSession::query()->find($justPastLifetime->id))->not->toBeNull();
});

it('is scheduled to run daily', function () {
    $pruneEvents = collect(app(Schedule::class)->events())
        ->filter(fn (Event $event) => str_contains((string) $event->command, 'model:prune')
            && str_contains((string) $event->command, 'UserSession'));

    expect($pruneEvents)->toHaveCount(1)
        ->and($pruneEvents->first()->expression)->toBe('10 3 * * *');
});
