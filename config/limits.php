<?php

// Tương đương lib/limits.rb của Chatwoot (phần đã dùng tới).
return [
    'conversation_message_per_minute' => env('CONVERSATION_MESSAGE_PER_MINUTE_LIMIT', 200),
];
