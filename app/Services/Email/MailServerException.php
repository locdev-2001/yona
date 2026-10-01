<?php

namespace App\Services\Email;

use RuntimeException;
use Throwable;
use Webklex\PHPIMAP\Exceptions\AuthFailedException;
use Webklex\PHPIMAP\Exceptions\ConnectionFailedException;

/**
 * Máy chủ thư (IMAP/SMTP) không cho vào: sai mật khẩu (`auth`) hay không tới được
 * máy chủ (`connection`). Lý do + máy chủ đủ để dựng lời nhắn theo ngôn ngữ người xem.
 */
final class MailServerException extends RuntimeException
{
    public const AUTHENTICATION = 'auth';

    public const CONNECTION = 'connection';

    private const AUTH_HINTS = [
        'authenticationfailed', 'authenticat', 'invalid credentials', 'login failed',
        'username and password not accepted', 'invalid_grant', '535',
    ];

    public function __construct(
        public readonly string $reason,
        public readonly string $protocol,
        public readonly string $host,
        public readonly int $port,
        ?Throwable $previous = null,
    ) {
        parent::__construct("[{$protocol}] {$reason} {$host}:{$port}".($previous ? ' - '.$previous->getMessage() : ''), 0, $previous);
    }

    public static function fromImap(Throwable $exception, string $host, int $port): self
    {
        if ($exception instanceof self) {
            return $exception;
        }

        $reason = match (true) {
            $exception instanceof AuthFailedException => self::AUTHENTICATION,
            $exception instanceof ConnectionFailedException => self::CONNECTION,
            self::mentionsAuthentication($exception) => self::AUTHENTICATION,
            default => self::CONNECTION,
        };

        return new self($reason, 'imap', $host, $port, $exception);
    }

    public static function fromSmtp(Throwable $exception, string $host, int $port): self
    {
        if ($exception instanceof self) {
            return $exception;
        }

        $reason = self::mentionsAuthentication($exception) ? self::AUTHENTICATION : self::CONNECTION;

        return new self($reason, 'smtp', $host, $port, $exception);
    }

    public function isAuthentication(): bool
    {
        return $this->reason === self::AUTHENTICATION;
    }

    /** @return array{reason: string, protocol: string, host: string, port: int} */
    public function toArray(): array
    {
        return ['reason' => $this->reason, 'protocol' => $this->protocol, 'host' => $this->host, 'port' => $this->port];
    }

    public function userMessage(): string
    {
        return self::messageFor($this->toArray());
    }

    /** @param  array{reason?: string, protocol?: string, host?: string, port?: int}  $failure */
    public static function messageFor(array $failure): string
    {
        $host = (string) ($failure['host'] ?? '');
        $params = [
            'protocol' => strtoupper((string) ($failure['protocol'] ?? 'imap')),
            'host' => $host,
            'port' => (int) ($failure['port'] ?? 0),
        ];

        if (($failure['reason'] ?? null) !== self::AUTHENTICATION) {
            return __('inbox_mgmt.CONNECTION_CHECK.CONNECTION_FAILED', $params);
        }

        $message = __('inbox_mgmt.CONNECTION_CHECK.AUTH_FAILED', $params);

        return match (true) {
            EmailProviderPresets::isGmailHost($host) => $message.' '.__('inbox_mgmt.CONNECTION_CHECK.GMAIL_APP_PASSWORD', ['url' => EmailProviderPresets::GMAIL_APP_PASSWORD_URL]),
            EmailProviderPresets::isMicrosoftHost($host) => $message.' '.__('inbox_mgmt.CONNECTION_CHECK.OUTLOOK_APP_PASSWORD'),
            default => $message,
        };
    }

    private static function mentionsAuthentication(Throwable $exception): bool
    {
        $text = strtolower($exception->getMessage().' '.$exception->getPrevious()?->getMessage());

        if (str_contains($text, 'could not be established') || str_contains($text, 'connection setup failed')) {
            return false;
        }

        foreach (self::AUTH_HINTS as $hint) {
            if (str_contains($text, $hint)) {
                return true;
            }
        }

        return false;
    }
}
