<?php

namespace App\Support;

use Illuminate\Support\Facades\Redis;

// Port từ Redis::Alfred::CONVERSATION_DRAFT_MESSAGE (lib/redis/redis_keys.rb):
// bản nháp sống trong Redis, không có bảng, không hạn dùng. Khóa dựng theo khóa
// chính của conversation (không phải display_id) — y bản gốc.
final class ConversationDraftMessage
{
    public const KEY = 'CONVERSATION::%d::DRAFT_MESSAGE';

    public static function get(int $conversationId): ?string
    {
        $draft = Redis::get(self::key($conversationId));

        return is_string($draft) ? $draft : null;
    }

    public static function put(int $conversationId, string $message): void
    {
        Redis::set(self::key($conversationId), $message);
    }

    public static function forget(int $conversationId): void
    {
        Redis::del(self::key($conversationId));
    }

    public static function key(int $conversationId): string
    {
        return sprintf(self::KEY, $conversationId);
    }
}
