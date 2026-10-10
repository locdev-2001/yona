<?php

namespace App\Services\Email;

use App\Mail\ConversationReplyMail;
use App\Models\Message;
use App\Services\Channels\ChannelMessageStatus;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Symfony\Component\Mailer\Exception\TransportExceptionInterface;
use Throwable;

/**
 * Tin outgoing của inbox
 * email được gửi ra ngoài ngay, source_id giữ Message-ID để thư trả lời nối lại được.
 */
class SendOnEmailService
{
    public const SEND_FAILED_CODE = 'email_send_failed';

    private const REASON_MAX_LENGTH = 200;

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
            ChannelMessageStatus::fail($this->message, [
                'code' => self::SEND_FAILED_CODE,
                'message' => $this->message->conversation->inAccountLocale(fn () => $this->failureMessage($exception)),
            ]);
        }
    }

    /** Lý do người trực đọc được: lời máy chủ SMTP trả về, hoặc lời nhắn kết nối hộp thư. */
    private function failureMessage(Throwable $exception): string
    {
        if ($exception instanceof MailServerException) {
            return $exception->userMessage();
        }

        if ($exception instanceof TransportExceptionInterface) {
            $reply = preg_match('/with message "(.+)"/s', $exception->getMessage(), $matches) === 1
                ? $matches[1]
                : $exception->getMessage();
            $reply = trim((string) preg_replace('/\s+/', ' ', $reply));

            if ($reply !== '') {
                return __('errors.messages.email_send_failed', ['reason' => Str::limit($reply, self::REASON_MAX_LENGTH)]);
            }
        }

        return __('errors.messages.email_send_failed_unknown');
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
