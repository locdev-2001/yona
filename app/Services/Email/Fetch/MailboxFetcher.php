<?php

namespace App\Services\Email\Fetch;

use App\Models\Channel\Email;
use App\Services\Email\MailPresenter;
use App\Services\Email\MailServerException;

/**
 * Một cách kéo thư mới của hộp thư (IMAP, API của nhà cung cấp...). Job quét gọi `perform`,
 * xử lý từng thư, báo thư nào xong bằng `acknowledge`, rồi `commitSyncProgress` để lần sau
 * chỉ lấy phần mới và thử lại thư chưa xong.
 */
interface MailboxFetcher
{
    public static function supports(Email $channel): bool;

    /**
     * @return list<MailPresenter>
     *
     * @throws MailServerException
     */
    public function perform(): array;

    public function acknowledge(MailPresenter $mail): void;

    public function commitSyncProgress(): void;
}
