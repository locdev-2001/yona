<?php

use App\Modules\Chat\Port\AbstractChannelDriver;
use App\Modules\Chat\Port\ChannelCapabilities;
use App\Modules\Chat\Port\ChannelDriver;
use App\Modules\Chat\Port\ChannelRegistry;
use App\Modules\Chat\Port\Exception\UnsupportedCapabilityException;

/*
 * Bí danh tương thích ngược: FQCN CŨ => FQCN MỚI.
 *
 * Chỉ phục vụ dữ liệu đã nằm ngoài tầm với của một lần sửa code:
 *   - job đã serialize trong bảng `jobs` (queue connection = database) — payload
 *     giữ nguyên tên class lúc đẩy vào hàng đợi, worker chạy sau khi đã đổi tên
 *     sẽ unserialize ra một class không còn tồn tại;
 *   - FQCN lưu dưới dạng chuỗi trong DB.
 *
 * KHÔNG dùng để né việc sửa `use` trong code: mọi tham chiếu trong repo phải trỏ
 * thẳng tên mới. Bảng này chết ở P5 — trước khi xóa phải kiểm `jobs` = 0 và
 * không có `failed_jobs` mới trong 24h.
 *
 * @return array<class-string, class-string>
 */

return [
    // Cụm 1 — Port/
    'App\Modules\Integration\ChannelManager' => ChannelRegistry::class,
    'App\Modules\Integration\Contracts\ChannelCapabilities' => ChannelCapabilities::class,
    'App\Modules\Integration\Contracts\ChannelDriver' => ChannelDriver::class,
    'App\Modules\Chat\Exceptions\UnsupportedCapabilityException' => UnsupportedCapabilityException::class,
    'App\Modules\Chat\Support\AbstractChannelDriver' => AbstractChannelDriver::class,
];
