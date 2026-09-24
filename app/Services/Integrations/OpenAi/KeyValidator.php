<?php

namespace App\Services\Integrations\OpenAi;

use App\Models\InstallationConfig;
use App\Services\Integrations\Contracts\CredentialValidator;
use Illuminate\Support\Facades\Http;
use Throwable;

// Gọi thẳng endpoint /v1/models của OpenAI để biết khoá còn dùng được không. Cắm vào
// HooksController qua config/integration/apps.php khoá `openai.credential_validator`.
class KeyValidator implements CredentialValidator
{
    private const TIMEOUT_SECONDS = 5;

    public function validate(array $settings): ?string
    {
        $apiKey = $settings['api_key'] ?? null;

        return self::isValid($apiKey) ? null : $this->invalidKeyMessage();
    }

    public static function isValid(?string $apiKey): bool
    {
        if (blank($apiKey)) {
            return false;
        }

        try {
            $response = Http::withToken($apiKey)
                ->timeout(self::TIMEOUT_SECONDS)
                ->connectTimeout(self::TIMEOUT_SECONDS)
                ->get(self::apiBase().'/models');

            return $response->status() !== 401;
        } catch (Throwable) {
            // Lỗi mạng/timeout coi như hợp lệ để không chặn việc lưu cài đặt
            // (đúng hành vi `rescue Faraday::Error` của bản gốc).
            return true;
        }
    }

    private static function apiBase(): string
    {
        $endpoint = InstallationConfig::valueOf('CAPTAIN_OPEN_AI_ENDPOINT') ?: 'https://api.openai.com/';

        return rtrim($endpoint, '/').'/v1';
    }

    // errors.openai.invalid_api_key CHƯA có trong lang/en/errors.php (nợ, xem
    // f6-notes-misc.md) — hardcode nguyên văn chuỗi bản gốc (config/locales/en.yml).
    private function invalidKeyMessage(): string
    {
        return __('errors.openai.invalid_api_key');
    }
}
