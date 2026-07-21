<?php

namespace App\Models;

use App\Models\Concerns\BelongsToWorkspace;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * P01a — pending BOUNDED cho undo event-đến-trước-tin (KHÔNG phải kho append-only).
 *
 * Unique (workspace_id, event_type, target_msg_id) + TTL 48h + prune daily.
 * Ingest tin mới quét theo target_msg_id = messages.source_id → áp + xoá (P02).
 *
 * @property string $id
 * @property string $workspace_id
 * @property string|null $channel_account_id
 * @property string $event_type
 * @property string $target_msg_id
 * @property array<string, mixed> $payload
 * @property Carbon $expires_at
 */
class PendingMessageState extends Model
{
    use BelongsToWorkspace, HasUuids;

    public const TTL_HOURS = 48;

    protected $fillable = [
        'channel_account_id',
        'event_type',
        'target_msg_id',
        'payload',
        'expires_at',
    ];

    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'expires_at' => 'datetime',
        ];
    }
}
