<?php

namespace App\Models;

use App\Models\Concerns\BelongsToWorkspace;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * P07 — Message entity. Immutable log per hội thoại.
 *
 * Immutable: KHÔNG softDeletes (không sửa, không xóa — chỉ append).
 * source_id: msgId từ platform — unique(conversation_id, source_id) idempotency (F14).
 * direction: 'in' (peer → tenant) | 'out' (tenant → peer, tính metering).
 *
 * @property string $id
 * @property string $workspace_id
 * @property string $conversation_id
 * @property string $direction
 * @property string $type
 * @property string|null $body
 * @property string|null $media_url
 * @property array<string, mixed> $media_meta
 * @property string|null $source_id
 * @property Carbon|null $platform_sent_at
 * @property string|null $sender_uid
 * @property string|null $sender_name
 * @property int|null $sent_by
 * @property Carbon|null $recalled_at
 * @property Carbon|null $delivered_at
 * @property Carbon|null $seen_at
 * @property array<string, mixed> $platform_meta
 * @property Carbon $created_at
 * @property Carbon $updated_at
 */
class Message extends Model
{
    use BelongsToWorkspace, HasUuids;

    protected $fillable = [
        'conversation_id',
        'direction',
        'type',
        'body',
        'media_url',
        'media_meta',
        'source_id',
        'platform_sent_at',
        'sender_uid',
        'sender_name',
        'sent_by',
        'platform_meta',
    ];

    protected function casts(): array
    {
        return [
            'media_meta' => 'array',
            'platform_meta' => 'array',
            'platform_sent_at' => 'datetime',
            'recalled_at' => 'datetime',
            'delivered_at' => 'datetime',
            'seen_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Conversation, $this> */
    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }
}
