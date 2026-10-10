<?php

namespace App\Services\Email\Bounce;

use App\Models\Inbox;
use App\Models\Message;
use App\Services\Channels\ChannelMessageStatus;
use Illuminate\Support\Facades\Log;

/**
 * Thư trả về không mở hội thoại: tìm tin đi gốc trong hộp thư theo Message-ID rồi đánh
 * dấu gửi lỗi kèm lý do người trực đọc được. Không khớp tin nào thì bỏ qua êm.
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

        $recipient = $report->failedRecipient() ?? $message->conversation->contactInbox?->source_id;
        $diagnostic = $report->diagnostic();

        $errorMessage = $message->conversation->inAccountLocale(fn () => $diagnostic === null
            ? __('errors.messages.email_bounced_without_reason', ['email' => $recipient])
            : __('errors.messages.email_bounced', ['email' => $recipient, 'reason' => $diagnostic]));

        ChannelMessageStatus::fail($message, ['code' => self::ERROR_CODE, 'message' => $errorMessage]);

        return $message;
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
