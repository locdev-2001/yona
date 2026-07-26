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
 * @property string $sender_uid
 * @property int $thread_type
 * @property string $thread_kind
 * @property string|null $contact_id
 * @property string|null $lead_id
 * @property int $conversation_number
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
        'sender_uid',
        'thread_type',
        'thread_kind',
        'thread_name',
        'thread_avatar',
        'identity_id',
        'profile_id',
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
            'thread_kind' => 'string',
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

    /** Loại luồng: nhắn riêng. */
    public const KIND_DIRECT = 'direct';

    /** Loại luồng: nhóm nhiều người. */
    public const KIND_GROUP = 'group';

    /**
     * Luồng này có nhiều người không.
     *
     * Đây là chỗ DUY NHẤT được biết cách suy ra điều đó. Còn đọc `thread_type`
     * rải rác là còn chỗ quên khi thêm loại luồng thứ ba.
     */
    public function isGroup(): bool
    {
        return $this->threadKind() === self::KIND_GROUP;
    }

    /**
     * Cột số nguyên cũ chỉ dùng làm phương án dự phòng cho cửa sổ giữa lúc thêm
     * cột và lúc điền xong. Sau đó nó không còn được đọc ở đâu ngoài lớp dịch
     * của kênh.
     */
    public function threadKind(): string
    {
        return $this->thread_kind ?? ((int) $this->thread_type === 1 ? self::KIND_GROUP : self::KIND_DIRECT);
    }

    /**
     * Cột số nguyên cũ là GƯƠNG của `thread_kind`, giữ đồng bộ ở đúng một chỗ.
     *
     * Nó không còn được đọc ở đâu ngoài lớp dịch của kênh, nhưng vẫn phải đúng:
     * nếu phải quay đầu về bản trước, code cũ đọc chính cột này để biết đâu là
     * nhóm. Đây là chuyện tương thích schema nên nó thuộc tầng dữ liệu — lõi
     * nghiệp vụ không được biết cột cũ tồn tại. Xóa cùng lúc với cột, ở P5.
     */
    protected static function booted(): void
    {
        static::saving(function (self $conversation): void {
            $conversation->thread_type = $conversation->threadKind() === self::KIND_GROUP ? 1 : 0;
        });
    }

    /** @return BelongsTo<Profile, $this> */
    public function profile(): BelongsTo
    {
        return $this->belongsTo(Profile::class);
    }

    /** @return HasMany<ConversationMember, $this> */
    public function members(): HasMany
    {
        return $this->hasMany(ConversationMember::class);
    }

    /**
     * Số điện thoại của người ở đầu bên kia — đọc từ bí danh, không phải từ một
     * bản sao trên chính luồng.
     *
     * Đây là truy vấn theo TỪNG luồng, cố ý không dùng cho danh sách hộp thư:
     * danh sách hiển thị `thread_name`, còn số điện thoại chỉ hiện ở màn hình
     * chi tiết một hội thoại.
     */
    public function senderPhone(): ?string
    {
        if ($this->profile_id === null) {
            return null;
        }

        return ProfileIdentity::query()
            ->where('profile_id', $this->profile_id)
            ->where('key', 'phone')
            ->orderByDesc('is_verified')
            ->orderByDesc('last_seen_at')
            // Cột thời gian chỉ chính xác tới giây, nên hai số học được trong
            // cùng một giây sẽ hòa. Khóa của bảng là uuid có thứ tự thời gian —
            // nó phân định được, và phân định đúng chiều.
            ->orderByDesc('id')
            ->value('value');
    }

    /**
     * Tên và avatar của từng người trong luồng, theo khóa thô của họ.
     *
     * Dựng từ `conversation_members` nối sang bí danh — nguồn duy nhất. Trước
     * đây thông tin này là một bản sao trong cột jsonb trên chính luồng, và bản
     * sao đó lệch dần với hồ sơ thật.
     *
     * Chỉ dùng cho MÀN HÌNH MỘT HỘI THOẠI. Danh sách hộp thư không gọi — nó
     * hiển thị `thread_name`, và gọi ở đó là một truy vấn cho mỗi hàng.
     *
     * @return array<string, array{name: string|null, avatar: string|null}>
     */
    public function memberProfiles(): array
    {
        $rows = ConversationMember::query()
            ->where('conversation_id', $this->id)
            ->leftJoin('profile_identities', 'profile_identities.id', '=', 'conversation_members.identity_id')
            ->get([
                'conversation_members.sender_uid',
                'profile_identities.display_name',
                'profile_identities.channel_profiles',
            ]);

        $profiles = [];

        foreach ($rows as $row) {
            $channelProfiles = json_decode((string) ($row->channel_profiles ?? '{}'), true) ?: [];
            $entry = $channelProfiles[$this->channel] ?? reset($channelProfiles) ?: [];

            $profiles[$row->sender_uid] = [
                'name' => $row->display_name,
                'avatar' => $entry['avatar'] ?? null,
            ];
        }

        return $profiles;
    }
}
