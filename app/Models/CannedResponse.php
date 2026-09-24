<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// Bỏ: AccountCacheRevalidator (endpoint cache_keys chưa port — xem note B10).
class CannedResponse extends Model
{
    protected $fillable = [
        'account_id',
        'short_code',
        'content',
    ];

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    // Gộp điều kiện lọc của CannedResponsesController#canned_responses với scope
    // order_by_search: khớp đầu short_code (1) > khớp giữa short_code (0.5) >
    // khớp content (0.2). Ký tự NUL bị loại ở đây vì PostgreSQL không nhận nó
    // trong chuỗi truy vấn (bản gốc loại ở controller).
    /**
     * @param  Builder<self>  $query
     * @return Builder<self>
     */
    public function scopeSearch(Builder $query, string $term): Builder
    {
        $term = str_replace("\0", '', $term);
        $contains = '%'.$term.'%';

        return $query
            ->where(fn (Builder $matches) => $matches
                ->where('short_code', 'ILIKE', $contains)
                ->orWhere('content', 'ILIKE', $contains))
            ->orderByRaw(
                'CASE WHEN short_code ILIKE ? THEN 1 WHEN short_code ILIKE ? THEN 0.5 WHEN content ILIKE ? THEN 0.2 ELSE 0 END DESC',
                [$term.'%', $contains, $contains]
            );
    }
}
