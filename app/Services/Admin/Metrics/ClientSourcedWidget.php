<?php

namespace App\Services\Admin\Metrics;

// Ô mà trình duyệt tự lấy dữ liệu từ nguồn khác (API vận hành, prop chia sẻ);
// máy chủ chỉ cần biết nó tồn tại để xếp bố cục.
final class ClientSourcedWidget implements DashboardWidget
{
    public function __construct(
        private readonly string $key,
        private readonly WidgetSize $defaultSize,
    ) {}

    public function key(): string
    {
        return $this->key;
    }

    public function defaultSize(): WidgetSize
    {
        return $this->defaultSize;
    }
}
