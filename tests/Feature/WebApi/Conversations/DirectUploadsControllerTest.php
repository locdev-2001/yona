<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Contact;
use App\Models\ContactInbox;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

// Port từ spec/controllers/api/v1/accounts/conversations/direct_uploads_controller_spec.rb.
// Không có ActiveStorage nên endpoint nhận thẳng tệp và trả signed_id thay cho
// hai bước tạo blob → PUT (quyết định #9). Bỏ: case AgentBot token (D4) và
// feature api_and_webhooks (F7).

beforeEach(function () {
    Storage::fake('public');

    $this->account = Account::factory()->create();
    $this->inbox = Inbox::factory()->create(['account_id' => $this->account->id]);
    $contact = Contact::factory()->create(['account_id' => $this->account->id]);
    $contactInbox = ContactInbox::factory()->create(['contact_id' => $contact->id, 'inbox_id' => $this->inbox->id]);
    $this->conversation = Conversation::factory()->create([
        'account_id' => $this->account->id,
        'inbox_id' => $this->inbox->id,
        'contact_id' => $contact->id,
        'contact_inbox_id' => $contactInbox->id,
    ]);

    $this->agent = User::factory()->create();
    AccountUser::factory()->create([
        'account_id' => $this->account->id,
        'user_id' => $this->agent->id,
        'role' => AccountUser::ROLE_AGENT,
    ]);
    $this->inbox->addMembers([$this->agent->id]);
});

function directUploadsUrl(Account $account, Conversation $conversation): string
{
    return "/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/direct_uploads";
}

it('returns unauthorized without any credentials', function () {
    $this->postJson(directUploadsUrl($this->account, $this->conversation))->assertUnauthorized();
});

it('returns unauthorized with an invalid api access token', function () {
    $this->postJson(directUploadsUrl($this->account, $this->conversation), [], ['api_access_token' => 'invalid-token'])
        ->assertUnauthorized();
});

it('stores the file and returns a signed id for a session request', function () {
    $response = $this->actingAs($this->agent)
        ->post(directUploadsUrl($this->account, $this->conversation), [
            'file' => UploadedFile::fake()->image('avatar.png'),
        ], ['Accept' => 'application/json'])
        ->assertOk();

    expect($response->json('content_type'))->toBe('image/png')
        ->and($response->json('filename'))->toBe('avatar.png')
        ->and($response->json('signed_id'))->not->toBeEmpty()
        ->and($response->json('url'))->toContain('/storage/attachments/'.$this->account->id);
});

it('stores the file for a request authenticated with an api access token', function () {
    $response = $this->post(directUploadsUrl($this->account, $this->conversation), [
        'file' => UploadedFile::fake()->image('avatar.png'),
    ], ['Accept' => 'application/json', 'api_access_token' => $this->agent->accessToken->token])
        ->assertOk();

    expect($response->json('content_type'))->toBe('image/png');
});

it('rejects a request without a file', function () {
    $this->actingAs($this->agent)
        ->postJson(directUploadsUrl($this->account, $this->conversation))
        ->assertStatus(422);
});

it('rejects an agent of another account', function () {
    $otherAgent = User::factory()->create();
    AccountUser::factory()->create(['account_id' => Account::factory()->create()->id, 'user_id' => $otherAgent->id]);

    $this->actingAs($otherAgent)
        ->post(directUploadsUrl($this->account, $this->conversation), [
            'file' => UploadedFile::fake()->image('avatar.png'),
        ], ['Accept' => 'application/json'])
        ->assertNotFound();
});

it('attaches the uploaded file to a message through its signed id', function () {
    $signedId = $this->actingAs($this->agent)
        ->post(directUploadsUrl($this->account, $this->conversation), [
            'file' => UploadedFile::fake()->image('avatar.png'),
        ], ['Accept' => 'application/json'])
        ->assertOk()
        ->json('signed_id');

    $response = $this->actingAs($this->agent)
        ->postJson("/api/v1/accounts/{$this->account->id}/conversations/{$this->conversation->display_id}/messages", [
            'content' => 'test-message',
            'attachments' => [$signedId],
        ])
        ->assertOk();

    expect($response->json('attachments.0.file_type'))->toBe('image');
});
