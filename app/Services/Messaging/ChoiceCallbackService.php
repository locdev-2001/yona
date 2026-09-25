<?php

namespace App\Services\Messaging;

use App\Messaging\Structured\InvalidStructuredPayload;
use App\Messaging\Structured\StructuredTypeRegistry;
use App\Models\Message;

/**
 * Map lựa chọn nhận từ nút/chip gốc của kênh (Telegram callback_query, FB
 * quick reply) về tin gốc rồi giao cho `SubmissionService` — dùng chung cho
 * mọi kênh có nút gốc, tránh mỗi kênh tự tra cứu tin + kiểm tenant.
 */
final class ChoiceCallbackService
{
    public function __construct(
        private readonly StructuredTypeRegistry $registry,
        private readonly SubmissionService $submissions,
    ) {}

    /** Trả về tin incoming đã tạo, hoặc null khi payload không hợp lệ/đã trả lời/khác tenant. */
    public function resolve(int $messageId, ?string $value, ?int $index, int $accountId): ?Message
    {
        $message = Message::find($messageId);

        if ($message === null || $message->account_id !== $accountId) {
            return null;
        }

        $type = $this->registry->for($message->contentTypeName());
        $attributes = $type === null ? null : $this->registry->read($message);

        if ($type === null || $attributes === null) {
            return null;
        }

        $submitted = $value ?? ($type->choices($attributes)[$index]->value ?? null);

        if ($submitted === null) {
            return null;
        }

        try {
            return $this->submissions->submit($message, $submitted);
        } catch (InvalidStructuredPayload) {
            // Đã trả lời trước đó, hoặc bấm khi tin đã hết hạn — bỏ qua êm.
            return null;
        }
    }
}
