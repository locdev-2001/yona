<?php

namespace App\Jobs\Inboxes;

use App\Jobs\ApplicationJob;
use App\Models\Channel\Email;
use App\Services\Email\MailServerException;
use App\Services\Email\OAuth\EmailOAuthProviders;
use App\Services\Email\OAuth\EmailOAuthTokenManager;

// Lấy tên chủ hộp thư đã đặt ở nhà cung cấp ngoài luồng request, làm tên người gửi của hộp.
// Chỉ điền khi hộp chưa có tên doanh nghiệp: tên người dùng tự đặt trong Yona luôn thắng.
class SyncMailboxSenderNameJob extends ApplicationJob
{
    public function __construct(public readonly Email $channel) {}

    public function handle(EmailOAuthTokenManager $tokens): void
    {
        $inbox = $this->channel->inbox;
        $provider = EmailOAuthProviders::forChannel($this->channel);

        if ($inbox === null || $provider === null || filled($inbox->business_name)) {
            return;
        }

        try {
            $name = $provider->senderDisplayName($tokens->accessToken($this->channel, recordFailure: false), (string) $this->channel->email);
        } catch (MailServerException) {
            return;
        }

        if ($name !== null) {
            $inbox->update(['business_name' => $name]);
        }
    }
}
