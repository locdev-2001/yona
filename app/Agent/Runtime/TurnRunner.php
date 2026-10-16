<?php

namespace App\Agent\Runtime;

use App\Agent\Context\History;
use App\Agent\Contracts\Ports\AiAgentDirectory;
use App\Agent\Contracts\Ports\ConversationFloor;
use App\Agent\Contracts\Ports\ConversationReader;
use App\Agent\Contracts\Ports\EphemeralStore;
use App\Agent\ValueObjects\AiAgentProfile;
use App\Agent\ValueObjects\AutonomyLevel;
use App\Agent\ValueObjects\ConversationSnapshot;
use App\Agent\ValueObjects\CoreMessage;
use App\Agent\ValueObjects\MessageOrigin;
use App\Agent\ValueObjects\StimulusDecisionKind;
use App\Agent\ValueObjects\TurnContext;
use App\Agent\ValueObjects\TurnSituation;
use App\Agent\ValueObjects\Usage;
use Carbon\CarbonImmutable;
use Psr\Log\LoggerInterface;

// Một lượt từ lúc job tỉnh dậy: hỏi lại Router, nhường cho job của tin mới hơn hoặc thoát
// khi tin đã được lượt trước lo, giữ quyền nói tới deadline + dự phòng, chạy vòng, và
// nhả quyền nói ở MỌI đường ra (worker chết thì khoá tự hết hạn).
final class TurnRunner
{
    private const MARK_TTL_SECONDS = 86_400;

    public function __construct(
        private readonly ConversationReader $reader,
        private readonly AiAgentDirectory $agents,
        private readonly ConversationFloor $floor,
        private readonly EphemeralStore $store,
        private readonly TurnJobMark $jobMark,
        private readonly StimulusRouter $router,
        private readonly History $history,
        private readonly TurnLoop $loop,
        private readonly Dispositions $dispositions,
        private readonly TurnTally $tally,
        private readonly TurnSettings $settings,
        private readonly LoggerInterface $logger,
    ) {}

    public function run(TurnOrder $order, string $jobKey): ?TurnEnd
    {
        $conversation = $order->conversation();
        $snapshot = $this->reader->conversation($conversation);
        $decision = $this->router->decide($snapshot);

        if ($decision->kind !== StimulusDecisionKind::Respond || $snapshot === null || $decision->aiAgentId === null) {
            return null;
        }

        if (($this->store->get($this->handledKey($order)) ?? 0) >= $order->wakeMessageId) {
            return null;
        }

        $recent = $this->reader->messagesAfter($conversation, null, $this->settings->historyMessages);

        if ($this->isStale($recent, $order->wakeMessageId)) {
            return null;
        }

        $agent = $this->agents->profile($order->accountId, $decision->aiAgentId);

        if ($agent === null || ! $this->jobMark->claim($jobKey)) {
            return null;
        }

        $now = CarbonImmutable::now();
        $turn = $this->turn($order, $snapshot, $decision->aiAgentId, $agent, $recent, $now);

        if (! $snapshot->canReply) {
            return $this->tallied($turn, $this->dispositions->fallBack(FallbackReason::WindowClosed, $turn));
        }

        $until = $now->addSeconds($this->settings->deadlineSeconds + $this->settings->floorGraceSeconds)->toDateTimeImmutable();

        if (! $this->floor->acquire($conversation, $decision->aiAgentId, $until)) {
            return null;
        }

        try {
            $end = $this->tallied($turn, $this->loop->run($turn));
            $this->store->put($this->handledKey($order), $turn->context->snapshotMessageId, self::MARK_TTL_SECONDS);
            $this->logger->info('agent.turn.ended', [
                'conversation_id' => $order->conversationId,
                'end' => $end->value,
                'cost_micro_usd' => $turn->context->usageSoFar->costMicroUsd,
            ]);

            return $end;
        } finally {
            $this->floor->release($conversation);
        }
    }

    /**
     * Có tin khách mới hơn tin đánh thức: job của tin đó lo và gom luôn tin này. Tin AI
     * gửi sau tin đánh thức KHÔNG làm job thoát: tin khách tới đúng lúc lượt trước đang
     * gửi sẽ bị bỏ rơi; lượt trước đã đưa tin này vào thì dấu `turn-handled` đã chặn.
     *
     * @param  list<CoreMessage>  $recent
     */
    private function isStale(array $recent, int $wakeMessageId): bool
    {
        foreach ($recent as $message) {
            if ($message->id > $wakeMessageId && ! $message->private && $message->origin === MessageOrigin::Customer) {
                return true;
            }
        }

        return false;
    }

    /** @param list<CoreMessage> $recent */
    private function turn(TurnOrder $order, ConversationSnapshot $snapshot, int $aiAgentId, AiAgentProfile $agent, array $recent, CarbonImmutable $now): Turn
    {
        $snapshotMessageId = max([$order->wakeMessageId, ...array_map(fn (CoreMessage $message) => $message->id, $recent)]);
        $context = new TurnContext(
            conversation: $order->conversation(),
            inboxId: $snapshot->inboxId,
            contactId: $snapshot->contactId,
            aiAgentId: $aiAgentId,
            turnId: $order->wakeMessageId,
            stimulus: $order->stimulus(),
            autonomy: AutonomyLevel::AutoSafe,
            snapshotMessageId: $snapshotMessageId,
            now: $now->toDateTimeImmutable(),
            timezone: $snapshot->timezone,
            deadline: $now->addSeconds($this->settings->deadlineSeconds)->toDateTimeImmutable(),
            usageSoFar: Usage::zero(),
        );

        return new Turn(
            $context,
            $agent,
            $this->history->render($recent, $this->settings->historyMaxTokens, $this->settings->historyDropChunk),
            new TurnSituation($context->now, $snapshot->timezone, $snapshot->channel, $snapshot->canReply),
            $snapshot->assigneeUserId,
            $this->pendingCustomerTexts($recent),
        );
    }

    /**
     * Các tin khách chưa được trả lời ở cuối hội thoại: câu hỏi của lượt.
     *
     * @param  list<CoreMessage>  $recent
     * @return list<string>
     */
    private function pendingCustomerTexts(array $recent): array
    {
        $texts = [];

        foreach (array_reverse($recent) as $message) {
            if ($message->private || $message->origin === MessageOrigin::System) {
                continue;
            }

            if ($message->origin !== MessageOrigin::Customer) {
                break;
            }

            if ($message->text !== null) {
                array_unshift($texts, $message->text);
            }
        }

        return $texts;
    }

    private function tallied(Turn $turn, TurnEnd $end): TurnEnd
    {
        $this->tally->ended($turn, $end);

        return $end;
    }

    private function handledKey(TurnOrder $order): string
    {
        return "turn-handled:{$order->conversationId}";
    }
}
