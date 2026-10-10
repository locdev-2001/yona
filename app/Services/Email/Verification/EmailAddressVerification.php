<?php

namespace App\Services\Email\Verification;

final class EmailAddressVerification
{
    public const INVALID_SYNTAX = 'invalid_syntax';

    public const DOMAIN_NOT_FOUND = 'domain_not_found';

    public const DOMAIN_NO_MAIL = 'domain_no_mail';

    public function __construct(
        public readonly string $email,
        public readonly ?string $reason,
    ) {}

    public function deliverable(): bool
    {
        return $this->reason === null;
    }

    /** Câu người dùng đọc được vì sao không gửi tới được địa chỉ này. */
    public function message(): ?string
    {
        return $this->reason === null ? null : __('errors.conversations.email_undeliverable', [
            'email' => $this->email,
            'reason' => __('errors.email_addresses.'.$this->reason),
        ]);
    }

    /** @return array{email: string, deliverable: bool, reason: ?string} */
    public function toArray(): array
    {
        return ['email' => $this->email, 'deliverable' => $this->deliverable(), 'reason' => $this->reason];
    }
}
