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

// Port từ spec/controllers/api/v1/accounts/integrations/dyte_controller_spec.rb.
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

    Hook::factory()->create([
        'account_id' => $this->account->id,
        'app_id' => 'dyte',
        'settings' => ['account_id' => 'cf_account', 'app_id' => 'cf_app', 'api_token' => 'cf_token'],
    ]);
});

it('từ chối người chưa đăng nhập', function () {
    $this->postJson("/api/v1/accounts/{$this->account->id}/integrations/dyte/create_a_meeting", [
        'conversation_id' => $this->conversation->display_id,
    ])->assertUnauthorized();
});

it('tạo cuộc gọi và trả payload tin nhắn', function () {
    Http::fake([
        'https://api.cloudflare.com/client/v4/accounts/cf_account/realtime/kit/cf_app/meetings' => Http::response(
            ['success' => true, 'data' => ['id' => 'meeting_123']], 200
        ),
    ]);

    $response = $this->actingAs($this->admin)
        ->postJson("/api/v1/accounts/{$this->account->id}/integrations/dyte/create_a_meeting", [
            'conversation_id' => $this->conversation->display_id,
        ])
        ->assertOk();

    expect($response->json('content_attributes.data.meeting_id'))->toBe('meeting_123');
});

it('cấp token tham gia cho tin nhắn integrations', function () {
    $message = Message::factory()->create([
        'account_id' => $this->account->id,
        'conversation_id' => $this->conversation->id,
        'content_type' => Message::CONTENT_TYPES['integrations'],
        'content_attributes' => ['type' => 'dyte', 'data' => ['meeting_id' => 'meeting_123']],
    ]);
    Http::fake([
        'https://api.cloudflare.com/client/v4/accounts/cf_account/realtime/kit/cf_app/meetings/meeting_123/participants' => Http::response(
            ['success' => true, 'data' => ['id' => 'participant_1', 'token' => 'jwt-token']], 200
        ),
    ]);

    $this->actingAs($this->admin)
        ->postJson("/api/v1/accounts/{$this->account->id}/integrations/dyte/add_participant_to_meeting", [
            'message_id' => $message->id,
        ])
        ->assertOk()
        ->assertJson(['id' => 'participant_1', 'token' => 'jwt-token']);
});

it('từ chối tin nhắn không phải content_type integrations', function () {
    $message = Message::factory()->create([
        'account_id' => $this->account->id,
        'conversation_id' => $this->conversation->id,
    ]);

    $this->actingAs($this->admin)
        ->postJson("/api/v1/accounts/{$this->account->id}/integrations/dyte/add_participant_to_meeting", [
            'message_id' => $message->id,
        ])
        ->assertStatus(422)
        ->assertJson(['error' => 'Invalid message type. Action not permitted']);
});
