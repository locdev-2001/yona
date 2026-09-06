<?php

// Port từ dashboard/i18n/locale/en/report.json (khối CSAT_REPORTS).
// Bỏ REVIEW_NOTES: ghi chú đánh giá là tính năng cloud/EE, không port.
return [
    'HEADER' => 'CSAT Reports',
    'NO_RECORDS' => 'No responses yet',
    'NO_RECORDS_DESCRIPTION' => 'CSAT survey responses will appear here once customers start providing feedback.',
    'DOWNLOAD' => 'Download CSAT Reports',
    'DOWNLOAD_FAILED' => 'Failed to download CSAT Reports',
    'FILTERS' => [
        'ADD_FILTER' => 'Add filter',
        'CLEAR_ALL' => 'Clear all',
        'NO_FILTER' => 'No filters available',
        'INPUT_PLACEHOLDER' => [
            'AGENTS' => 'Search agents',
            'INBOXES' => 'Search inboxes',
            'TEAMS' => 'Search teams',
            'RATINGS' => 'Search ratings',
        ],
        'AGENTS' => [
            'LABEL' => 'Agent',
        ],
        'INBOXES' => [
            'LABEL' => 'Inbox',
        ],
        'TEAMS' => [
            'LABEL' => 'Team',
        ],
        'RATINGS' => [
            'LABEL' => 'Rating',
        ],
    ],
    'TABLE' => [
        'HEADER' => [
            'CONTACT_NAME' => 'Contact',
            'AGENT_NAME' => 'Agent',
            'RATING' => 'Rating',
            'FEEDBACK_TEXT' => 'Feedback comment',
            'CONVERSATION' => 'Conversation',
            'CUSTOMER' => 'Customer',
            'RESPONSE' => 'Response',
            'HANDLED_BY' => 'Handled by',
        ],
        'UNKNOWN_CUSTOMER' => 'Unknown customer',
    ],
    'NO_AGENT' => 'No assigned agent',
    'NO_FEEDBACK' => 'No feedback provided',
    'METRIC' => [
        'TOTAL_RESPONSES' => [
            'LABEL' => 'Total responses',
            'TOOLTIP' => 'Total number of responses collected',
        ],
        'SATISFACTION_SCORE' => [
            'LABEL' => 'Satisfaction score',
            'TOOLTIP' => 'Total number of positive responses / Total number of responses * 100',
        ],
        'RESPONSE_RATE' => [
            'LABEL' => 'Response rate',
            'TOOLTIP' => 'Total number of responses / Total number of CSAT survey messages sent * 100',
        ],
        'RATING_DISTRIBUTION' => 'Rating distribution',
    ],
];
