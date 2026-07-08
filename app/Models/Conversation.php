<?php

namespace App\Models;

use App\Models\Concerns\BelongsToWorkspace;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * P07 — Conversation entity. Inbox hội thoại per-channel per-peer.
 *
 * F23: contact_id IS NULL = "Liên hệ nháp" (assertion bất biến, không tạo CDP rỗng).
 * F17/F26: soft-delete — opt-out = ẩn mềm; global scope whereNull(deleted_at).
 * F1: last_metered_period — compare-set atomic metering (Y-m string).
 * lead_id: no FK (cross-module isolation N1, inbox không biết crm-sales models).
 *
 * @property string $id
 * @property string $workspace_id
 * @property string $channel
 * @property string|null $channel_account_id
 * @property string $peer_uid
 * @property int $thread_type
 * @property string|null $peer_phone
 * @property string|null $peer_name
 * @property string|null $peer_avatar_url
 * @property string|null $contact_id
 * @property string|null $lead_id
 * @property int $conversation_number
 * @property Carbon|null $last_message_at
 * @property string|null $last_message_preview
 * @property int $unread_count
 * @property string|null $last_metered_period
 * @property int $lock_version
 * @property int $stream_version
 * @property int|null $created_by
 * @property int|null $updated_by
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property Carbon|null $deleted_at
 */
class Conversation extends Model
{
    use BelongsToWorkspace, HasUuids, SoftDeletes;

    protected $fillable = [
        'channel',
        'channel_account_id',
        'peer_uid',
        'thread_type',
        'peer_phone',
        'peer_name',
        'peer_avatar_url',
        'contact_id',
        'lead_id',
        'conversation_number',
        'last_message_at',
        'last_message_preview',
        'unread_count',
        'last_metered_period',
        'created_by',
        'updated_by',
    ];

    protected function casts(): array
    {
        return [
            'thread_type' => 'integer',
            'unread_count' => 'integer',
            'lock_version' => 'integer',
            'stream_version' => 'integer',
            'conversation_number' => 'integer',
            'last_message_at' => 'datetime',
            'deleted_at' => 'datetime',
        ];
    }

    /** @return HasMany<Message, $this> */
    public function messages(): HasMany
    {
        return $this->hasMany(Message::class);
    }

    /** @return BelongsTo<ChannelAccount, $this> */
    public function channelAccount(): BelongsTo
    {
        return $this->belongsTo(ChannelAccount::class);
    }

    /**
     * True nếu hội thoại chưa được gắn Contact = "Liên hệ nháp" (F23).
     */
    public function isDraftContact(): bool
    {
        return $this->contact_id === null;
    }
}
