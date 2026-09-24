<?php

namespace App\Services\Email;

use App\Mail\ConversationReplyMail;
use App\Models\Message;
use App\Services\Messages\StatusUpdateService;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Tin outgoing của inbox
 * email được gửi ra ngoài ngay, source_id giữ Message-ID để thư trả lời nối lại được.
 */
class SendOnEmailService
{
    public function __construct(private readonly Message $message) {}

    public function perform(): void
    {
        if (! $this->shouldSendMessage()) {
            return;
        }

        try {
            $mailable = ConversationReplyMail::emailReply($this->message);

            if ($mailable === null) {
                return;
            }

            $sent = ChannelMailer::send($this->message->conversation->inbox, $mailable);
            $messageId = $sent?->getMessageId();

            Log::info("Email message {$this->message->id} sent with source_id: ".(string) $messageId);

            if (filled($messageId)) {
                $this->message->update(['source_id' => $messageId]);
            }
        } catch (Throwable $exception) {
            report($exception);
            (new StatusUpdateService($this->message, 'failed'))->perform();
        }
    }

    // Base::SendOnChannelService#perform: kênh phải khớp, tin không private,
    // hội thoại chưa bị bot giữ; email_notifiable_message? là điều kiện riêng của kênh.
    private function shouldSendMessage(): bool
    {
        return $this->message->conversation->inbox->isEmail()
            && ! $this->message->private
            && $this->message->isEmailNotifiableMessage();
    }
}
