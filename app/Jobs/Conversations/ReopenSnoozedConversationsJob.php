<?php

namespace App\Jobs\Conversations;

use App\Jobs\ApplicationJob;
use App\Models\Conversation;

// Port từ refs/chatwoot/app/jobs/conversations/reopen_snoozed_conversations_job.rb.
// Gốc do TriggerScheduledItemsJob gọi mỗi 5 phút (config/schedule.yml) —
// ở đây đăng ký thẳng trong routes/console.php cùng cron.
class ReopenSnoozedConversationsJob extends ApplicationJob
{
    public const BATCH_SIZE = 100;

    public function __construct()
    {
        $this->onQueue('low');
    }

    public function handle(): void
    {
        Conversation::query()
            ->where('status', Conversation::STATUS_SNOOZED)
            ->whereBetween('snoozed_until', [now()->subDays(3), now()])
            ->chunkById(self::BATCH_SIZE, function ($conversations) {
                // open! của gốc = update status → hook updated chạy đủ (event + activity).
                $conversations->each(fn (Conversation $conversation) => $conversation->update(['status' => Conversation::STATUS_OPEN]));
            });
    }
}
