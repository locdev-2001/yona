<?php

namespace App\Listeners;

use App\Events\DomainEvent;
use App\Events\EventType;
use App\Messaging\Delivery\DeliveryLevel;
use App\Messaging\Structured\InvalidStructuredPayload;
use App\Messaging\Structured\StructuredTypeRegistry;
use App\Models\Message;
use App\Services\Messaging\SubmissionService;

/**
 * Khách gõ một con số trên kênh không có chip/nút gốc (Zalo, SMS…) để trả lời
 * tin có lựa chọn: map về tin gốc thay vì để rơi thành chữ tự do
 * (docs/system-architecture.md §3 "Map câu trả lời về lựa chọn").
 */
class ChoiceReplyResolver extends BaseListener
{
    private const REPLY_WINDOW_HOURS = 24;

    public function __construct(
        private readonly StructuredTypeRegistry $registry,
        private readonly SubmissionService $submissions,
    ) {}

    public function handle(DomainEvent $event): void
    {
        if ($event->type !== EventType::MESSAGE_CREATED) {
            return;
        }

        [$message] = $this->extractMessageAndAccount($event);

        if ($message->message_type !== Message::TYPE_INCOMING) {
            return;
        }

        $index = self::digitChoiceIndex($message->content);

        if ($index === null) {
            return;
        }

        $original = $this->latestUnansweredChoice($message);

        if ($original === null) {
            return;
        }

        $attributes = $this->registry->read($original);
        $type = $this->registry->for($original->contentTypeName());
        $choices = $type?->choices($attributes ?? []) ?? [];

        if (! isset($choices[$index])) {
            return;
        }

        try {
            $this->submissions->submit($original, $choices[$index]->value, repliedBy: $message);
        } catch (InvalidStructuredPayload) {
            // Trả lời trùng lúc gần như đồng thời — tin khách vẫn đến nhân viên bình thường.
        }
    }

    /** "2", " 2. " → 1; "5" → 4; "ok", "2 cái" → null (bỏ khoảng trắng/dấu chấm rồi mới kiểm số). */
    private static function digitChoiceIndex(?string $content): ?int
    {
        $stripped = preg_replace('/[\s.]+/u', '', (string) $content) ?? '';

        if ($stripped === '' || ! ctype_digit($stripped) || strlen($stripped) > 2) {
            return null;
        }

        return ((int) $stripped) - 1;
    }

    /**
     * Tin outgoing/template gần nhất còn lựa chọn chưa trả lời, trong 24 giờ, và đã thực sự
     * tới khách dưới dạng danh sách đánh số — khách không thấy số thì "2" chỉ là chữ.
     */
    private function latestUnansweredChoice(Message $incoming): ?Message
    {
        $contentTypes = array_map(
            fn (string $name) => Message::CONTENT_TYPES[$name],
            $this->registry->contentTypes(),
        );

        $candidates = Message::query()
            ->where('conversation_id', $incoming->conversation_id)
            ->whereIn('message_type', [Message::TYPE_OUTGOING, Message::TYPE_TEMPLATE])
            ->whereIn('content_type', $contentTypes)
            ->where('created_at', '>=', $incoming->created_at->copy()->subHours(self::REPLY_WINDOW_HOURS))
            ->orderByDesc('id')
            ->get();

        return $candidates->first(function (Message $candidate): bool {
            if (($candidate->content_attributes['delivery'] ?? null) !== DeliveryLevel::TextNumbered->value
                || filled($candidate->content_attributes['submitted_values'] ?? null)) {
                return false;
            }

            $attributes = $this->registry->read($candidate);
            $type = $this->registry->for($candidate->contentTypeName());

            return $attributes !== null && $type !== null && $type->choices($attributes) !== [];
        });
    }
}
