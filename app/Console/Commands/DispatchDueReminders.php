<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Modules\Shared\Services\ReminderService;

/**
 * Scheduler command: fire notifications for all due reminders.
 * Registered in routes/console.php with everyMinute()->withoutOverlapping().
 *
 * G12 note: ReminderService::dispatchDue() handles per-workspace context
 * isolation. Not Octane-safe in loop form; see service docblock.
 */
class DispatchDueReminders extends Command
{
    protected $signature = 'reminders:dispatch-due';

    protected $description = 'Fire notifications for all reminders past their remind_at time.';

    public function handle(ReminderService $service): int
    {
        $count = $service->dispatchDue();

        $this->line("Dispatched {$count} reminder notification(s).");

        return self::SUCCESS;
    }
}
