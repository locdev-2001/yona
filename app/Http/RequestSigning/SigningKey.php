<?php

namespace App\Http\RequestSigning;

final readonly class SigningKey
{
    public function __construct(
        public string $id,
        public string $subject,
        public int $generation,
        public string $encryptionKey,
        public string $signingKey,
        public int $expiresAt,
    ) {}

    /** @return array<string, mixed> */
    public function toStorage(): array
    {
        return [
            'subject' => $this->subject,
            'generation' => $this->generation,
            'encryption_key' => base64_encode($this->encryptionKey),
            'signing_key' => base64_encode($this->signingKey),
            'expires_at' => $this->expiresAt,
        ];
    }

    /** @param array<string, mixed> $stored */
    public static function fromStorage(string $id, array $stored): self
    {
        return new self(
            id: $id,
            subject: (string) $stored['subject'],
            generation: (int) $stored['generation'],
            encryptionKey: base64_decode((string) $stored['encryption_key'], true) ?: '',
            signingKey: base64_decode((string) $stored['signing_key'], true) ?: '',
            expiresAt: (int) $stored['expires_at'],
        );
    }
}
