<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Contact;
use App\Models\ContactInbox;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Integrations\Hook;
use App\Models\Message;
use App\Models\User;
use Illuminate\Support\Facades\Http;

// Port từ phần `translate` của
// spec/controllers/api/v1/accounts/conversations/messages_controller_spec.rb.
function messageTranslateCredentials(): array
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
    $this->admin = User::factory()->create();
    AccountUser::factory()->administrator()->create(['account_id' => $this->account->id, 'user_id' => $this->admin->id]);

    $this->inbox = Inbox::factory()->create(['account_id' => $this->account->id]);
    $contact = Contact::factory()->create(['account_id' => $this->account->id]);
    $contactInbox = ContactInbox::factory()->create(['contact_id' => $contact->id, 'inbox_id' => $this->inbox->id]);
    $this->conversation = Conversation::factory()->create([
        'account_id' => $this->account->id,
        'inbox_id' => $this->inbox->id,
        'contact_id' => $contact->id,
        'contact_inbox_id' => $contactInbox->id,
    ]);
    $this->message = Message::factory()->create([
        'account_id' => $this->account->id,
        'conversation_id' => $this->conversation->id,
        'content' => 'hola',
    ]);

    Hook::factory()->create([
        'account_id' => $this->account->id,
        'app_id' => 'google_translate',
        'settings' => ['project_id' => 'test-project', 'credentials' => messageTranslateCredentials()],
    ]);
});

function translateUrl(Account $account, Conversation $conversation, Message $message): string
{
    return "/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/messages/{$message->id}/translate";
}

it('dịch nội dung tin nhắn và lưu lại', function () {
    Http::fake([
        'https://oauth2.googleapis.com/token' => Http::response(['access_token' => 'tok'], 200),
        'https://translation.googleapis.com/*' => Http::response(['translations' => [['translatedText' => 'hello']]], 200),
    ]);

    $this->actingAs($this->admin)
        ->postJson(translateUrl($this->account, $this->conversation, $this->message), ['target_language' => 'en'])
        ->assertOk()
        ->assertJson(['content' => 'hello']);

    expect($this->message->fresh()->content_attributes['translations']['en'])->toBe('hello');
});

it('không dịch lại khi ngôn ngữ đã có trong bộ nhớ đệm', function () {
    $this->message->update(['content_attributes' => ['translations' => ['en' => 'hello']]]);
    Http::fake();

    $this->actingAs($this->admin)
        ->postJson(translateUrl($this->account, $this->conversation, $this->message), ['target_language' => 'en'])
        ->assertStatus(200)
        ->assertNoContent(200);

    Http::assertNothingSent();
});

it('từ chối người không có quyền xem hội thoại', function () {
    $outsider = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $this->account->id, 'user_id' => $outsider->id]);

    $this->actingAs($outsider)
        ->postJson(translateUrl($this->account, $this->conversation, $this->message), ['target_language' => 'en'])
        ->assertUnauthorized();
});
