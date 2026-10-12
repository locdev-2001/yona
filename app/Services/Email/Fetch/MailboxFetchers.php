<?php

namespace App\Services\Email\Fetch;

use App\Models\Channel\Email;
use App\Services\Imap\FetchEmailService;
use LogicException;

/** Sổ cách kéo thư theo hộp thư: driver đầu tiên nhận hộp thư thắng, IMAP đứng cuối làm mặc định. */
class MailboxFetchers
{
    /** @var list<class-string<MailboxFetcher>> */
    private const DRIVERS = [
        GmailApiFetcher::class,
        FetchEmailService::class,
    ];

    public function for(Email $channel, int $interval = 1): MailboxFetcher
    {
        foreach (self::DRIVERS as $driver) {
            if ($driver::supports($channel)) {
                return app($driver, ['channel' => $channel, 'interval' => $interval]);
            }
        }

        throw new LogicException('Không có cách kéo thư nào nhận hộp thư '.$channel->getKey());
    }
}
