<?php

namespace App\Services\Email\Bounce;

use App\Models\Inbox;
use App\Models\Message;
use App\Services\Channels\ChannelMessageStatus;
use Illuminate\Support\Facades\Log;

/**
 * Thư trả về không mở hội thoại: tìm tin đi gốc trong hộp thư theo Message-ID rồi đánh
 * dấu gửi lỗi kèm lý do người trực đọc được khi chính khách của hội thoại không nhận được
 * thư. Không khớp tin nào thì bỏ qua êm.
 */
class EmailBounceHandler
{
    public const ERROR_CODE = 'email_bounced';

    // Message-ID Yona tự đặt cho thư đi: conversation/{uuid}/messages/{id}@tên-miền.
    private const OWN_MESSAGE_ID_PATTERN = '#^conversation/([a-zA-Z0-9-]+)/messages/(\d+)@#';

    public function handle(BounceReport $report, Inbox $inbox): ?Message
    {
        $message = $this->originalMessage($report->originalMessageIds(), $inbox);

        if ($message === null) {
            Log::info("[EMAIL BOUNCE] Không khớp tin đi nào trong inbox {$inbox->id}");

            return null;
        }

        $recipient = $this->failedConversationRecipient($report, $message);

        if ($recipient === null) {
            // Chỉ người CC/BCC bị trả thư: khách chính vẫn nhận được nên tin không tính là lỗi.
            Log::info("[EMAIL BOUNCE] Người nhận lỗi không phải khách của hội thoại, tin {$message->id}");

            return null;
        }

        $diagnostic = $report->diagnosticFor($recipient);

        $errorMessage = $message->conversation->inAccountLocale(fn () => $diagnostic === null
            ? __('errors.messages.email_bounced_without_reason', ['email' => $recipient])
            : __('errors.messages.email_bounced', ['email' => $recipient, 'reason' => $diagnostic]));

        ChannelMessageStatus::fail($message, ['code' => self::ERROR_CODE, 'message' => $errorMessage]);

        return $message;
    }

    private function failedConversationRecipient(BounceReport $report, Message $message): ?string
    {
        $conversationRecipients = array_map('strtolower', array_filter([
            $message->conversation->contactInbox?->source_id,
            $message->conversation->contact?->email,
        ]));

        foreach ($report->failedRecipients() as $failedRecipient) {
            if (in_array(strtolower($failedRecipient), $conversationRecipients, true)) {
                return $failedRecipient;
            }
        }

        return null;
    }

    /** @param  list<string>  $messageIds */
    private function originalMessage(array $messageIds, Inbox $inbox): ?Message
    {
        if ($messageIds === []) {
            return null;
        }

        $bySourceId = $inbox->messages()->outgoing()->whereIn('source_id', $messageIds)->latest('id')->first();

        if ($bySourceId !== null) {
            return $bySourceId;
        }

        foreach ($messageIds as $messageId) {
            if (preg_match(self::OWN_MESSAGE_ID_PATTERN, $messageId, $matches) !== 1) {
                continue;
            }

            $message = $inbox->messages()->outgoing()
                ->whereKey((int) $matches[2])
                ->whereHas('conversation', fn ($query) => $query->where('uuid', $matches[1]))
                ->first();

            if ($message !== null) {
                return $message;
            }
        }

        return null;
    }
}
