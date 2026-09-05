<?php

use App\Jobs\Conversations\ReopenSnoozedConversationsJob;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// config/schedule.yml gốc: trigger_scheduled_items_job cron '*/5 * * * *'.
Schedule::job(new ReopenSnoozedConversationsJob)->cron('*/5 * * * *');
