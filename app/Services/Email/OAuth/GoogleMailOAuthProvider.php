<?php

namespace App\Services\Email\OAuth;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;

/** Gmail/Google Workspace qua OAuth — khoá bằng `services.google_mail.enabled` tới khi Google duyệt scope. */
class GoogleMailOAuthProvider extends EmailOAuthProvider
{
    public function key(): string
    {
        return 'google';
    }

    public function available(): bool
    {
        return (bool) config('services.google_mail.enabled')
            && filled($this->clientId())
            && filled($this->clientSecret());
    }

    private const SEND_AS_ENDPOINT = 'https://gmail.googleapis.com/gmail/v1/users/me/settings/sendAs';

    // Tên ở mục "Gửi thư dưới tên" của Gmail (địa chỉ chính), đúng tên người nhận thấy khi gửi thẳng từ Gmail.
    public function senderDisplayName(string $accessToken, string $email): ?string
    {
        try {
            $response = Http::withToken($accessToken)->timeout(5)->get(self::SEND_AS_ENDPOINT);
        } catch (ConnectionException) {
            return null;
        }

        $aliases = collect($response->successful() ? $response->json('sendAs', []) : []);
        $primary = $aliases->firstWhere('isPrimary', true)
            ?? $aliases->first(fn ($alias) => strcasecmp((string) ($alias['sendAsEmail'] ?? ''), $email) === 0);

        $name = trim((string) ($primary['displayName'] ?? ''));

        return $name === '' ? null : $name;
    }

    public function scope(): string
    {
        return 'https://mail.google.com/ email openid';
    }

    public function imapHost(): string
    {
        return 'imap.gmail.com';
    }

    public function smtpHost(): string
    {
        return 'smtp.gmail.com';
    }

    protected function configKey(): string
    {
        return 'google_mail';
    }

    protected function authorizeEndpoint(): string
    {
        return 'https://accounts.google.com/o/oauth2/v2/auth';
    }

    protected function tokenEndpoint(): string
    {
        return 'https://oauth2.googleapis.com/token';
    }

    // offline + consent: Google chỉ trả refresh token khi người dùng đồng ý lại.
    protected function extraAuthorizeParameters(): array
    {
        return ['access_type' => 'offline', 'prompt' => 'consent', 'include_granted_scopes' => 'true'];
    }
}
