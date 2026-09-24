<?php

use App\Events\DomainEvent;
use App\Events\EventType;
use App\Jobs\Conversations\ActivityMessageJob;
use App\Models\Contact;
use App\Models\ContactInbox;
use App\Models\Conversation;
use App\Models\Message;
use App\Support\WidgetTokenService;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Queue;
use Tests\Support\WidgetSession;

// Port từ spec/controllers/api/v1/widget/conversations_controller_spec.rb.

function widgetConversationParams(): array
{
    return [
        'contact' => [
            'name' => 'contact-name',
            'email' => 'contact-email@chatwoot.com',
            'phone_number' => '+919745313456',
        ],
        'message' => ['content' => 'This is a test message'],
        'custom_attributes' => ['order_id' => '12345'],
    ];
}

describe('GET /api/v1/widget/conversations', function () {
    it('returns the current conversation', function () {
        $session = WidgetSession::make(contactAttributes: ['email' => null]);
        $conversation = Conversation::factory()->create([
            'account_id' => $session->account->id,
            'inbox_id' => $session->inbox->id,
            'contact_id' => $session->contact->id,
            'contact_inbox_id' => $session->contactInbox->id,
        ]);

        $this->getJson($session->url('conversations'), $session->headers())
            ->assertOk()
            ->assertJson(['id' => $conversation->display_id, 'status' => 'open']);
    });

    it('exposes when an agent last read the conversation so the widget can show seen receipts', function () {
        $session = WidgetSession::make(contactAttributes: ['email' => null]);
        $conversation = Conversation::factory()->create([
            'account_id' => $session->account->id,
            'inbox_id' => $session->inbox->id,
            'contact_id' => $session->contact->id,
            'contact_inbox_id' => $session->contactInbox->id,
            'agent_last_seen_at' => now()->subMinute(),
        ]);

        $this->getJson($session->url('conversations'), $session->headers())
            ->assertOk()
            ->assertJson(['agent_last_seen_at' => $conversation->agent_last_seen_at->getTimestamp()]);
    });

    it('returns not found when the token points at an unknown source id', function () {
        $session = WidgetSession::make();
        $token = WidgetTokenService::generate(['source_id' => 'invalid source id', 'inbox_id' => $session->inbox->id]);

        $this->getJson($session->url('conversations'), ['X-Auth-Token' => $token])->assertNotFound();
    });

    it('returns an empty object when the visitor has no conversation', function () {
        $session = WidgetSession::make();

        $this->getJson($session->url('conversations'), $session->headers())->assertOk()->assertExactJson([]);
    });
});

