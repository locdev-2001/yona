<?php

namespace App\Agent\ValueObjects;

use InvalidArgumentException;

// Thông tin khách tự nói ra trong hội thoại, để lưu vào hồ sơ. Là lời khai, chưa xác minh.
final readonly class CustomerDetails
{
    /** @param array<string, string> $attributes khoá thuộc tính tuỳ biến → giá trị */
    public function __construct(
        public ?string $name = null,
        public ?string $phoneNumber = null,
        public ?string $email = null,
        public ?string $city = null,
        public array $attributes = [],
    ) {
        if ($name === null && $phoneNumber === null && $email === null && $city === null && $attributes === []) {
            throw new InvalidArgumentException('Customer details need at least one field.');
        }
    }
}
