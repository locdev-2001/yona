<?php

// Port từ GlobalConfig.get_value('WEBHOOK_TIMEOUT') của Chatwoot (mặc định 5 giây)
// — hạn thời gian cho mọi cú gọi webhook đi ra.
return [
    'timeout' => (int) env('WEBHOOK_TIMEOUT', 5),

    // Khoá `content_attributes` là payload THÔ của nền tảng nhắn tin: giữ trong DB
    // vì chiều gửi cần dựng lại trích dẫn/thu hồi, nhưng không đi ra ngoài qua
    // webhook (mang uid nền tảng, link CDN, chuỗi nội bộ của người thật).
    // Quy tắc chung: docs/channel-capabilities.md §2.5.
    'redacted_content_attributes' => ['zca_message', 'sticker'],
];
