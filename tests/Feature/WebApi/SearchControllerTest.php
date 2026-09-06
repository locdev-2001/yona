<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Contact;
use App\Models\ContactInbox;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use App\Models\User;

// Port từ spec/controllers/api/v1/accounts/search_controller_spec.rb.
// Bỏ các khối :opensearch (advanced_search + Elasticsearch, enterprise) và mọi
// kỳ vọng về articles có dữ liệu — Help Center vào ở E4, endpoint trả rỗng.
beforeEach(function () {
    $this->account = Account::factory()->create();
    $this->agent = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $this->account->id, 'user_id' => $this->agent->id]);

    $this->inbox = Inbox::factory()->create(['account_id' => $this->account->id]);
    $this->agent->inboxes()->attach($this->inbox->id);

    $this->contact = Contact::factory()->create([
        'account_id' => $this->account->id,
        'email' => 'test@example.com',
    ]);
    $contactInbox = ContactInbox::factory()->create([
        'contact_id' => $this->contact->id,
        'inbox_id' => $this->inbox->id,
    ]);
    $this->conversation = Conversation::factory()->create([
        'account_id' => $this->account->id,
        'inbox_id' => $this->inbox->id,
        'contact_id' => $this->contact->id,
        'contact_inbox_id' => $contactInbox->id,
    ]);
    Message::factory()->create([
        'account_id' => $this->account->id,
        'inbox_id' => $this->inbox->id,
        'conversation_id' => $this->conversation->id,
        'content' => 'test1',
    ]);
    Message::factory()->create([
        'account_id' => $this->account->id,
        'inbox_id' => $this->inbox->id,
        'conversation_id' => $this->conversation->id,
        'content' => 'test2',
        'created_at' => now()->addSecond(),
    ]);

    $this->url = "/api/v1/accounts/{$this->account->id}/search";
});

describe('GET /api/v1/accounts/{id}/search', function () {
    it('returns unauthorized for an unauthenticated user', function () {
        $this->getJson("{$this->url}?q=test")->assertUnauthorized();
    });

    it('returns every collection for the search query', function () {
        $payload = $this->actingAs($this->agent)->getJson("{$this->url}?q=test")
            ->assertOk()
            ->json('payload');

        expect(array_keys($payload))->toEqualCanonicalizing(['contacts', 'conversations', 'messages', 'articles'])
            ->and($payload['messages'][0]['content'])->toBe('test2')
            ->and($payload['messages'])->toHaveCount(2)
            ->and($payload['conversations'])->toHaveCount(1)
            ->and($payload['contacts'])->toHaveCount(1)
            ->and($payload['articles'])->toBe([]);
    });

    it('returns matching conversations that have no messages', function () {
        $emptyContact = Contact::factory()->create(['account_id' => $this->account->id, 'name' => 'test empty']);
        $emptyConversation = Conversation::factory()->create([
            'account_id' => $this->account->id,
            'inbox_id' => $this->inbox->id,
            'contact_id' => $emptyContact->id,
        ]);

        $displayIds = collect(
            $this->actingAs($this->agent)->getJson("{$this->url}?q=test")->assertOk()->json('payload.conversations'),
        )->pluck('id')->all();

        expect($displayIds)->toContain($emptyConversation->display_id);
    });
});

describe('GET /api/v1/accounts/{id}/search/contacts', function () {
    it('returns unauthorized for an unauthenticated user', function () {
        $this->getJson("{$this->url}/contacts?q=test")->assertUnauthorized();
    });

    it('returns only contacts', function () {
        $payload = $this->actingAs($this->agent)->getJson("{$this->url}/contacts?q=test")->assertOk()->json('payload');

        expect(array_keys($payload))->toBe(['contacts'])->and($payload['contacts'])->toHaveCount(1);
    });

    it('returns last_activity_at and no created_at in contact results', function () {
        $contact = Contact::factory()->create([
            'account_id' => $this->account->id,
            'email' => 'activity@test.com',
            'last_activity_at' => now()->subDays(3),
        ]);

        $result = $this->actingAs($this->agent)->getJson("{$this->url}/contacts?q=activity")
            ->assertOk()
            ->json('payload.contacts.0');

        expect($result['last_activity_at'])->toBe($contact->last_activity_at->getTimestamp())
            ->and($result)->not->toHaveKey('created_at');
    });
});

describe('GET /api/v1/accounts/{id}/search/conversations', function () {
    it('returns unauthorized for an unauthenticated user', function () {
        $this->getJson("{$this->url}/conversations?q=test")->assertUnauthorized();
    });

    it('returns only conversations, keyed by display_id and with additional_attributes', function () {
        $payload = $this->actingAs($this->agent)->getJson("{$this->url}/conversations?q=test")
            ->assertOk()
            ->json('payload');

        expect(array_keys($payload))->toBe(['conversations'])
            ->and($payload['conversations'])->toHaveCount(1)
            ->and($payload['conversations'][0]['id'])->toBe($this->conversation->display_id)
            ->and($payload['conversations'][0])->toHaveKey('additional_attributes')
            ->and($payload['conversations'][0]['inbox']['id'])->toBe($this->inbox->id)
            ->and($payload['conversations'][0]['contact']['id'])->toBe($this->contact->id);
    });
});

describe('GET /api/v1/accounts/{id}/search/messages', function () {
    it('returns unauthorized for an unauthenticated user', function () {
        $this->getJson("{$this->url}/messages?q=test")->assertUnauthorized();
    });

    it('returns only messages', function () {
        $payload = $this->actingAs($this->agent)->getJson("{$this->url}/messages?q=test")->assertOk()->json('payload');

        expect(array_keys($payload))->toBe(['messages'])->and($payload['messages'])->toHaveCount(2);
    });

    it('paginates at fifteen messages per page', function () {
        Message::factory()->count(16)->create([
            'account_id' => $this->account->id,
            'inbox_id' => $this->inbox->id,
            'conversation_id' => $this->conversation->id,
            'content' => 'paged test message',
        ]);

        $firstPage = $this->actingAs($this->agent)->getJson("{$this->url}/messages?q=test&page=1")
            ->assertOk()->json('payload.messages');
        $secondPage = $this->actingAs($this->agent)->getJson("{$this->url}/messages?q=test&page=2")
            ->assertOk()->json('payload.messages');

        expect($firstPage)->toHaveCount(15)->and($secondPage)->toHaveCount(3);
    });
});

describe('GET /api/v1/accounts/{id}/search/articles', function () {
    it('returns unauthorized for an unauthenticated user', function () {
        $this->getJson("{$this->url}/articles?q=test")->assertUnauthorized();
    });

    // Help Center chưa port (E4) — khoá `articles` giữ nguyên nhưng luôn rỗng.
    it('returns an empty articles collection', function () {
        $payload = $this->actingAs($this->agent)->getJson("{$this->url}/articles?q=test")->assertOk()->json('payload');

        expect(array_keys($payload))->toBe(['articles'])->and($payload['articles'])->toBe([]);
    });
});
