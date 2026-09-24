<?php

namespace App\Services\Channels\Stickers;

use App\Channels\Capability;
use App\Models\Inbox;
use App\Models\Message;
use App\Services\Channels\ChannelActionRegistry;

/**
 * Lõi trung tính của bảng chọn sticker: gate theo năng lực kênh, ghép "gần đây"
 * từ chính tin trong hộp thư (không gọi nền tảng), còn tìm kiếm và theo bộ thì
 * hỏi danh mục của kênh qua ChannelActionRegistry.
 */
final class StickerLibrary
{
    public const RECENT_LIMIT = 24;

    public const RECENT_SCAN = 200;

    public const PACK_LIMIT = 6;

    public const QUERY_MIN = 2;

    public const QUERY_MAX = 50;

    public const SOURCE_RECENT = 'recent';

    public const SOURCE_SEARCH = 'search';

    public const SOURCE_PACK = 'pack';

    /**
     * @return array{
     *     source: string,
     *     query: string|null,
     *     pack_id: string|null,
     *     stickers: list<array{id: string, image_url: string, pack_id: string|null, label: string|null}>,
     *     packs: list<array{id: string, cover_url: string}>
     * }
     */
    public function browse(Inbox $inbox, ?string $query, ?string $packId): array
    {
        $catalog = $this->catalog($inbox);
        $keyword = $this->searchableQuery($query);

        if ($keyword !== null) {
            return $this->result(self::SOURCE_SEARCH, $catalog->search($inbox, $keyword), query: $keyword);
        }

        $packId = trim((string) $packId);

        if ($packId !== '') {
            return $this->result(self::SOURCE_PACK, $catalog->pack($inbox, $packId), packId: $packId);
        }

        $recent = $this->recent($inbox, $catalog);

        return $this->result(self::SOURCE_RECENT, $recent, packs: $this->packsOf($recent));
    }

    /**
     * `$direction` là năng lực kênh phải khai cho chiều của tin: agent gửi cần
     * `outbound_sticker`, khách gửi từ bề mặt của kênh cần `inbound_sticker`.
     */
    public function resolve(Inbox $inbox, string $stickerId, Capability $direction = Capability::OutboundSticker): Sticker
    {
        return $this->catalog($inbox, $direction)->find($inbox, $stickerId)
            ?? throw StickerCatalogException::notFound($inbox->account->locale);
    }

    private function catalog(Inbox $inbox, Capability $direction = Capability::OutboundSticker): StickerCatalog
    {
        $catalog = $inbox->supports($direction) ? ChannelActionRegistry::stickers($inbox) : null;

        return $catalog ?? throw StickerCatalogException::notSupported($inbox->account->locale);
    }

    private function searchableQuery(?string $query): ?string
    {
        $normalized = trim((string) preg_replace('/\s+/u', ' ', (string) $query));
        $length = mb_strlen($normalized);

        return $length >= self::QUERY_MIN && $length <= self::QUERY_MAX ? $normalized : null;
    }

    /**
     * Sticker vừa gửi hoặc vừa nhận trong hộp thư, mới nhất trước, bỏ trùng. Tin
     * đã thu hồi tự rơi khỏi danh sách vì markDeleted đưa content_type về text.
     *
     * @return list<Sticker>
     */
    private function recent(Inbox $inbox, StickerCatalog $catalog): array
    {
        $stickers = [];

        $messages = Message::query()
            ->where('account_id', $inbox->account_id)
            ->where('inbox_id', $inbox->id)
            ->where('content_type', Message::CONTENT_TYPES['sticker'])
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->limit(self::RECENT_SCAN)
            ->get(['id', 'content_attributes']);

        foreach ($messages as $message) {
            $stored = $message->content_attributes['sticker'] ?? null;
            $sticker = is_array($stored) ? $catalog->fromStored($stored) : null;

            if ($sticker !== null && ! isset($stickers[$sticker->id])) {
                $stickers[$sticker->id] = $sticker;
            }

            if (count($stickers) >= self::RECENT_LIMIT) {
                break;
            }
        }

        return array_values($stickers);
    }

    /**
     * Bộ sticker theo thứ tự xuất hiện trong "gần đây"; ảnh bìa là sticker đầu tiên của bộ.
     *
     * @param  list<Sticker>  $stickers
     * @return list<array{id: string, cover_url: string}>
     */
    private function packsOf(array $stickers): array
    {
        $packs = [];

        foreach ($stickers as $sticker) {
            if ($sticker->packId !== null && ! isset($packs[$sticker->packId])) {
                $packs[$sticker->packId] = ['id' => $sticker->packId, 'cover_url' => $sticker->imageUrl];
            }
        }

        return array_slice(array_values($packs), 0, self::PACK_LIMIT);
    }

    /**
     * @param  list<Sticker>  $stickers
     * @param  list<array{id: string, cover_url: string}>  $packs
     */
    private function result(string $source, array $stickers, ?string $query = null, ?string $packId = null, array $packs = []): array
    {
        return [
            'source' => $source,
            'query' => $query,
            'pack_id' => $packId,
            'stickers' => array_map(fn (Sticker $sticker) => $sticker->toApi(), $stickers),
            'packs' => $packs,
        ];
    }
}
