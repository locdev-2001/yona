<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// Port từ refs/chatwoot/app/models/data_import_error.rb — nhật ký lỗi từng
// bản ghi của một lần nhập.
class DataImportError extends Model
{
    public const SKIP_LOG_KINDS = ['failed', 'skipped'];

    protected $fillable = [
        'data_import_id',
        'source_object_type',
        'source_object_id',
        'error_code',
        'message',
        'details',
    ];

    protected function casts(): array
    {
        return ['details' => 'array'];
    }

    /** @param Builder<self> $query */
    public function scopeSkipLogs(Builder $query): Builder
    {
        return $query->whereRaw("details ->> 'kind' IN (?, ?)", self::SKIP_LOG_KINDS);
    }

    /** @param Builder<self> $query */
    public function scopeNonSkipLogs(Builder $query): Builder
    {
        return $query->whereRaw("details ->> 'kind' IS NULL OR details ->> 'kind' NOT IN (?, ?)", self::SKIP_LOG_KINDS);
    }

    public function dataImport(): BelongsTo
    {
        return $this->belongsTo(DataImport::class);
    }
}
