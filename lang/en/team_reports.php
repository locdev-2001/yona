<?php

// Port từ dashboard/i18n/locale/en/report.json (khối TEAM_REPORTS).
// Bỏ DATE_RANGE: mảng khóa số, i18n:generate từ chối; code dùng constants.ts thay thế.
return [
    'HEADER' => 'Team Overview',
    'DESCRIPTION' => 'Get a snapshot of your team\'s performance with essential metrics, including conversations, response times, resolution times, and resolved cases. Click a team name for more details.',
    'LOADING_CHART' => 'Loading chart data...',
    'NO_ENOUGH_DATA' => 'We\'ve not received enough data points to generate report, Please try again later.',
    'DOWNLOAD_TEAM_REPORTS' => 'Download team reports',
    'FILTER_DROPDOWN_LABEL' => 'Select Team',
    'FILTERS' => [
        'ADD_FILTER' => 'Add filter',
        'CLEAR_ALL' => 'Clear all',
        'NO_FILTER' => 'No filters available',
        'INPUT_PLACEHOLDER' => [
            'TEAMS' => 'Search teams',
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
