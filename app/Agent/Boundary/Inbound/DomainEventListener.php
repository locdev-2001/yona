<?php

namespace App\Agent\Boundary\Inbound;

use App\Events\DomainEvent;
use App\Events\EventType;
use App\Models\AiAgent;
use App\Models\Message;
use Illuminate\Contracts\Bus\Dispatcher;

// Lọc rẻ, đồng bộ: chỉ tin khách gửi (không ghi chú, không tin do chính AI tạo) trên hội
// thoại đang tự động mới được đưa sang hàng đợi AI. Mọi quyết định còn lại ở Runtime.
final class DomainEventListener
{
    public function __construct(private readonly Dispatcher $bus) {}

    public function handle(DomainEvent $event): void
    {
        if ($event->type !== EventType::MESSAGE_CREATED) {
            return;
        }

        $message = $event->data['message'] ?? null;

        if (! $message instanceof Message || ! $this->isCustomerMessageOnAutoReply($message)) {
            return;
        }

        $this->bus->dispatch(
            (new MapDomainEventJob($message->account_id, $message->conversation_id, $message->id, $message->created_at->getTimestamp()))
                ->onQueue((string) config('agent.turn.queue')),
        );
    }

    private function isCustomerMessageOnAutoReply(Message $message): bool
    {
        return $message->isIncoming()
            && ! $message->private
            && $message->sender_type !== (new AiAgent)->getMorphClass()
            && (bool) $message->conversation?->ai_auto_reply;
    }
}
