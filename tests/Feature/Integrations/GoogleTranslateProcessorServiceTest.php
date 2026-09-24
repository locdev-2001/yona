<?php

use App\Models\Account;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Integrations\Hook;
use App\Models\Message;
use App\Services\Integrations\GoogleTranslate\ProcessorService;
use Illuminate\Support\Facades\Http;

// — không có spec riêng ở bản gốc (test qua messages_controller_spec#translate,
// xem tests/Feature/Integrations/MessageTranslateTest.php).
function googleTranslateProcessorCredentials(): array
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
    Hook::factory()->create([
        'account_id' => $this->account->id,
        'app_id' => 'google_translate',
        'settings' => ['project_id' => 'test-project', 'credentials' => googleTranslateProcessorCredentials()],
    ]);

    Http::fake([
        'https://oauth2.googleapis.com/token' => Http::response(['access_token' => 'tok'], 200),
    ]);
});

it('dịch nội dung tin nhắn thường qua translateText', function () {
    $message = Message::factory()->create(['account_id' => $this->account->id, 'content' => 'hola']);
    Http::fake([
        'https://oauth2.googleapis.com/token' => Http::response(['access_token' => 'tok'], 200),
        'https://translation.googleapis.com/*' => Http::response(['translations' => [['translatedText' => 'hello']]], 200),
    ]);

    $result = (new ProcessorService($message, 'en'))->perform();

    expect($result)->toBe('hello');
    Http::assertSent(fn ($request) => str_contains($request->url(), 'translateText')
        && ($request->data()['mimeType'] ?? null) === 'text/plain'
        && ($request->data()['contents'] ?? null) === ['hola']
        && ($request->data()['targetLanguageCode'] ?? null) === 'en');
});

it('trả về null khi account chưa bật google_translate', function () {
    $account = Account::factory()->create();
    $message = Message::factory()->create(['account_id' => $account->id, 'content' => 'hola']);

    $result = (new ProcessorService($message, 'en'))->perform();

    expect($result)->toBeNull();
});

it('dịch nội dung html của email khi có', function () {
    $inbox = Inbox::factory()->email()->create(['account_id' => $this->account->id]);
    $conversation = Conversation::factory()->create(['account_id' => $this->account->id, 'inbox_id' => $inbox->id]);
    $message = Message::factory()->create([
        'account_id' => $this->account->id,
        'conversation_id' => $conversation->id,
        'inbox_id' => $inbox->id,
        'content' => 'plain fallback',
        'content_attributes' => ['email' => ['html_content' => ['full' => '<p>hola</p>'], 'content_type' => 'text/html']],
    ]);
    Http::fake([
        'https://oauth2.googleapis.com/token' => Http::response(['access_token' => 'tok'], 200),
        'https://translation.googleapis.com/*' => Http::response(['translations' => [['translatedText' => '<p>hello</p>']]], 200),
    ]);

    $result = (new ProcessorService($message, 'en'))->perform();

    expect($result)->toBe('<p>hello</p>');
    Http::assertSent(fn ($request) => str_contains($request->url(), 'translateText')
        && ($request->data()['mimeType'] ?? null) === 'text/html'
        && ($request->data()['contents'] ?? null) === ['<p>hola</p>']);
});
