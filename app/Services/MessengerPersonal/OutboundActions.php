<?php

namespace App\Services\MessengerPersonal;

use App\Models\Channel\MessengerPersonal;
use App\Models\Conversation;
use App\Models\Message;
use App\Services\Channels\ChannelMessageRequests;
use App\Services\Channels\ChannelOutboundActions;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

/**
 * Hành động trên tin đã có ở Messenger cá nhân (cảm xúc, thu hồi, đang gõ, đánh dấu đã
 * đọc) và chấp nhận tin nhắn chờ. Lõi chỉ thấy `{ok, code, message}`; `chat` của hợp
 * đồng và việc một tin lõi mang nhiều mã nằm ở đây.
 */
class OutboundActions implements ChannelMessageRequests, ChannelOutboundActions
{
    public const ERROR_MISSING_SOURCE_ID = 'missing_source_id';

    /** Messenger tự tắt "đang soạn tin" sau vài giây — bắn dày hơn mức này là phí. */
    private const TYPING_THROTTLE_SECONDS = 5;

    public function __construct(private readonly BridgeClient $bridge) {}

    public function reaction(Message $message, ?string $emoji): array
    {
        $sourceId = $this->allSourceIds($message)[0] ?? null;
        $target = $this->target($message->conversation);

        if ($sourceId === null || $target === null) {
            return $this->failure(self::ERROR_MISSING_SOURCE_ID, $message);
        }

        // Hợp đồng: emoji rỗng là gỡ cảm xúc.
        return $this->outcome($message, $this->bridge->reaction([
            ...$target,
            'target_source_id' => $sourceId,
            'emoji' => $emoji ?? '',
        ]));
    }

    /** Một tin lõi có thể là nhiều tin bên Messenger (nhiều tệp): thu hồi hết, hỏng một phần là hỏng cả. */
    public function recall(Message $message): array
    {
        $sourceIds = $this->allSourceIds($message);
        $target = $this->target($message->conversation);

        if ($sourceIds === [] || $target === null) {
            return $this->failure(self::ERROR_MISSING_SOURCE_ID, $message);
        }

        foreach ($sourceIds as $sourceId) {
            $outcome = $this->outcome($message, $this->bridge->unsend([...$target, 'target_source_id' => $sourceId]));

            if (! $outcome['ok']) {
                return $outcome;
            }
        }

        return ['ok' => true];
    }

    public function typing(Conversation $conversation): void
    {
        $target = $this->target($conversation);

        if ($target === null || ! Cache::add("messenger_personal:typing-out:{$conversation->id}", true, self::TYPING_THROTTLE_SECONDS)) {
            return;
        }

        $this->bridge->typing([...$target, 'typing' => true]);
    }

    /** Đánh dấu đã đọc tới tin mới nhất ở phía Messenger. */
    public function markRead(Conversation $conversation): void
    {
        $target = $this->target($conversation);

        if ($target !== null) {
            $this->bridge->markRead($target);
        }
    }

    /**
     * Chủ hộp thư bấm "Chấp nhận" ở mục Đang chờ: Messenger cũng chuyển cuộc trò chuyện
     * khỏi thư mục tin nhắn chờ. Hỏng chỉ ghi log — trạng thái trong Yona đã đổi.
     */
    public function accept(Conversation $conversation): void
    {
        $target = $this->target($conversation);

        if ($target === null) {
            return;
        }

        $outcome = BridgeOutcome::fromResponse($this->bridge->acceptRequest($target), null);

        if (! $outcome['ok']) {
            Log::warning('messenger_personal.request_accept_failed', [
                'conversation_id' => $conversation->id,
                'code' => $outcome['code'],
            ]);
        }
    }

    /**
     * `connection_id` + `chat` của hợp đồng; null khi phiên không sống hoặc hội thoại không
     * trỏ được tới chat nào.
     *
     * @return array{connection_id: int, chat: array{kind: string, id: string}}|null
     */
    private function target(Conversation $conversation): ?array
    {
        $channel = $conversation->inbox->channel;

        if (! $channel instanceof MessengerPersonal || ! $channel->isConnected()) {
            return null;
        }

        $chat = $channel->chatOf($conversation);

        return $chat === null ? null : ['connection_id' => $channel->connectionId(), 'chat' => $chat->toArray()];
    }

    /** @return array{ok: bool, code?: string, message?: string} */
    private function outcome(Message $message, ?Response $response): array
    {
        $outcome = BridgeOutcome::fromResponse($response, $this->locale($message));

        if ($outcome['ok']) {
            return ['ok' => true];
        }

        return ['ok' => false, 'code' => $outcome['code'], 'message' => $outcome['message']];
    }

    /** @return array{ok: false, code: string, message: string} */
    private function failure(string $code, Message $message): array
    {
        $failure = BridgeOutcome::failure($code, $this->locale($message));

        return ['ok' => false, 'code' => $failure['code'], 'message' => $failure['message']];
    }

    private function locale(Message $message): ?string
    {
        return $message->inbox->account->locale;
    }

    /**
     * `source_id` là mã chính; `external_source_ids` là mọi mã của cùng một tin lõi.
     *
     * @return list<string>
     */
    private function allSourceIds(Message $message): array
    {
        $aliases = $message->content_attributes['external_source_ids'] ?? [];
        $ids = is_array($aliases) ? $aliases : [];

        if (filled($message->source_id)) {
            array_unshift($ids, $message->source_id);
        }

        $ids = array_map(fn ($id) => is_scalar($id) ? (string) $id : '', $ids);

        return array_values(array_unique(array_filter($ids, fn (string $id) => $id !== '')));
    }
}
