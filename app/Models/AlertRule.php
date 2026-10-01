<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

// Một luật cảnh báo của console quản trị: chỉ số (key) nào, ngưỡng bao nhiêu, cửa sổ
// đánh giá, thời gian chờ giữa hai lần báo. Danh sách chỉ số ở AlertMetrics.
class AlertRule extends Model
{
    protected $fillable = [
        'key',
        'enabled',
        'threshold',
        'window_minutes',
        'cooldown_minutes',
        'last_value',
        'last_evaluated_at',
        'breaching_since',
    ];

    protected function casts(): array
    {
        return [
            'enabled' => 'boolean',
            'threshold' => 'integer',
            'window_minutes' => 'integer',
            'cooldown_minutes' => 'integer',
            'last_value' => 'integer',
            'last_evaluated_at' => 'datetime',
            'breaching_since' => 'datetime',
        ];
    }

    public function incidents(): HasMany
    {
        return $this->hasMany(AlertIncident::class);
    }

    public function openIncident(): HasOne
    {
        return $this->hasOne(AlertIncident::class)->whereNull('resolved_at')->latestOfMany('opened_at');
    }
}
