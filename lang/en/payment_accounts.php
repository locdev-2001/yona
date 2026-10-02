<?php

// Settings / Account / Bank transfer (resources/js/dashboard/settings/paymentAccounts).

return [
    'HEADER' => 'Bank transfer',
    'DESCRIPTION' => 'Bank accounts used when sending a bank transfer card in a conversation. Customers pay straight into your account, Yona never holds the money.',
    'LOADING' => 'Loading accounts',
    'LIST' => [
        'TITLE' => 'Receiving accounts',
        'EMPTY' => 'No receiving account yet.',
        'ADD' => 'Add account',
        'DEFAULT_BADGE' => 'Default',
    ],
    'FORM' => [
        'EDIT' => 'Edit',
        'DELETE' => 'Delete',
        'SAVE' => 'Save changes',
        'CREATE' => 'Add account',
        'CANCEL' => 'Cancel',
        'BANK' => [
            'LABEL' => 'Bank',
            'PLACEHOLDER' => 'Choose a bank',
            'SEARCH_PLACEHOLDER' => 'Search banks...',
            'EMPTY' => 'No bank found',
        ],
        'ACCOUNT_NUMBER' => [
            'LABEL' => 'Account number',
            'PLACEHOLDER' => 'Digits only',
            'INVALID' => 'Account number must be 4-30 digits.',
        ],
        'ACCOUNT_NAME' => [
            'LABEL' => 'Account holder',
            'PLACEHOLDER' => 'HKD GOM MOC',
            'HINT' => 'Uppercase without diacritics, exactly as the bank shows it, so customers can check it.',
        ],
        'MEMO_TEMPLATE' => [
            'LABEL' => 'Transfer memo',
            'HINT' => 'Customers see this in their banking app (up to 25 characters, no diacritics). Add {ma_hoi_thoai} to include the conversation code for reconciliation.',
        ],
        'IS_DEFAULT' => [
            'LABEL' => 'Set as default account',
        ],
        'ALLOW_ALL_AGENTS' => [
            'LABEL' => 'Let every agent send bank transfer cards in conversations',
        ],
    ],
    'ADD' => [
        'TITLE' => 'Add account',
        'SUCCESS' => 'Account added',
        'ERROR' => 'Something went wrong, please try again',
    ],
    'EDIT' => [
        'TITLE' => 'Edit account',
        'SUCCESS' => 'Changes saved',
        'ERROR' => 'Something went wrong, please try again',
    ],
    'DELETE' => [
        'SUCCESS' => 'Account deleted',
        'ERROR' => 'Something went wrong, please try again',
        'CONFIRM' => [
            'TITLE' => 'Delete account?',
            'MESSAGE' => 'Agents will no longer be able to send bank transfer cards with this account:',
            'YES' => 'Yes, delete',
            'NO' => 'No, keep it',
        ],
    ],
    'PREVIEW' => [
        'TITLE' => 'What customers see',
        'EMPTY' => 'Save the account to see its QR code.',
        'QR_ALT' => 'Bank transfer QR code',
        'BANK' => 'Bank',
        'ACCOUNT_NUMBER' => 'Account number',
        'NOTE' => 'The QR code follows the VietQR standard and scans with any banking app.',
    ],
];
