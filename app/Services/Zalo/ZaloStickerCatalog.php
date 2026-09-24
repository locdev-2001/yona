<?php

namespace App\Services\Zalo;

use App\Models\Channel\Zalo;
use App\Models\Inbox;
use App\Services\Channels\Stickers\Sticker;
use App\Services\Channels\Stickers\StickerCatalog;
use App\Services\Channels\Stickers\StickerCatalogException;
use Closure;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Cache;

/**
 * Danh mục sticker của Zalo cá nhân, hỏi qua bridge. Mỗi lượt tìm là một lời gọi
 * API không chính thức từ tài khoản Zalo của khách, nên gọi càng ít càng tốt:
 * danh mục sticker của Zalo là chung cho mọi tài khoản, cache dùng chung giữa các
 * tenant; lỗi thì không bao giờ vào cache.
 *
 * Cache chỉ giữ mảng mục `{id, cate_id, type, url, label}` (đúng hình dạng bridge
 * trả), không giữ object.
 */
final class ZaloStickerCatalog implements StickerCatalog
{
    private const CACHE_PREFIX = 'stickers:zalo:';

    private const SEARCH_TTL = 12 * 3600;

    private const EMPTY_RESULT_TTL = 3600;

    private const PACK_TTL = 7 * 86400;

    private const ITEM_TTL = 30 * 86400;

    private const SEARCH_LIMIT = 30;

    private const DEFAULT_TYPE = 1;

    // Sticker nhận về ghi bộ là `catId`, danh mục ghi `cate_id`, bản lõi lưu `cateId`.
    private const STORED_ID_KEYS = ['id', 'sticker_id', 'stickerId', 'sid'];

    private const STORED_PACK_KEYS = ['cateId', 'catId', 'cate_id'];

    private const STORED_URL_KEYS = ['url', 'stickerUrl', 'stickerWebpUrl', 'thumbnail'];

    private const STORED_LABEL_KEYS = ['label', 'description', 'text'];

    /** Nhãn dạng `[^61900.98930^]` là mã nội bộ của Zalo, không phải chữ cho người đọc. */
    private const LABEL_CODE_PATTERN = '/^\[\^.*\^\]$/u';

    private const BAD_REQUEST = 'bad_request';

    public function __construct(private readonly ZaloBridgeClient $bridge) {}

    public function search(Inbox $inbox, string $query): array
    {
        $keyword = mb_strtolower(trim($query));

        return $this->stickersFrom($this->cached(
            'q:'.sha1($keyword),
            self::SEARCH_TTL,
            fn () => $this->fetch($inbox, fn (Zalo $channel) => $this->bridge->searchStickers($channel, $keyword, self::SEARCH_LIMIT)),
        ));
    }

    public function pack(Inbox $inbox, string $packId): array
    {
        $categoryId = self::positiveInt($packId);

        if ($categoryId === null) {
            return [];
        }

        return $this->stickersFrom($this->cached(
            "pack:{$categoryId}",
            self::PACK_TTL,
            fn () => $this->fetch($inbox, fn (Zalo $channel) => $this->bridge->stickerCategory($channel, $categoryId)),
        ));
    }

    public function find(Inbox $inbox, string $stickerId): ?Sticker
    {
        $id = self::positiveInt($stickerId);

        if ($id === null) {
            return null;
        }

        $item = $this->validItem(Cache::get($this->itemKey($id)));

        if ($item === null) {
            $items = $this->fetch($inbox, fn (Zalo $channel) => $this->bridge->stickerDetails($channel, [$id]));
            $this->rememberItems($items);
            $item = collect($items)->firstWhere('id', $id);
        }

        return $item === null ? null : $this->stickerFromItem($item);
    }

    public function fromStored(array $stored): ?Sticker
    {
        $item = $this->validItem([
            'id' => self::firstFilled($stored, self::STORED_ID_KEYS),
            'cate_id' => self::firstFilled($stored, self::STORED_PACK_KEYS),
            'type' => $stored['type'] ?? null,
            'url' => self::firstFilled($stored, self::STORED_URL_KEYS),
            'label' => self::firstFilled($stored, self::STORED_LABEL_KEYS),
        ]);

        if ($item === null) {
            return null;
        }

        $this->rememberItems([$item]);

        return $this->stickerFromItem($item);
    }

    /**
     * @param  Closure(): list<array<string, mixed>>  $load
     * @return list<array{id: int, cate_id: int, type: int, url: string, label: string|null}>
     */
    private function cached(string $key, int $ttl, Closure $load): array
    {
        $cacheKey = self::CACHE_PREFIX.$key;
        $cached = Cache::get($cacheKey);

        if (is_array($cached)) {
            return array_values(array_filter(array_map(fn ($entry) => $this->validItem($entry), $cached)));
        }

        $items = $load();
        Cache::put($cacheKey, $items, $items === [] ? self::EMPTY_RESULT_TTL : $ttl);
        $this->rememberItems($items);

        return $items;
    }

