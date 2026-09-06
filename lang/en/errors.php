<?php

// Port từ config/locales/en.yml khối `errors:` (chuỗi backend, không có
// namespace FE tương ứng) — cùng lối với lang/en/contacts.php.
return [
    'webhook' => [
        'invalid' => 'Invalid events',
    ],
    'reports' => [
        'date_range_too_long' => 'Date range cannot exceed 6 months',
    ],
    'conversations' => [
        'resolved' => 'Conversation is resolved and does not accept new messages',
    ],
    'custom_filters' => [
        'number_of_records' => 'Limit reached. The maximum number of allowed custom filters for a user per account is 1000.',
        'invalid_attribute' => 'Invalid attribute key - [:key]. The key should be one of [:allowed_keys] or a custom attribute defined in the account.',
        'invalid_operator' => 'Invalid operator. The allowed operators for :attribute_name are [:allowed_keys].',
        'invalid_query_operator' => 'Query operator must be either "AND" or "OR".',
        'invalid_value' => 'Invalid value. The values provided for :attribute_name are invalid',
    ],
    'mfa' => [
        'already_enabled' => 'MFA is already enabled',
        'not_enabled' => 'MFA is not enabled',
        'invalid_code' => 'Invalid verification code',
        'invalid_backup_code' => 'Invalid backup code',
        'invalid_token' => 'Invalid or expired MFA token',
        'invalid_credentials' => 'Invalid credentials or verification code',
        'feature_unavailable' => 'MFA feature is not available. Please configure encryption keys.',
    ],
    // Chatwoot đặt ở `profile_settings.sessions` — chuyển vào đây để không đụng
    // namespace PROFILE_SETTINGS của bundle FE (lang/en/profile_settings.php).
    'sessions' => [
        'cannot_revoke_current' => 'You cannot revoke the current session.',
    ],
    'contacts' => [
        'import' => [
            'failed' => 'File is blank',
        ],
        'export' => [
            'success' => 'We will notify you once contacts export file is ready to view.',
        ],
    ],
    'custom_attribute_definition' => [
        'attribute_key_format' => 'must only contain letters, numbers, underscores, hyphens, and dots',
        'key_conflict' => 'The provided key is not allowed as it might conflict with default attributes.',
    ],
];
