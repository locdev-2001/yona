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

// Automation — resume workflow_runs whose "wait" node has elapsed.
Schedule::command('workflow:resume-waiting')->everyMinute()->withoutOverlapping();

// P04 — bảng tạm inbox BOUNDED (goal #3): pending_message_states expired +
// attachments upload-không-gửi quá 48h. Daily là đủ (TTL tính bằng giờ).
Schedule::command('inbox:prune-transient')->daily()->withoutOverlapping();
