<?php

namespace App\Services\Messaging;

use App\Builders\Messages\MessageBuilder;
use App\Messaging\Structured\InvalidStructuredPayload;
use App\Messaging\Structured\StructuredTypeRegistry;
use App\Models\Message;
use App\Support\SubmittedValues;
use Illuminate\Support\Facades\DB;

/**
 * Khách trả lời một tin có cấu trúc (bấm chip, gửi form, chọn nút…) từ bất kỳ
 * đâu: widget, trang công khai, nút của kênh, gõ số trên Zalo.
 *
 * Ghi `submitted_values` lên tin gốc (widget và hộp thư hiện "đã chọn") và tạo
 * một tin incoming mang nhãn lựa chọn để nhân viên, automation, webhook thấy
 * như một câu trả lời thường.
 */
final class SubmissionService
{
    public function __construct(private readonly StructuredTypeRegistry $registry) {}

    /**
     * @param  Message|null  $repliedBy  tin incoming CỦA KHÁCH đã có sẵn (gõ số trên kênh
     *                                   chữ — ChoiceReplyResolver): không tạo tin incoming thứ
     *                                   hai, chỉ gắn `content_attributes.choice_of` vào tin này.
     * @return Message|null tin incoming đã tạo (hoặc `$repliedBy` khi truyền vào); null khi
     *                      tin gốc đời cũ không có payload hợp lệ (chỉ lưu giá trị như trước
     *                      khi có lõi)
     *
     * @throws InvalidStructuredPayload
     */
    public function submit(Message $message, mixed $submitted, ?Message $repliedBy = null): ?Message
    {
        $type = $this->registry->for($message->contentTypeName());
        $attributes = $type === null ? null : $this->registry->read($message);

        if ($type === null || $attributes === null) {
            $this->storeLegacy($message, $submitted);

            return null;
        }

        return DB::transaction(function () use ($message, $type, $attributes, $submitted, $repliedBy): Message {
            // Khoá dòng: hai lần bấm gần nhau chỉ một lần được ghi nhận.
            $locked = Message::query()->whereKey($message->id)->lockForUpdate()->firstOrFail();

            if (filled($locked->content_attributes['submitted_values'] ?? null)) {
                throw InvalidStructuredPayload::because('already_submitted');
            }

            $accepted = $type->acceptSubmission($attributes, $submitted);
            $locked->update(['content_attributes' => [...($locked->content_attributes ?? []), 'submitted_values' => $accepted]]);
            $message->setRawAttributes($locked->getAttributes(), true);

            if ($repliedBy !== null) {
                $repliedBy->update(['content_attributes' => [...($repliedBy->content_attributes ?? []), 'choice_of' => $message->id]]);

                return $repliedBy;
            }

            return (new MessageBuilder(
                user: null,
                conversation: $message->conversation,
                params: ['content' => $type->submissionText($accepted), 'message_type' => 'incoming'],
                incomingAllowed: true,
                trustedContentAttributes: ['in_reply_to_choice' => $message->id],
            ))->perform();
        });
    }

    private function storeLegacy(Message $message, mixed $submitted): void
    {
        $message->update([
            'content_attributes' => [
                ...($message->content_attributes ?? []),
                'submitted_values' => SubmittedValues::permit($submitted),
            ],
        ]);
    }
}
