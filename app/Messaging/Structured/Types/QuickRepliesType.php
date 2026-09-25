<?php

namespace App\Messaging\Structured\Types;

use App\Messaging\Structured\AbstractStructuredType;
use App\Messaging\Structured\Choice;
use App\Messaging\Structured\InvalidStructuredPayload;
use App\Messaging\Structured\PayloadContext;

/** Câu hỏi + chip trả lời nhanh. Giữ khoá `items[{title,value}]` mà FB/LINE/Telegram đang đọc. */
final class QuickRepliesType extends AbstractStructuredType
{
    public const MAX_ITEMS = 10;

    public function contentType(): string
    {
        return 'input_select';
    }

    public function rules(): array
    {
        return [
            'content' => ['required', 'string', 'max:2000'],
            'items' => ['required', 'array', 'list', 'min:1', 'max:'.self::MAX_ITEMS],
            'items.*' => ['array'],
            'items.*.title' => ['required', 'string', 'max:80'],
            'items.*.value' => ['nullable', 'string', 'max:200'],
        ];
    }

    public function normalize(array $attributes, PayloadContext $context): array
    {
        $items = array_map(fn (array $item) => [
            'title' => trim($item['title']),
            'value' => trim((string) ($item['value'] ?? '')) ?: trim($item['title']),
        ], $attributes['items']);

        if (count(array_unique(array_column($items, 'value'))) !== count($items)) {
            throw InvalidStructuredPayload::because('duplicate_choice');
        }

        return ['items' => $items];
    }

    public function choices(array $attributes): array
    {
        return array_map(fn (array $item) => new Choice($item['value'], $item['title']), $attributes['items']);
    }

    public function acceptSubmission(array $attributes, mixed $submitted): array
    {
        return self::acceptedChoice(self::pickChoice($this->choices($attributes), $submitted));
    }

    public function submissionText(array $accepted): string
    {
        return self::choiceLabel($accepted);
    }
}
