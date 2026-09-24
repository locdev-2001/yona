<?php

// Không có GROUP_BY_*_OPTIONS: danh sách chỉ số nguyên, code dùng constants.ts.
return [
    'HEADER' => 'Conversations',
    'LOADING_CHART' => 'Loading chart data...',
    'NO_ENOUGH_DATA' => 'We\'ve not received enough data points to generate report, Please try again later.',
    'DOWNLOAD_CONVERSATION_REPORTS' => 'Download conversation reports',
    'DATA_FETCHING_FAILED' => 'Failed to fetch data, please try again later.',
    'SUMMARY_FETCHING_FAILED' => 'Failed to fetch summary, please try again later.',
    'METRICS' => [
        'CONVERSATIONS' => [
            'NAME' => 'Conversations',
            'DESC' => '( Total )',
        ],
        'INCOMING_MESSAGES' => [
            'NAME' => 'Messages received',
            'DESC' => '( Total )',
        ],
        'OUTGOING_MESSAGES' => [
            'NAME' => 'Messages sent',
            'DESC' => '( Total )',
        ],
        'FIRST_RESPONSE_TIME' => [
            'NAME' => 'First Response Time',
            'DESC' => '( Avg )',
            'INFO_TEXT' => 'Total number of conversations used for computation:',
            'TOOLTIP_DESCRIPTION' => 'Based on {count} conversation | Based on {count} conversations',
            'TOOLTIP_TEXT' => 'First Response Time is {metricValue} (based on {conversationCount} conversations)',
        ],
        'RESOLUTION_TIME' => [
            'NAME' => 'Resolution Time',
            'DESC' => '( Avg )',
            'INFO_TEXT' => 'Total number of conversations used for computation:',
            'TOOLTIP_DESCRIPTION' => 'Based on {count} conversation | Based on {count} conversations',
            'TOOLTIP_TEXT' => 'Resolution Time is {metricValue} (based on {conversationCount} conversations)',
        ],
        'RESOLUTION_COUNT' => [
            'NAME' => 'Resolution Count',
            'DESC' => '( Total )',
        ],
        'BOT_RESOLUTION_COUNT' => [
            'NAME' => 'Resolution Count',
            'DESC' => '( Total )',
        ],
        'BOT_HANDOFF_COUNT' => [
            'NAME' => 'Handoff Count',
            'DESC' => '( Total )',
        ],
        'REPLY_TIME' => [
            'NAME' => 'Customer waiting time',
            'TOOLTIP_LABEL' => 'Waiting time',
            'TOOLTIP_DESCRIPTION' => 'Based on {count} reply | Based on {count} replies',
            'TOOLTIP_TEXT' => 'Waiting time is {metricValue} (based on {conversationCount} replies)',
            'DESC' => '',
        ],
    ],
    'DATE_RANGE_OPTIONS' => [
        'LAST_7_DAYS' => 'Last 7 days',
        'LAST_14_DAYS' => 'Last 14 days',
        'LAST_30_DAYS' => 'Last 30 days',
        'THIS_MONTH' => 'This month',
        'LAST_MONTH' => 'Last month',
        'LAST_3_MONTHS' => 'Last 3 months',
        'LAST_6_MONTHS' => 'Last 6 months',
        'LAST_YEAR' => 'Last year',
        'CUSTOM_DATE_RANGE' => 'Custom date range',
    ],
    'CUSTOM_DATE_RANGE' => [
        'CONFIRM' => 'Apply',
        'PLACEHOLDER' => 'Select date range',
    ],
    'GROUP_BY_FILTER_DROPDOWN_LABEL' => 'Group By',
    'DURATION_FILTER_LABEL' => 'Duration',
    'GROUPING_OPTIONS' => [
        'DAY' => 'Day',
        'WEEK' => 'Week',
        'MONTH' => 'Month',
        'YEAR' => 'Year',
    ],
    'BUSINESS_HOURS' => 'Business Hours',
    'FILTER_ACTIONS' => [
        'CLEAR_FILTER' => 'Clear filter',
        'EMPTY_LIST' => 'No results found',
    ],
    'DRILLDOWN' => [
        'TITLE' => '{metric} details',
        'RESULT_COUNT_CONVERSATION' => '{count} conversation | {count} conversations',
        'RESULT_COUNT_MESSAGE' => '{count} message | {count} messages',
        'EMPTY' => 'No records found for this bar.',
        'ERROR' => 'Could not load records. Please try again.',
        'ADMIN_ONLY' => 'Only administrators can drill down into report records.',
        'LOAD_MORE' => 'Load more',
        'PREVIOUS_BUCKET' => 'Previous bar',
        'NEXT_BUCKET' => 'Next bar',
        'UNKNOWN_CONTACT' => 'Unknown contact',
        'UNKNOWN_INBOX' => 'Unknown inbox',
        'UNASSIGNED_AGENT' => 'Unassigned',
        'NO_MESSAGE_CONTENT' => 'No message content',
        'MESSAGE_CREATED_AT' => 'Message created at {time}',
        'EVENT_OCCURRED_AT' => 'Event occurred at {time}',
        'INCOMING_MESSAGE' => 'Incoming message',
        'OUTGOING_MESSAGE' => 'Outgoing message',
    ],
    'PAGINATION' => [
        'RESULTS' => 'Showing {start} to {end} of {total} results',
        'PER_PAGE_TEMPLATE' => '{size} / page',
    ],
];
