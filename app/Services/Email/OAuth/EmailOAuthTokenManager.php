<?php

namespace App\Services\Email\OAuth;

use App\Models\Channel\Email;
use App\Services\Email\MailServerException;
use Carbon\CarbonImmutable;

/**
 * Access token còn hạn cho IMAP/SMTP (XOAUTH2) của hộp thư nối bằng OAuth: sắp hết hạn
 * thì làm mới bằng refresh token rồi lưu lại. Refresh token hỏng/bị thu hồi thì kênh bị
 * đánh dấu cần kết nối lại và ném lỗi xác thực.
 */
class EmailOAuthTokenManager
{
    private const REFRESH_MARGIN_SECONDS = 300;

    /** @throws MailServerException */
    public function accessToken(Email $channel): string
    {
        $provider = EmailOAuthProviders::forChannel($channel);
        $config = $channel->provider_config ?? [];
        $accessToken = (string) ($config['access_token'] ?? '');
        $expiresAt = isset($config['expires_at']) ? CarbonImmutable::parse($config['expires_at']) : null;

        if ($accessToken !== '' && $expiresAt !== null && $expiresAt->subSeconds(self::REFRESH_MARGIN_SECONDS)->isFuture()) {
            return $accessToken;
        }

        $refreshToken = (string) ($config['refresh_token'] ?? '');

        if ($provider === null || $refreshToken === '') {
            $channel->promptReauthorization();

            throw new MailServerException(MailServerException::AUTHENTICATION, 'imap', (string) $channel->imap_address, (int) $channel->imap_port);
        }

        try {
            $tokens = $provider->refresh($refreshToken);
        } catch (MailServerException $exception) {
            $channel->recordConnectionFailure($exception);

            throw $exception;
        }

        $this->store($channel, $tokens);

        return $tokens->accessToken;
    }

    public function store(Email $channel, EmailOAuthTokens $tokens): void
    {
        $config = $channel->provider_config ?? [];

        $channel->forceFill(['provider_config' => [
            ...$config,
            'access_token' => $tokens->accessToken,
            // Google không trả refresh token mới khi làm mới: giữ cái cũ.
            'refresh_token' => $tokens->refreshToken ?? ($config['refresh_token'] ?? null),
            'expires_at' => $tokens->expiresAt->toIso8601String(),
        ]]);

        if ($channel->exists) {
            $channel->save();
        }
    }
}
