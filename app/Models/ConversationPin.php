<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// Ghim theo từng nhân viên: người này ghim không làm đổi danh sách của người khác.
// Quyền xem hội thoại kiểm ở tầng gọi (fetchConversationForUser) trước khi ghim.
class ConversationPin extends Model
{
    protected $fillable = [
        'account_id',
        'user_id',
        'conversation_id',
    ];

    public static function pin(User $user, Conversation $conversation): void
    {
        $now = now();

        self::query()->insertOrIgnore([
            'account_id' => $conversation->account_id,
            'user_id' => $user->id,
            'conversation_id' => $conversation->id,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }

    public static function unpin(User $user, Conversation $conversation): void
    {
        self::query()
            ->where('user_id', $user->id)
            ->where('conversation_id', $conversation->id)
            ->delete();
    }

    /**
     * Khoá chính các hội thoại người này đã ghim trong account, có thể giới hạn
     * trong một nhóm hội thoại cho sẵn.
     *
     * @param  iterable<int>|null  $amongConversationIds
     * @return list<int>
     */
    public static function conversationIdsPinnedBy(User $user, int $accountId, ?iterable $amongConversationIds = null): array
    {
        $query = self::query()
            ->where('account_id', $accountId)
            ->where('user_id', $user->id);

        if ($amongConversationIds !== null) {
            $query->whereIn('conversation_id', collect($amongConversationIds)->all());
        }

        return $query->pluck('conversation_id')->map(fn ($id) => (int) $id)->all();
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