describe('POST /api/v1/widget/conversations', function () {
    it('creates a conversation with contact details', function () {
        $session = WidgetSession::make(contactAttributes: ['email' => null]);

        $response = $this->postJson($session->url('conversations'), widgetConversationParams(), $session->headers())->assertOk();

        expect($response->json('id'))->not->toBeNull();
        expect($response->json('contact.email'))->toBe('contact-email@chatwoot.com');
        expect($response->json('contact.phone_number'))->toBe('+919745313456');
        expect($response->json('contact.name'))->toBe('contact-name');
    });

    it('creates a conversation with the first message and custom attributes', function () {
        $session = WidgetSession::make(contactAttributes: ['email' => null]);

        $response = $this->postJson($session->url('conversations'), widgetConversationParams(), $session->headers())->assertOk();

        expect($response->json('custom_attributes.order_id'))->toBe('12345');
        expect($response->json('messages.0.content'))->toBe('This is a test message');
        expect($response->json('messages.0.message_type'))->toBe(Message::TYPE_INCOMING);
    });

    it('creates a conversation with a name and without an email', function () {
        $session = WidgetSession::make(contactAttributes: ['email' => null]);

        $response = $this->postJson($session->url('conversations'), [
            'contact' => ['name' => 'alphy'],
            'message' => ['content' => 'This is a test message'],
        ], $session->headers())->assertOk();

        expect($response->json('contact.email'))->toBeNull();
        expect($response->json('contact.name'))->toBe('alphy');
        expect($response->json('messages.0.content'))->toBe('This is a test message');
    });

    it('does not overwrite the name of an existing contact', function () {
        $session = WidgetSession::make(contactAttributes: ['email' => null]);
        $existing = Contact::factory()->create([
            'account_id' => $session->account->id,
            'email' => 'contact-email@chatwoot.com',
        ]);

        $response = $this->postJson($session->url('conversations'), widgetConversationParams(), $session->headers())->assertOk();

        expect($response->json('contact.email'))->toBe($existing->email);
        expect($response->json('contact.name'))->not->toBe('contact-name');
        expect($response->json('contact.phone_number'))->toBe('+919745313456');
        expect($response->json('custom_attributes.order_id'))->toBe('12345');
        expect($response->json('messages.0.content'))->toBe('This is a test message');
    });

    it('saves contact custom attributes on the widget contact', function () {
        $session = WidgetSession::make(contactAttributes: ['email' => null]);

        $this->postJson($session->url('conversations'), [
            'contact' => [
                'name' => 'contact-name',
                'email' => 'contact-email@chatwoot.com',
                'custom_attributes' => ['cpf' => '123.456.789-09'],
            ],
            'message' => ['content' => 'This is a test message'],
        ], $session->headers())->assertOk();

        expect($session->contact->fresh()->custom_attributes['cpf'])->toBe('123.456.789-09');
    });

    it('saves contact custom attributes on the surviving contact after a merge', function () {
        $session = WidgetSession::make(contactAttributes: ['email' => null]);
        $existing = Contact::factory()->create([
            'account_id' => $session->account->id,
            'email' => 'contact-email@chatwoot.com',
            'custom_attributes' => ['cpf' => 'old-value'],
        ]);

        $this->postJson($session->url('conversations'), [
            'contact' => [
                'name' => 'contact-name',
                'email' => 'contact-email@chatwoot.com',
                'custom_attributes' => ['cpf' => '123.456.789-09'],
            ],
            'message' => ['content' => 'This is a test message'],
        ], $session->headers())->assertOk();

        expect(Contact::query()->whereKey($session->contact->id)->exists())->toBeFalse();
        expect($existing->fresh()->custom_attributes['cpf'])->toBe('123.456.789-09');
    });

    it('does not store an invalid phone number', function () {
        $session = WidgetSession::make(contactAttributes: ['email' => null]);
        $existing = Contact::factory()->withEmail()->create(['account_id' => $session->account->id]);

        $response = $this->postJson($session->url('conversations'), [
            'contact' => ['name' => 'contact-name-1', 'email' => $existing->email, 'phone_number' => '13456'],
            'message' => ['content' => 'This is a test message'],
        ], $session->headers())->assertOk();

        expect($response->json('contact.phone_number'))->toBeNull();
    });

    it('records browser context and the referer on the conversation', function () {
        $session = WidgetSession::make(contactAttributes: ['email' => null]);

        $this->withHeaders([
            ...$session->headers(),
            'User-Agent' => 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language' => 'vi-VN,vi;q=0.9',
        ])->postJson($session->url('conversations'), [
            'message' => ['content' => 'hello', 'referer_url' => 'https://example.com/pricing', 'timestamp' => '2026-09-06T00:00:00Z'],
        ])->assertOk();

        $attributes = Conversation::query()->latest('id')->first()->additional_attributes;

        expect($attributes['browser_language'])->toBe('vi');
        expect($attributes['browser']['browser_name'])->toBe('Chrome');
        expect($attributes['browser']['platform_name'])->toBe('Mac');
        expect($attributes['referer'])->toBe('https://example.com/pricing');
        expect($attributes['initiated_at']['timestamp'])->toBe('2026-09-06T00:00:00Z');
    });
});

describe('POST /api/v1/widget/conversations/toggle_typing', function () {
    it('dispatches the typing event with the contact as the actor', function () {
        $session = WidgetSession::make(contactAttributes: ['email' => null]);
        $conversation = Conversation::factory()->create([
            'account_id' => $session->account->id,
            'inbox_id' => $session->inbox->id,
            'contact_id' => $session->contact->id,
            'contact_inbox_id' => $session->contactInbox->id,
        ]);

        Event::fake([DomainEvent::class]);

        $this->postJson($session->url('conversations/toggle_typing'), ['typing_status' => 'on'], $session->headers())
            ->assertOk();

        Event::assertDispatched(
            DomainEvent::class,
            fn (DomainEvent $event) => $event->type === EventType::CONVERSATION_TYPING_ON
                && $event->data['conversation']->id === $conversation->id
                && $event->data['user']->id === $session->contact->id
        );
    });
});

