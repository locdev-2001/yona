<?php

namespace App\Agent\Inference\Gateway\Throttle;

use App\Agent\ValueObjects\ModelError;
use App\Agent\ValueObjects\ModelErrorKind;

// Một lần gọi thất bại đã phân loại, kèm lời khuyên chờ của máy chủ nếu có.
final readonly class Failure
{
    public function __construct(
        public ModelError $error,
        public ?float $retryAfterSeconds = null,
    ) {}

    // Lỗi tạm thời: thử lại cùng tuyến nếu còn thời gian.
    public function retriesOnSameRoute(): bool
    {
        return $this->error->kind === ModelErrorKind::Retryable;
    }

    // Đổi tuyến chữa được lỗi tạm thời và lỗi khoá; request sai hay vượt ngữ cảnh thì không.
    public function movesToNextRoute(): bool
    {
        return in_array($this->error->kind, [ModelErrorKind::Retryable, ModelErrorKind::Auth], true);
    }

    // Lỗi phản ánh sức khoẻ của tuyến, tính vào circuit breaker.
    public function countsAgainstRoute(): bool
    {
        return $this->movesToNextRoute();
    }

    // Khoá bị từ chối không tự lành: mở mạch ngay, không đợi đủ ngưỡng lỗi.
    public function disablesRoute(): bool
    {
        return $this->error->kind === ModelErrorKind::Auth;
    }
}
