<?php

namespace App\Agent\Boundary;

use App\Agent\ValueObjects\ConversationRef;
use App\Models\AiAgent;
use App\Models\Conversation;
use App\Models\Inbox;
use Illuminate\Support\Str;

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

    // Tên kênh trung tính cho mô hình đọc (`zalo`, `web_widget`…), không lộ tên lớp lõi.
    public static function channel(Inbox $inbox): string
    {
        return Str::snake(Str::afterLast((string) $inbox->channel_type, ':'));
    }
}
