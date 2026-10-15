<?php

// Cấu hình nhân viên AI (App\Agent). Mọi khoá API đọc từ .env, không ghi ở đây.
// Chủ từng khoá: `providers`, `models`, `default_model`, `agent_models` thuộc cổng
// mô hình (Inference/Gateway); `turn` thuộc vòng lượt (Runtime). Chưa đặt khoá nào
// trong .env thì mọi tuyến bị bỏ qua, nên chưa lượt nào gọi ra ngoài.
return [

    // Nhà cung cấp theo giao thức. Thêm API tương thích = thêm một mục, không sửa code.
    // Khoá API chỉ đọc từ .env; thiếu khoá hoặc base_url thì tuyến bị bỏ qua (có cảnh báo).
    // cache: explicit (điểm ngắt cache_control) | automatic (gửi prompt_cache_key) |
    // passthrough (cổng trung gian: mô hình `anthropic/*` nhận cache_control) | prefix_only.
    'providers' => [
        'anthropic' => [
            'protocol' => 'anthropic_messages',
            'base_url' => 'https://api.anthropic.com',
            'api_key' => env('AGENT_ANTHROPIC_KEY'),
            'cache' => 'explicit',
            'timeout_seconds' => 60,
        ],
        'openai' => [
            'protocol' => 'openai_chat',
            'base_url' => 'https://api.openai.com/v1',
            'api_key' => env('AGENT_OPENAI_KEY'),
            'cache' => 'automatic',
            'max_tokens_field' => 'max_completion_tokens',
            'timeout_seconds' => 60,
        ],
        'openrouter' => [
            'protocol' => 'openai_chat',
            'base_url' => 'https://openrouter.ai/api/v1',
            'api_key' => env('AGENT_OPENROUTER_KEY'),
            'cache' => 'passthrough',
            'max_tokens_field' => 'max_tokens',
            'timeout_seconds' => 60,
            'headers' => [
                'HTTP-Referer' => env('APP_URL'),
                'X-OpenRouter-Title' => env('APP_NAME', 'Yona'),
            ],
        ],
        'custom_9router' => [
            'protocol' => 'openai_chat',
            'base_url' => env('AGENT_9ROUTER_URL'),
            'api_key' => env('AGENT_9ROUTER_KEY'),
            'cache' => 'prefix_only',
            'max_tokens_field' => 'max_tokens',
            'timeout_seconds' => 60,
        ],
    ],

    // Alias mô hình => tuyến theo thứ tự ưu tiên; tuyến sau là dự phòng của tuyến trước.
    // price: USD mỗi triệu token (input, output, cache_read, cache_write); bỏ trống = 0,
    // chi phí ghi 0. request_options: tham số thêm vào thân request của tuyến, vd
    // ['thinking' => ['type' => 'disabled']] với mô hình cho tắt thinking. Mã mô hình và
    // giá ở đây là chỗ giữ, chốt theo số đo (QĐ K10).
    'models' => [
        'main' => [
            'routes' => [
                ['provider' => 'anthropic', 'model' => 'claude-sonnet-5', 'max_output' => 2048],
                ['provider' => 'openrouter', 'model' => 'anthropic/claude-sonnet-5', 'max_output' => 2048],
            ],
        ],
    ],

    'default_model' => env('AGENT_DEFAULT_MODEL', 'main'),

    // ai_agent_id => alias: chỉ AI agent cần mô hình riêng mới khai ở đây.
    'agent_models' => [],

    'turn' => [
        // Công tắc dừng toàn nền tảng: false thì không lượt nào chạy, lượt đang chạy dừng ở bước kế.
        'enabled' => (bool) env('AGENT_TURNS_ENABLED', true),

        'queue' => 'ai',

        // Bất biến (test khoá): deadline_seconds + floor_grace_seconds <= job_timeout_seconds
        // (= timeout của supervisor-ai, config/horizon.php) < lock_expire_seconds và
        // job_timeout_seconds < retry_after của Redis (180s, config/queue.php).
        'deadline_seconds' => 120,
        // Khoá lượt giữ tới deadline + chừng này giây; worker chết thì khoá tự hết.
        'floor_grace_seconds' => 20,
        'job_timeout_seconds' => 150,
        // Hội thoại đang có lượt khác: nhả job lại sau chừng này giây.
        'lock_release_seconds' => 5,
        'lock_expire_seconds' => 180,
        // Job chờ khoá tối đa chừng này giây (sau cửa sổ im lặng) rồi bỏ.
        'max_wait_seconds' => 600,

        // Số lần gọi mô hình tối đa của một lượt, thêm một bước ân hạn chỉ cho công cụ kết thúc. [NGƯỠNG]
        'max_steps' => 6,

        // Cửa sổ im lặng theo loại kênh (giây): gom tin khách nhắn dồn thành một lượt.
        'debounce_seconds' => [
            'default' => 4,
            'email' => 0,
        ],

        // Lịch sử đọc từ messages mỗi lượt: số tin gần nhất, trần token cứng, cắt tin cũ theo khúc.
        'history' => [
            'messages' => 60,
            'max_tokens' => 12000,
            'drop_chunk' => 10,
        ],

        // Trần chi phí mô hình mỗi account mỗi ngày (USD, theo api_logs); 0 = không giới hạn. [NGƯỠNG]
        'daily_budget_usd' => (float) env('AGENT_DAILY_BUDGET_USD', 5),
    ],
];
