<?php

// Tương đương lib/limits.rb của Chatwoot (phần đã dùng tới) + hạn mức tệp
// lấy từ installation config (MAXIMUM_FILE_UPLOAD_SIZE).
return [
    'conversation_message_per_minute' => env('CONVERSATION_MESSAGE_PER_MINUTE_LIMIT', 200),
    'url_length' => 2048,
    'bulk_actions' => 100,
    'maximum_file_upload_size' => env('MAXIMUM_FILE_UPLOAD_SIZE', 40),
    'number_of_permitted_attachments' => 15,
];
