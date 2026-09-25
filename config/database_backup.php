<?php

return [

    // Disk Laravel (config/filesystems.php) nhận bản sao lưu ngoài server, ví dụ
    // s3/r2. Để trống = chỉ lưu cục bộ ở storage/app/backups (không an toàn nếu
    // mất cả server), `db:backup` sẽ cảnh báo mỗi lần chạy khi thiếu.
    'offsite_disk' => env('BACKUP_DISK'),

    // Số ngày giữ bản sao lưu cũ, áp dụng cả cục bộ lẫn ngoài server.
    'keep_days' => (int) env('BACKUP_KEEP_DAYS', 14),

];
