<?php

namespace App\Jobs\Conversations;

use App\Jobs\ApplicationJob;
use App\Models\Mention;

// Mỗi cặp (user, conversation) chỉ có một bản ghi; nhắc lại thì dời mentioned_at.
class UserMentionJob extends ApplicationJob
{
    /** @param list<int> $mentionedUserIds */
    public function __construct(
        public readonly array $mentionedUserIds,
        public readonly int $conversationId,
        public readonly int $accountId,
    ) {}

    public function handle(): void
    {
        foreach ($this->mentionedUserIds as $userId) {
            $mention = Mention::query()->firstOrNew([
                'user_id' => (int) $userId,
                'conversation_id' => $this->conversationId,
                'account_id' => $this->accountId,
            ]);

            $mention->mentioned_at = now();
            $mention->save();
        }
    }
}
