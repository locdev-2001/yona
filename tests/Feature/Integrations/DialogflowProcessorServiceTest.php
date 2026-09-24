<?php

use App\Models\Account;
use App\Models\Contact;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Integrations\Hook;
use App\Models\Message;
use App\Services\Integrations\Dialogflow\ProcessorService;
use Illuminate\Support\Facades\Http;

// Bản gốc dùng gRPC mock; ở đây fake HTTP REST (token OAuth + detectIntent —
// xem note "Khác biệt cố ý" trong f6-notes-misc.md).

function dialogflowCredentials(): array
{
    static $privateKey = null;

    if ($privateKey === null) {
        $resource = openssl_pkey_new(['private_key_bits' => 2048, 'private_key_type' => OPENSSL_KEYTYPE_RSA]);
        openssl_pkey_export($resource, $privateKey);
    }

    return ['client_email' => 'bot@test.iam.gserviceaccount.com', 'private_key' => $privateKey];
}

function fakeGoogleToken(array $extra = []): array
{
    return array_merge([
        'https://oauth2.googleapis.com/token' => Http::response(['access_token' => 'fake-google-token'], 200),
    ], $extra);
}

beforeEach(function () {
    $this->account = Account::factory()->create();
    $this->inbox = Inbox::factory()->create(['account_id' => $this->account->id]);
    $this->hook = Hook::factory()->create([
        'account_id' => $this->account->id,
        'inbox_id' => $this->inbox->id,
        'hook_type' => Hook::TYPE_INBOX,
        'app_id' => 'dialogflow',
        'settings' => ['project_id' => 'test-project', 'credentials' => dialogflowCredentials()],
    ]);
    $this->conversation = Conversation::factory()->create([
        'account_id' => $this->account->id,
        'inbox_id' => $this->inbox->id,
        'status' => Conversation::STATUS_PENDING,
    ]);
    $this->message = Message::factory()->create([
        'account_id' => $this->account->id,
        'conversation_id' => $this->conversation->id,
        'inbox_id' => $this->inbox->id,
    ]);
});

it('tạo tin trả lời khi dialogflow trả fulfillment text', function () {
    Http::fake(fakeGoogleToken([
        'https://dialogflow.googleapis.com/*' => Http::response([
            'queryResult' => ['fulfillmentMessages' => [['text' => ['text' => ['hello payload']]]]],
        ], 200),
    ]));

    (new ProcessorService('message.created', $this->hook, ['message' => $this->message]))->perform();

    expect($this->conversation->messages()->get()->last()->content)->toBe('hello payload');
});

it('tạo tin trả lời từ payload khi fulfillment text rỗng', function () {
    Http::fake(fakeGoogleToken([
        'https://dialogflow.googleapis.com/*' => Http::response([
            'queryResult' => ['fulfillmentMessages' => [['payload' => ['content' => 'hello payload random']]]],
        ], 200),
    ]));

    (new ProcessorService('message.created', $this->hook, ['message' => $this->message]))->perform();

    expect($this->conversation->messages()->get()->last()->content)->toBe('hello payload random');
});

it('handoff trả hội thoại về agent', function () {
    Http::fake(fakeGoogleToken([
        'https://dialogflow.googleapis.com/*' => Http::response([
            'queryResult' => ['fulfillmentMessages' => [['payload' => ['action' => 'handoff']]]],
        ], 200),
    ]));

    (new ProcessorService('message.created', $this->hook, ['message' => $this->message]))->perform();

    expect($this->conversation->refresh()->status)->toBe(Conversation::STATUS_OPEN);
});

it('resolve đóng hội thoại không chuyển cho agent', function () {
    Http::fake(fakeGoogleToken([
        'https://dialogflow.googleapis.com/*' => Http::response([
            'queryResult' => ['fulfillmentMessages' => [['payload' => ['action' => 'resolve']], ['text' => ['text' => ['hello payload']]]]],
        ], 200),
    ]));

    (new ProcessorService('message.created', $this->hook, ['message' => $this->message]))->perform();

    expect($this->conversation->refresh()->status)->toBe(Conversation::STATUS_RESOLVED)
        ->and($this->conversation->messages()->get()->last()->content)->toBe('hello payload');
});

