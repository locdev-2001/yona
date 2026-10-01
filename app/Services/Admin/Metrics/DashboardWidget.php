<?php

namespace App\Services\Admin\Metrics;

// Một ô trên trang Tổng quan. Ô chỉ khai danh tính; ô nào máy chủ tính số
// thì hiện thực thêm ComputesMetrics.
interface DashboardWidget
{
    public function key(): string;

    public function defaultSize(): WidgetSize;
}
