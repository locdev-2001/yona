<?php

namespace App\Messaging\Delivery;

use App\Jobs\SendReplyJob;
use App\Models\Message;
use Illuminate\Support\Facades\Redis;

/**
 * Tin gửi ra kênh đi đúng thứ tự tạo TRONG MỘT hội thoại, dù tin chữ và tin tệp
 * chạy ở hai hàng đợi khác nhau, dù pool có nhiều worker. Hội thoại khác nhau vẫn
 * chạy song song.
 *
 * Mỗi hội thoại một hàng (danh sách id trên Redis). Chỉ tin đứng đầu hàng có job
 * trong hàng đợi; tin sau nằm chờ, không giữ worker nào. Job của tin đầu xong (gửi
 * được hoặc hỏng hẳn) thì nhả hàng và đẩy job cho tin kế tiếp. Job mất hẳn (worker
 * chết, Redis mất job) thì lượt quét định kỳ gỡ đầu hàng quá STALE_AFTER_SECONDS.
 *
 * Chỗ DUY NHẤT quyết định thứ tự gửi; lõi không biết kênh nào.
 */
final class OutboundOrder
{
    /**
     * Dài hơn đời tối đa của một job gửi: 3 lượt × (timeout 150s + chờ retry_after
     * 180s của Redis) ≈ 9 phút. Quá mốc này mà đầu hàng chưa nhả là job đã mất.
     */
    public const STALE_AFTER_SECONDS = 600;

    private const LANE_KEY = 'messaging:outbound-order:%d';

    private const HEAD_SINCE_KEY = 'messaging:outbound-order:%d:head-since';

    private const LANES_KEY = 'messaging:outbound-order:lanes';

    /** Hàng bị bỏ quên (không ai nhả, không ai quét) tự hết hạn. */
    private const LANE_TTL_SECONDS = 86400;

    // KEYS: lane, head-since, lanes · ARGV: message id, now, conversation id, ttl. Trả 1 khi tin vừa thành đầu hàng.
    private const ENQUEUE_SCRIPT = <<<'LUA'
        for _, queuedId in ipairs(redis.call('lrange', KEYS[1], 0, -1)) do
            if queuedId == ARGV[1] then return 0 end
        end
        redis.call('rpush', KEYS[1], ARGV[1])
        redis.call('expire', KEYS[1], ARGV[4])
        redis.call('sadd', KEYS[3], ARGV[3])
        if redis.call('llen', KEYS[1]) == 1 then
            redis.call('set', KEYS[2], ARGV[2], 'EX', ARGV[4])
            return 1
        end
        return 0
        LUA;

    // Chỉ đầu hàng mới nhả được. Trả id tin kế tiếp vừa thành đầu hàng, hoặc nil.
    private const ADVANCE_SCRIPT = <<<'LUA'
        if redis.call('lindex', KEYS[1], 0) ~= ARGV[1] then return false end
        redis.call('lpop', KEYS[1])
        local nextId = redis.call('lindex', KEYS[1], 0)
        if nextId then
            redis.call('set', KEYS[2], ARGV[2], 'EX', ARGV[4])
            return nextId
        end
        redis.call('del', KEYS[2])
        redis.call('srem', KEYS[3], ARGV[3])
        return false
        LUA;

    // Trả id đầu hàng khi nó đứng quá lâu; dọn hàng rỗng.
    private const STALE_HEAD_SCRIPT = <<<'LUA'
        local head = redis.call('lindex', KEYS[1], 0)
        if not head then
            redis.call('del', KEYS[2])
            redis.call('srem', KEYS[3], ARGV[3])
            return false
        end
        local since = tonumber(redis.call('get', KEYS[2]) or '0')
        if tonumber(ARGV[1]) - since < tonumber(ARGV[2]) then return false end
        return head
        LUA;

    public function dispatch(Message $message): void
    {
        if (! self::needsOrdering($message) || $this->enqueue($message)) {
            SendReplyJob::dispatch($message);
        }
    }

    /** Job của tin xong hẳn (gửi được hoặc hỏng sau lượt cuối): nhường cho tin kế tiếp. */
    public function release(Message $message): void
    {
        $this->dispatchFrom($message->conversation_id, $this->advance($message->conversation_id, $message->id));
    }

    /** Gỡ các hàng có đầu hàng kẹt quá STALE_AFTER_SECONDS (job mất, worker chết). */
    public function sweep(): void
    {
        $conversationIds = (array) Redis::eval("return redis.call('smembers', KEYS[1])", 1, self::LANES_KEY);

        foreach ($conversationIds as $conversationId) {
            $conversationId = (int) $conversationId;
            $staleHead = Redis::eval(
                self::STALE_HEAD_SCRIPT, 3,
                ...$this->keys($conversationId),
                ...[now()->getTimestamp(), self::STALE_AFTER_SECONDS, $conversationId],
            );

            if ($staleHead) {
                $this->dispatchFrom($conversationId, $this->advance($conversationId, (int) $staleHead));
            }
        }
    }

    /** Tin mà driver kênh có thể gửi ra ngoài; tin khác không cần xếp hàng. */
    private static function needsOrdering(Message $message): bool
    {
        return in_array($message->message_type, [Message::TYPE_OUTGOING, Message::TYPE_TEMPLATE], true)
            && ! $message->private
            && blank($message->source_id);
    }

    private function enqueue(Message $message): bool
    {
        return (int) Redis::eval(
            self::ENQUEUE_SCRIPT, 3,
            ...$this->keys($message->conversation_id),
            ...[$message->id, now()->getTimestamp(), $message->conversation_id, self::LANE_TTL_SECONDS],
        ) === 1;
    }

    private function advance(int $conversationId, int $messageId): ?int
    {
        $nextId = Redis::eval(
            self::ADVANCE_SCRIPT, 3,
            ...$this->keys($conversationId),
            ...[$messageId, now()->getTimestamp(), $conversationId, self::LANE_TTL_SECONDS],
        );

        return $nextId ? (int) $nextId : null;
    }

    // Tin kế tiếp đã bị xoá thì nhường luôn cho tin sau nó.
    private function dispatchFrom(int $conversationId, ?int $messageId): void
    {
        while ($messageId !== null) {
            $message = Message::query()->find($messageId);

            if ($message !== null) {
                SendReplyJob::dispatch($message);

                return;
            }

            $messageId = $this->advance($conversationId, $messageId);
        }
    }

    /** @return array{0: string, 1: string, 2: string} */
    private function keys(int $conversationId): array
    {
        return [sprintf(self::LANE_KEY, $conversationId), sprintf(self::HEAD_SINCE_KEY, $conversationId), self::LANES_KEY];
    }
}
