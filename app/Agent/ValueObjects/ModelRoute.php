<?php

namespace App\Agent\ValueObjects;

use InvalidArgumentException;

// Một tuyến cụ thể đã phục vụ lời gọi: nhà cung cấp (khoá trong config/agent.php) + mã mô hình.
final readonly class ModelRoute
{
    public function __construct(
        public string $provider,
        public string $model,
    ) {
        if ($provider === '' || $model === '') {
            throw new InvalidArgumentException('Model route needs both provider and model.');
        }
    }
}
