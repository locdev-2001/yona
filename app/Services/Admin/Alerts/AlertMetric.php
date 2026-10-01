<?php

namespace App\Services\Admin\Alerts;

// Một chỉ số theo dõi được của hệ thống. Lõi đánh giá (AlertEvaluator) chỉ hỏi
// các chỉ số qua giao diện này; thêm chỉ số = viết một lớp trong Metrics/ rồi
// khai ở AlertMetrics.
interface AlertMetric
{
    public function key(): string;

    public function defaults(): AlertRuleDefaults;

    public function windowMode(): WindowMode;

    public function unit(): MetricUnit;

    // Trang quản trị giúp xử lý sự cố của chỉ số này (đường dẫn tương đối).
    public function url(): string;

    /**
     * Giá trị hiện tại. Ném lỗi khi nguồn số liệu không trả lời được — lượt đó bị
     * bỏ qua, không mở cũng không đóng sự cố.
     */
    public function measure(int $windowMinutes): int;
}
