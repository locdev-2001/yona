<?php

namespace App\Models;

use App\Models\Concerns\BelongsToWorkspace;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * P01 (inbox-multichannel-relayer) — L4 core: dấu ngăn mất tin (kind=session_gap)
 * trong luồng stream hợp nhất (P05). Immutable — chỉ created_at, không updated_at.
 *
 * Unique(conversation_id, kind, gap_started_at): idempotent, reconnect nhiều
 * lần không nhân marker. KHÔNG đụng metering/unread/preview.
 *
 * @property string $id
 * @property string $workspace_id
 * @property string $conversation_id
 * @property string $kind
 * @property Carbon $gap_started_at
 * @property Carbon|null $gap_ended_at
 * @property Carbon $stream_at
 * @property int $stream_rank
 * @property Carbon $created_at
 */
class ConversationEvent extends Model
{
    use BelongsToWorkspace, HasUuids;

    public $timestamps = false;

    protected $fillable = [
        'conversation_id',
        'kind',
        'gap_started_at',
        'gap_ended_at',
        'stream_at',
        'stream_rank',
    ];

    protected function casts(): array
    {
        return [
            'gap_started_at' => 'datetime',
            'gap_ended_at' => 'datetime',
            'stream_at' => 'datetime',
            'stream_rank' => 'integer',
            'created_at' => 'datetime',
        ];
    }

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (self $event): void {
            $event->created_at ??= now();
        });
    }

    /** @return BelongsTo<Conversation, $this> */
    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }
}
