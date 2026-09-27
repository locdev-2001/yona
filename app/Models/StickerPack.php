<?php

namespace App\Models;

use Database\Factories\StickerPackFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

// Bộ sticker. Không có account là kho chung của Yona. Ai thấy sticker nào do
// Sticker::visibleTo() quyết định, không lọc lại ở đây.
class StickerPack extends Model
{
    /** @use HasFactory<StickerPackFactory> */
    use HasFactory;

    protected $fillable = [
        'account_id',
        'name',
        'position',
        'published_at',
    ];

    protected function casts(): array
    {
        return [
            'position' => 'integer',
            'published_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Account, $this> */
    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    /** @return HasMany<Sticker, $this> */
    public function stickers(): HasMany
    {
        return $this->hasMany(Sticker::class);
    }

    /**
     * @param  Builder<self>  $query
     * @return Builder<self>
     */
    public function scopePublished(Builder $query): Builder
    {
        return $query->whereNotNull('published_at');
    }
}
