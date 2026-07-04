<?php

namespace App\Models;

use App\Models\Concerns\BelongsToWorkspace;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * P10 (inbox-multichannel-relayer) — event bridge chưa có handler product
 * (undo/seen/delivered/reaction/typing/connected…) được LƯU thay vì drop im
 * lặng (H1). KHÔNG tính metering — kho quan sát, không phải message.
 *
 * Idempotent theo unique partial (workspace_id, event_type, source_id).
 *
 * @property string $id
 * @property string $workspace_id
 * @property string|null $channel_account_id
 * @property int|null $connection_id
 * @property string $event_type
 * @property string|null $personal_uid
 * @property string|null $source_id
 * @property array<string, mixed> $payload
 * @property Carbon $received_at
 * @property Carbon $created_at
 */
class RelayEvent extends Model
{
    use BelongsToWorkspace, HasUuids;

    public const UPDATED_AT = null;

    protected $fillable = [
        'channel_account_id',
        'connection_id',
        'event_type',
        'personal_uid',
        'source_id',
        'payload',
        'received_at',
    ];

    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'received_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<ChannelAccount, $this> */
    public function channelAccount(): BelongsTo
    {
        return $this->belongsTo(ChannelAccount::class);
    }
}
