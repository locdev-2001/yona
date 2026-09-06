<?php

// Port từ GlobalConfig.get_value('WEBHOOK_TIMEOUT') của Chatwoot (mặc định 5 giây)
// — hạn thời gian cho mọi cú gọi webhook đi ra.
return [
    'timeout' => (int) env('WEBHOOK_TIMEOUT', 5),
];
