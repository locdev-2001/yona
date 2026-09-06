<?php

namespace App\Services\Integrations\GoogleTranslate;

use App\Models\Integrations\Hook;
use App\Models\Message;
use App\Services\Integrations\Google\ServiceAccountToken;
use Illuminate\Support\Facades\Http;
use Throwable;

// Port từ refs/chatwoot/lib/integrations/google_translate/processor_service.rb
// — dịch nội dung một tin nhắn theo yêu cầu (nút "Translate" trên UI). Dùng
// bởi MessagesController::translate.
class ProcessorService
{
    public function __construct(
        private readonly Message $message,
        private readonly string $targetLanguage,
    ) {}

    public function perform(): ?string
    {
        $hook = $this->hook();

        if ($hook === null) {
            return null;
        }

        $content = $this->translationContent();

        if (blank($content)) {
            return null;
        }

        $credentials = $hook->settings['credentials'] ?? [];
        $accessToken = (new ServiceAccountToken)->fetch($credentials);
        $projectId = $hook->settings['project_id'] ?? '';

        $response = Http::withToken($accessToken)
            ->post("https://translation.googleapis.com/v3/projects/{$projectId}:translateText", [
                'contents' => [$content],
                'targetLanguageCode' => $this->bcp47LanguageCode(),
                'parent' => "projects/{$projectId}",
                'mimeType' => $this->mimeType(),
            ]);

        if (! $response->successful()) {
            return null;
        }

        return $response->json('translations.0.translatedText');
    }

    private function bcp47LanguageCode(): string
    {
        return str_replace('_', '-', $this->targetLanguage);
    }

    private function isEmailChannel(): bool
    {
        return $this->message->inbox?->isEmail() === true;
    }

    /** @return array{html: ?string, text: ?string, content_type: ?string} */
    private function emailContent(): array
    {
        $email = $this->message->content_attributes['email'] ?? [];

        return [
            'html' => $email['html_content']['full'] ?? null,
            'text' => $email['text_content']['full'] ?? null,
            'content_type' => $email['content_type'] ?? null,
        ];
    }

    private function htmlContentAvailable(): bool
    {
        return filled($this->emailContent()['html']);
    }

    private function plainTextContentAvailable(): bool
    {
        $email = $this->emailContent();

        return str_contains((string) $email['content_type'], 'text/plain') && filled($email['text']);
    }

    private function translationContent(): ?string
    {
        if (! $this->isEmailChannel()) {
            return $this->message->content;
        }

        if ($this->htmlContentAvailable()) {
            return $this->emailContent()['html'];
        }

        if ($this->plainTextContentAvailable()) {
            return $this->emailContent()['text'];
        }

        return $this->message->content;
    }

    private function mimeType(): string
    {
        return $this->isEmailChannel() && $this->htmlContentAvailable() ? 'text/html' : 'text/plain';
    }

    private function hook(): ?Hook
    {
        try {
            return $this->message->account->hooks()->where('app_id', 'google_translate')->first();
        } catch (Throwable) {
            return null;
        }
    }
}
