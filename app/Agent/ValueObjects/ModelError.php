<?php

namespace App\Agent\ValueObjects;

use InvalidArgumentException;

final readonly class ModelError
{
    public function __construct(
        public ModelErrorKind $kind,
        public string $message,
        public ?int $httpStatus = null,
    ) {
        if (trim($message) === '') {
            throw new InvalidArgumentException('Model error message must not be empty.');
        }
    }
}
