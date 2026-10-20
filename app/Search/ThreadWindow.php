<?php

namespace App\Search;

use App\Models\Conversation;
use App\Models\Message;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;

/**
 * Một luồng dùng chung người tìm được nhìn vào: tin của hội thoại gốc tới mốc `until`
 * (lúc rời nhóm, null = còn trong nhóm), hiện ra ở dòng `viewConversationId` của họ.
 * Cùng luật cắt với `SharesThread::visibleMessages()`.
 */
final readonly class ThreadWindow
{
    public function __construct(
        public int $threadConversationId,
        public int $viewConversationId,
        public ?CarbonInterface $until,
    ) {}

    public static function of(Conversation $view): self
    {
        return new self((int) $view->thread_conversation_id, $view->id, $view->threadMembership?->left_at);
    }

    /**
     * Nối thêm (OR) tin của các luồng này vào điều kiện phạm vi tin đang dựng.
     *
     * @param  Builder<Message>  $messages
     * @param  list<self>  $windows
     * @return Builder<Message>
     */
    public static function orWhereVisible(Builder $messages, array $windows): Builder
    {
        $open = array_filter($windows, fn (self $window) => $window->until === null);

        if ($open !== []) {
            $messages->orWhereIn('messages.conversation_id', array_values(array_map(fn (self $window) => $window->threadConversationId, $open)));
        }

        foreach (array_diff_key($windows, $open) as $window) {
            $messages->orWhere(fn (Builder $thread) => $thread
                ->where('messages.conversation_id', $window->threadConversationId)
                ->where('messages.created_at', '<=', $window->until));
        }

        return $messages;
    }
}
