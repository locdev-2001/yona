<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Default Broadcaster
    |--------------------------------------------------------------------------
    |
    | This option controls the default broadcaster that will be used by the
    | framework when an event needs to be broadcast. You may set this to
    | any of the connections defined in the "connections" array below.
    |
    | Supported: "reverb", "pusher", "ably", "redis", "log", "null"
    |
    */

    'default' => env('BROADCAST_CONNECTION', 'null'),

    /*
    |--------------------------------------------------------------------------
    | Broadcast Connections
    |--------------------------------------------------------------------------
    |
    | Here you may define all of the broadcast connections that will be used
    | to broadcast events to other systems or over WebSockets. Samples of
    | each available type of connection are provided inside this array.
    |
    */

    'connections' => [

        'reverb' => [
            'driver' => 'reverb',
            'key' => env('REVERB_APP_KEY'),
            'secret' => env('REVERB_APP_SECRET'),
            'app_id' => env('REVERB_APP_ID'),
            // Đây là đường Laravel gọi Reverb TỪ chính server để đẩy sự kiện,
            // không phải đường trình duyệt nối vào. Hai vai trò khác nhau:
            // REVERB_HOST là tên miền công khai (đồng thời là `hostname` của app
            // trong config/reverb.php, đổi là client không khớp nữa), còn đường
            // nội bộ nên trỏ thẳng loopback. Để nó đi ra tên miền công khai là
            // mỗi tin nhắn phải qua DNS, CDN rồi vòng về chính máy này — một cú
            // nấc DNS 10s đã giết 8 job MessageReceived ngày 16/09/2026, nghĩa
            // là 8 tin khách không hiện realtime mà không ai biết.
            // Bỏ trống thì chạy như cũ, hợp cho máy dev một mình.
            'options' => [
                'host' => env('REVERB_INTERNAL_HOST', env('REVERB_HOST')),
                'port' => env('REVERB_INTERNAL_PORT', env('REVERB_PORT', 443)),
                'scheme' => env('REVERB_INTERNAL_SCHEME', env('REVERB_SCHEME', 'https')),
                'useTLS' => env('REVERB_INTERNAL_SCHEME', env('REVERB_SCHEME', 'https')) === 'https',
            ],
            'client_options' => [
                // Guzzle client options: https://docs.guzzlephp.org/en/stable/request-options.html
            ],
        ],

        'pusher' => [
            'driver' => 'pusher',
            'key' => env('PUSHER_APP_KEY'),
            'secret' => env('PUSHER_APP_SECRET'),
            'app_id' => env('PUSHER_APP_ID'),
            'options' => [
                'cluster' => env('PUSHER_APP_CLUSTER'),
                'host' => env('PUSHER_HOST') ?: 'api-'.env('PUSHER_APP_CLUSTER', 'mt1').'.pusher.com',
                'port' => env('PUSHER_PORT', 443),
                'scheme' => env('PUSHER_SCHEME', 'https'),
                'encrypted' => true,
                'useTLS' => env('PUSHER_SCHEME', 'https') === 'https',
            ],
            'client_options' => [
                // Guzzle client options: https://docs.guzzlephp.org/en/stable/request-options.html
            ],
        ],

        'ably' => [
            'driver' => 'ably',
            'key' => env('ABLY_KEY'),
        ],

        'log' => [
            'driver' => 'log',
        ],

        'null' => [
            'driver' => 'null',
        ],

    ],

];
