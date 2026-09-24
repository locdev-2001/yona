<?php

namespace App\Services\Messages;

use App\Jobs\ConversationReplyEmailJob;
use App\Models\Message;
use Illuminate\Support\Facades\Redis;

/**
 * Kênh Website/API: khách nhận thư tổng hợp khi agent trả lời. Khóa Redis đặt
 * theo hội thoại để hàng đợi chậm không xếp trùng job.
 */
class SendEmailNotificationService
{
    private const MAILER_KEY_TTL_SECONDS = 3600;

    private const MAILER_DELAY_SECONDS = 120;

    public function __construct(private readonly Message $message) {}

    public function perform(): void
    {
        if (! $this->shouldSendEmailNotification()) {
            return;
        }

        $conversation = $this->message->conversation;
        $key = 'CONVERSATION_MAILER_KEY::'.$conversation->id;

        if (! Redis::set($key, $this->message->id, 'EX', self::MAILER_KEY_TTL_SECONDS, 'NX')) {
            return;
        }

        ConversationReplyEmailJob::dispatch($conversation, $this->message->id)
            ->delay(now()->addSeconds(self::MAILER_DELAY_SECONDS));
    }

    private function shouldSendEmailNotification(): bool
    {
        return $this->message->isEmailNotifiableMessage()
            && filled($this->message->conversation->contact?->email)
            && $this->emailReplyEnabled();
    }

    private function emailReplyEnabled(): bool
    {
        $inbox = $this->message->inbox;

        return match ($inbox->channel_type) {
            'Channel::WebWidget' => (bool) $inbox->channel->continuity_via_email,
            'Channel::Api' => $inbox->account->featureEnabled('email_continuity_on_api_channel'),
            default => false,
        };
    }
}
