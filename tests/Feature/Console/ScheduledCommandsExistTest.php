<?php

use Illuminate\Console\Scheduling\Event;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Support\Facades\Artisan;

it('only schedules artisan commands that exist', function () {
    $registered = array_keys(Artisan::all());

    $missing = collect(app(Schedule::class)->events())
        ->filter(fn (Event $event) => str_contains($event->command ?? '', 'artisan'))
        ->map(fn (Event $event) => preg_match("/artisan['\"]?\s+(\S+)/", $event->command, $m) ? trim($m[1], "'\"") : null)
        ->filter(fn (?string $name) => $name !== null && ! in_array($name, $registered, true))
        ->values()
        ->all();

    expect($missing)->toBe([]);
});
