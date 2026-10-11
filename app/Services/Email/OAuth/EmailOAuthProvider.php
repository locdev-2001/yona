<?php

namespace App\Services\Email\OAuth;

use App\Services\Email\MailServerException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;

/**
 * Nhà cung cấp hộp thư nối bằng OAuth (authorization code + refresh token). Mỗi nhà
 * cung cấp khai endpoint, scope và máy chủ thư; phần trao đổi token dùng chung.
 */
abstract class EmailOAuthProvider
{
    /** Khoá lưu ở `channel_email.provider` và trên URL kết nối. */
    abstract public function key(): string;

    abstract public function available(): bool;

    abstract protected function authorizeEndpoint(): string;

    abstract protected function tokenEndpoint(): string;

    abstract public function scope(): string;

    abstract public function imapHost(): string;

    abstract public function smtpHost(): string;

    /** @return array<string, string> tham số riêng của nhà cung cấp trên URL ủy quyền */
    protected function extraAuthorizeParameters(): array
    {
        return [];
    }

    protected function clientId(): string
    {
        return (string) config("services.{$this->configKey()}.client_id");
    }

    protected function clientSecret(): string
    {
        return (string) config("services.{$this->configKey()}.client_secret");
    }

    abstract protected function configKey(): string;

    /** Tên hiển thị chủ hộp thư đã đặt ở nhà cung cấp, để thư gửi đi giữ đúng tên đó. Không lấy được thì null. */
    public function senderDisplayName(string $accessToken, string $email): ?string
    {
        return null;
    }

    public function authorizationUrl(string $state, string $redirectUri): string
    {
        return $this->authorizeEndpoint().'?'.http_build_query([
            'client_id' => $this->clientId(),
            'redirect_uri' => $redirectUri,
            'response_type' => 'code',
            'scope' => $this->scope(),
            'state' => $state,
            ...$this->extraAuthorizeParameters(),
        ], '', '&', PHP_QUERY_RFC3986);
    }

    /** @throws EmailOAuthException */
    public function exchangeCode(string $code, string $redirectUri): EmailOAuthTokens
    {
        return $this->requestToken([
            'grant_type' => 'authorization_code',
            'code' => $code,
            'redirect_uri' => $redirectUri,
        ]);
    }

    /** @throws MailServerException  refresh token bị thu hồi/hết hạn thì là lỗi xác thực */
    public function refresh(string $refreshToken): EmailOAuthTokens
    {
        try {
            return $this->requestToken([
                'grant_type' => 'refresh_token',
                'refresh_token' => $refreshToken,
            ]);
        } catch (EmailOAuthException $exception) {
            throw new MailServerException(
                $exception->revoked ? MailServerException::AUTHENTICATION : MailServerException::CONNECTION,
                'imap',
                $this->imapHost(),
                993,
                $exception,
            );
        }
    }

    /**
     * @param  array<string, string>  $parameters
     *
     * @throws EmailOAuthException
     */
    private function requestToken(array $parameters): EmailOAuthTokens
    {
        try {
            $response = Http::asForm()->timeout(20)->post($this->tokenEndpoint(), [
                'client_id' => $this->clientId(),
                'client_secret' => $this->clientSecret(),
                'scope' => $this->scope(),
                ...$parameters,
            ]);
        } catch (ConnectionException $exception) {
            throw new EmailOAuthException('token endpoint unreachable: '.$exception->getMessage(), false, $exception);
        }

        $tokens = $response->successful() ? EmailOAuthTokens::fromTokenResponse((array) $response->json()) : null;

        if ($tokens === null || $tokens->accessToken === '') {
            $error = (string) $response->json('error', 'unknown_error');

            // invalid_grant: refresh token bị thu hồi/hết hạn/đổi mật khẩu — phải kết nối lại.
            throw new EmailOAuthException("token request failed: {$error}", in_array($error, ['invalid_grant', 'unauthorized_client', 'invalid_client'], true) || $response->status() === 401);
        }

        return $tokens;
    }
}
