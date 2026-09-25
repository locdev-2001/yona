<?php

namespace App\Messaging\Structured;

/**
 * Webhook là contract công khai (docs/system-architecture.md §9): hệ thống khách
 * từng nhận nút thẻ dạng `{type: link|postback, text, uri|payload}`. Lõi lưu dạng
 * `{kind, label, url|payload}`, nên webhook gửi kèm tên đời trước làm alias.
 */
final class LegacyWebhookAliases
{
    public static function apply(array $contentAttributes): array
    {
        if (isset($contentAttributes['actions']) && is_array($contentAttributes['actions'])) {
            $contentAttributes['actions'] = array_map(self::action(...), $contentAttributes['actions']);
        }

        if (isset($contentAttributes['items']) && is_array($contentAttributes['items'])) {
            $contentAttributes['items'] = array_map(function (mixed $item) {
                if (is_array($item) && isset($item['actions']) && is_array($item['actions'])) {
                    $item['actions'] = array_map(self::action(...), $item['actions']);
                }

                return $item;
            }, $contentAttributes['items']);
        }

        return $contentAttributes;
    }

    private static function action(mixed $action): mixed
    {
        if (! is_array($action) || ! in_array($action['kind'] ?? null, ['link', 'postback'], true)) {
            return $action;
        }

        return [
            ...$action,
            'type' => $action['kind'],
            'text' => $action['label'] ?? null,
            ...($action['kind'] === 'link' ? ['uri' => $action['url'] ?? null] : []),
        ];
    }
}
