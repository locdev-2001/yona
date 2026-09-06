<?php

namespace App\Services\Mailbox\Strategies;

use App\Models\Conversation;
use App\Services\Email\MailPresenter;

// Port từ refs/chatwoot/app/services/mailbox/conversation_finder_strategies/base_strategy.rb.
abstract class BaseStrategy
{
    // Message-ID do chính hệ thống sinh: `conversation/<uuid>/messages/<id>@domain`.
    protected const MESSAGE_PATTERN = '#conversation/([a-zA-Z0-9-]+)/messages/(\d+)@#';

    // Hội thoại chưa có tin đến nào thì Message-ID chỉ mang uuid hội thoại.
    protected const FALLBACK_PATTERN = '#account/(\d+)/conversation/([a-zA-Z0-9-]+)@#';

    public function __construct(protected readonly MailPresenter $mail) {}

    abstract public function find(): ?Conversation;

    protected function extractUuidFromPatterns(string $messageId): ?string
    {
        if (preg_match(self::MESSAGE_PATTERN, $messageId, $matches) === 1) {
            return $matches[1];
        }

        if (preg_match(self::FALLBACK_PATTERN, $messageId, $matches) === 1) {
            return $matches[2];
        }

        return null;
    }
}
