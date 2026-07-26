<?php

namespace App\Models;

use App\Models\Concerns\BelongsToWorkspace;
use App\Models\Concerns\HasNotes;
use App\Models\Concerns\HasTags;
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
 * @property array<string, array{name: string|null, avatar: string|null}>|null $participants
 * @property Carbon|null $last_message_at
 * @property string|null $last_message_preview
 * @property int $unread_count
 * @property string|null $last_metered_period
 * @property string|null $agent_unlocked_period
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
    use BelongsToWorkspace, HasNotes, HasTags, HasUuids, SoftDeletes;

    protected $fillable = [
        'channel',
        'channel_account_id',
        'peer_uid',
        'thread_type',
        'peer_phone',
        'phone_source',
        'peer_name',
        'peer_avatar_url',
        'contact_id',
        'lead_id',
        'conversation_number',
        'last_message_at',
        'last_message_preview',
        'unread_count',
        'last_metered_period',
        'agent_unlocked_period',
        'created_by',
        'updated_by',
    ];

    protected function casts(): array
    {
        return [
            'thread_type' => 'integer',
            'participants' => 'array',
            'unread_count' => 'integer',
            'lock_version' => 'integer',
            'stream_version' => 'integer',
            'conversation_number' => 'integer',
            'last_message_at' => 'datetime',
            'deleted_at' => 'datetime',
            'phone_verified_at' => 'datetime',
            'phone_enriched_at' => 'datetime',
        ];
    }

    /** @return HasMany<Message, $this> */
    public function messages(): HasMany
    {
        return $this->hasMany(Message::class);
    }

    /** @return BelongsTo<User, $this> P07 — người phụ trách (gán qua ConversationAssignController) */
    public function assignedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_user_id');
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

    /**
     * Upsert hồ sơ thành viên nhóm (keyed sender_uid) từ tin inbound có sender profile.
     * Field null giữ giá trị cũ (backfill/tin thiếu profile không xoá dữ liệu đã có);
     * chỉ save khi thực sự đổi — tin liên tiếp cùng người gửi là no-op.
     */
    public function rememberParticipant(?string $uid, ?string $name, ?string $avatar): void
    {
        if ($uid === null || $uid === '' || ($name === null && $avatar === null)) {
            return;
        }

        $participants = $this->participants ?? [];
        $current = $participants[$uid] ?? [];
        $merged = [
            'name' => $name ?? ($current['name'] ?? null),
            'avatar' => $avatar ?? ($current['avatar'] ?? null),
        ];

        if ($merged === $current) {
            return;
        }

        $participants[$uid] = $merged;
        $this->forceFill(['participants' => $participants])->save();
    }
}
