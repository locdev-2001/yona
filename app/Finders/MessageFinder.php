<?php

namespace App\Finders;

use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Support\Collection;

class MessageFinder
{
    public const MESSAGE_ID_MAX = 2147483647;

    /** @param array<string, mixed> $params */
    public function __construct(
        private readonly Conversation $conversation,
        private readonly array $params,
    ) {}

    /** @return Collection<int, Message> */
    public function perform(): Collection
    {
        $after = $this->params['after'] ?? null;
        $before = $this->params['before'] ?? null;

        if (filled($after) && $this->oversized($after)) {
            return new Collection;
        }

        if (filled($after) && filled($before)) {
            return $this->messagesBetween($this->normalized($after), (int) $before);
        }

        if (filled($before)) {
            return $this->messagesBefore((int) $before);
        }

        if (filled($after)) {
            return $this->messagesAfter($this->normalized($after));
        }

        return $this->messagesLatest();
    }

    /** @return Builder<Message> */
    private function messages(): Builder
    {
        $query = $this->conversation->messages()->getQuery()->with([
            'sender' => fn (MorphTo $sender) => $sender->morphWith([User::class => ['accountUsers']]),
            'sender.avatar',
        ]);

        // present? của Ruby coi boolean false là blank — blank() của Laravel thì không.
        $filterInternalMessages = $this->params['filter_internal_messages'] ?? null;

        if ($filterInternalMessages === false || blank($filterInternalMessages)) {
            return $query;
        }

        return $query->whereRaw('NOT (private = ? OR message_type = ?)', [true, Message::TYPE_ACTIVITY]);
    }

    /** @return Collection<int, Message> */
    private function messagesAfter(int $afterId): Collection
    {
        return $this->messages()->reorder('platform_sent_at', 'asc')->orderBy('id')->where('id', '>', $afterId)->limit(100)->get();
    }

    /** @return Collection<int, Message> */
    private function messagesBefore(int $beforeId): Collection
    {
        if ($this->oversized($beforeId)) {
            return $this->messagesLatest();
        }

        return $this->messages()
            ->reorder('platform_sent_at', 'desc')->orderByDesc('id')
            ->where('id', '<', $this->normalized($beforeId))
            ->limit(20)
            ->get()
            ->reverse()
            ->values();
    }

    /** @return Collection<int, Message> */
    private function messagesBetween(int $afterId, int $beforeId): Collection
    {
        $query = $this->messages()->reorder('platform_sent_at', 'asc')->orderBy('id')->where('id', '>=', $afterId);

        if (! $this->oversized($beforeId)) {
            $query->where('id', '<', $this->normalized($beforeId));
        }

        return $query->limit(1000)->get();
    }

    /** @return Collection<int, Message> */
    private function messagesLatest(): Collection
    {
        return $this->messages()->reorder('platform_sent_at', 'desc')->orderByDesc('id')->limit(20)->get()->reverse()->values();
    }

    private function normalized(int|string $value): int
    {
        return (int) min(max((int) $value, 0), self::MESSAGE_ID_MAX);
    }

    private function oversized(int|string $value): bool
    {
        return (int) $value > self::MESSAGE_ID_MAX;
    }
}
