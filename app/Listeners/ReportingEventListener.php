<?php

namespace App\Listeners;

use App\Events\DomainEvent;
use App\Events\EventType;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\ReportingEvent;
use App\Services\ReportingEvents\BusinessHoursCalculator;
use App\Services\ReportingEvents\RollupService;
use Carbon\Carbon;
use Carbon\CarbonInterface;
use Throwable;

/**
 * Port từ refs/chatwoot/app/listeners/reporting_event_listener.rb — nơi DUY NHẤT
 * ghi `reporting_events`; mọi con số của báo cáo đọc ra từ bảng này.
 */
class ReportingEventListener extends BaseListener
{
    public function handle(DomainEvent $event): void
    {
        match ($event->type) {
            EventType::CONVERSATION_RESOLVED => $this->conversationResolved($event),
            EventType::FIRST_REPLY_CREATED => $this->firstReplyCreated($event),
            EventType::REPLY_CREATED => $this->replyCreated($event),
            EventType::CONVERSATION_BOT_HANDOFF => $this->conversationBotHandoff($event),
            EventType::CONVERSATION_OPENED => $this->conversationOpened($event),
            default => null,
        };
    }

    private function conversationResolved(DomainEvent $event): void
    {
        [$conversation] = $this->extractConversationAndAccount($event);
        $eventEndTime = $this->timestamp($event);

        $reportingEvent = $this->newEvent($conversation, ReportingEvent::NAME_CONVERSATION_RESOLVED, [
            'value' => $eventEndTime->getTimestamp() - $conversation->created_at->getTimestamp(),
            'value_in_business_hours' => BusinessHoursCalculator::between($conversation->inbox, $conversation->created_at, $eventEndTime),
            'user_id' => $conversation->assignee_id,
            'event_start_time' => $conversation->created_at,
            'event_end_time' => $eventEndTime,
        ]);

        $this->createBotResolvedEvent($conversation, $reportingEvent);
        $reportingEvent->save();
        $this->safeRollup($reportingEvent);
    }

    private function firstReplyCreated(DomainEvent $event): void
    {
        [$message] = $this->extractMessageAndAccount($event);
        $conversation = $message->conversation;
        $startTime = self::lastNonHumanActivity($conversation);

        $reportingEvent = $this->newEvent($conversation, ReportingEvent::NAME_FIRST_RESPONSE, [
            'value' => $message->created_at->getTimestamp() - $startTime->getTimestamp(),
            'value_in_business_hours' => BusinessHoursCalculator::between($conversation->inbox, $startTime, $message->created_at),
            'user_id' => $message->sender_id,
            'event_start_time' => $startTime,
            'event_end_time' => $message->created_at,
        ]);

        $reportingEvent->save();
        $this->safeRollup($reportingEvent);
    }

    private function replyCreated(DomainEvent $event): void
    {
        [$message] = $this->extractMessageAndAccount($event);
        $conversation = $message->conversation;
        $waitingSince = $event->data['waiting_since'] ?? null;

        if (blank($waitingSince)) {
            return;
        }

        $waitingSince = Carbon::parse($waitingSince);

        $reportingEvent = $this->newEvent($conversation, ReportingEvent::NAME_REPLY_TIME, [
            'value' => $message->created_at->getTimestamp() - $waitingSince->getTimestamp(),
            'value_in_business_hours' => BusinessHoursCalculator::between($conversation->inbox, $waitingSince, $message->created_at),
            'user_id' => $conversation->assignee_id,
            'event_start_time' => $waitingSince,
            'event_end_time' => $message->created_at,
        ]);

        $reportingEvent->save();
        $this->safeRollup($reportingEvent);
    }

    private function conversationBotHandoff(DomainEvent $event): void
    {
        [$conversation] = $this->extractConversationAndAccount($event);
        $eventEndTime = $this->timestamp($event);

        // Đường đọc thô đếm bàn giao bằng DISTINCT conversation_id còn rollup cộng
        // dồn từng dòng — chốt chặn ở đây giữ đúng một sự kiện bàn giao mỗi hội thoại.
        $alreadyHandedOff = ReportingEvent::query()
            ->where('conversation_id', $conversation->id)
            ->where('name', ReportingEvent::NAME_CONVERSATION_BOT_HANDOFF)
            ->exists();

        if ($alreadyHandedOff) {
            return;
        }

        $reportingEvent = $this->newEvent($conversation, ReportingEvent::NAME_CONVERSATION_BOT_HANDOFF, [
            'value' => $eventEndTime->getTimestamp() - $conversation->created_at->getTimestamp(),
            'value_in_business_hours' => BusinessHoursCalculator::between($conversation->inbox, $conversation->created_at, $eventEndTime),
            'user_id' => $conversation->assignee_id,
            'event_start_time' => $conversation->created_at,
            'event_end_time' => $eventEndTime,
        ]);

        $reportingEvent->save();
        $this->safeRollup($reportingEvent);
    }

