<?php

namespace App\Services\Integrations\Slack;

use RuntimeException;

// Thay cho các lớp lỗi riêng của gem slack-ruby-client (Slack::Web::Api::Errors::*).
// Slack trả `{ ok: false, error: '<mã lỗi>' }` cho mọi lời gọi thất bại; giữ đúng
// mã lỗi để service gọi biết có nên vô hiệu hoá hook hay chỉ bỏ qua trong im lặng.
class SlackApiException extends RuntimeException
{
    // Nhóm lỗi khiến SendOnSlackService/UpdateSlackMessageService vô hiệu hoá
    // hook + yêu cầu cấp quyền lại (rescue list của bản gốc).
    private const REAUTHORIZATION_ERRORS = [
        'is_archived',
        'account_inactive',
        'missing_scope',
        'invalid_auth',
        'channel_not_found',
        'not_in_channel',
    ];

    public function __construct(public readonly string $method, public readonly string $errorCode)
    {
        parent::__construct("Slack API {$method} failed: {$errorCode}");
    }

    public static function fromResponse(string $method, array $response): self
    {
        return new self($method, (string) ($response['error'] ?? 'unknown_error'));
    }

    public function isMissingScope(): bool
    {
        return $this->errorCode === 'missing_scope';
    }

    public function isMessageNotFound(): bool
    {
        return $this->errorCode === 'message_not_found';
    }

    public function requiresReauthorization(): bool
    {
        return in_array($this->errorCode, self::REAUTHORIZATION_ERRORS, true);
    }
}
