<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// Tin trong hội thoại giữa người dùng. Chung bảng `messages` (chia partition theo
// tháng) với tin hộp thư nhưng không mang hook gửi ra kênh ngoài của Message.
// Người gửi luôn là User; tin hệ thống (vd "A đã thêm B") không có người gửi.
class ChatMessage extends Model
{
    public const TYPE_USER = Message::TYPE_OUTGOING;

    public const TYPE_SYSTEM = Message::TYPE_ACTIVITY;

    protected $table = 'messages';

    protected $fillable = [
        'conversation_id',
        'message_type',
        'content',
        'content_type',
        'content_attributes',
        'sender_type',
        'sender_id',
        'client_id',
        'edited_at',
        'status',
    ];

    protected $attributes = [
        'private' => false,
        'status' => 0,
        'content_type' => 0,
        'content_attributes' => '{}',
    ];

    protected function casts(): array
    {
        return [
            'content_attributes' => 'array',
            'edited_at' => 'datetime',
            'platform_sent_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (ChatMessage $message) {
            $message->created_at ??= $message->freshTimestamp();
            $message->platform_sent_at ??= $message->created_at;
        });
    }

    public function chat(): BelongsTo
    {
        return $this->belongsTo(Chat::class, 'conversation_id');
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    public function isRecalled(): bool
    {
        return ($this->content_attributes['deleted'] ?? false) === true;
    }
}
