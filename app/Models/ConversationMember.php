<?php

namespace App\Models;

use App\Models\Concerns\BelongsToWorkspace;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Ai đang ở trong luồng nào.
 *
 * Ghi cho CẢ 1-1 lẫn nhóm (1-1 đúng một hàng) để câu hỏi "người này ở đâu" chỉ
 * có một đường trả lời, thay vì một đường cho nhóm và một đường cho tin riêng.
 *
 * Khóa nghiệp vụ là `(conversation_id, sender_uid)` — sự thật thô của nền tảng,
 * luôn biết được, kể cả khi chưa resolve ra con người. Nó là ràng buộc DUY NHẤT
 * trên bảng, nhưng KHÔNG phải khóa chính: Eloquent không hỗ trợ khóa tổ hợp, và
 * một model khai `$primaryKey = null` sẽ sinh `UPDATE` không có `WHERE` dùng
 * được — ghi một hàng là ghi đè cả bảng. Đã xảy ra thật.
 *
 * @property string $conversation_id
 * @property string $sender_uid
 * @property string $workspace_id
 * @property string|null $channel_account_id
 * @property string|null $identity_id
 * @property string|null $profile_id
 * @property Carbon|null $first_seen_at
 * @property Carbon|null $last_seen_at
 * @property Carbon|null $left_at
 */
class ConversationMember extends Model
{
    use BelongsToWorkspace;
    use HasUuids;

    protected $fillable = [
        'conversation_id',
        'sender_uid',
        'workspace_id',
        'channel_account_id',
        'identity_id',
        'profile_id',
        'first_seen_at',
        'last_seen_at',
        'left_at',
    ];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'first_seen_at' => 'datetime',
            'last_seen_at' => 'datetime',
            'left_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Conversation, $this> */
    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }

    /** @return BelongsTo<Profile, $this> */
    public function profile(): BelongsTo
    {
        return $this->belongsTo(Profile::class);
    }
}
