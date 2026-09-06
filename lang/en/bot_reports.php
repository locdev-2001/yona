<?php

// Port từ dashboard/i18n/locale/en/report.json (khối BOT_REPORTS).
return [
    'HEADER' => 'Bot Reports',
    'METRIC' => [
        'TOTAL_CONVERSATIONS' => [
            'LABEL' => 'No. of Conversations',
            'TOOLTIP' => 'Total number of conversations handled by the bot',
        ],
        'TOTAL_RESPONSES' => [
            'LABEL' => 'Total Responses',
            'TOOLTIP' => 'Total number of responses sent by the bot',
        ],
        'RESOLUTION_RATE' => [
            'LABEL' => 'Resolution Rate',
            'TOOLTIP' => 'Total number of conversations resolved by the bot / Total number of conversations handled by the bot * 100',
        ],
        'HANDOFF_RATE' => [
            'LABEL' => 'Handoff Rate',
            'TOOLTIP' => 'Total number of conversations handed off to agents / Total number of conversations handled by the bot * 100',
        ],
    ],
];
