<?php

namespace App\Modules\Chat\Delivery;

/**
 * Ý định soạn một tin đi ra, đã tách khỏi mọi ngữ cảnh HTTP.
 */
final readonly class ComposeMessageInput
{
    /**
     * @param  array<string, mixed>|null  $sticker  {id, cate_id, type?, url?, thumbnail?}
     */
    public function __construct(
        public ?string $text = null,
        public ?string $attachmentId = null,
        public ?string $replyToMessageId = null,
        public ?array $sticker = null,
    ) {}

    /**
     * @param  array<string, mixed>  $validated  dữ liệu đã qua tầng validate của biên vào
     */
    public static function fromValidated(array $validated): self
    {
        return new self(
            text: isset($validated['text']) ? (string) $validated['text'] : null,
            attachmentId: $validated['attachment_id'] ?? null,
            replyToMessageId: $validated['reply_to_message_id'] ?? null,
            sticker: $validated['sticker'] ?? null,
        );
    }
}
