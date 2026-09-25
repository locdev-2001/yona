<?php

// Chuỗi riêng của màn bắt buộc cài đặt 2FA console quản trị
// (superadmin/pages/MfaSetup.tsx) — phần còn lại của wizard dùng chung
// lang/{locale}/mfa_settings.php với agent.

return [
    'REQUIRED_TITLE' => 'Two-factor authentication required',
    'REQUIRED_DESCRIPTION' => '{installationName} requires 2FA for the super admin console. Finish setup below to continue.',
    'START_ERROR' => 'Could not start 2FA setup.',
    'INVALID_CODE' => 'Invalid code, try again.',
];
