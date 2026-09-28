<?php

namespace App\Models;

use Database\Factories\StickerFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class Sticker extends Model
{
    /** @use HasFactory<StickerFactory> */
    use HasFactory;

    public const DISK = 'stickers';

    public const CUSTOM_STICKERS_FEATURE = 'custom_stickers';

    public const STATUS_PROCESSING = 'processing';

    public const STATUS_READY = 'ready';

    public const STATUS_FAILED = 'failed';

    protected $fillable = [
        'sticker_pack_id',
        'label',
        'keywords',
        'animation_path',
        'poster_path',
        'static_path',
        'content_hash',
        'width',
        'height',
        'frame_count',
        'duration_ms',
        'byte_size',
        'status',
        'failure_code',
        'position',
    ];

    protected $attributes = [
        'keywords' => '[]',
        'status' => self::STATUS_PROCESSING,
        'position' => 0,
    ];

    protected function casts(): array
    {
        return [
            'keywords' => 'array',
            'width' => 'integer',
            'height' => 'integer',
            'frame_count' => 'integer',
            'duration_ms' => 'integer',
            'byte_size' => 'integer',
            'position' => 'integer',
        ];
    }

    /** @return BelongsTo<StickerPack, $this> */
    public function stickerPack(): BelongsTo
    {
        return $this->belongsTo(StickerPack::class);
    }

    /**
     * Nguồn duy nhất của quy tắc "account nào thấy sticker nào": kho nền tảng
     * cho mọi account, kho riêng chỉ cho chính account đó; chỉ sticker đã xử lý
     * xong trong bộ đã xuất bản. Ai được tạo bộ trong kho riêng do
     * StickerLibraryAccess quyết; bộ đã xuất bản thì account luôn thấy.
     *
     * @param  Builder<self>  $query
     * @return Builder<self>
     */
    public function scopeVisibleTo(Builder $query, Account $account): Builder
    {
        return $query
            ->where('status', self::STATUS_READY)
            ->whereHas('stickerPack', fn (Builder $pack) => $pack
                ->published()
                ->where(fn (Builder $owner) => $owner->whereNull('account_id')->orWhere('account_id', $account->id)));
    }

    /** @return Attribute<string|null, never> */
    protected function animationUrl(): Attribute
    {
        return Attribute::get(fn () => self::diskUrl($this->animation_path));
    }

    /** @return Attribute<string|null, never> */
    protected function posterUrl(): Attribute
    {
        return Attribute::get(fn () => self::diskUrl($this->poster_path));
    }

    /** @return Attribute<string|null, never> */
    protected function staticUrl(): Attribute
    {
        return Attribute::get(fn () => self::diskUrl($this->static_path));
    }

    private static function diskUrl(?string $path): ?string
    {
        return $path === null ? null : Storage::disk(self::DISK)->url($path);
    }
}
