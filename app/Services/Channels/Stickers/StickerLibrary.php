<?php

namespace App\Services\Channels\Stickers;

use App\Channels\Capability;
use App\Models\Attachment;
use App\Models\Inbox;
use App\Models\Message;
use App\Services\Channels\ChannelActionRegistry;
use App\Services\Stickers\YonaStickerCatalog;

/**
 * Lõi trung tính của sticker: ghép các danh mục một hộp thư dùng được, gate theo
 * năng lực kênh. Kho Yona áp cho mọi kênh gửi được ảnh (nó ra ngoài như một ảnh)
 * nên đăng ký DUY NHẤT ở đây; danh mục của nền tảng (sticker gốc của kênh) tra qua
 * ChannelActionRegistry. "Gần đây" ghép từ chính tin trong hộp thư, không gọi nền
 * tảng; tìm kiếm và theo bộ thì hỏi danh mục.
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

    public function __construct(private readonly YonaStickerCatalog $library) {}

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
        $catalogs = $this->catalogsOrFail($inbox, Capability::OutboundSticker);
        $keyword = $this->searchableQuery($query);

        if ($keyword !== null) {
            $found = array_map(fn (StickerCatalog $catalog) => $catalog->search($inbox, $keyword), $catalogs);

            return $this->result(self::SOURCE_SEARCH, array_merge(...$found), query: $keyword);
        }

        $packId = trim((string) $packId);

        if ($packId !== '') {
            $owner = $this->owner($inbox, $catalogs, $packId, Capability::OutboundSticker);

            return $this->result(self::SOURCE_PACK, $owner->pack($inbox, $packId), packId: $packId);
        }

        $recent = $this->recent($inbox, $catalogs);

        return $this->result(self::SOURCE_RECENT, $recent, packs: $this->packsFor($inbox, $catalogs, $recent));
    }

    /**
     * Gợi ý sticker khi agent gõ: chỉ kho Yona (tra DB, không hỏi nền tảng) và chỉ
     * khi hộp thư dùng được kho như bảng chọn. Không đủ điều kiện thì rỗng, không lỗi,
     * vì lời gọi đi theo từng phím gõ.
     *
     * @return array{stickers: list<array{id: string, image_url: string, pack_id: string|null, label: string|null}>}
     */
    public function suggest(Inbox $inbox, ?string $query): array
    {
        $keyword = $this->searchableQuery($query);
        $usesLibrary = $inbox->supports($this->libraryCapability(Capability::OutboundSticker));
        $stickers = $keyword !== null && $usesLibrary ? $this->library->suggest($inbox->account, $keyword) : [];

        return ['stickers' => array_map(fn (Sticker $sticker) => $sticker->toApi(), $stickers)];
    }

    /**
     * `$direction` là năng lực kênh phải khai cho chiều của tin: agent gửi cần
     * `outbound_sticker`, khách gửi từ bề mặt của kênh cần `inbound_sticker`.
     */
    public function resolve(Inbox $inbox, string $stickerId, Capability $direction = Capability::OutboundSticker): Sticker
    {
        return $this->owner($inbox, $this->catalogsOrFail($inbox, $direction), $stickerId, $direction)->find($inbox, $stickerId)
            ?? throw StickerCatalogException::notFound($inbox->account->locale);
    }

    /** Đính kèm ảnh của tin sticker, do chính danh mục sở hữu sticker dựng. */
    public function attachmentFor(Inbox $inbox, Sticker $sticker, Capability $direction = Capability::OutboundSticker): Attachment
    {
        return $this->owner($inbox, $this->catalogsOrFail($inbox, $direction), $sticker->id, $direction)->attachmentFor($sticker, $inbox);
    }

    /**
     * Danh sách tải một lần cho bề mặt không duyệt theo lượt (widget): chỉ kho
     * Yona, vì danh mục nền tảng không liệt kê hết được.
     *
     * @return list<Sticker>
     */
    public function listing(Inbox $inbox, Capability $direction): array
    {
        return in_array($this->library, $this->catalogs($inbox, $direction), true)
            ? $this->library->available($inbox->account)
            : [];
    }

    /**
     * Dựng lại sticker đã lưu theo các danh mục hộp thư dùng được. Null = hộp thư
     * này không gửi được sticker đó, kể cả sticker của kho mà account không còn
     * thấy (bộ gỡ xuất bản, cờ tắt).
     *
     * @param  array<string, mixed>  $stored
     */
    public function fromStored(Inbox $inbox, array $stored, Capability $direction = Capability::OutboundSticker): ?Sticker
    {
        $sticker = $this->storedIn($this->catalogs($inbox, $direction), $stored);

        return $sticker === null ? null : ($this->library->withoutHidden($inbox->account, [$sticker])[0] ?? null);
    }

    /**
     * Năng lực hộp thư đích phải có để GỬI lại sticker đã lưu: sticker của kho ra
     * ngoài là ảnh, sticker nền tảng cần sticker gốc của kênh.
     *
     * @param  array<string, mixed>  $stored
     */
    public function outboundCapabilityFor(array $stored): Capability
    {
        return $this->library->fromStored($stored) !== null
            ? $this->libraryCapability(Capability::OutboundSticker)
            : Capability::OutboundSticker;
    }

    /**
     * Payload sticker đã lưu, kèm URL dựng lúc đọc cho bề mặt hiển thị.
     *
     * @param  array<string, mixed>  $stored
     * @return array<string, mixed>
     */
    public function forReader(array $stored): array
    {
        return $this->library->forReader($stored);
    }

    /**
     * Kho Yona trước, rồi danh mục của nền tảng.
     *
     * @return list<StickerCatalog>
     */
    private function catalogs(Inbox $inbox, Capability $direction): array
    {
        $catalogs = [];

        if ($inbox->supports($this->libraryCapability($direction))) {
            $catalogs[] = $this->library;
        }

        $platform = $inbox->supports($direction) ? ChannelActionRegistry::stickers($inbox) : null;

        if ($platform !== null) {
            $catalogs[] = $platform;
        }

        return $catalogs;
    }

    /** @return non-empty-list<StickerCatalog> */
    private function catalogsOrFail(Inbox $inbox, Capability $direction): array
    {
        $catalogs = $this->catalogs($inbox, $direction);

        return $catalogs === [] ? throw StickerCatalogException::notSupported($inbox->account->locale) : $catalogs;
    }

    /** Kho Yona ra ngoài như ảnh: agent gửi cần kênh nhận ảnh; khách gửi thì vẫn cần bề mặt có sticker. */
    private function libraryCapability(Capability $direction): Capability
    {
        return $direction === Capability::OutboundSticker ? Capability::OutboundImage : $direction;
    }

    /**
     * Danh mục sở hữu mã (sticker hoặc bộ): mã của kho có tiền tố riêng, còn lại
     * là của nền tảng. Hộp thư thiếu danh mục đó: không khai năng lực danh mục cần
     * thì là năng lực chưa hỗ trợ, có khai mà không có danh mục thì là mã lạ.
     *
     * @param  non-empty-list<StickerCatalog>  $catalogs
     */
    private function owner(Inbox $inbox, array $catalogs, string $id, Capability $direction): StickerCatalog
    {
        $ownedByLibrary = YonaStickerCatalog::owns($id);

        foreach ($catalogs as $catalog) {
            if (($catalog === $this->library) === $ownedByLibrary) {
                return $catalog;
            }
        }

        $ownerCapability = $ownedByLibrary ? $this->libraryCapability($direction) : $direction;
        $locale = $inbox->account->locale;

        throw $inbox->supports($ownerCapability)
            ? StickerCatalogException::notFound($locale)
            : StickerCatalogException::notSupported($locale);
    }

    /**
     * @param  list<StickerCatalog>  $catalogs
     * @param  array<string, mixed>  $stored
     */
    private function storedIn(array $catalogs, array $stored): ?Sticker
    {
        foreach ($catalogs as $catalog) {
            $sticker = $catalog->fromStored($stored);

            if ($sticker !== null) {
                return $sticker;
            }
        }

        return null;
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
     * Sticker của kho mà account không còn thấy bị bỏ (một truy vấn cho cả lượt).
     *
     * @param  list<StickerCatalog>  $catalogs
     * @return list<Sticker>
     */
    private function recent(Inbox $inbox, array $catalogs): array
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
            $sticker = is_array($stored) ? $this->storedIn($catalogs, $stored) : null;

            if ($sticker !== null && ! isset($stickers[$sticker->id])) {
                $stickers[$sticker->id] = $sticker;
            }

            if (count($stickers) >= self::RECENT_LIMIT) {
                break;
            }
        }

        return $this->library->withoutHidden($inbox->account, array_values($stickers));
    }

    /**
     * Bộ của kho Yona (để duyệt khi chưa dùng sticker nào) rồi bộ theo thứ tự xuất
     * hiện trong "gần đây"; ảnh bìa là sticker đầu tiên của bộ.
     *
     * @param  list<StickerCatalog>  $catalogs
     * @param  list<Sticker>  $recent
     * @return list<array{id: string, cover_url: string}>
     */
    private function packsFor(Inbox $inbox, array $catalogs, array $recent): array
    {
        $packs = [];

        if (in_array($this->library, $catalogs, true)) {
            foreach ($this->library->packs($inbox->account) as $pack) {
                $packs[$pack['id']] = $pack;
            }
        }

        foreach ($this->recentPacks($recent) as $pack) {
            $packs[$pack['id']] ??= $pack;
        }

        return array_values($packs);
    }

    /**
     * @param  list<Sticker>  $stickers
     * @return list<array{id: string, cover_url: string}>
     */
    private function recentPacks(array $stickers): array
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