describe('POST /api/v1/widget/conversations/update_last_seen', function () {
    it('stamps contact_last_seen_at', function () {
        $session = WidgetSession::make();
        $conversation = Conversation::factory()->create([
            'account_id' => $session->account->id,
            'inbox_id' => $session->inbox->id,
            'contact_id' => $session->contact->id,
            'contact_inbox_id' => $session->contactInbox->id,
        ]);

        expect($conversation->contact_last_seen_at)->toBeNull();

        $this->postJson($session->url('conversations/update_last_seen'), [], $session->headers())->assertOk();

        expect($conversation->fresh()->contact_last_seen_at)->not->toBeNull();
    });
});

describe('GET /api/v1/widget/conversations/toggle_status', function () {
    it('resolves the conversation and names the contact in the activity message', function () {
        $session = WidgetSession::make(contactAttributes: ['email' => null, 'name' => 'trang']);
        $conversation = Conversation::factory()->create([
            'account_id' => $session->account->id,
            'inbox_id' => $session->inbox->id,
            'contact_id' => $session->contact->id,
            'contact_inbox_id' => $session->contactInbox->id,
        ]);

        Queue::fake();

        $this->getJson($session->url('conversations/toggle_status'), $session->headers())->assertOk();

        expect($conversation->fresh()->isResolved())->toBeTrue();
        Queue::assertPushed(
            ActivityMessageJob::class,
            fn (ActivityMessageJob $job) => $job->messageParams['content'] === 'Conversation was resolved by Trang'
                && $job->messageParams['content_attributes']['activity']['status'] === 'resolved'
        );
    });

    it('is forbidden when the end conversation feature is off', function () {
        $session = WidgetSession::make();
        $session->channel->update(['selected_feature_flags' => ['attachments', 'emoji_picker']]);
        $conversation = Conversation::factory()->create([
            'account_id' => $session->account->id,
            'inbox_id' => $session->inbox->id,
            'contact_id' => $session->contact->id,
            'contact_inbox_id' => $session->contactInbox->id,
        ]);

        $this->getJson($session->url('conversations/toggle_status'), $session->headers())->assertForbidden();

        expect($conversation->fresh()->isResolved())->toBeFalse();
    });

    it('returns not found for a session without a conversation', function () {
        $session = WidgetSession::make();
        $secondSession = ContactInbox::factory()->create([
            'contact_id' => $session->contact->id,
            'inbox_id' => $session->inbox->id,
        ]);

        $this->getJson($session->url('conversations/toggle_status'), $session->headers($secondSession))->assertNotFound();
    });
});

describe('conversation custom attributes', function () {
    it('returns not found with an invalid website token', function () {
        WidgetSession::make();

        $this->postJson('/api/v1/widget/conversations/set_custom_attributes', ['website_token' => ''])->assertNotFound();
        $this->postJson('/api/v1/widget/conversations/destroy_custom_attributes', ['website_token' => ''])->assertNotFound();
    });

    it('sets and removes conversation custom attributes', function () {
        $session = WidgetSession::make();
        $conversation = Conversation::factory()->create([
            'account_id' => $session->account->id,
            'inbox_id' => $session->inbox->id,
            'contact_id' => $session->contact->id,
            'contact_inbox_id' => $session->contactInbox->id,
        ]);

        $this->postJson(
            $session->url('conversations/set_custom_attributes'),
            ['custom_attributes' => ['product_name' => 'Chatwoot']],
            $session->headers()
        )->assertNoContent();

        expect($conversation->fresh()->custom_attributes)->toMatchArray(['product_name' => 'Chatwoot']);

        $this->postJson(
            $session->url('conversations/destroy_custom_attributes'),
            ['custom_attribute' => ['product_name']],
            $session->headers()
        )->assertOk();

        expect($conversation->fresh()->custom_attributes)->not->toHaveKey('product_name');
    });
});
