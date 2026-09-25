<?php

namespace App\Messaging\Structured\Types;

use App\Messaging\Structured\AbstractStructuredType;
use App\Messaging\Structured\Action;
use App\Messaging\Structured\ActionKind;
use App\Messaging\Structured\InvalidStructuredPayload;
use App\Messaging\Structured\Money;
use App\Messaging\Structured\PayloadContext;

/**
 * 1 thẻ = thẻ đơn, nhiều thẻ = trượt ngang. Dùng cho sản phẩm lẫn thẻ nội dung.
 * Nhận dạng đời cũ `{title, description, media_url, price, actions[{type,text,uri|payload}]}`.
 */
final class CardsType extends AbstractStructuredType
{
    public const MAX_ITEMS = 10;

    public const MAX_ACTIONS = 3;

    public function contentType(): string
    {
        return 'cards';
    }

    public function rules(): array
    {
        return [
            'content' => ['nullable', 'string', 'max:2000'],
            'items' => ['required', 'array', 'list', 'min:1', 'max:'.self::MAX_ITEMS],
            'items.*' => ['array'],
            'items.*.id' => ['nullable', 'string', 'max:64'],
            'items.*.title' => ['required', 'string', 'max:120'],
            'items.*.description' => ['nullable', 'string', 'max:300'],
            'items.*.media_url' => ['nullable', 'string', 'max:2000'],
            'items.*.stock_label' => ['nullable', 'string', 'max:40'],
            'items.*.max_quantity' => ['nullable', 'integer', 'min:1', 'max:999'],
            'items.*.variants' => ['nullable', 'array', 'list', 'max:3'],
            'items.*.variants.*.name' => ['required', 'string', 'max:40'],
            'items.*.variants.*.options' => ['required', 'array', 'list', 'min:1', 'max:20'],
            'items.*.variants.*.options.*.value' => ['required', 'string', 'max:60'],
            'items.*.variants.*.options.*.label' => ['nullable', 'string', 'max:60'],
            'items.*.variants.*.options.*.media_url' => ['nullable', 'string', 'max:2000'],
            'items.*.variants.*.options.*.disabled' => ['nullable', 'boolean'],
        ];
    }

    public function normalize(array $attributes, PayloadContext $context): array
    {
        $items = [];

        foreach ($attributes['items'] as $index => $item) {
            $items[] = $this->normalizeItem($item, $index);
        }

        if (count(array_unique(array_column($items, 'id'))) !== count($items)) {
            throw InvalidStructuredPayload::because('duplicate_item');
        }

        return ['items' => $items];
    }

    public function plainText(?string $content, array $attributes, ?string $pageUrl = null): string
    {
        $lines = [$content];

        foreach ($attributes['items'] as $item) {
            $lines[] = '• '.self::itemSummary($item);
            $lines = [...$lines, ...ActionText::lines(Action::list($item['actions'] ?? [], self::MAX_ACTIONS))];
        }

        return self::lines([...$lines, $pageUrl]);
    }

    public function previewText(?string $content, array $attributes): string
    {
        $first = $attributes['items'][0]['title'];
        $others = count($attributes['items']) - 1;

        return filled($content) ? trim((string) $content) : ($others > 0 ? __('messaging.cards.preview_many', ['title' => $first, 'count' => $others]) : $first);
    }

    public function choices(array $attributes): array
    {
        $actions = [];

        foreach ($attributes['items'] as $item) {
            $actions = [...$actions, ...Action::list($item['actions'] ?? [], self::MAX_ACTIONS)];
        }

        return Action::replyChoices($actions);
    }

    public function acceptSubmission(array $attributes, mixed $submitted): array
    {
        return self::acceptedChoice(self::pickChoice($this->choices($attributes), $submitted));
    }

    public function submissionText(array $accepted): string
    {
        return self::choiceLabel($accepted);
    }

    public function needsPublicPage(array $attributes): bool
    {
        foreach ($attributes['items'] as $item) {
            foreach ($item['actions'] ?? [] as $action) {
                if (in_array($action['kind'], [ActionKind::Webview->value, ActionKind::Order->value], true)) {
                    return true;
                }
            }
        }

        return false;
    }

    /** Một thẻ trong payload đã chuẩn hoá, theo `id`. */
    public static function findItem(array $attributes, string $itemId): ?array
    {
        foreach ($attributes['items'] ?? [] as $item) {
            if (($item['id'] ?? null) === $itemId) {
                return $item;
            }
        }

        return null;
    }

    /** "Bình men lam — 450.000đ (giá cũ 530.000đ, -15%)" */
    public static function itemSummary(array $item): string
    {
        $price = $item['price'] ?? null;

        if ($price === null) {
            return $item['title'];
        }

        $summary = $item['title'].' — '.Money::format($price['amount'], $price['currency']);

        if (isset($price['compare_at'])) {
            $summary .= ' ('.__('messaging.cards.compare_at', [
                'price' => Money::format($price['compare_at'], $price['currency']),
                'percent' => $price['discount_percent'],
            ]).')';
        }

        return $summary;
    }

    private function normalizeItem(array $item, int $index): array
    {
        $actions = Action::list($item['actions'] ?? null, self::MAX_ACTIONS);
        $variants = array_map($this->normalizeVariant(...), $item['variants'] ?? []);

        if ($variants !== [] && ! in_array(ActionKind::Order, array_map(fn (Action $action) => $action->kind, $actions), true)) {
            throw InvalidStructuredPayload::because('variants_without_order');
        }

        return array_filter([
            'id' => trim((string) ($item['id'] ?? '')) ?: 'item-'.($index + 1),
            'title' => trim($item['title']),
            'description' => filled($item['description'] ?? null) ? trim($item['description']) : null,
            'media_url' => filled($item['media_url'] ?? null) ? Action::url($item['media_url']) : null,
            'price' => Money::normalize($item['price'] ?? null),
            'stock_label' => filled($item['stock_label'] ?? null) ? trim($item['stock_label']) : null,
            'max_quantity' => $item['max_quantity'] ?? null,
            'variants' => $variants === [] ? null : $variants,
            'actions' => array_map(fn (Action $action) => $action->toArray(), $actions),
        ], fn (mixed $value) => $value !== null);
    }

    private function normalizeVariant(array $variant): array
    {
        $options = array_map(fn (array $option) => array_filter([
            'value' => trim($option['value']),
            'label' => trim((string) ($option['label'] ?? '')) ?: trim($option['value']),
            'media_url' => filled($option['media_url'] ?? null) ? Action::url($option['media_url']) : null,
            'disabled' => ($option['disabled'] ?? false) ? true : null,
        ], fn (mixed $value) => $value !== null), $variant['options']);

        if (count(array_unique(array_column($options, 'value'))) !== count($options)) {
            throw InvalidStructuredPayload::because('duplicate_choice');
        }

        return ['name' => trim($variant['name']), 'options' => $options];
    }
}
