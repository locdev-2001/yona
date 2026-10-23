<?php

return [
    'METRICS' => [
        'VERSION' => 'Phiên bản Yona',
        'POSTGRES' => 'Kết nối Postgres',
        'MIGRATIONS' => 'Migration cơ sở dữ liệu',
        'REDIS' => 'Kết nối Redis',
        'REDIS_VERSION' => 'Phiên bản Redis',
        'REDIS_CLIENTS' => 'Số kết nối Redis',
        'REDIS_MEMORY' => 'Bộ nhớ Redis đang dùng',
        'REDIS_PEAK' => 'Bộ nhớ Redis cao nhất',
        'REDIS_MAX_MEMORY' => 'Redis maxmemory',
        'REDIS_POLICY' => 'Redis maxmemory policy',
    ],
    'STATUS' => [
        'true' => 'Hoạt động',
        'false' => 'Mất kết nối',
        'completed' => 'Đã chạy hết',
        'pending' => 'Còn migration chưa chạy',
    ],
];
