<?php

use App\Search\Drivers\PostgresSearchEngine;

return [

    // Engine tìm ra id khớp; quyền và dữ liệu trả về luôn nạp lại từ PostgreSQL.
    'driver' => env('SEARCH_DRIVER', 'pgsql'),

    // Thêm engine = thêm một driver cài SearchEngine và đăng ký ở đây.
    'drivers' => [
        'pgsql' => PostgresSearchEngine::class,
    ],

];
