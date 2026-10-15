<?php

namespace App\Agent\Contracts\Ports;

// Dấu tạm có hạn của Runtime (job đã chạy, tin đã xử lý, ghi chú đã gửi trong ngày).
// Mất dấu chỉ làm Runtime làm lại một việc, không bao giờ làm sai dữ liệu.
interface EphemeralStore
{
    // Đặt khi chưa có; false nếu khoá đã tồn tại.
    public function add(string $key, int $value, int $ttlSeconds): bool;

    public function put(string $key, int $value, int $ttlSeconds): void;

    public function get(string $key): ?int;
}
