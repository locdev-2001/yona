<?php

namespace App\Services\Integrations\Dialogflow;

use App\Models\Message;
use App\Services\Integrations\BotProcessorService;
use App\Services\Integrations\Google\ServiceAccountToken;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

// Bản gốc dùng gem gRPC `google-cloud-dialogflow`; chưa có SDK này trong composer
// nên gọi thẳng REST `detectIntent` (xem f6-notes-misc.md — Khác biệt cố ý).
class ProcessorService extends BotProcessorService
{
    private const SUPPORTED_LANGUAGE_CODES = [
        'ar', 'en-US', 'en-GB', 'es-ES', 'es-419', 'fr-FR', 'de-DE', 'pt-BR', 'pt-PT',
        'it-IT', 'ja-JP', 'ko-KR', 'zh-CN', 'zh-TW', 'hi-IN', 'ru-RU', 'nl-NL', 'pl-PL',
        'tr-TR', 'th-TH', 'vi-VN', 'id-ID',
    ];

    private const AUTO_LANGUAGE_CODE_MAP = [
        'ar' => 'ar', 'de' => 'de-DE', 'en' => 'en-US', 'es' => 'es-ES', 'fr' => 'fr-FR',
        'hi' => 'hi-IN', 'id' => 'id-ID', 'it' => 'it-IT', 'ja' => 'ja-JP', 'ko' => 'ko-KR',
        'nl' => 'nl-NL', 'pl' => 'pl-PL', 'pt' => 'pt-BR', 'ru' => 'ru-RU', 'th' => 'th-TH',
        'tr' => 'tr-TR', 'vi' => 'vi-VN', 'zh' => 'zh-CN',
    ];

    protected function getResponse(string $sessionId, string $content): mixed
    {
        $credentials = $this->hook->settings['credentials'] ?? null;

        if (blank($credentials)) {
            Log::warning("Account: {$this->hook->account_id} Hook: {$this->hook->id} credentials are not present.");

            return null;
        }

        return $this->detectIntent($sessionId, $content, $credentials);
    }

    protected function processResponse(Message $message, mixed $response): void
    {
        $fulfillmentMessages = $response['fulfillment_messages'] ?? $response['fulfillmentMessages'] ?? [];

        foreach ($fulfillmentMessages as $fulfillmentMessage) {
            $contentParams = $this->generateContentParams($fulfillmentMessage);

            if (filled($contentParams['action'] ?? null)) {
                $this->processAction($message, $contentParams['action']);
            } else {
                $this->createResponseMessage($message, $contentParams);
            }
        }
    }

    /** @return array<string, mixed> */
    private function generateContentParams(array $fulfillmentMessage): array
    {
        $text = $fulfillmentMessage['text']['text'][0] ?? null;

        if ($text !== null) {
            return ['content' => $text];
        }

        return $fulfillmentMessage['payload'] ?? [];
    }

    private function createResponseMessage(Message $message, array $contentParams): void
    {
        if ($contentParams === []) {
            return;
        }

        $conversation = $message->conversation;

        $conversation->messages()->create([
            ...$contentParams,
            'message_type' => Message::TYPE_OUTGOING,
            'account_id' => $conversation->account_id,
            'inbox_id' => $conversation->inbox_id,
        ]);
    }

    /** @param  array<string, mixed>  $credentials */
    private function detectIntent(string $sessionId, string $content, array $credentials): ?array
    {
        try {
            $accessToken = (new ServiceAccountToken)->fetch($credentials);
        } catch (\Throwable $error) {
            Log::warning("DialogFlow Error: (account-{$this->hook->account_id}, hook-{$this->hook->id}) {$error->getMessage()}");

            return null;
        }

        $endpoint = $this->dialogflowEndpoint();
        $session = $this->buildSessionPath($sessionId);

        $response = Http::withToken($accessToken)
            ->post("https://{$endpoint}/v2/{$session}:detectIntent", [
                'queryInput' => [
                    'text' => [
                        'text' => $content,
                        'languageCode' => $this->dialogflowLanguageCode(),
                    ],
                ],
            ]);

        if ($response->status() === 403) {
            Log::warning("DialogFlow Error: (account-{$this->hook->account_id}, hook-{$this->hook->id}) permission denied");
            $this->hook->disable();

            return null;
        }

        if (! $response->successful()) {
            Log::warning("DialogFlow Error: (account-{$this->hook->account_id}, hook-{$this->hook->id}) {$response->body()}");

            return null;
        }

        return $response->json('queryResult');
    }

    private function normalizedRegion(): string
    {
        $region = trim((string) ($this->hook->settings['region'] ?? ''));

        return $region !== '' ? $region : 'global';
    }

    private function dialogflowEndpoint(): string
    {
        $region = $this->normalizedRegion();

        return $region === 'global' ? 'dialogflow.googleapis.com' : "{$region}-dialogflow.googleapis.com";
    }

    private function buildSessionPath(string $sessionId): string
    {
        $projectId = $this->hook->settings['project_id'] ?? '';
        $region = $this->normalizedRegion();

        return $region === 'global'
            ? "projects/{$projectId}/agent/sessions/{$sessionId}"
            : "projects/{$projectId}/locations/{$region}/agent/sessions/{$sessionId}";
    }

    private function dialogflowLanguageCode(): string
    {
        $configured = trim((string) ($this->hook->settings['language_code'] ?? ''));

        if ($configured === '') {
            return 'en-US';
        }

        if ($configured !== 'auto') {
            return $configured;
        }

        $contactLanguage = $this->eventData['message']->conversation->contact?->additional_attributes['language_code'] ?? null;

        return $this->normalizedContactLanguageCode($contactLanguage) ?? 'en-US';
    }

    private function normalizedContactLanguageCode(?string $languageCode): ?string
    {
        $canonical = $this->canonicalLanguageCode($languageCode);

        if (blank($canonical)) {
            return null;
        }

        if (in_array($canonical, self::SUPPORTED_LANGUAGE_CODES, true)) {
            return $canonical;
        }

        $base = explode('-', $canonical)[0];

        return self::AUTO_LANGUAGE_CODE_MAP[$canonical] ?? self::AUTO_LANGUAGE_CODE_MAP[$base] ?? null;
    }

    private function canonicalLanguageCode(?string $languageCode): ?string
    {
        $normalized = trim(str_replace('_', '-', (string) $languageCode));

        if ($normalized === '') {
            return null;
        }

        [$language, $region] = array_pad(explode('-', $normalized, 2), 2, null);

        return $region === null ? strtolower($language) : strtolower($language).'-'.strtoupper($region);
    }
}
