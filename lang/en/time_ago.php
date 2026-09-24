<?php

// Mốc thời gian rút gọn cho cột hẹp (danh sách hội thoại, chuông thông báo, tệp đã chia sẻ).
// {count} là số đơn vị đã làm tròn; AGO bọc quanh khi cần nói "trước đây".

return [
    'SHORT' => [
        'NOW' => 'now',
        'MINUTES' => '{count}m',
        'HOURS' => '{count}h',
        'DAYS' => '{count}d',
        'WEEKS' => '{count}w',
        'MONTHS' => '{count}mo',
        'YEARS' => '{count}y',
        'AGO' => '{time} ago',
    ],
];
