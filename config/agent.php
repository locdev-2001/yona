<?php

// Cấu hình nhân viên AI (App\Agent). Mọi khoá API đọc từ .env, không ghi ở đây.
// Chủ từng khoá: `providers`, `models`, `default_model`, `agent_models` thuộc cổng
// mô hình (Inference/Gateway); `turn` thuộc vòng lượt (Runtime). Giá trị mặc định ở
// đây an toàn: không nhà cung cấp, không mô hình, nên chưa lượt nào gọi ra ngoài.
return [

    // Tên nhà cung cấp => ['protocol' => 'anthropic_messages'|'openai_chat', 'base_url', 'key_env', ...].
    'providers' => [],

    // Alias mô hình => ['routes' => [tuyến theo thứ tự ưu tiên, tuyến sau là dự phòng]].
    'models' => [],

    'default_model' => env('AGENT_DEFAULT_MODEL', 'main'),

    // ai_agent_id => alias: chỉ AI agent cần mô hình riêng mới khai ở đây.
    'agent_models' => [],

    'turn' => [
        'queue' => 'ai',

        // Bất biến: deadline_seconds < timeout của supervisor-ai (150s, config/horizon.php)
        // < retry_after của Redis (180s, config/queue.php).
        'deadline_seconds' => 120,

        'max_steps' => 6,
    ],
];
