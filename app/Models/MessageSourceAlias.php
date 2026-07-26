<?php

namespace App\Models;

use App\Models\Concerns\BelongsToWorkspace;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * P01 (inbox-multichannel-relayer) — compat dedup xuyên migration: map
 * message_id ↔ legacy source_id. Backfill 100% (P02e) TRƯỚC khi drop
 * conversations.zalo_connection_id (P02g). Ingest lookup ở P06.
 *
 * @property string $id
 * @property string $workspace_id
 * @property string $conversation_id
 * @property string $message_id
 * @property string $source_id
 * @property string $kind
 * @property Carbon $created_at
 */
class MessageSourceAlias extends Model
{
    use BelongsToWorkspace, HasUuids;

    public $timestamps = false;

    protected $fillable = [
        'conversation_id',
        'message_id',
        'source_id',
        'kind',
    ];

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
        ];
    }

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (self $alias): void {
            $alias->created_at ??= now();
        });
    }

    /** @return BelongsTo<Message, $this> */
    public function message(): BelongsTo
    {
        return $this->belongsTo(Message::class);
    }

    /** @return BelongsTo<Conversation, $this> */
    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }

    /**
     * P06 — lookup message_id qua alias (source_id legacy hoặc source_id contract cũ
     * qua reconnect). Dùng bởi IntakeService::findExistingBySource() sau khi
     * miss messages.source_id trực tiếp.
     */
    public static function messageIdFor(string $conversationId, string $sourceId): ?string
    {
        return static::query()
            ->where('conversation_id', $conversationId)
            ->where('source_id', $sourceId)
            ->value('message_id');
    }
}
