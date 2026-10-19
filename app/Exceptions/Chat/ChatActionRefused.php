<?php

namespace App\Exceptions\Chat;

use Illuminate\Http\JsonResponse;
use RuntimeException;

// Hành động nhắn tin bị từ chối vì quy tắc (bị chặn, không còn trong hội thoại…).
// Lời báo đã dịch sẵn để trả thẳng cho người dùng.
class ChatActionRefused extends RuntimeException
{
    public static function blocked(): self
    {
        return new self(__('chat.ERRORS.BLOCKED'));
    }

    public static function notMember(): self
    {
        return new self(__('chat.ERRORS.NOT_MEMBER'));
    }

    public static function cannotMessageSelf(): self
    {
        return new self(__('chat.ERRORS.SELF'));
    }

    public function render(): JsonResponse
    {
        return response()->json(['message' => $this->getMessage()], 422);
    }

    public static function emptyMessage(): self
    {
        return new self(__('chat.ERRORS.EMPTY'));
    }
}
