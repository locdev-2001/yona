<?php

namespace App\Models\Concerns;

use App\Search\SearchOutbox;
use Illuminate\Database\Eloquent\Builder;

/**
 * Model là tài liệu tìm kiếm: mọi lần tạo, sửa, xoá ghi một dòng outbox ngay
 * trong hook đồng bộ — tức cùng transaction với thay đổi, rollback thì mất theo.
 * Ghi hàng loạt bằng query builder hay saveQuietly bỏ qua hook; lệnh
 * search:reindex là lưới an toàn cho các đường đó.
 */
trait IndexedForSearch
{
    public static function bootIndexedForSearch(): void
    {
        static::created(fn (self $model) => app(SearchOutbox::class)->recordUpsert($model));
        static::updated(fn (self $model) => app(SearchOutbox::class)->recordUpsert($model));
        static::deleted(fn (self $model) => app(SearchOutbox::class)->recordRemoval($model));
    }

    /**
     * Bản ghi nào của bảng là tài liệu tìm kiếm — mặc định là tất cả.
     *
     * @param  Builder<static>  $query
     * @return Builder<static>
     */
    public function scopeSearchDocuments(Builder $query): Builder
    {
        return $query;
    }

    // Cùng luật với scopeSearchDocuments, cho một bản ghi đã nạp.
    public function isSearchDocument(): bool
    {
        return true;
    }
}
