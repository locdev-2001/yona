<?php

namespace App\Services\MessengerPersonal;

use App\Models\Channel\MessengerPersonal;
use App\Models\Conversation;

/**
 * `chat` của hợp đồng sidecar: `direct` (id = fbid người kia, đi kênh mã hoá) hoặc
 * `group` (id = thread key, đi kênh thường). Một hội thoại Yona trỏ đúng một chat;
 * id chat cũng là `source_id` của liên hệ trong hộp thư.
 */
final class MessengerChat
{
    public const KIND_DIRECT = 'direct';

    public const KIND_GROUP = 'group';

    private function __construct(
        public readonly string $kind,
        public readonly string $id,
    ) {}

    /** @param mixed $payload `chat` trong webhook hoặc trong additional_attributes */
    public static function fromPayload(mixed $payload): ?self
    {
        if (! is_array($payload)) {
            return null;
        }

        $kind = (string) ($payload['kind'] ?? '');
        $id = trim((string) ($payload['id'] ?? ''));

        if ($id === '' || ! in_array($kind, [self::KIND_DIRECT, self::KIND_GROUP], true)) {
            return null;
        }

        return new self($kind, $id);
    }

    /**
     * Hội thoại do webhook mở mang sẵn `chat`; hội thoại người dùng tự mở lại thì suy từ
     * liên hệ: `source_id` là id chat, hồ sơ nhóm có dấu nhóm.
     */
    public static function ofConversation(Conversation $conversation): ?self
    {
        $stored = self::fromPayload($conversation->additional_attributes[MessengerPersonal::CONVERSATION_CHAT_ATTRIBUTE] ?? null);

        if ($stored !== null) {
            return $stored;
        }

        $sourceId = $conversation->contactInbox?->source_id;

        if (blank($sourceId)) {
            return null;
        }

        $kind = $conversation->contact?->additional_attributes[MessengerPersonal::CONTACT_CHAT_KIND_ATTRIBUTE] ?? null;

        return new self($kind === self::KIND_GROUP ? self::KIND_GROUP : self::KIND_DIRECT, (string) $sourceId);
    }

    public function isGroup(): bool
    {
        return $this->kind === self::KIND_GROUP;
    }

    /** @return array{kind: string, id: string} */
    public function toArray(): array
    {
        return ['kind' => $this->kind, 'id' => $this->id];
    }
}
