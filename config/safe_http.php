<?php

// SAFE_FETCH_ALLOW_PRIVATE_NETWORK của bản gốc: bật thì cho phép gọi vào mạng nội
// bộ (dev/harness chạy localhost). Môi trường thật để false.
return [
    'allow_private_networks' => filter_var(
        env('ALLOW_PRIVATE_WEBHOOK_URLS', false),
        FILTER_VALIDATE_BOOLEAN,
    ),
];
