<?php

namespace App\Services\Email\OAuth;

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
