<?php

// Thứ tự phân tầng hàng đợi: job ở tier
// trước luôn được lấy trước job ở tier sau.
//
// Đây là NGUỒN DUY NHẤT. File cố ý không gọi env()/helper nào để `php -r
// "require"` đọc được từ Makefile và deploy.sh mà không cần bootstrap Laravel.
// Ba nơi đọc: config/horizon.php (worker production), Makefile (queue:listen
// dev), deploy.sh (kiểm tra cấu hình).
//
// `media` là tin gửi kèm tệp (SendReplyJob::queueFor): production có supervisor
// riêng cho nó (config/horizon.php), dev vẫn chạy chung một worker theo thứ tự này.
// `ai` là lượt của nhân viên AI (mỗi lượt tới 120s): production cũng có supervisor
// riêng, để lượt dài không giữ worker của tin nhắn và realtime.
return [
    'critical',
    'high',
    'media',
    'medium',
    'default',
    'ai',
    'mailers',
    'low',
    'scheduled_jobs',
    'purgable',
];
