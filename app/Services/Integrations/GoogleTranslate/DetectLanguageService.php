<?php

namespace App\Services\Integrations\GoogleTranslate;

use App\Models\Integrations\Hook;
use App\Models\Message;
use App\Services\Integrations\Google\ServiceAccountToken;
use Illuminate\Support\Facades\Http;
use Throwable;

// — đoán ngôn ngữ hội thoại từ tin nhắn đến đầu tiên, ghi vào
// conversation.additional_attributes['conversation_language'].
class DetectLanguageService
{
    public function __construct(
        private readonly Hook $hook,
        private readonly Message $message,
    ) {}

    public function perform(): void
    {
        if (! $this->isValidMessage()) {
            return;
        }

        $conversation = $this->message->conversation;

        if (filled($conversation->additional_attributes['conversation_language'] ?? null)) {
            return;
        }

        $text = mb_substr((string) $this->message->content, 0, 1500);
        $languageCode = $this->detectLanguageCode($text);

        if (blank($languageCode)) {
            return;
        }

        $conversation->update([
            'additional_attributes' => [
                ...($conversation->additional_attributes ?? []),
                'conversation_language' => $languageCode,
            ],
        ]);
    }

    private function isValidMessage(): bool
    {
        return $this->message->isIncoming() && filled($this->message->content);
    }

    private function detectLanguageCode(string $text): ?string
    {
        $credentials = $this->hook->settings['credentials'] ?? [];

        try {
            $accessToken = (new ServiceAccountToken)->fetch($credentials);
        } catch (Throwable) {
            return null;
        }

        $projectId = $this->hook->settings['project_id'] ?? '';

        $response = Http::withToken($accessToken)
            ->post("https://translation.googleapis.com/v3/projects/{$projectId}:detectLanguage", [
                'content' => $text,
            ]);

        if (! $response->successful()) {
            return null;
        }

        return $response->json('languages.0.languageCode');
    }
}
