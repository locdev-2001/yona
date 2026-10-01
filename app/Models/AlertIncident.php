<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// Một lần chỉ số vượt ngưỡng, từ lúc mở tới lúc hồi phục. notified_at null nghĩa là
// sự cố mở trong thời gian chờ của lần báo trước nên chưa gửi thông báo.
class AlertIncident extends Model
{
    protected $fillable = [
        'alert_rule_id',
        'value',
        'peak_value',
        'last_value',
        'threshold',
        'opened_at',
        'resolved_at',
        'notified_at',
        'recovery_notified_at',
    ];

    protected function casts(): array
    {
        return [
            'value' => 'integer',
            'peak_value' => 'integer',
            'last_value' => 'integer',
            'threshold' => 'integer',
            'opened_at' => 'datetime',
            'resolved_at' => 'datetime',
            'notified_at' => 'datetime',
            'recovery_notified_at' => 'datetime',
        ];
    }

    public function rule(): BelongsTo
    {
        return $this->belongsTo(AlertRule::class, 'alert_rule_id');
    }

    public function isOpen(): bool
    {
        return $this->resolved_at === null;
    }

    /** @param  Builder<self>  $query */
    public function scopeOpen(Builder $query): void
    {
        $query->whereNull('resolved_at');
    }
}
