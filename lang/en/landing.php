<?php

// Strings the server needs for the public surface: meta tags, JSON-LD, a form
// error and the back-to-home link on the auth screens. The visible page copy
// lives in resources/js/landing/copy.ts.
return [
    'meta' => [
        'title' => 'Yona · One personal inbox for Zalo, email and friends',
        'description' => 'Bring your personal Zalo messages, Gmail and chats with friends on Yona into one inbox of your own. Find people by @username, open it in your browser, install it on your phone.',
    ],

    'nav' => [
        'back_to_home' => 'Back to home',
    ],

    // The /dat-lich-demo route stays so old links do not break; it renders the homepage.
    'demo' => [
        'meta' => [
            'title' => 'Yona · One personal inbox for Zalo, email and friends',
            'description' => 'Sign up with email or Google and get your own inbox right away: connect personal Zalo and Gmail, and message friends by @username.',
        ],
        'form' => [
            'phone_invalid' => 'That phone number is not valid. Use 0912345678 or +84912345678.',
        ],
        'thanks' => [
            'meta' => [
                'title' => 'Yona · One personal inbox for Zalo, email and friends',
                'description' => 'Bring your personal Zalo messages, Gmail and chats with friends on Yona into one inbox of your own.',
            ],
        ],
    ],

    // The /zalo-ca-nhan route stays so old links do not break; it renders the homepage.
    'zalo_page' => [
        'meta' => [
            'title' => 'Read and reply to personal Zalo in your Yona inbox',
            'description' => 'Scan a QR code to bring your personal Zalo messages into your Yona inbox, next to Gmail and chats with friends. The connection is unofficial, so Zalo may restrict the account.',
        ],
        'hero' => [
            'eyebrow' => 'Personal Zalo',
        ],
    ],
];
