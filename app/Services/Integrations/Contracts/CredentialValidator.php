<?php

namespace App\Services\Integrations\Contracts;

// Hợp đồng trung tính cho việc kiểm chứng thông tin đăng nhập của một ứng dụng
// tích hợp trước khi lưu hook. Ứng dụng nào cần kiểm thì khai khoá
// `credential_validator` trong config/integration/apps.php — lõi không biết tên app.
interface CredentialValidator
{
    /** @param array<string, mixed> $settings Trả về câu lỗi, hoặc null nếu hợp lệ. */
    public function validate(array $settings): ?string;
}
