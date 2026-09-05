<?php

namespace App\Listeners;

use App\Events\DomainEvent;
use App\Events\EventType;
use Illuminate\Support\Facades\Log;

// Port từ refs/chatwoot/app/listeners/participation_listener.rb — người được
// giao hội thoại tự động trở thành participant.
class ParticipationListener extends BaseListener
{
    public function handle(DomainEvent $event): void
    {
        if ($event->type !== EventType::ASSIGNEE_CHANGED) {
            return;
        }

        [$conversation] = $this->extractConversationAndAccount($event);

        if ($conversation->assignee_id === null) {
            return;
        }

        // Gán qua automation trong lúc auto-assignment cũng chạy có thể đụng
        // unique (user_id, conversation_id) — bản gốc rescue rồi ghi log.
        try {
            $conversation->addParticipant($conversation->assignee_id);
        } catch (\Throwable $exception) {
            Log::warning("Failed to create conversation participant for account {$conversation->account_id} "
                .": user {$conversation->assignee_id} : conversation {$conversation->id}");
        }
    }
}
