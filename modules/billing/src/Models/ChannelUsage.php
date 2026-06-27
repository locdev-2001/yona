<?php

namespace Modules\Billing\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Modules\Tenancy\Concerns\BelongsToWorkspace;

/**
 * ChannelUsage — bộ đếm hội thoại per-workspace per-channel per-month (RLS).
 *
 * period: 'YYYY-MM' (ví dụ '2026-06').
 * answered_count: tăng atomic qua ON CONFLICT DO UPDATE (F1 compare-set).
 * unique(workspace_id, channel, period) đảm bảo chỉ 1 row per kỳ.
 */
class ChannelUsage extends Model
{
    use BelongsToWorkspace, HasUuids;

    // Laravel pluralize → channel_usages, nhưng bảng thật là channel_usage
    protected $table = 'channel_usage';

    protected $fillable = [
        'workspace_id',
        'channel',
        'period',
        'answered_count',
    ];

    protected function casts(): array
    {
        return [
            'answered_count' => 'integer',
        ];
    }
}
