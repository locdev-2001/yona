<?php

// Nguồn: Chatwoot v4.17.1 dashboard/i18n/locale/en/settings.json — namespace BILLING_SETTINGS.

return [
    'TITLE' => 'Billing',
    'DESCRIPTION' => 'Manage your subscription here, upgrade your plan and get more for your team.',
    'CURRENT_PLAN' => [
        'TITLE' => 'Current Plan',
        'PLAN_NOTE' => 'You are currently subscribed to the **{plan}** plan with **{quantity}** licenses',
        'SEAT_COUNT' => 'Number of seats',
        'RENEWS_ON' => 'Renews on',
        'CURRENCY' => 'Currency',
    ],
    'CURRENCY' => [
        'SELECT' => [
            'TITLE' => 'Choose your billing currency',
            'DESCRIPTION' => 'Select the currency you\'d like to be billed in. This can\'t be changed once your subscription is created.',
        ],
        'OPTIONS' => [
            'USD' => 'US Dollar (USD)',
            'BRL' => 'Brazilian Real (BRL)',
        ],
    ],
    'VIEW_PRICING' => 'View Pricing',
    'MANAGE_SUBSCRIPTION' => [
        'TITLE' => 'Manage your subscription',
        'DESCRIPTION' => 'View your previous invoices, edit your billing details, or cancel your subscription.',
        'BUTTON_TXT' => 'Go to the billing portal',
    ],
    'CAPTAIN' => [
        'TITLE' => 'Captain',
        'DESCRIPTION' => 'Manage usage and credits for Captain AI.',
        'BUTTON_TXT' => 'Buy more credits',
        'DOCUMENTS' => 'Documents',
        'RESPONSES' => 'Credits',
        'UPGRADE' => 'Captain is not available on the free plan, upgrade now to get access to assistants, copilot and more.',
        'REFRESH_CREDITS' => 'Refresh',
    ],
    'CHAT_WITH_US' => [
        'TITLE' => 'Need help?',
        'DESCRIPTION' => 'Do you face any issues in billing? We are here to help.',
        'BUTTON_TXT' => 'Chat with us',
    ],
    'NO_BILLING_USER' => 'Your billing account is being configured. Please refresh the page and try again.',
    'TOPUP' => [
        'BUY_CREDITS' => 'Buy more credits',
        'MODAL_TITLE' => 'Buy AI Credits',
        'MODAL_DESCRIPTION' => 'Purchase additional credits for Captain AI.',
        'CREDITS' => 'CREDITS',
        'ONE_TIME' => 'one-time',
        'POPULAR' => 'Most Popular',
        'NOTE_TITLE' => 'Note:',
        'NOTE_DESCRIPTION' => 'Credits are added immediately and expire in 6 months. An active subscription is required to use credits. Purchased credits are consumed after your monthly plan credits.',
        'CANCEL' => 'Cancel',
        'PURCHASE' => 'Purchase Credits',
        'LOADING' => 'Loading options...',
        'FETCH_ERROR' => 'Failed to load credit options. Please try again.',
        'RETRY' => 'Retry',
        'PURCHASE_ERROR' => 'Failed to process purchase. Please try again.',
        'PURCHASE_SUCCESS' => 'Successfully added {credits} credits to your account',
        'CONFIRM' => [
            'TITLE' => 'Confirm Purchase',
            'DESCRIPTION' => 'You are about to purchase {credits} credits for {amount}.',
            'INSTANT_DEDUCTION_NOTE' => 'Your saved card will be charged immediately upon confirmation.',
            'GO_BACK' => 'Go Back',
            'CONFIRM_PURCHASE' => 'Confirm Purchase',
        ],
    ],
];
