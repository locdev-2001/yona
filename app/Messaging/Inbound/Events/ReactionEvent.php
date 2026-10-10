<?php

namespace App\Messaging\Inbound\Events;

/**
 * Cảm xúc trên một tin. `emoji` null/rỗng = người đó GỠ cảm xúc của chính mình.
 * `isSelf` = chính tài khoản của tenant thả (chủ shop thả trên app, hoặc Yona dội lại).
 */
final class ReactionEvent implements InboundEvent
{
    public function __construct(
        public readonly string $targetSourceId,
        public readonly ?string $emoji,
        public readonly ?string $actor,
        public readonly bool $isSelf = false,
    ) {}
}
