<?php

namespace App\Services\Stickers;

use App\Models\Account;
use App\Models\Attachment;
use App\Models\Inbox;
use App\Models\Sticker as LibrarySticker;
use App\Services\Channels\Stickers\Sticker;
use App\Services\Channels\Stickers\StickerCatalog;
use App\Support\SearchTerm;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

/**
 * Kho sticker của chính Yona (bảng `stickers`), dùng được trên mọi kênh gửi được
 * ảnh: ra ngoài là ảnh PNG tĩnh mượn từ disk stickers, trong Yona là sticker động.
 * Mã sticker và mã bộ mang tiền tố `yona:` để không lẫn với mã của nền tảng.
 *
 * Payload ghi vào tin chỉ giữ đường dẫn trên disk, không giữ URL: đổi tên miền
 * hay chuyển disk sang R2 thì tin cũ vẫn đọc đúng, URL dựng lúc đọc (forReader).
 * Ai thấy sticker nào do Sticker::visibleTo() quyết định.
 */
final class YonaStickerCatalog implements StickerCatalog
{
    public const SOURCE = 'yona';

    public const ID_PREFIX = 'yona:';

    public const SEARCH_LIMIT = 30;

    public const LISTING_LIMIT = 200;

    public const SUGGESTION_LIMIT = 8;

    private const KEYWORD_MATCH_SQL = 'EXISTS (SELECT 1 FROM jsonb_array_elements_text(stickers.keywords) AS keyword WHERE %s)';

    private const STATIC_CONTENT_TYPE = 'image/png';

    private const STATIC_FILENAME_PATTERN = 'sticker-%d.png';

    private const REQUIRED_PATH_KEYS = ['animation_path', 'poster_path', 'static_path'];

    /** Khoá URL trả cho người đọc → khoá đường dẫn trong payload. `url` là ảnh tĩnh, trùng khoá của payload sticker nền tảng. */
    private const READER_URL_KEYS = [
        'url' => 'static_url',
        'poster_url' => 'poster_url',
        'animation_url' => 'animation_url',
    ];

    public static function owns(string $stickerOrPackId): bool
    {
        return str_starts_with($stickerOrPackId, self::ID_PREFIX);
    }

    /** Nhãn hoặc một từ khoá chứa đủ mọi chữ của từ khoá tìm, so không dấu như mọi ô tìm (SearchTerm). */
    public function search(Inbox $inbox, string $query): array
    {
        $term = new SearchTerm($query);
        [$labelMatch, $labelBindings] = $term->foldedMatch('stickers.label');
        [$keywordMatch, $keywordBindings] = $term->foldedMatch('keyword');

        return $this->stickersFrom($this->ordered($inbox->account)
            ->where(fn (Builder $match) => $match
                ->whereRaw($labelMatch, $labelBindings)
                ->orWhereRaw(sprintf(self::KEYWORD_MATCH_SQL, $keywordMatch), $keywordBindings))
            ->limit(self::SEARCH_LIMIT)
            ->get());
    }

    /**
     * Gợi ý khi gõ theo luật của StickerKeywordMatch: hạng khớp tốt trước, cùng
     * hạng theo thứ tự trong kho.
     *
     * @return list<Sticker>
     */
    public function suggest(Account $account, string $prefix): array
    {
        $rank = StickerKeywordMatch::rankFor($prefix);

        if ($rank === null) {
            return [];
        }

        [$rankSql, $rankBindings] = $rank;

        return $this->stickersFrom($this->inLibraryOrder($this->visible($account)
            ->whereRaw("({$rankSql}) IS NOT NULL", $rankBindings)
            ->orderByRaw($rankSql, $rankBindings))
            ->limit(self::SUGGESTION_LIMIT)
            ->get());
    }

    public function pack(Inbox $inbox, string $packId): array
    {
        $libraryPackId = self::libraryId($packId);

        if ($libraryPackId === null) {
            return [];
        }

        return $this->stickersFrom($this->ordered($inbox->account)
            ->where('stickers.sticker_pack_id', $libraryPackId)
            ->get());
    }

