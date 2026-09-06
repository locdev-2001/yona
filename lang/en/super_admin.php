<?php

// Port từ khối `super_admin:` trong refs/chatwoot/config/locales/en.yml (phần
// CE — bỏ `captain_model_overrides` là enterprise). Console quản trị của bản
// gốc chỉ có tiếng Anh (gem Administrate không đa ngữ), nên đây là nguồn duy
// nhất cho các chuỗi phía máy chủ của khu /super_admin.
return [
    'account_suspension' => [
        'categories' => [
            'spam' => 'Spam',
            'non_payment' => 'Non-payment',
            'other' => 'Other',
        ],
        'form' => [
            'category' => 'Suspension category',
            'category_prompt' => 'Select a category',
            'reason' => 'Suspension reason',
            'reason_hint' => 'Enter a reason of up to 256 characters.',
        ],
        'history' => [
            'suspended_at' => 'Suspended at',
            'category' => 'Category',
            'reason' => 'Reason',
            'empty' => 'No suspension history recorded.',
        ],
    ],
    'users' => [
        'resend_confirmation' => [
            'button' => 'Resend confirmation email',
            'sent' => 'Confirmation email sent.',
            'already_confirmed' => 'User is already confirmed.',
        ],
    ],
];
