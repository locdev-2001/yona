<?php

namespace App\Services\Email;

/**
 * Thử đăng nhập máy chủ thư ngay khi lưu cấu hình. Tách thành giao kèo để test thay
 * bằng bản giả (tests/Support/FakeMailServerProbe.php) — test không ra Internet.
 */
interface MailServerProbe
{
    /** @throws MailServerException */
    public function checkImap(string $host, int $port, bool $ssl, string $username, ?string $password, bool $oauth = false): void;

    /** @throws MailServerException */
    public function checkSmtp(string $host, int $port, bool $implicitTls, string $username, ?string $password, bool $verifyPeer = true, bool $oauth = false): void;
}
