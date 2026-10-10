<?php

namespace App\Services\Email\Push;

use App\Models\Channel\Email;

/**
 * Nhà cung cấp hộp thư báo "có thư mới" về Yona thay vì chờ lượt quét IMAP. Báo chỉ là
 * tín hiệu; đọc thư vẫn qua IMAP. Nhà cung cấp chưa có subscriber thì hộp thư chỉ quét.
 */
interface MailboxPushSubscriber
{
    public function supports(Email $channel): bool;

    /** @throws MailboxPushException */
    public function subscribe(Email $channel): MailboxPushSubscription;

    /** @throws MailboxPushException */
    public function stop(Email $channel): void;
}
