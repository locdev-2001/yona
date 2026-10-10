<?php

namespace App\Services\Email\Push;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

/**
 * Xác thực OIDC token (JWT RS256) mà Pub/Sub kèm theo mỗi lần đẩy: chữ ký theo khoá công
 * khai của Google, đúng nơi cấp, đúng audience, đúng service account đã cấu hình, còn hạn.
 * Khoá công khai cache theo giờ; gặp `kid` lạ thì tải lại một lần (Google xoay khoá).
 */
class GooglePubSubTokenVerifier
{
    private const CERTS_URL = 'https://www.googleapis.com/oauth2/v1/certs';

    private const CERTS_CACHE_KEY = 'google_oidc_certs';

    private const CERTS_CACHE_SECONDS = 3600;

    private const ISSUERS = ['accounts.google.com', 'https://accounts.google.com'];

    private const CLOCK_SKEW_SECONDS = 60;

    public function verify(string $jwt): bool
    {
        $audience = config('services.google_mail.pubsub_audience');
        $serviceAccount = config('services.google_mail.pubsub_service_account');

        if (blank($audience) || blank($serviceAccount)) {
            return false;
        }

        $parts = explode('.', $jwt);

        if (count($parts) !== 3) {
            return false;
        }

        [$encodedHeader, $encodedClaims, $encodedSignature] = $parts;
        $header = $this->decodeJson($encodedHeader);
        $claims = $this->decodeJson($encodedClaims);
        $signature = $this->base64UrlDecode($encodedSignature);

        if ($header === null || $claims === null || $signature === null || ($header['alg'] ?? null) !== 'RS256') {
            return false;
        }

        $certificate = $this->certificate((string) ($header['kid'] ?? ''));

        if ($certificate === null
            || openssl_verify($encodedHeader.'.'.$encodedClaims, $signature, $certificate, OPENSSL_ALGO_SHA256) !== 1) {
            return false;
        }

        return $this->claimsValid($claims, (string) $audience, (string) $serviceAccount);
    }

    /** @param  array<string, mixed>  $claims */
    private function claimsValid(array $claims, string $audience, string $serviceAccount): bool
    {
        $now = time();

        return in_array($claims['iss'] ?? null, self::ISSUERS, true)
            && ($claims['aud'] ?? null) === $audience
            && strcasecmp((string) ($claims['email'] ?? ''), $serviceAccount) === 0
            && ($claims['email_verified'] ?? false) === true
            && is_numeric($claims['exp'] ?? null) && (int) $claims['exp'] + self::CLOCK_SKEW_SECONDS >= $now
            && (! is_numeric($claims['iat'] ?? null) || (int) $claims['iat'] - self::CLOCK_SKEW_SECONDS <= $now);
    }

    private function certificate(string $keyId): ?string
    {
        if ($keyId === '') {
            return null;
        }

        $certificates = Cache::get(self::CERTS_CACHE_KEY);

        if (! is_array($certificates) || ! isset($certificates[$keyId])) {
            $certificates = $this->fetchCertificates();
        }

        $certificate = $certificates[$keyId] ?? null;

        return is_string($certificate) ? $certificate : null;
    }

    /** @return array<string, string> */
    private function fetchCertificates(): array
    {
        try {
            $response = Http::timeout(10)->get(self::CERTS_URL);
        } catch (ConnectionException) {
            return [];
        }

        $certificates = $response->successful() ? $response->json() : null;

        if (! is_array($certificates) || $certificates === []) {
            return [];
        }

        Cache::put(self::CERTS_CACHE_KEY, $certificates, self::CERTS_CACHE_SECONDS);

        return $certificates;
    }

    /** @return array<string, mixed>|null */
    private function decodeJson(string $segment): ?array
    {
        $decoded = json_decode((string) $this->base64UrlDecode($segment), true);

        return is_array($decoded) ? $decoded : null;
    }

    private function base64UrlDecode(string $segment): ?string
    {
        $decoded = base64_decode(strtr($segment, '-_', '+/'), true);

        return $decoded === false ? null : $decoded;
    }
}
