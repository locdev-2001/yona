<?php

// Strings the server needs for the public surface: meta tags, JSON-LD, a form
// error and the back-to-home link on the auth screens. The visible page copy
// lives in resources/js/landing/copy.ts.
$homeMeta = [
    'title' => 'Yona — Unified communication platform',
    'description' => 'Connect communication platforms in one shared space with Yona. Read, reply and find your conversations in one place, right in your browser.',
];

return [
    'meta' => [
        'title' => $homeMeta['title'],
        'description' => $homeMeta['description'],
    ],

    'nav' => [
        'back_to_home' => 'Back to home',
    ],

    // The /dat-lich-demo route stays so old links do not break; it renders the homepage.
    'demo' => [
        'meta' => [
            'title' => $homeMeta['title'],
            'description' => $homeMeta['description'],
        ],
        'form' => [
            'phone_invalid' => 'That phone number is not valid. Use 0912345678 or +84912345678.',
        ],
        'thanks' => [
            'meta' => [
                'title' => $homeMeta['title'],
                'description' => $homeMeta['description'],
            ],
        ],
    ],

    // The /zalo-ca-nhan route stays so old links do not break; it renders the homepage.
    'zalo_page' => [
        'meta' => [
            'title' => $homeMeta['title'],
            'description' => $homeMeta['description'],
        ],
        'hero' => [
            'eyebrow' => 'Personal Zalo',
        ],
    ],
];