    private function conversationOpened(DomainEvent $event): void
    {
        [$conversation] = $this->extractConversationAndAccount($event);
        $eventEndTime = $this->timestamp($event);

        $lastResolvedEvent = ReportingEvent::query()
            ->where('conversation_id', $conversation->id)
            ->where('name', ReportingEvent::NAME_CONVERSATION_RESOLVED)
            ->where('event_end_time', '<=', $eventEndTime)
            ->orderByDesc('event_end_time')
            ->first();

        // Mở lần đầu thì value = 0; mở lại thì đo từ lần đóng gần nhất.
        $startTime = $lastResolvedEvent?->event_end_time ?? $conversation->created_at;
        $value = $lastResolvedEvent === null
            ? 0
            : $eventEndTime->getTimestamp() - $lastResolvedEvent->event_end_time->getTimestamp();
        $valueInBusinessHours = $lastResolvedEvent === null
            ? 0.0
            : BusinessHoursCalculator::between($conversation->inbox, $lastResolvedEvent->event_end_time, $eventEndTime);

        // Không rollup: conversation_opened không sinh chỉ số tổng hợp nào.
        $this->newEvent($conversation, ReportingEvent::NAME_CONVERSATION_OPENED, [
            'value' => $value,
            'value_in_business_hours' => $valueInBusinessHours,
            'user_id' => $conversation->assignee_id,
            'event_start_time' => $startTime,
            'event_end_time' => $eventEndTime,
        ])->save();
    }

    /**
     * ReportingEventHelper#last_non_human_activity — mốc bắt đầu tính thời gian
     * phản hồi đầu tiên: bàn giao/mở lại gần nhất, rồi tới bot tự đóng, cuối cùng
     * là lúc tạo hội thoại.
     */
    public static function lastNonHumanActivity(Conversation $conversation): CarbonInterface
    {
        $event = ReportingEvent::query()
            ->where('conversation_id', $conversation->id)
            ->whereIn('name', [ReportingEvent::NAME_CONVERSATION_BOT_HANDOFF, ReportingEvent::NAME_CONVERSATION_OPENED])
            ->orderByDesc('event_end_time')
            ->first();

        if ($event?->event_end_time !== null) {
            return $event->event_end_time;
        }

        $botEvent = ReportingEvent::query()
            ->where('conversation_id', $conversation->id)
            ->where('name', ReportingEvent::NAME_CONVERSATION_BOT_RESOLVED)
            ->orderBy('id')
            ->get()
            ->last();

        return $botEvent?->event_end_time ?? $conversation->created_at;
    }

    private function createBotResolvedEvent(Conversation $conversation, ReportingEvent $reportingEvent): void
    {
        if (! $conversation->inbox?->activeBot()) {
            return;
        }

        $handledByHuman = $conversation->messages()
            ->where('message_type', Message::TYPE_OUTGOING)
            ->where('sender_type', 'User')
            ->exists();

        if ($handledByHuman) {
            return;
        }

        $botResolvedEvent = $reportingEvent->replicate();
        $botResolvedEvent->name = ReportingEvent::NAME_CONVERSATION_BOT_RESOLVED;
        $botResolvedEvent->save();

        $this->safeRollup($botResolvedEvent);
    }

    /** @param array<string, mixed> $attributes */
    private function newEvent(Conversation $conversation, string $name, array $attributes): ReportingEvent
    {
        return new ReportingEvent(array_replace([
            'name' => $name,
            'account_id' => $conversation->account_id,
            'inbox_id' => $conversation->inbox_id,
            'conversation_id' => $conversation->id,
        ], $attributes));
    }

    private function timestamp(DomainEvent $event): CarbonInterface
    {
        return $event->timestamp ?? now();
    }

    // Rollup hỏng không được làm mất sự kiện thô — số tổng hợp dựng lại được bằng backfill.
    private function safeRollup(ReportingEvent $reportingEvent): void
    {
        try {
            RollupService::perform($reportingEvent);
        } catch (Throwable $exception) {
            report($exception);
        }
    }
}
