<?php

use App\Jobs\Account\ConversationsResolutionSchedulerJob;
use App\Jobs\Conversations\ReopenSnoozedConversationsJob;
use App\Jobs\Notification\RemoveOldNotificationJob;
use App\Jobs\Notification\ReopenSnoozedNotificationsJob;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// config/schedule.yml gốc: trigger_scheduled_items_job cron '*/5 * * * *' —
// một cron duy nhất rải mọi job định kỳ ở dưới.
Schedule::job(new ReopenSnoozedConversationsJob)->cron('*/5 * * * *');
Schedule::job(new ReopenSnoozedNotificationsJob)->cron('*/5 * * * *');
// config/schedule.yml gốc: remove_old_notification_job cron '30 22 * * *'.
Schedule::job(new RemoveOldNotificationJob)->cron('30 22 * * *');
Schedule::job(new ConversationsResolutionSchedulerJob)->cron('*/5 * * * *');