it('không chạy khi tin nhắn riêng tư', function () {
    Http::fake(fakeGoogleToken());
    $privateMessage = Message::factory()->create([
        'account_id' => $this->account->id,
        'conversation_id' => $this->conversation->id,
        'inbox_id' => $this->inbox->id,
        'private' => true,
    ]);

    (new ProcessorService('message.created', $this->hook, ['message' => $privateMessage]))->perform();

    Http::assertNothingSent();
});

it('không chạy khi hội thoại không ở trạng thái pending', function () {
    Http::fake(fakeGoogleToken());
    $this->conversation->update(['status' => Conversation::STATUS_OPEN]);

    (new ProcessorService('message.created', $this->hook, ['message' => $this->message->fresh()]))->perform();

    Http::assertNothingSent();
});

it('không gọi API khi hook chưa có credentials', function () {
    Http::fake(fakeGoogleToken());
    $this->hook->update(['settings' => ['project_id' => 'something_invalid', 'credentials' => []]]);
    $countBefore = $this->conversation->messages()->count();

    (new ProcessorService('message.created', $this->hook, ['message' => $this->message]))->perform();

    Http::assertNothingSent();
    expect($this->conversation->messages()->count())->toBe($countBefore);
});

it('vô hiệu hoá hook khi dialogflow trả 403 permission denied', function () {
    Http::fake(fakeGoogleToken([
        'https://dialogflow.googleapis.com/*' => Http::response(['error' => 'permission denied'], 403),
    ]));

    (new ProcessorService('message.created', $this->hook, ['message' => $this->message]))->perform();

    expect($this->hook->refresh()->status)->toBe(Hook::STATUS_DISABLED);
});

it('dùng endpoint theo vùng khi hook cấu hình region', function () {
    $this->hook->update(['settings' => [
        'project_id' => 'test-project',
        'credentials' => dialogflowCredentials(),
        'region' => 'europe-west1',
    ]]);
    Http::fake(fakeGoogleToken([
        'https://europe-west1-dialogflow.googleapis.com/*' => Http::response([
            'queryResult' => ['fulfillmentMessages' => [['text' => ['text' => ['hi']]]]],
        ], 200),
    ]));

    (new ProcessorService('message.created', $this->hook, ['message' => $this->message]))->perform();

    Http::assertSent(fn ($request) => str_contains($request->url(), 'europe-west1-dialogflow.googleapis.com')
        && str_contains($request->url(), 'locations/europe-west1/agent/sessions'));
});

it('tự nhận diện language_code từ ngôn ngữ contact khi cấu hình auto', function () {
    $contact = Contact::find($this->conversation->contact_id);
    $contact->update(['additional_attributes' => ['language_code' => 'pt_br']]);
    $this->hook->update(['settings' => [
        'project_id' => 'test-project',
        'credentials' => dialogflowCredentials(),
        'language_code' => 'auto',
    ]]);
    Http::fake(fakeGoogleToken([
        'https://dialogflow.googleapis.com/*' => Http::response(['queryResult' => ['fulfillmentMessages' => []]], 200),
    ]));

    (new ProcessorService('message.created', $this->hook, ['message' => $this->message->fresh()]))->perform();

    Http::assertSent(fn ($request) => ($request->data()['queryInput']['text']['languageCode'] ?? null) === 'pt-BR');
});

it('message.updated gửi giá trị submitted_values thay vì content', function () {
    $updatedMessage = Message::factory()->create([
        'account_id' => $this->account->id,
        'conversation_id' => $this->conversation->id,
        'inbox_id' => $this->inbox->id,
        'content_attributes' => ['submitted_values' => [['title' => 'Support', 'value' => 'selected_gas']]],
    ]);
    Http::fake(fakeGoogleToken([
        'https://dialogflow.googleapis.com/*' => Http::response(['queryResult' => ['fulfillmentMessages' => []]], 200),
    ]));

    (new ProcessorService('message.updated', $this->hook, ['message' => $updatedMessage]))->perform();

    Http::assertSent(fn ($request) => ($request->data()['queryInput']['text']['text'] ?? null) === 'selected_gas');
});
