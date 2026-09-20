<?php

use App\Jobs\Account\ConversationsResolutionSchedulerJob;
use App\Jobs\AutomationRules\TriggerPendingExecutionsJob;
use App\Jobs\Conversations\ReopenSnoozedConversationsJob;
use App\Jobs\Inboxes\FetchImapEmailInboxesJob;
use App\Jobs\Notification\RemoveOldNotificationJob;
use App\Jobs\Notification\ReopenSnoozedNotificationsJob;
use App\Jobs\Zalo\ZaloHealthSweepJob;
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
Schedule::job(new TriggerPendingExecutionsJob)->cron('*/5 * * * *');
// config/schedule.yml gốc: trigger_imap_email_inboxes_job cron '*/1 * * * *'.
Schedule::job(new FetchImapEmailInboxesJob)->cron('*/1 * * * *');
// G1 Zalo: nhịp tim Laravel ↔ zalo-bridge. Không có nó, bridge chết là DB vẫn báo
// "connected" và chủ shop không thấy gì (zalo-deep-audit 6.5).
Schedule::job(new ZaloHealthSweepJob)->cron('*/1 * * * *')->withoutOverlapping();

// Horizon chỉ vẽ được biểu đồ thông lượng/thời gian chờ nếu có ai chụp ảnh
// hàng đợi định kỳ; không có dòng này thì tab Metrics trống.
Schedule::command('horizon:snapshot')->everyFiveMinutes();
// Pulse ghi thẳng vào PostgreSQL dùng chung — dọn bản ghi quá hạn mỗi giờ để
// bảng pulse_* không phình ra cạnh dữ liệu khách.
Schedule::command('pulse:trim')->hourly();
