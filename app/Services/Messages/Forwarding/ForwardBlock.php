<?php

namespace App\Services\Messages\Forwarding;

/**
 * Lý do một tin không chuyển tiếp được (hoặc không tới được một đích). `code` là
 * contract ổn định cho FE và API; `message` là câu đã dịch để hiện thẳng.
 */
final readonly class ForwardBlock
{
    public const NOT_FORWARDABLE = 'not_forwardable';

    public const ATTACHMENT_UNAVAILABLE = 'attachment_unavailable';

    public const CAPABILITY_NOT_SUPPORTED = 'capability_not_supported';

    public const STICKER_UNAVAILABLE = 'sticker_unavailable';

    public const REPLY_WINDOW_CLOSED = 'reply_window_closed';

    public const TARGET_NOT_FOUND = 'target_not_found';

    public const MESSAGE_INVALID = 'message_invalid';

    public const NO_TARGETS = 'no_targets';

    public const TOO_MANY_TARGETS = 'too_many_targets';

    /** @param list<string> $missingCapabilities */
    public function __construct(
        public string $code,
        public string $message,
        public array $missingCapabilities = [],
    ) {}

    /**
     * @param  array<string, string|int>  $replace
     * @param  list<string>  $missingCapabilities
     */
    public static function translated(string $code, ?string $locale, array $replace = [], array $missingCapabilities = []): self
    {
        return new self($code, __("errors.forward.{$code}", $replace, $locale), $missingCapabilities);
    }

    /** @return array{error: string, code: string} */
    public function toErrorResponse(): array
    {
        return ['error' => $this->message, 'code' => $this->code];
    }
}
