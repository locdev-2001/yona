<?php

// Tương đương GlobalConfigService.load('<KEY>') của Chatwoot — giá trị cấu hình
// của cài đặt cho từng ứng dụng tích hợp. Rỗng = app đó chưa cấu hình nên bị ẩn
// khỏi màn Integrations (giống Chatwoot chạy trần).
return [
    'SLACK_CLIENT_ID' => env('SLACK_CLIENT_ID'),
    'SLACK_CLIENT_SECRET' => env('SLACK_CLIENT_SECRET'),
    'LINEAR_CLIENT_ID' => env('LINEAR_CLIENT_ID'),
    'NOTION_CLIENT_ID' => env('NOTION_CLIENT_ID'),
    'SHOPIFY_CLIENT_ID' => env('SHOPIFY_CLIENT_ID'),
];
