<?php

namespace App\Agent\ValueObjects;

use InvalidArgumentException;

// Kết quả ghi vào lõi. Cổng ghi không ném lỗi nghiệp vụ: từ chối trả về có mã.
final readonly class DeliveryReceipt
{
    private function __construct(
        public ?int $coreMessageId,
        public ?DeliveryFailure $failure,
    ) {
        if (($coreMessageId === null) === ($failure === null)) {
            throw new InvalidArgumentException('A receipt is either delivered with a message id or failed with a reason.');
        }
    }

    public static function delivered(int $coreMessageId): self
    {
        return new self($coreMessageId, null);
    }

    public static function failed(DeliveryFailure $failure): self
    {
        return new self(null, $failure);
    }

    public function isDelivered(): bool
    {
        return $this->coreMessageId !== null;
    }
}
