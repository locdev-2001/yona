<?php

namespace App\Models;

use App\Events\DomainEvent;
use App\Events\EventType;
use Database\Factories\MentionFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\DB;

class Mention extends Model
{
    /** @use HasFactory<MentionFactory> */
    use HasFactory;

    protected $fillable = [
        'account_id',
        'user_id',
        'conversation_id',
        'mentioned_at',
    ];

    protected function casts(): array
    {
        return [
            'mentioned_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (Mention $mention) {
            $mention->account_id ??= $mention->conversation?->account_id;
        });

        // notify_mentioned_user: bản gốc là after_commit không giới hạn `on:`,
        // ở đây chỉ bắn khi tạo/cập nhật — xem mục Khác biệt cố ý của b11-notes-be.
        static::saved(function (Mention $mention) {
            DomainEvent::dispatch(EventType::CONVERSATION_MENTIONED, [
                'user' => $mention->user,
                'conversation' => $mention->conversation,
            ]);
        });
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // scope :latest của bản gốc — đổi tên vì Eloquent đã có Builder::latest().
    public function scopeLatestMentioned(Builder $query): Builder
    {
        return $query->orderBy('mentioned_at', 'desc');
    }

    // Mention.last_user_message_at: nối với tin nhắn mới nhất của mỗi hội thoại
    // rồi xếp incoming trước, cùng phép SQL với Conversation::scopeLastUserMessageAt.
    public function scopeLastUserMessageAt(Builder $query): Builder
    {
        $lastMessagePerConversation = 'SELECT DISTINCT ON (conversation_id) conversation_id, created_at, message_type'
            .' FROM messages ORDER BY conversation_id, created_at DESC';

        return $query
            ->select('mentions.*')
            ->join(
                DB::raw("($lastMessagePerConversation) AS grouped_conversations"),
                'grouped_conversations.conversation_id',
                '=',
                'mentions.conversation_id'
            )
            ->orderBy('grouped_conversations.message_type')
            ->orderBy('grouped_conversations.created_at');
    }
}
