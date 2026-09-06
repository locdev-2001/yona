<?php

use App\Models\Account;
use App\Models\Integrations\Hook;
use App\Models\Message;
use App\Services\Integrations\GoogleTranslate\DetectLanguageService;
use Illuminate\Support\Facades\Http;

// Port từ refs/chatwoot/spec/lib/integrations/google_translate/detect_language_service_spec.rb.
function googleTranslateCredentials(): array
{
    static $privateKey = null;

    if ($privateKey === null) {
        $resource = openssl_pkey_new(['private_key_bits' => 2048, 'private_key_type' => OPENSSL_KEYTYPE_RSA]);
        openssl_pkey_export($resource, $privateKey);
    }

    return ['client_email' => 'translate@test.iam.gserviceaccount.com', 'private_key' => $privateKey];
}

beforeEach(function () {
    $this->account = Account::factory()->create();
    $this->hook = Hook::factory()->create([
        'account_id' => $this->account->id,
        'app_id' => 'google_translate',
        'settings' => ['project_id' => 'test-project', 'credentials' => googleTranslateCredentials()],
    ]);
    $this->message = Message::factory()->create([
        'account_id' => $this->account->id,
        'content' => 'muchas muchas gracias',
    ]);

    Http::fake([
        'https://oauth2.googleapis.com/token' => Http::response(['access_token' => 'tok'], 200),
        'https://translation.googleapis.com/*' => Http::response([
            'languages' => [['languageCode' => 'es', 'confidence' => 0.71875]],
        ], 200),
    ]);
});

it('nhận diện và ghi ngôn ngữ hội thoại', function () {
    (new DetectLanguageService($this->hook, $this->message))->perform();

    expect($this->message->conversation->refresh()->additional_attributes['conversation_language'])->toBe('es');
    Http::assertSent(fn ($request) => str_contains($request->url(), ':detectLanguage'));
});

it('không ghi đè nếu hội thoại đã có ngôn ngữ', function () {
    $this->message->conversation->update(['additional_attributes' => ['conversation_language' => 'en']]);

    (new DetectLanguageService($this->hook, $this->message->fresh()))->perform();

    Http::assertNotSent(fn ($request) => str_contains($request->url(), ':detectLanguage'));
    expect($this->message->conversation->refresh()->additional_attributes['conversation_language'])->toBe('en');
});

it('không chạy nếu tin nhắn không phải incoming', function () {
    $this->message->update(['message_type' => Message::TYPE_OUTGOING]);

    (new DetectLanguageService($this->hook, $this->message->fresh()))->perform();

    Http::assertNotSent(fn ($request) => str_contains($request->url(), ':detectLanguage'));
    expect($this->message->conversation->refresh()->additional_attributes['conversation_language'] ?? null)->toBeNull();
});

it('không chạy nếu nội dung tin nhắn rỗng', function () {
    $this->message->update(['content' => null]);

    (new DetectLanguageService($this->hook, $this->message->fresh()))->perform();

    Http::assertNotSent(fn ($request) => str_contains($request->url(), ':detectLanguage'));
});
