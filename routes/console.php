<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// P04 — Reminder scheduler: fires notifications for all due reminders.
// withoutOverlapping prevents concurrent runs if the previous tick is slow.
// G12: ReminderService::dispatchDue() handles per-workspace context isolation.
Schedule::command('reminders:dispatch-due')->everyMinute()->withoutOverlapping();
