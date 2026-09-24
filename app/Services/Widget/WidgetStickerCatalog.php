<?php

namespace App\Services\Widget;

use App\Models\Inbox;
use App\Services\Channels\Stickers\Sticker;
use App\Services\Channels\Stickers\StickerCatalog;

/**
 * Danh mục sticker của widget website: một bộ cấu hình sẵn (`yona.widget_stickers`)
 * dùng chung mọi inbox, không có nền tảng nào để hỏi. Payload lưu vào
 * `content_attributes.sticker` dùng cùng khoá `id`/`cateId`/`url`/`thumbnail`
 * với sticker Zalo để mọi bề mặt đọc một hình dạng.
 */
final class WidgetStickerCatalog implements StickerCatalog
{
    /** @return list<Sticker> */
    public function all(): array
    {
        $configured = config('yona.widget_stickers', []);

        if (! is_array($configured)) {
            return [];
        }

        return array_values(array_filter(array_map(
            fn (mixed $entry) => is_array($entry)
                ? $this->sticker($entry['id'] ?? null, $entry['url'] ?? null, $entry['pack_id'] ?? null, $entry['label'] ?? null)
                : null,
            $configured,
        )));
    }

    public function search(Inbox $inbox, string $query): array
    {
        $needle = mb_strtolower($query);

        return array_values(array_filter(
            $this->all(),
            fn (Sticker $sticker) => str_contains(mb_strtolower($sticker->label ?? $sticker->id), $needle),
        ));
    }

    public function pack(Inbox $inbox, string $packId): array
    {
        return array_values(array_filter($this->all(), fn (Sticker $sticker) => $sticker->packId === $packId));
    }

    public function find(Inbox $inbox, string $stickerId): ?Sticker
    {
        foreach ($this->all() as $sticker) {
            if ($sticker->id === $stickerId) {
                return $sticker;
            }
        }

        return null;
    }

    public function fromStored(array $stored): ?Sticker
    {
        return $this->sticker($stored['id'] ?? null, $stored['url'] ?? null, $stored['cateId'] ?? null, null);
    }

    private function sticker(mixed $id, mixed $url, mixed $packId, mixed $label): ?Sticker
    {
        if (! is_scalar($id) || ! is_string($url) || trim((string) $id) === '' || trim($url) === '') {
            return null;
        }

        $id = (string) $id;
        $packId = is_scalar($packId) && (string) $packId !== '' ? (string) $packId : null;

        return new Sticker(
            id: $id,
            imageUrl: $url,
            packId: $packId,
            label: is_string($label) && $label !== '' ? $label : null,
            payload: ['id' => $id, 'cateId' => $packId, 'url' => $url, 'thumbnail' => $url],
        );
    }
}
