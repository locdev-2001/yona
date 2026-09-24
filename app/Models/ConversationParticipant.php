<?php

namespace App\Models;

use Database\Factories\ConversationParticipantFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// Kiểm tra quyền vào inbox nằm ở Conversation::addParticipant() — cổng duy nhất
// tạo bản ghi này. FilteredCountInvalidator không port (B8 bỏ tầng cache đếm).
class ConversationParticipant extends Model
{
    /** @use HasFactory<ConversationParticipantFactory> */
    use HasFactory;

    protected $fillable = [
        'account_id',
        'user_id',
        'conversation_id',
    ];

    protected static function booted(): void
    {
        static::saving(function (ConversationParticipant $participant) {
            $participant->account_id ??= $participant->conversation?->account_id;
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
}
