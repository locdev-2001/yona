<?php

namespace App\Messaging\Structured\Types;

use App\Messaging\Structured\AbstractStructuredType;
use App\Messaging\Structured\InvalidStructuredPayload;
use App\Messaging\Structured\PayloadContext;
use App\Support\EmailAddress;

/**
 * Form trong tin. Ngắn (≤ 3 ô, không có ô dài) thì điền ngay trong widget;
 * dài hơn thì mở trang công khai. Giữ khoá `items` của form đời cũ.
 */
final class FormType extends AbstractStructuredType
{
    public const FIELD_TYPES = ['text', 'text_area', 'email', 'phone', 'select', 'date'];

    public const INLINE_MAX_FIELDS = 3;

    public function contentType(): string
    {
        return 'form';
    }

    public function rules(): array
    {
        return [
            'content' => ['nullable', 'string', 'max:2000'],
            'items' => ['required', 'array', 'list', 'min:1', 'max:10'],
            'items.*' => ['array'],
            'items.*.name' => ['required', 'string', 'alpha_dash', 'max:40', 'distinct'],
            'items.*.type' => ['required', 'string', 'in:'.implode(',', self::FIELD_TYPES)],
            'items.*.label' => ['required', 'string', 'max:80'],
            'items.*.placeholder' => ['nullable', 'string', 'max:120'],
            'items.*.required' => ['nullable', 'boolean'],
            'items.*.options' => ['required_if:items.*.type,select', 'nullable', 'array', 'list', 'max:20'],
            'items.*.options.*.label' => ['required', 'string', 'max:80'],
            'items.*.options.*.value' => ['required', 'string', 'max:80'],
        ];
    }

    public function normalize(array $attributes, PayloadContext $context): array
    {
        return ['items' => array_map(fn (array $item) => array_filter([
            'name' => $item['name'],
            'type' => $item['type'],
            'label' => trim($item['label']),
            'placeholder' => filled($item['placeholder'] ?? null) ? trim($item['placeholder']) : null,
            'required' => ($item['required'] ?? false) ? true : null,
            'options' => $item['type'] === 'select'
                ? array_map(fn (array $option) => ['label' => trim($option['label']), 'value' => trim($option['value'])], $item['options'])
                : null,
        ], fn (mixed $value) => $value !== null), $attributes['items'])];
    }

    public function needsPublicPage(array $attributes): bool
    {
        return count($attributes['items']) > self::INLINE_MAX_FIELDS
            || in_array('text_area', array_column($attributes['items'], 'type'), true);
    }

    /** Nhận `[{name, value}]` hoặc `{name: value}`; trả `[{name, title, value}]`. */
    public function acceptSubmission(array $attributes, mixed $submitted): array
    {
        $values = $this->submittedMap($submitted);
        $accepted = [];

        foreach ($attributes['items'] as $field) {
            $value = trim((string) ($values[$field['name']] ?? ''));

            if ($value === '') {
                if ($field['required'] ?? false) {
                    throw InvalidStructuredPayload::because('field_required', ['field' => $field['label']]);
                }

                continue;
            }

            $accepted[] = ['name' => $field['name'], 'title' => $field['label'], 'value' => $this->fieldValue($field, $value)];
        }

        if ($accepted === []) {
            throw InvalidStructuredPayload::because('empty_submission');
        }

        return $accepted;
    }

    public function submissionText(array $accepted): string
    {
        return self::lines(array_map(fn (array $entry) => "{$entry['title']}: {$entry['value']}", $accepted));
    }

    private function submittedMap(mixed $submitted): array
    {
        if (! is_array($submitted)) {
            throw InvalidStructuredPayload::because('empty_submission');
        }

        if (! array_is_list($submitted)) {
            return $submitted;
        }

        return collect($submitted)
            ->filter(fn (mixed $entry) => is_array($entry) && isset($entry['name']))
            ->mapWithKeys(fn (array $entry) => [$entry['name'] => $entry['value'] ?? null])
            ->all();
    }

    private function fieldValue(array $field, string $value): string
    {
        $valid = match ($field['type']) {
            'email' => EmailAddress::isValid($value),
            'phone' => preg_match('/^\+?[0-9][0-9 .-]{7,18}[0-9]$/', $value) === 1,
            'select' => in_array($value, array_column($field['options'], 'value'), true),
            'date' => preg_match('/^\d{4}-\d{2}-\d{2}$/', $value) === 1 && strtotime($value) !== false,
            'text_area' => mb_strlen($value) <= 2000,
            default => mb_strlen($value) <= 255,
        };

        if (! $valid) {
            throw InvalidStructuredPayload::because('field_invalid', ['field' => $field['label']]);
        }

        return $field['type'] === 'select'
            ? collect($field['options'])->firstWhere('value', $value)['label']
            : $value;
    }
}
