<?php

namespace App\Messaging\Structured\Types;

use App\Messaging\Structured\AbstractStructuredType;
use App\Messaging\Structured\Choice;
use App\Messaging\Structured\InvalidStructuredPayload;
use App\Messaging\Structured\PayloadContext;

/**
 * Thẻ "mở trang để thao tác": trang công khai trên domain Yona (chọn lịch, form dài,
 * tra đơn…). Widget mở trong sheet, kênh khác nhận link. Chỉ trang đã đăng ký.
 */
final class WebviewType extends AbstractStructuredType
{
    public const PAGES = ['schedule', 'form', 'order_tracking', 'product', 'bank_transfer'];

    public const MAX_DATA_BYTES = 16_384;

    public function contentType(): string
    {
        return 'webview';
    }

    public function rules(): array
    {
        return [
            'content' => ['nullable', 'string', 'max:2000'],
            'page' => ['required', 'string', 'in:'.implode(',', self::PAGES)],
            'title' => ['required', 'string', 'max:80'],
            'subtitle' => ['nullable', 'string', 'max:120'],
            'cta_label' => ['nullable', 'string', 'max:30'],
            'data' => ['nullable', 'array'],
        ];
    }

    public function normalize(array $attributes, PayloadContext $context): array
    {
        $data = $attributes['data'] ?? [];

        if (strlen((string) json_encode($data)) > self::MAX_DATA_BYTES) {
            throw InvalidStructuredPayload::because('payload_too_large');
        }

        return array_filter([
            'page' => $attributes['page'],
            'title' => trim($attributes['title']),
            'subtitle' => filled($attributes['subtitle'] ?? null) ? trim($attributes['subtitle']) : null,
            'cta_label' => filled($attributes['cta_label'] ?? null) ? trim($attributes['cta_label']) : null,
            'data' => $data === [] ? null : $data,
        ], fn (mixed $value) => $value !== null);
    }

    public function plainText(?string $content, array $attributes, ?string $pageUrl = null): string
    {
        return self::lines([$content, $attributes['title'], $attributes['subtitle'] ?? null, $pageUrl]);
    }

    public function previewText(?string $content, array $attributes): string
    {
        return filled($content) ? trim((string) $content) : $attributes['title'];
    }

    public function needsPublicPage(array $attributes): bool
    {
        return true;
    }

    // Chỉ trang "schedule" nhận câu trả lời (chọn ngày + khung giờ trong
    // `data.slots`); các trang còn lại chỉ để xem trên `/m/{token}`.
    public function acceptSubmission(array $attributes, mixed $submitted): array
    {
        if (($attributes['page'] ?? null) !== 'schedule') {
            throw InvalidStructuredPayload::notAnswerable($this->contentType());
        }

        return self::acceptedChoice(self::pickChoice($this->scheduleChoices($attributes), $submitted));
    }

    public function submissionText(array $accepted): string
    {
        return self::choiceLabel($accepted);
    }

    /** @return list<Choice> */
    private function scheduleChoices(array $attributes): array
    {
        $slots = $attributes['data']['slots'] ?? [];
        $choices = [];

        foreach (is_array($slots) ? $slots : [] as $slot) {
            if (! is_array($slot) || ($slot['full'] ?? false) || ! isset($slot['value'], $slot['label'])) {
                continue;
            }

            $choices[] = new Choice((string) $slot['value'], (string) $slot['label']);
        }

        return $choices;
    }
}
