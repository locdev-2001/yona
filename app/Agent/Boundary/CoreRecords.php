<?php

namespace App\Agent\Boundary;

use App\Agent\ValueObjects\ConversationRef;
use App\Models\AiAgent;
use App\Models\Conversation;

// Tra bản ghi lõi theo tham chiếu của agent, luôn khoá theo account: bản ghi account
// khác coi như không tồn tại. Nguồn duy nhất cho mọi adapter của Boundary.
final class CoreRecords
{
    public static function conversation(ConversationRef $conversation): ?Conversation
    {
        return Conversation::query()
            ->where('account_id', $conversation->accountId)
            ->whereKey($conversation->conversationId)
            ->first();
    }

    public static function aiAgent(int $accountId, int $aiAgentId): ?AiAgent
    {
        return AiAgent::query()->where('account_id', $accountId)->whereKey($aiAgentId)->first();
    }
}
