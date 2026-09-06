<?php

namespace App\Services\Integrations\Google;

use Illuminate\Support\Facades\Http;
use RuntimeException;

// Chưa có SDK google-cloud (composer không cài gói này — quyết định port dùng
// REST thay gRPC, xem note f6-notes-misc.md). Lấy access token bằng JWT bearer
// grant (RFC 7523) từ credentials service-account, dùng chung cho Dialogflow
// và Google Translate — một chỗ duy nhất, sửa gì cũng chỉ sửa ở đây.
class ServiceAccountToken
{
    private const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';

    private const SCOPE = 'https://www.googleapis.com/auth/cloud-platform';

    /**
     * @param  array<string, mixed>  $credentials  JSON service-account (client_email/private_key…).
     */
    public function fetch(array $credentials): string
    {
        $assertion = $this->buildAssertion($credentials);

        $response = Http::asForm()->post(self::TOKEN_ENDPOINT, [
            'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            'assertion' => $assertion,
        ]);

        if (! $response->successful() || blank($response->json('access_token'))) {
            throw new RuntimeException('Unable to obtain Google service account access token');
        }

        return $response->json('access_token');
    }

    /** @param  array<string, mixed>  $credentials */
    private function buildAssertion(array $credentials): string
    {
        $clientEmail = $credentials['client_email'] ?? null;
        $privateKey = $credentials['private_key'] ?? null;

        if (blank($clientEmail) || blank($privateKey)) {
            throw new RuntimeException('Service account credentials are missing client_email or private_key');
        }

        $now = time();

        $header = $this->base64UrlEncode(json_encode([
            'alg' => 'RS256',
            'typ' => 'JWT',
        ]));

        $claims = $this->base64UrlEncode(json_encode([
            'iss' => $clientEmail,
            'scope' => self::SCOPE,
            'aud' => self::TOKEN_ENDPOINT,
            'iat' => $now,
            'exp' => $now + 3600,
        ]));

        $signingInput = "{$header}.{$claims}";

        $signature = '';
        $signed = openssl_sign($signingInput, $signature, $privateKey, OPENSSL_ALGO_SHA256);

        if (! $signed) {
            throw new RuntimeException('Unable to sign Google service account JWT — invalid private key');
        }

        return "{$signingInput}.{$this->base64UrlEncode($signature)}";
    }

    private function base64UrlEncode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }
}
