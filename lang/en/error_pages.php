<?php

// Branded error pages of the public surface (resources/views/errors/*).

return [
    'not_found' => [
        'meta' => [
            'title' => 'Page not found · Yona',
            'description' => 'This link does not lead to any Yona page.',
        ],
        'eyebrow' => 'Error 404',
        'title' => 'We could not find this page',
        'lead' => 'The link may have changed, the page may have been removed, or the address is missing a character. Check the link, or carry on from one of the two places below.',
        'home' => 'Back to home',
    ],
];
