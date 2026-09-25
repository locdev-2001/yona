<?php

namespace App\Messaging\Structured\Types;

use App\Messaging\Structured\AbstractStructuredType;
use App\Messaging\Structured\Action;
use App\Messaging\Structured\PayloadContext;

/** Bài trợ giúp gợi ý. Dạng đời cũ dùng `link`, dạng mới dùng `url`. */
final class ArticleType extends AbstractStructuredType
{
    public const MAX_ITEMS = 5;

    public function contentType(): string
    {
        return 'article';
    }

    public function rules(): array
    {
        return [
            'content' => ['nullable', 'string', 'max:2000'],
            'items' => ['required', 'array', 'list', 'min:1', 'max:'.self::MAX_ITEMS],
            'items.*' => ['array'],
            'items.*.title' => ['required', 'string', 'max:200'],
            'items.*.description' => ['nullable', 'string', 'max:300'],
            'items.*.url' => ['required_without:items.*.link', 'nullable', 'string', 'max:2000'],
            'items.*.link' => ['nullable', 'string', 'max:2000'],
        ];
    }

    public function normalize(array $attributes, PayloadContext $context): array
    {
        return ['items' => array_map(fn (array $item) => array_filter([
            'title' => trim($item['title']),
            'description' => filled($item['description'] ?? null) ? trim($item['description']) : null,
            'url' => Action::url($item['url'] ?? $item['link'] ?? null),
        ], fn (?string $value) => $value !== null), $attributes['items'])];
    }

    public function plainText(?string $content, array $attributes, ?string $pageUrl = null): string
    {
        return self::lines([$content, ...array_map(fn (array $item) => "{$item['title']}: {$item['url']}", $attributes['items'])]);
    }

    public function previewText(?string $content, array $attributes): string
    {
        return filled($content) ? trim((string) $content) : $attributes['items'][0]['title'];
    }
}
