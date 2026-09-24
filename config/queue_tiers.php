<?php

// Thứ tự phân tầng hàng đợi: job ở tier
// trước luôn được lấy trước job ở tier sau.
//
// Đây là NGUỒN DUY NHẤT. File cố ý không gọi env()/helper nào để `php -r
// "require"` đọc được từ Makefile và deploy.sh mà không cần bootstrap Laravel.
// Ba nơi đọc: config/horizon.php (worker production), Makefile (queue:listen
// dev), deploy.sh (kiểm tra cấu hình).
return [
    'critical',
    'high',
    'medium',
    'default',
    'mailers',
    'low',
    'scheduled_jobs',
    'purgable',
];
