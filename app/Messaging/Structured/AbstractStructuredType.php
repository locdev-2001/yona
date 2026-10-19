<?php

namespace App\Messaging\Structured;

use App\Models\Message;

/** Mặc định an toàn: chỉ nhân viên/bot gửi, không có lựa chọn, không nhận trả lời. */
abstract class AbstractStructuredType implements StructuredType
{
    public function allowedMessageTypes(): array
    {
        return [Message::TYPE_OUTGOING, Message::TYPE_TEMPLATE];
    }

    public function plainText(?string $content, array $attributes): string
    {
        return self::lines([$content]);
    }

    public function previewText(?string $content, array $attributes): string
    {
        return trim((string) $content);
    }

    public function choices(array $attributes): array
    {
        return [];
    }

    public function acceptSubmission(array $attributes, mixed $submitted): array
    {
        throw InvalidStructuredPayload::notAnswerable($this->contentType());
    }

    public function submissionText(array $accepted): string
    {
        return '';
    }

    /** Ghép các dòng khác rỗng. */
    protected static function lines(array $lines): string
    {
        return implode("\n", array_values(array_filter(
            array_map(fn (mixed $line) => trim((string) $line), $lines),
            fn (string $line) => $line !== '',
        )));
    }

    /**
     * Chọn một lựa chọn theo `value` (hoặc `title` với client đời cũ chỉ gửi nhãn).
     *
     * @param  list<Choice>  $choices
     */
    protected static function pickChoice(array $choices, mixed $submitted): Choice
    {
        $entry = is_array($submitted) && array_is_list($submitted) ? ($submitted[0] ?? null) : $submitted;
        $value = is_array($entry) ? ($entry['value'] ?? $entry['title'] ?? null) : $entry;

        foreach ($choices as $choice) {
            if (is_scalar($value) && ((string) $value === $choice->value || (string) $value === $choice->label)) {
                return $choice;
            }
        }

        throw InvalidStructuredPayload::unknownChoice();
    }

    /** @return list<array{title: string, value: string}> dạng `submitted_values` client hiện có đang đọc. */
    protected static function acceptedChoice(Choice $choice): array
    {
        return [['title' => $choice->label, 'value' => $choice->value]];
    }

    protected static function choiceLabel(array $accepted): string
    {
        return (string) ($accepted[0]['title'] ?? $accepted[0]['value'] ?? '');
    }
}
