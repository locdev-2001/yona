<?php

namespace App\Models;

use Database\Factories\ReportingEventFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// Port từ refs/chatwoot/app/models/reporting_event.rb.
class ReportingEvent extends Model
{
    /** @use HasFactory<ReportingEventFactory> */
    use HasFactory;

    public const NAME_CONVERSATION_RESOLVED = 'conversation_resolved';

    public const NAME_FIRST_RESPONSE = 'first_response';

    public const NAME_REPLY_TIME = 'reply_time';

    public const NAME_CONVERSATION_BOT_RESOLVED = 'conversation_bot_resolved';

    public const NAME_CONVERSATION_BOT_HANDOFF = 'conversation_bot_handoff';

    public const NAME_CONVERSATION_OPENED = 'conversation_opened';

    protected $fillable = [
        'name',
        'value',
        'value_in_business_hours',
        'account_id',
        'inbox_id',
        'user_id',
        'conversation_id',
        'event_start_time',
        'event_end_time',
    ];

    protected function casts(): array
    {
        return [
            'value' => 'float',
            'value_in_business_hours' => 'float',
            'event_start_time' => 'datetime',
            'event_end_time' => 'datetime',
        ];
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function inbox(): BelongsTo
    {
        return $this->belongsTo(Inbox::class);
    }

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }

    /** @param array{0: \DateTimeInterface, 1: \DateTimeInterface}|null $range */
    public function scopeFilterByDateRange(Builder $query, ?array $range): Builder
    {
        return $range === null ? $query : $query->where('created_at', '>=', $range[0])->where('created_at', '<', $range[1]);
    }

    public function scopeFilterByName(Builder $query, ?string $name): Builder
    {
        return blank($name) ? $query : $query->where('name', $name);
    }
}
