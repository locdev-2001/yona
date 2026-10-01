<?php

namespace App\Services\Email\OAuth;

/** Outlook/Microsoft 365 qua OAuth (Microsoft identity platform v2). */
class MicrosoftMailOAuthProvider extends EmailOAuthProvider
{
    public function key(): string
    {
        return 'microsoft';
    }

    public function available(): bool
    {
        return filled($this->clientId()) && filled($this->clientSecret());
    }

    public function scope(): string
    {
        return 'https://outlook.office.com/IMAP.AccessAsUser.All https://outlook.office.com/SMTP.Send offline_access email openid';
    }

    public function imapHost(): string
    {
        return 'outlook.office365.com';
    }

    public function smtpHost(): string
    {
        return 'smtp.office365.com';
    }

    protected function configKey(): string
    {
        return 'microsoft_mail';
    }

    protected function authorizeEndpoint(): string
    {
        return "https://login.microsoftonline.com/{$this->tenant()}/oauth2/v2.0/authorize";
    }

    protected function tokenEndpoint(): string
    {
        return "https://login.microsoftonline.com/{$this->tenant()}/oauth2/v2.0/token";
    }

    protected function extraAuthorizeParameters(): array
    {
        return ['response_mode' => 'query', 'prompt' => 'select_account'];
    }

    private function tenant(): string
    {
        return (string) (config('services.microsoft_mail.tenant') ?: 'common');
    }
}