    /**
     * @param  Closure(Zalo): ?Response  $call
     * @return list<array{id: int, cate_id: int, type: int, url: string, label: string|null}>
     */
    private function fetch(Inbox $inbox, Closure $call): array
    {
        $locale = $inbox->account->locale;
        $channel = $inbox->channel;

        if (! $channel instanceof Zalo || ! $channel->isConnected()) {
            throw $this->exception(ZaloBridgeOutcome::failure(ZaloBridgeOutcome::SESSION_LOST, $locale), $locale);
        }

        $outcome = ZaloBridgeOutcome::fromResponse($call($channel), $locale);

        if (! $outcome['ok']) {
            throw $this->exception($outcome, $locale);
        }

        $stickers = $outcome['body']['stickers'] ?? [];

        return array_values(array_filter(array_map(
            fn ($entry) => $this->validItem($entry),
            is_array($stickers) ? $stickers : [],
        )));
    }

    /** @param array{code: string, message: string} $failure */
    private function exception(array $failure, ?string $locale): StickerCatalogException
    {
        // Câu `bad_request` của errors.zalo.action nói về một tin nhắn cụ thể — sai ngữ cảnh ở đây.
        $message = $failure['code'] === self::BAD_REQUEST
            ? __('errors.stickers.bad_request', [], $locale)
            : $failure['message'];

        return new StickerCatalogException($failure['code'], $message);
    }

    /** @param list<array{id: int, cate_id: int, type: int, url: string, label: string|null}> $items */
    private function rememberItems(array $items): void
    {
        if ($items === []) {
            return;
        }

        Cache::putMany(
            collect($items)->mapWithKeys(fn (array $item) => [$this->itemKey($item['id']) => $item])->all(),
            self::ITEM_TTL,
        );
    }

    private function itemKey(int $stickerId): string
    {
        return self::CACHE_PREFIX."item:{$stickerId}";
    }

    /**
     * @param  list<array{id: int, cate_id: int, type: int, url: string, label: string|null}>  $items
     * @return list<Sticker>
     */
    private function stickersFrom(array $items): array
    {
        return array_map(fn (array $item) => $this->stickerFromItem($item), $items);
    }

    /** @param array{id: int, cate_id: int, type: int, url: string, label: string|null} $item */
    private function stickerFromItem(array $item): Sticker
    {
        return new Sticker(
            id: (string) $item['id'],
            imageUrl: $item['url'],
            packId: $item['cate_id'] > 0 ? (string) $item['cate_id'] : null,
            label: $item['label'],
            payload: [
                'id' => $item['id'],
                'cateId' => $item['cate_id'],
                'type' => $item['type'],
                'url' => $item['url'],
                'thumbnail' => $item['url'],
            ],
        );
    }

    /** @return array{id: int, cate_id: int, type: int, url: string, label: string|null}|null */
    private function validItem(mixed $entry): ?array
    {
        if (! is_array($entry)) {
            return null;
        }

        $id = self::positiveInt($entry['id'] ?? null);
        $url = $entry['url'] ?? null;

        if ($id === null || ! is_string($url) || ! preg_match('#^https?://#i', $url)) {
            return null;
        }

        return [
            'id' => $id,
            'cate_id' => self::nonNegativeInt($entry['cate_id'] ?? null) ?? 0,
            'type' => self::positiveInt($entry['type'] ?? null) ?? self::DEFAULT_TYPE,
            'url' => $url,
            'label' => self::readableLabel($entry['label'] ?? null),
        ];
    }

    /**
     * @param  array<string, mixed>  $stored
     * @param  list<string>  $keys
     */
    private static function firstFilled(array $stored, array $keys): mixed
    {
        foreach ($keys as $key) {
            if (filled($stored[$key] ?? null) && is_scalar($stored[$key])) {
                return $stored[$key];
            }
        }

        return null;
    }

    private static function readableLabel(mixed $label): ?string
    {
        $text = is_string($label) ? trim($label) : '';

        return $text === '' || preg_match(self::LABEL_CODE_PATTERN, $text) ? null : $text;
    }

    private static function positiveInt(mixed $value): ?int
    {
        return self::intAtLeast($value, 1);
    }

    private static function nonNegativeInt(mixed $value): ?int
    {
        return self::intAtLeast($value, 0);
    }

    private static function intAtLeast(mixed $value, int $minimum): ?int
    {
        if (! is_int($value) && ! is_string($value)) {
            return null;
        }

        $int = filter_var($value, FILTER_VALIDATE_INT, ['options' => ['min_range' => $minimum]]);

        return $int === false ? null : $int;
    }
}
