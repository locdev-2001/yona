<?php

namespace App\Jobs\Inboxes;

use App\Jobs\ApplicationJob;
use App\Models\Account;
use App\Models\Inbox;
use Illuminate\Support\Facades\Log;

// Cron mỗi phút: duyệt mọi inbox email đủ điều kiện và xếp job quét riêng.
class FetchImapEmailInboxesJob extends ApplicationJob
{
    public function handle(): void
    {
        Inbox::query()
            ->where('channel_type', 'Channel::Email')
            ->with('channel.account')
            ->chunkById(100, function ($inboxes) {
                foreach ($inboxes as $inbox) {
                    if (! $this->shouldFetchEmails($inbox)) {
                        continue;
                    }

                    Log::info('[IMAP] Enqueuing fetch job for inbox '.$inbox->id);
                    FetchImapEmailsJob::dispatch($inbox->channel);
                }
            });
    }

    private function shouldFetchEmails(Inbox $inbox): bool
    {
        return $inbox->account->status === Account::STATUS_ACTIVE
            && $inbox->channel->imap_enabled
            && ! $inbox->channel->reauthorizationRequired();
    }
}
