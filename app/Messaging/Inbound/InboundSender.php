<?php

namespace App\Messaging\Inbound;

/** Người gửi theo cách kênh biết: id ổn định trên kênh + hồ sơ để lõi dựng/gộp liên hệ. */
final class InboundSender
{
    /** @param array<string, mixed> $additionalAttributes */
    public function __construct(
        public readonly string $sourceId,
        public readonly ?string $name = null,
        public readonly ?string $avatarUrl = null,
        public readonly ?string $phoneNumber = null,
        public readonly ?string $email = null,
        public readonly ?string $identifier = null,
        public readonly array $additionalAttributes = [],
    ) {}

    /** @return array<string, mixed> theo khoá ContactInboxWithContactBuilder nhận */
    public function contactAttributes(): array
    {
        return array_filter([
            'name' => $this->name,
            'avatar_url' => $this->avatarUrl,
            'phone_number' => $this->phoneNumber,
            'email' => $this->email,
            'identifier' => $this->identifier,
            'additional_attributes' => array_filter($this->additionalAttributes, fn ($value) => $value !== null) ?: null,
        ], fn ($value) => $value !== null);
    }
}
