<?php

use App\Jobs\Account\ConversationsResolutionSchedulerJob;
use App\Jobs\AutomationRules\TriggerPendingExecutionsJob;
use App\Jobs\Conversations\ReopenSnoozedConversationsJob;
use App\Jobs\Inboxes\FetchImapEmailInboxesJob;
use App\Jobs\Notification\RemoveOldNotificationJob;
use App\Jobs\Notification\ReopenSnoozedNotificationsJob;
use App\Jobs\Search\ProcessSearchOutboxJob;
use App\Jobs\Zalo\ZaloHealthSweepJob;
use App\Models\UserSession;
use App\Search\SearchOutbox;
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
// Outbox tìm kiếm đã xếp job ngay sau mỗi lần ghi; lịch này vét phần xếp hàng lỗi
// hoặc job hết lượt thử. Engine không giữ chỉ mục riêng thì không chạy.
Schedule::job(new ProcessSearchOutboxJob)->everyMinute()->when(fn () => app(SearchOutbox::class)->enabled());

// Horizon chỉ vẽ được biểu đồ thông lượng/thời gian chờ nếu có ai chụp ảnh
// hàng đợi định kỳ; không có dòng này thì tab Metrics trống.
Schedule::command('horizon:snapshot')->everyFiveMinutes();
// Pulse ghi thẳng vào PostgreSQL dùng chung — dọn bản ghi quá hạn mỗi giờ để
// bảng pulse_* không phình ra cạnh dữ liệu khách.
Schedule::command('pulse:trim')->hourly();

// Ảnh thẻ gửi qua kênh không có dạng gốc (Zalo): kênh đã tải về lúc gửi, bản cache chỉ còn tốn đĩa.
Schedule::command('messaging:prune-card-images')->dailyAt('03:40');
// Xoá sticker trước rồi mới xoá tin đã gửi thì tệp sticker bị bỏ lại trên đĩa.
Schedule::command('stickers:prune-orphan-files')->weeklyOn(0, '03:50');
// Dòng user_sessions của phiên đã hết hạn tự nhiên không ai xoá; để lại thì
// chạm trần số phiên dù người dùng không còn phiên nào sống.
Schedule::command('model:prune', ['--model' => [UserSession::class]])->dailyAt('03:10');

// Cảnh báo khi Horizon/Reverb/zalo-bridge đổi trạng thái, không phải mỗi phút.
Schedule::command('monitor:check')
    ->everyMinute()
    ->withoutOverlapping()
    ->onOneServer();
