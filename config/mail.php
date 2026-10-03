<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Default Mailer
    |--------------------------------------------------------------------------
    |
    | This option controls the default mailer that is used to send all email
    | messages unless another mailer is explicitly specified when sending
    | the message. All additional mailers can be configured within the
    | "mailers" array. Examples of each type of mailer are provided.
    |
    */

    'default' => env('MAIL_MAILER', 'log'),

    /*
    |--------------------------------------------------------------------------
    | Mailer Configurations
    |--------------------------------------------------------------------------
    |
    | Here you may configure all of the mailers used by your application plus
    | their respective settings. Several examples have been configured for
    | you and you are free to add your own as your application requires.
    |
    | Laravel supports a variety of mail "transport" drivers that can be used
    | when delivering an email. You may specify which one you're using for
    | your mailers below. You may also add additional mailers if needed.
    |
    | Supported: "smtp", "sendmail", "mailgun", "ses", "ses-v2",
    |            "postmark", "resend", "log", "array",
    |            "failover", "roundrobin"
    |
    */

    'mailers' => [

        'smtp' => [
            'transport' => 'smtp',
            'scheme' => env('MAIL_SCHEME'),
            'url' => env('MAIL_URL'),
            'host' => env('MAIL_HOST', '127.0.0.1'),
            'port' => env('MAIL_PORT', 2525),
            'username' => env('MAIL_USERNAME'),
            'password' => env('MAIL_PASSWORD'),
            'timeout' => null,
            'local_domain' => env('MAIL_EHLO_DOMAIN', parse_url((string) env('APP_URL', 'http://localhost'), PHP_URL_HOST)),
        ],

        'ses' => [
            'transport' => 'ses',
        ],

        'postmark' => [
            'transport' => 'postmark',
            // 'message_stream_id' => env('POSTMARK_MESSAGE_STREAM_ID'),
            // 'client' => [
            //     'timeout' => 5,
            // ],
        ],

        'resend' => [
            'transport' => 'resend',
        ],

        'sendmail' => [
            'transport' => 'sendmail',
            'path' => env('MAIL_SENDMAIL_PATH', '/usr/sbin/sendmail -bs -i'),
        ],

        'log' => [
            'transport' => 'log',
            'channel' => env('MAIL_LOG_CHANNEL'),
        ],

        'array' => [
            'transport' => 'array',
        ],

        'failover' => [
            'transport' => 'failover',
            'mailers' => [
                'smtp',
                'log',
            ],
            'retry_after' => 60,
        ],

        'roundrobin' => [
            'transport' => 'roundrobin',
            'mailers' => [
                'ses',
                'postmark',
            ],
            'retry_after' => 60,
        ],

    ],

    /*
    |--------------------------------------------------------------------------
    | Global "From" Address
    |--------------------------------------------------------------------------
    |
    | You may wish for all emails sent by your application to be sent from
    | the same address. Here you may specify a name and address that is
    | used globally for all emails that are sent by your application.
    |
    */

    'from' => [
        'address' => env('MAIL_FROM_ADDRESS', 'hello@example.com'),
        'name' => env('MAIL_FROM_NAME', env('APP_NAME', 'Laravel')),
    ],

    /*
    |--------------------------------------------------------------------------
    | Kênh Email (F1 — port ENV)
    |--------------------------------------------------------------------------
    |
    | MAILER_INBOUND_EMAIL_DOMAIN bật tính năng chuyển tiếp thư: có domain thì
    | mỗi inbox email được cấp một địa chỉ `forward_to_email`, và thư trả lời
    | dùng `reply+<conversation-uuid>@<domain>` làm Reply-To.
    | MAILER_SENDER_EMAIL là địa chỉ gửi mặc định khi tài khoản chưa khai riêng.
    |
    */

    // ENV SMTP_ADDRESS của bản gốc: chưa khai SMTP thì thư tổng hợp không gửi
    // (`smtp_config_set_or_development?`). Khác `mailers.smtp.host` — khóa đó
    // luôn có giá trị mặc định nên không dùng để biết đã cấu hình hay chưa.
    'smtp_address' => env('MAIL_HOST') ?: null,

    'inbound_email_domain' => env('MAILER_INBOUND_EMAIL_DOMAIN') ?: null,

    'sender_email' => env('MAILER_SENDER_EMAIL', env('MAIL_FROM_ADDRESS', 'hello@example.com')),

    // GlobalConfigService SKIP_INCOMING_BCC_PROCESSING — danh sách account_id
    // (ngăn cách dấu phẩy) không nhận thư chỉ-BCC.
    'skip_incoming_bcc_processing' => env('SKIP_INCOMING_BCC_PROCESSING', ''),

    'smtp_open_timeout' => (int) env('SMTP_OPEN_TIMEOUT', 15),

    'smtp_read_timeout' => (int) env('SMTP_READ_TIMEOUT', 30),

    'imap_read_timeout' => (int) env('IMAP_READ_TIMEOUT', 20),

    'imap_logout_timeout' => (int) env('IMAP_LOGOUT_TIMEOUT', 2),

    'imap_retry_max_seconds' => (int) env('IMAP_RETRY_MAX_SECONDS', 600),

    // Lượt quét IMAP lâu hơn ngưỡng này (ms) thì ghi log thời gian từng pha.
    'imap_slow_fetch_ms' => (int) env('IMAP_SLOW_FETCH_MS', 10000),

    'email_processing_timeout' => (int) env('EMAIL_PROCESSING_TIMEOUT_SECONDS', 60),

];