    public function find(Inbox $inbox, string $stickerId): ?Sticker
    {
        $libraryId = self::libraryId($stickerId);
        $model = $libraryId === null ? null : LibrarySticker::query()->visibleTo($inbox->account)->find($libraryId);

        return $model === null ? null : $this->stickerFromModel($model);
    }

    public function fromStored(array $stored): ?Sticker
    {
        $payload = self::validPayload($stored);

        return $payload === null ? null : $this->stickerFromPayload($payload, null);
    }

    /** Đính kèm là tệp mượn trên disk stickers: xoá hay chuyển tiếp tin không đụng tới tệp của kho. */
    public function attachmentFor(Sticker $sticker, Inbox $inbox): Attachment
    {
        return new Attachment([
            'account_id' => $inbox->account_id,
            'file_type' => Attachment::FILE_TYPE_IMAGE,
            'disk' => LibrarySticker::DISK,
            'path' => $sticker->payload['static_path'],
            'filename' => sprintf(self::STATIC_FILENAME_PATTERN, $sticker->payload['id']),
            'content_type' => self::STATIC_CONTENT_TYPE,
            'meta' => array_filter([
                'width' => $sticker->payload['width'],
                'height' => $sticker->payload['height'],
            ], fn (?int $size) => $size !== null),
        ]);
    }

    /**
     * Sticker account thấy được, dùng cho danh sách tải một lần (cấu hình widget).
     *
     * @return list<Sticker>
     */
    public function available(Account $account): array
    {
        return $this->stickersFrom($this->ordered($account)->limit(self::LISTING_LIMIT)->get());
    }

    /**
     * Mỗi bộ account thấy được một mục, ảnh bìa là sticker đầu tiên của bộ.
     *
     * @return list<array{id: string, cover_url: string}>
     */
    public function packs(Account $account): array
    {
        return $this->ordered($account)
            ->select(DB::raw('DISTINCT ON (sticker_packs.position, sticker_packs.id) stickers.*'))
            ->get()
            ->map(fn (LibrarySticker $cover) => [
                'id' => self::ID_PREFIX.$cover->sticker_pack_id,
                'cover_url' => (string) $cover->poster_url,
            ])
            ->values()
            ->all();
    }

    /**
     * Bỏ sticker của kho mà account không còn thấy (bộ gỡ xuất bản, cờ tắt), giữ
     * nguyên sticker của nguồn khác. Một truy vấn cho cả danh sách.
     *
     * @param  list<Sticker>  $stickers
     * @return list<Sticker>
     */
    public function withoutHidden(Account $account, array $stickers): array
    {
        $libraryIds = array_values(array_map(
            fn (Sticker $sticker) => $sticker->payload['id'],
            array_filter($stickers, fn (Sticker $sticker) => self::owns($sticker->id)),
        ));

        if ($libraryIds === []) {
            return $stickers;
        }

        $visibleIds = LibrarySticker::query()->visibleTo($account)->whereKey($libraryIds)->pluck('id')->all();

        return array_values(array_filter(
            $stickers,
            fn (Sticker $sticker) => ! self::owns($sticker->id) || in_array($sticker->payload['id'], $visibleIds, true),
        ));
    }

    /**
     * Payload đã lưu kèm URL dựng lúc đọc cho bề mặt hiển thị. Payload không phải
     * của kho (sticker nền tảng, sticker cũ không có `source`) trả nguyên vẹn.
     *
     * @param  array<string, mixed>  $stored
     * @return array<string, mixed>
     */
    public function forReader(array $stored): array
    {
        $payload = self::validPayload($stored);

        if ($payload === null) {
            return $stored;
        }

        $files = self::filesOf($payload);

        return [
            ...$stored,
            ...array_map(fn (string $accessor) => $files->{$accessor}, self::READER_URL_KEYS),
        ];
    }

    /** @return Builder<LibrarySticker> */
    private function ordered(Account $account): Builder
    {
        return $this->inLibraryOrder($this->visible($account));
    }

