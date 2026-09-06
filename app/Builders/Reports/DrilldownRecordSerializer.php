<?php

namespace App\Builders\Reports;

use App\Models\Account;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\ReportingEvent;
use App\Services\Reports\ReportMetricRegistry;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;

/**
 * Port từ V2::Reports::DrilldownRecordSerializer — mỗi bản ghi drilldown luôn
 * kèm khối hội thoại, và với chỉ số thời gian phản hồi thì cố suy ra đúng tin
 * nhắn đã tạo ra con số.
 */
final class DrilldownRecordSerializer
{
    private const MESSAGE_EVENT_METRICS = DrilldownBuilder::MESSAGE_EVENT_METRICS;

    /** @var array<int, Message|null>|null */
    private ?array $inferredMessagesByEventId = null;

    /** @var array<int, Message>|null */
    private ?array $latestMessagesByConversationId = null;

    /** @param list<Model> $records */
    public function __construct(
        private readonly Account $account,
        private readonly string $metric,
        private readonly bool $useBusinessHours,
        private readonly array $records = [],
    ) {}

    /** @return array<string, mixed> */
    public function serialize(Model $record): array
    {
        if ($record instanceof Message) {
            return $this->serializeMessage($record);
        }

        if ($record instanceof ReportingEvent) {
            return $this->serializeConversationEvent($record);
        }

        return $this->serializeConversation($record);
    }

    /** @return array<string, mixed> */
    private function serializeMessage(Message $message, mixed $metricValue = null, ?CarbonInterface $occurredAt = null): array
    {
        return [
            'record_type' => 'message',
            'conversation' => $this->conversationAttributes($message->conversation),
            'message' => $this->messageAttributes($message),
            'metric_value' => $metricValue,
            'occurred_at' => ($occurredAt ?? $message->created_at)->getTimestamp(),
        ];
    }

    /** @return array<string, mixed> */
    private function serializeConversationEvent(ReportingEvent $event): array
    {
        $inferredMessage = $this->inferredMessageFor($event);
        $metricValue = $this->useBusinessHours ? $event->value_in_business_hours : $event->value;
        $occurredAt = $event->event_end_time ?? $event->created_at;

        if ($inferredMessage !== null) {
            return $this->serializeMessage($inferredMessage, $metricValue, $occurredAt);
        }

        return $this->serializeConversation($event->conversation, $metricValue, $occurredAt, $event->name);
    }

    /** @return array<string, mixed> */
    private function serializeConversation(
        ?Conversation $conversation,
        mixed $metricValue = null,
        ?CarbonInterface $occurredAt = null,
        ?string $eventName = null,
    ): array {
        $record = [
            'record_type' => 'conversation',
            'conversation' => $this->conversationAttributes($conversation),
            'message' => null,
            'metric_value' => $metricValue,
            'occurred_at' => ($occurredAt ?? $conversation?->created_at)?->getTimestamp(),
        ];

        if (filled($eventName)) {
            $record['event_name'] = $eventName;
        }

        return $record;
    }

    /** @return array<string, mixed> */
    private function conversationAttributes(?Conversation $conversation): array
    {
        if ($conversation === null) {
            return [];
        }

        return [
            'id' => $conversation->id,
            'display_id' => $conversation->display_id,
            'contact_id' => $conversation->contact_id,
            'contact_name' => $conversation->contact?->name,
            'inbox_id' => $conversation->inbox_id,
            'inbox_name' => $conversation->inbox?->name,
            'assignee_id' => $conversation->assignee_id,
            'assignee_name' => $conversation->assignee?->name,
            'status' => $conversation->statusName(),
            'created_at' => $conversation->created_at->getTimestamp(),
            'last_activity_at' => $conversation->last_activity_at?->getTimestamp(),
            'last_message' => $this->lastMessageAttributes($conversation),
        ];
    }

    /** @return array<string, mixed> */
    private function messageAttributes(Message $message): array
    {
        return [
            'id' => $message->id,
            'content' => $message->content,
            'message_type' => Message::typeName((int) $message->message_type),
            'sender_name' => $message->sender?->name,
            'created_at' => $message->created_at->getTimestamp(),
        ];
    }

