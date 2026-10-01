<?php

namespace Tests\Support;

use App\Services\Email\MailServerException;
use App\Services\Email\MailServerProbe;

/**
 * Máy chủ thư giả cho test: mặc định nhận mọi đăng nhập; `rejectImap()`/`rejectSmtp()`
 * cho lần thử sau báo lỗi. Ghi lại từng lần thử để test kiểm đã gọi đúng máy chủ.
 */
final class FakeMailServerProbe implements MailServerProbe
{
    /** @var list<array<string, mixed>> */
    public array $attempts = [];

    private ?string $imapFailure = null;

    private ?string $smtpFailure = null;

    public function rejectImap(string $reason = MailServerException::AUTHENTICATION): self
    {
        $this->imapFailure = $reason;

        return $this;
    }

    public function rejectSmtp(string $reason = MailServerException::AUTHENTICATION): self
    {
        $this->smtpFailure = $reason;

        return $this;
    }

    public function checkImap(string $host, int $port, bool $ssl, string $username, ?string $password, bool $oauth = false): void
    {
        $this->attempts[] = ['protocol' => 'imap', ...compact('host', 'port', 'ssl', 'username', 'password', 'oauth')];

        if ($this->imapFailure !== null) {
            throw new MailServerException($this->imapFailure, 'imap', $host, $port);
        }
    }

    public function checkSmtp(string $host, int $port, bool $implicitTls, string $username, ?string $password, bool $verifyPeer = true, bool $oauth = false): void
    {
        $this->attempts[] = ['protocol' => 'smtp', ...compact('host', 'port', 'implicitTls', 'username', 'password', 'oauth')];

        if ($this->smtpFailure !== null) {
            throw new MailServerException($this->smtpFailure, 'smtp', $host, $port);
        }
    }
}
