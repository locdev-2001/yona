<?php

namespace App\Services\Facebook;

/**
 * Đọc một phần tử `messaging`/`standby` của webhook Messenger.
 */
class MessageParser
{
    /** @var array<string, mixed> */
    private array $messaging;

    /** @param array<string, mixed> $entry một phần tử `messaging` hoặc `standby`. */
    public function __construct(array $entry)
    {
        $this->messaging = $entry['messaging'] ?? $entry['standby'] ?? $entry;
    }

    public function senderId(): ?string
    {
        return data_get($this->messaging, 'sender.id');
    }

    public function recipientId(): ?string
    {
        return data_get($this->messaging, 'recipient.id');
    }

    public function content(): ?string
    {
        return data_get($this->messaging, 'message.text');
    }

    /** @return list<array<string, mixed>> */
    public function attachments(): array
    {
        return (array) data_get($this->messaging, 'message.attachments', []);
    }

    public function identifier(): ?string
    {
        return data_get($this->messaging, 'message.mid');
    }

    public function isEcho(): bool
    {
        return filled(data_get($this->messaging, 'message.is_echo'));
    }

    public function appId(): ?string
    {
        $appId = data_get($this->messaging, 'message.app_id');

        return $appId === null ? null : (string) $appId;
    }

    public function isSentFromOwnApp(): bool
    {
        return filled($this->appId()) && $this->appId() === (string) config('services.facebook.app_id');
    }

    public function inReplyToExternalId(): ?string
    {
        return data_get($this->messaging, 'message.reply_to.mid');
    }

    /** @return array<string, mixed>|null */
    public function delivery(): ?array
    {
        return $this->messaging['delivery'] ?? null;
    }

    /** @return array<string, mixed>|null */
    public function read(): ?array
    {
        return $this->messaging['read'] ?? null;
    }
}