    /** @return Builder<LibrarySticker> */
    private function visible(Account $account): Builder
    {
        return LibrarySticker::query()
            ->visibleTo($account)
            ->join('sticker_packs', 'sticker_packs.id', '=', 'stickers.sticker_pack_id')
            ->select('stickers.*');
    }

    /**
     * @param  Builder<LibrarySticker>  $query
     * @return Builder<LibrarySticker>
     */
    private function inLibraryOrder(Builder $query): Builder
    {
        return $query
            ->orderBy('sticker_packs.position')
            ->orderBy('sticker_packs.id')
            ->orderBy('stickers.position')
            ->orderBy('stickers.id');
    }

    /**
     * @param  iterable<LibrarySticker>  $models
     * @return list<Sticker>
     */
    private function stickersFrom(iterable $models): array
    {
        $stickers = [];

        foreach ($models as $model) {
            $stickers[] = $this->stickerFromModel($model);
        }

        return $stickers;
    }

    private function stickerFromModel(LibrarySticker $model): Sticker
    {
        return $this->stickerFromPayload([
            'source' => self::SOURCE,
            'id' => $model->id,
            'pack_id' => $model->sticker_pack_id,
            'animation_path' => (string) $model->animation_path,
            'poster_path' => (string) $model->poster_path,
            'static_path' => (string) $model->static_path,
            'width' => $model->width,
            'height' => $model->height,
        ], $model->label, $model->keywords ?? []);
    }

    /**
     * @param  array{source: string, id: int, pack_id: int, animation_path: string, poster_path: string, static_path: string, width: int|null, height: int|null}  $payload
     * @param  list<string>  $keywords
     */
    private function stickerFromPayload(array $payload, ?string $label, array $keywords = []): Sticker
    {
        return new Sticker(
            id: self::ID_PREFIX.$payload['id'],
            imageUrl: (string) self::filesOf($payload)->poster_url,
            packId: self::ID_PREFIX.$payload['pack_id'],
            label: filled($label) ? $label : null,
            payload: $payload,
            keywords: array_values($keywords),
        );
    }

    /**
     * Bản ghi tạm (không lưu) chỉ để mượn cách dựng URL của model — URL của tệp
     * kho chỉ dựng ở một nơi.
     *
     * @param  array{animation_path: string, poster_path: string, static_path: string}  $payload
     */
    private static function filesOf(array $payload): LibrarySticker
    {
        return new LibrarySticker(array_intersect_key($payload, array_flip(self::REQUIRED_PATH_KEYS)));
    }

    /**
     * @param  array<string, mixed>  $stored
     * @return array{source: string, id: int, pack_id: int, animation_path: string, poster_path: string, static_path: string, width: int|null, height: int|null}|null
     */
    private static function validPayload(array $stored): ?array
    {
        if (($stored['source'] ?? null) !== self::SOURCE) {
            return null;
        }

        $id = self::positiveInt($stored['id'] ?? null);
        $packId = self::positiveInt($stored['pack_id'] ?? null);

        if ($id === null || $packId === null) {
            return null;
        }

        foreach (self::REQUIRED_PATH_KEYS as $key) {
            if (! is_string($stored[$key] ?? null) || trim($stored[$key]) === '') {
                return null;
            }
        }

        return [
            'source' => self::SOURCE,
            'id' => $id,
            'pack_id' => $packId,
            'animation_path' => $stored['animation_path'],
            'poster_path' => $stored['poster_path'],
            'static_path' => $stored['static_path'],
            'width' => self::positiveInt($stored['width'] ?? null),
            'height' => self::positiveInt($stored['height'] ?? null),
        ];
    }

    private static function libraryId(string $prefixedId): ?int
    {
        return self::owns($prefixedId) ? self::positiveInt(substr($prefixedId, strlen(self::ID_PREFIX))) : null;
    }

    private static function positiveInt(mixed $value): ?int
    {
        if (! is_int($value) && ! is_string($value)) {
            return null;
        }

        $int = filter_var($value, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);

        return $int === false ? null : $int;
    }
}
