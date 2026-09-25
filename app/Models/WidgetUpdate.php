<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Bài của tab "Cập nhật" trong widget: khuyến mãi, hàng mới, thông báo. */
class WidgetUpdate extends Model
{
    use HasFactory;

    public const TAGS = ['promo', 'new', 'notice'];

    protected $fillable = ['account_id', 'inbox_id', 'title', 'body', 'cover_url', 'tag', 'cta_label', 'cta_url', 'published_at'];

    protected function casts(): array
    {
        return ['published_at' => 'datetime'];
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    /** Đã xuất bản và dành cho hộp thư này (hoặc mọi hộp thư của account). */
    public function scopeVisibleIn(Builder $query, Inbox $inbox): Builder
    {
        return $query
            ->where('account_id', $inbox->account_id)
            ->where(fn (Builder $scope) => $scope->whereNull('inbox_id')->orWhere('inbox_id', $inbox->id))
            ->whereNotNull('published_at')
            ->where('published_at', '<=', now());
    }
}
