<?php

// Port từ dashboard/i18n/locale/en/report.json (khối INBOX_REPORTS) — heatmap Overview dùng ALL_INBOXES/SEARCH_INBOX.
// Bỏ DATE_RANGE: danh sách chỉ số nguyên, code dùng constants.ts thay thế.
return [
    'HEADER' => 'Inbox Overview',
    'DESCRIPTION' => 'Quickly view your inbox performance with key metrics like conversations, response times, resolution times, and resolved cases—all in one place. Click an inbox name for more details.',
    'LOADING_CHART' => 'Loading chart data...',
    'NO_ENOUGH_DATA' => 'We\'ve not received enough data points to generate report, Please try again later.',
    'DOWNLOAD_INBOX_REPORTS' => 'Download inbox reports',
    'FILTER_DROPDOWN_LABEL' => 'Select Inbox',
    'ALL_INBOXES' => 'All Inboxes',
    'SEARCH_INBOX' => 'Search Inbox',
    'FILTERS' => [
        'INPUT_PLACEHOLDER' => [
            'INBOXES' => 'Search inboxes',
        ],
    ],
    'METRICS' => [
        'CONVERSATIONS' => [
            'NAME' => 'Conversations',
            'DESC' => '( Total )',
        ],
        'INCOMING_MESSAGES' => [
            'NAME' => 'Incoming Messages',
            'DESC' => '( Total )',
        ],
        'OUTGOING_MESSAGES' => [
            'NAME' => 'Outgoing Messages',
            'DESC' => '( Total )',
        ],
        'FIRST_RESPONSE_TIME' => [
            'NAME' => 'First Response Time',
            'DESC' => '( Avg )',
            'INFO_TEXT' => 'Total number of conversations used for computation:',
            'TOOLTIP_TEXT' => 'First Response Time is {metricValue} (based on {conversationCount} conversations)',
        ],
        'RESOLUTION_TIME' => [
            'NAME' => 'Resolution Time',
            'DESC' => '( Avg )',
            'INFO_TEXT' => 'Total number of conversations used for computation:',
            'TOOLTIP_TEXT' => 'Resolution Time is {metricValue} (based on {conversationCount} conversations)',
        ],
        'RESOLUTION_COUNT' => [
            'NAME' => 'Resolution Count',
            'DESC' => '( Total )',
        ],
    ],
    'CUSTOM_DATE_RANGE' => [
        'CONFIRM' => 'Apply',
        'PLACEHOLDER' => 'Select date range',
    ],
];
