<?php

namespace App\Exceptions\Conversations;

use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;

// Inbox của hội thoại chưa gắn AI agent, hoặc AI đó đang tắt, thì không bật được trả lời
// tự động: 422 ở mọi mặt tiền, mã `no_replying_ai_agent` để giao diện dẫn người dùng đi gắn AI.
final class AutoResponderUnavailable extends ValidationException
{
    public const CODE = 'no_replying_ai_agent';

    public static function noReplyingAiAgent(): self
    {
        return self::withMessages(['ai_auto_reply' => __('errors.ai_agents.no_replying_ai_agent')]);
    }

    public function render(): JsonResponse
    {
        return response()->json([
            'error' => self::CODE,
            'message' => $this->getMessage(),
            'errors' => $this->errors(),
        ], $this->status);
    }
}
