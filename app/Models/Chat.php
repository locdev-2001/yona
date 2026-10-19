<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

// Hội thoại giữa người dùng (1-1 và nhóm). Chung bảng `conversations` với hội thoại
// hộp thư nhưng là model riêng: không mang hook của hộp thư (gán người, webhook,
// automation, báo cáo), vốn đều giả định có account/inbox/contact.
class Chat extends Model
{
    use SoftDeletes;

    public const KIND_DIRECT = 1;

    public const KIND_GROUP = 2;

    protected $table = 'conversations';

    protected $fillable = [
        'kind',
        'title',
        'description',
        'created_by',
        'direct_key',
        'last_message_id',
        'last_activity_at',
        'member_count',
        'settings',
    ];

    protected function casts(): array
    {
        return [
            'settings' => 'array',
            'last_activity_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::addGlobalScope('chat', fn (Builder $query) => $query->whereNotNull('conversations.kind'));
    }

    public static function directKey(int $firstUserId, int $secondUserId): string
    {
        return min($firstUserId, $secondUserId).':'.max($firstUserId, $secondUserId);
    }

    public function isDirect(): bool
    {
        return $this->kind === self::KIND_DIRECT;
    }

    public function members(): HasMany
    {
        return $this->hasMany(ChatMember::class, 'conversation_id');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(ChatMessage::class, 'conversation_id');
    }

    public function lastMessage(): BelongsTo
    {
        return $this->belongsTo(ChatMessage::class, 'last_message_id');
    }

    public function memberFor(User $user): ?ChatMember
    {
        return $this->members->firstWhere('user_id', $user->getKey());
    }
}
