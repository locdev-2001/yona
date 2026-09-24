<?php

use App\Search\Drivers\MeilisearchEngine;
use App\Search\Drivers\PostgresSearchEngine;

return [

    // Engine tìm ra id khớp; quyền và dữ liệu trả về luôn nạp lại từ PostgreSQL.
    'driver' => env('SEARCH_DRIVER', 'pgsql'),

    // Thêm engine = thêm một driver cài SearchEngine và đăng ký ở đây.
    'drivers' => [
        'pgsql' => PostgresSearchEngine::class,
        'meilisearch' => MeilisearchEngine::class,
    ],

    'meilisearch' => [
        'host' => env('MEILISEARCH_HOST', 'http://127.0.0.1:7700'),
        // Master key: chỉ dùng để ghi tài liệu và cấu hình chỉ mục.
        'key' => env('MEILISEARCH_KEY'),
        // Key chỉ có quyền search — mọi lượt tìm dùng key này, không cấp cho trình duyệt.
        'search_key' => env('MEILISEARCH_SEARCH_KEY'),
        'index_prefix' => env('MEILISEARCH_INDEX_PREFIX', 'yona_'),
    ],

];
