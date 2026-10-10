<?php

namespace App\Jobs\Inboxes;

use App\Jobs\ApplicationJob;
use App\Models\Channel\Email;
use App\Services\Email\Push\MailboxPushSubscriptions;

// Đăng ký báo thư mới ngoài luồng request: gọi ra nhà cung cấp chậm hay hỏng không làm treo màn kết nối.
class SubscribeMailboxPushJob extends ApplicationJob
{
    public function __construct(public readonly Email $channel) {}

    public function handle(MailboxPushSubscriptions $subscriptions): void
    {
        $subscriptions->subscribe($this->channel);
    }
}
