<?php

namespace App\Agent\Boundary\Writers;

use App\Agent\Boundary\CoreRecords;
use App\Agent\Contracts\Ports\ConversationFloor as FloorPort;
use App\Agent\ValueObjects\ConversationRef;
use App\Models\AiAgent;
use App\Models\Conversation;
use App\Services\Conversations\ConversationFloor;
use Carbon\CarbonImmutable;
use DateTimeImmutable;

// Bọc khoá lượt của lõi; lõi tự kiểm AI có phải AI trả lời của inbox và công tắc còn bật.
final class CoreConversationFloor implements FloorPort
{
    public function __construct(private readonly ConversationFloor $floor) {}

    public function acquire(ConversationRef $conversation, int $aiAgentId, DateTimeImmutable $until): bool
    {
        [$model, $aiAgent] = $this->locate($conversation, $aiAgentId);

        return $model !== null && $aiAgent !== null && $this->floor->acquire($model, $aiAgent, CarbonImmutable::instance($until));
    }

    public function release(ConversationRef $conversation, int $aiAgentId): void
    {
        [$model, $aiAgent] = $this->locate($conversation, $aiAgentId);

        if ($model !== null && $aiAgent !== null) {
            $this->floor->release($model, $aiAgent);
        }
    }

    public function heldUntil(ConversationRef $conversation): ?DateTimeImmutable
    {
        $heldUntil = CoreRecords::conversation($conversation)?->floorHeldUntil();

        return $heldUntil === null ? null : DateTimeImmutable::createFromInterface($heldUntil);
    }

    /** @return array{0: ?Conversation, 1: ?AiAgent} */
    private function locate(ConversationRef $conversation, int $aiAgentId): array
    {
        return [CoreRecords::conversation($conversation), CoreRecords::aiAgent($conversation->accountId, $aiAgentId)];
    }
}
