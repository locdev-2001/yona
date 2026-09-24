<?php

namespace App\Listeners;

use App\Builders\CsatSurveys\ResponseBuilder;
use App\Events\DomainEvent;
use App\Events\EventType;
use App\Exceptions\RecordInvalidException;
use App\Services\CsatSurveyService;

/**
 * Khác bản gốc: chạy đồng bộ trong request (bản gốc qua AsyncDispatcher →
 * EventDispatcherJob) — giống mọi listener khác đã port. Vì thế phiếu trả lời
 * hỏng (điểm ngoài 1..5 do client tự chế) không được phép làm hỏng lượt cập
 * nhật tin: bắt lại và ghi log, khách vẫn nhận 200 như bản gốc.
 */
class CsatSurveyListener extends BaseListener
{
    public function handle(DomainEvent $event): void
    {
        match ($event->type) {
            EventType::CONVERSATION_STATUS_CHANGED => $this->conversationStatusChanged($event),
            EventType::MESSAGE_UPDATED => $this->messageUpdated($event),
            default => null,
        };
    }

    private function conversationStatusChanged(DomainEvent $event): void
    {
        [$conversation] = $this->extractConversationAndAccount($event);

        if (! $conversation->isResolved()) {
            return;
        }

        (new CsatSurveyService($conversation))->perform();
    }

    private function messageUpdated(DomainEvent $event): void
    {
        [$message] = $this->extractMessageAndAccount($event);

        if (! $message->isInputCsat()) {
            return;
        }

        try {
            (new ResponseBuilder($message))->perform();
        } catch (RecordInvalidException $exception) {
            report($exception);
        }
    }
}
