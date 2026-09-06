<?php

// Port từ dashboard/i18n/locale/en/report.json (khối AGENT_REPORTS).
// Bỏ DATE_RANGE: mảng khóa số, i18n:generate từ chối; code dùng constants.ts thay thế.
return [
    'HEADER' => 'Agents Overview',
    'DESCRIPTION' => 'Easily track agent performance with key metrics such as conversations, response times, resolution times, and resolved cases. Click an agent\'s name to learn more.',
    'LOADING_CHART' => 'Loading chart data...',
    'NO_ENOUGH_DATA' => 'We\'ve not received enough data points to generate report, Please try again later.',
    'DOWNLOAD_AGENT_REPORTS' => 'Download agent reports',
    'FILTER_DROPDOWN_LABEL' => 'Select Agent',
    'FILTERS' => [
        'INPUT_PLACEHOLDER' => [
            'AGENTS' => 'Search agents',
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
