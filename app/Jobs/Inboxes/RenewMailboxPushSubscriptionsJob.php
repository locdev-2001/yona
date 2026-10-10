<?php

namespace App\Jobs\Inboxes;

use App\Jobs\ApplicationJob;
use App\Models\Account;
use App\Models\Channel\Email;
use App\Services\Email\Push\MailboxPushSubscriptions;

// Hằng ngày: gia hạn báo thư mới cho mọi hộp thư sắp hết hạn đăng ký (Gmail watch sống 7 ngày).
class RenewMailboxPushSubscriptionsJob extends ApplicationJob
{
    public function handle(MailboxPushSubscriptions $subscriptions): void
    {
        Email::query()
            ->where('imap_enabled', true)
            ->whereHas('inbox')
            ->whereHas('account', fn ($query) => $query->where('status', Account::STATUS_ACTIVE))
            ->chunkById(100, function ($channels) use ($subscriptions) {
                foreach ($channels as $channel) {
                    $subscriptions->renewIfDue($channel);
                }
            });
    }
}
