<?php

namespace App\Jobs\Conversations;

use App\Events\RealtimeBroadcast;
use App\Http\Resources\MessageResource;
use App\Jobs\ApplicationJob;
use App\Models\Conversation;
use App\Models\Message;

/**
 * Tin của hội thoại gốc (tạo mới, cảm xúc, thu hồi) tới dòng riêng của từng thành viên
 * luồng dùng chung, mỗi người một payload mang id hội thoại, account, số chưa đọc của
 * chính dòng đó. Chạy trong hàng đợi vì một nhóm có tới vài trăm thành viên.
 */
class SharedThreadBroadcastJob extends ApplicationJob
{
    /** @param  array<string, mixed>|null  $previousChanges */
    public function __construct(
        public readonly int $messageId,
        public readonly string $eventName,
        public readonly ?array $previousChanges = null,
    ) {
        $this->onQueue('critical');
    }

    public function handle(): void
    {
        $message = Message::query()->with(['attachments', 'sender'])->find($this->messageId);

        if ($message === null) {
            return;
        }

        $views = Conversation::query()
            ->where('thread_conversation_id', $message->conversation_id)
            ->whereHas('threadMembership', fn ($membership) => $membership->whereNull('left_at'))
            ->with(['account', 'inbox', 'threadConversation', 'threadMembership.user'])
            ->get();
        Conversation::preloadUnreadIncomingMessagesCounts($views);

        foreach ($views as $view) {
            $token = $view->threadMembership?->user?->pubsub_token;

            if ($token === null) {
                continue;
            }

            broadcast(new RealtimeBroadcast([$token], $this->eventName, [
                ...MessageResource::pushEventData($view->presentMessage($message)),
                ...($this->previousChanges !== null ? ['previous_changes' => $this->previousChanges] : []),
                'account_id' => $view->account_id,
            ]));
        }
    }
}