    /** @return array<string, mixed>|null */
    private function lastMessageAttributes(Conversation $conversation): ?array
    {
        $message = $this->latestMessagesByConversationId()[$conversation->id] ?? null;

        return $message === null ? null : $this->messageAttributes($message);
    }

    private function inferredMessageFor(ReportingEvent $event): ?Message
    {
        if (! in_array($this->metric, self::MESSAGE_EVENT_METRICS, true)) {
            return null;
        }

        if ($event->conversation === null || $event->event_end_time === null) {
            return null;
        }

        return $this->inferredMessagesByEventId()[$event->id] ?? null;
    }

    /** @return array<int, Message|null> */
    private function inferredMessagesByEventId(): array
    {
        if ($this->inferredMessagesByEventId !== null) {
            return $this->inferredMessagesByEventId;
        }

        $events = $this->inferenceEvents();

        if ($events->isEmpty()) {
            return $this->inferredMessagesByEventId = [];
        }

        $endTimes = $events->map(fn (ReportingEvent $event) => $event->event_end_time);

        $candidates = Message::query()
            ->where('account_id', $this->account->id)
            ->whereIn('conversation_id', $events->pluck('conversation_id')->unique()->all())
            ->where('created_at', '>=', $endTimes->min()->copy()->subSecond())
            ->where('created_at', '<=', $endTimes->max()->copy()->addSecond())
            ->whereIn('message_type', [Message::TYPE_OUTGOING, Message::TYPE_TEMPLATE])
            ->with('sender')
            ->reorder('created_at', 'desc')
            ->orderByDesc('id')
            ->get();

        $matches = [];

        foreach ($events as $event) {
            $matches[$event->id] = $candidates->first(fn (Message $message) => $this->messageMatchesEvent($message, $event));
        }

        return $this->inferredMessagesByEventId = $matches;
    }

    private function messageMatchesEvent(Message $message, ReportingEvent $event): bool
    {
        if ($message->conversation_id !== $event->conversation_id) {
            return false;
        }

        $lower = $event->event_end_time->copy()->subSecond();
        $upper = $event->event_end_time->copy()->addSecond();

        if ($message->created_at < $lower || $message->created_at > $upper) {
            return false;
        }

        // Với thời gian phản hồi đầu tiên có agent, tin phải do chính agent đó gửi.
        if ($this->metric === ReportMetricRegistry::AVG_FIRST_RESPONSE_TIME && $event->user_id !== null) {
            return $message->sender_id === $event->user_id && $message->sender_type === 'User';
        }

        return true;
    }

    /** @return Collection<int, ReportingEvent> */
    private function inferenceEvents(): Collection
    {
        return collect($this->records)
            ->filter(fn (Model $record) => $record instanceof ReportingEvent
                && $record->conversation_id !== null
                && $record->event_end_time !== null)
            ->values();
    }

    /** @return array<int, Message> */
    private function latestMessagesByConversationId(): array
    {
        if ($this->latestMessagesByConversationId !== null) {
            return $this->latestMessagesByConversationId;
        }

        $conversationIds = $this->conversationIds();

        if ($conversationIds === []) {
            return $this->latestMessagesByConversationId = [];
        }

        $messages = Message::query()
            ->where('account_id', $this->account->id)
            ->whereIn('conversation_id', $conversationIds)
            ->where('message_type', '!=', Message::TYPE_ACTIVITY)
            ->with('sender')
            ->reorder('conversation_id')
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->get()
            ->unique('conversation_id');

        $indexed = [];

        foreach ($messages as $message) {
            $indexed[$message->conversation_id] = $message;
        }

        return $this->latestMessagesByConversationId = $indexed;
    }

    /** @return list<int> */
    private function conversationIds(): array
    {
        return collect($this->records)
            ->map(fn (Model $record) => $record instanceof Message || $record instanceof ReportingEvent
                ? $record->conversation_id
                : $record->getKey())
            ->filter()
            ->unique()
            ->values()
            ->all();
    }
}
