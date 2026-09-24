<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\AgentBot;
use App\Models\Attachment;
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
    $this->firstMessage = Message::factory()->create([
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

        expect(array_keys($payload))->toEqualCanonicalizing(['contacts', 'conversations', 'messages', 'files', 'articles'])
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
            ->and($payload['conversations'][0]['contact']['id'])->toBe($this->contact->id)
            ->and($payload['conversations'][0])->toHaveKey('matched_member_name')
            ->and($payload['conversations'][0]['matched_member_name'])->toBeNull();
    });

    it('names the group member that matched the query', function () {
        $group = Contact::factory()->create(['account_id' => $this->account->id, 'name' => 'Hội Khách Sỉ']);
        $groupConversation = Conversation::factory()->create([
            'account_id' => $this->account->id,
            'inbox_id' => $this->inbox->id,
            'contact_id' => $group->id,
        ]);
        Message::factory()->create([
            'account_id' => $this->account->id,
            'inbox_id' => $this->inbox->id,
            'conversation_id' => $groupConversation->id,
            'content' => 'Còn hàng không?',
            'content_attributes' => ['sender' => ['external_id' => 'u-9', 'name' => 'Trần Đức', 'avatar' => '']],
        ]);

        $conversations = $this->actingAs($this->agent)->getJson("{$this->url}/conversations?q=tran duc")
            ->assertOk()
            ->json('payload.conversations');

        expect($conversations)->toHaveCount(1)
            ->and($conversations[0]['id'])->toBe($groupConversation->display_id)
            ->and($conversations[0]['matched_member_name'])->toBe('Trần Đức');
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

describe('GET /api/v1/accounts/{id}/search/files', function () {
    beforeEach(function () {
        $this->file = $this->firstMessage->attachments()->create([
            'account_id' => $this->account->id,
            'file_type' => Attachment::FILE_TYPE_FILE,
            'path' => 'attachments/test/bao-gia.pdf',
            'filename' => 'Báo giá T9.pdf',
            'content_type' => 'application/pdf',
            'byte_size' => 20480,
        ]);
    });

    it('returns unauthorized for an unauthenticated user', function () {
        $this->getJson("{$this->url}/files?q=bao")->assertUnauthorized();
    });

    it('returns matching files with their display name and the message holding them', function () {
        $payload = $this->actingAs($this->agent)->getJson("{$this->url}/files?q=bao")->assertOk()->json('payload');

        expect(array_keys($payload))->toBe(['files'])
            ->and($payload['files'])->toHaveCount(1)
            ->and($payload['files'][0])->toMatchArray([
                'id' => $this->file->id,
                'message_id' => $this->firstMessage->id,
                'file_type' => 'file',
                'file_name' => 'Báo giá T9.pdf',
                'extension' => 'pdf',
            ])
            ->and($payload['files'][0]['data_url'])->toContain('/attachments/')
            ->and($payload['files'][0]['message']['id'])->toBe($this->firstMessage->id)
            ->and($payload['files'][0]['message']['conversation_id'])->toBe($this->conversation->display_id)
            ->and($payload['files'][0]['message']['inbox_id'])->toBe($this->inbox->id);
    });

    it('is part of the combined search', function () {
        $files = $this->actingAs($this->agent)->getJson("{$this->url}?q=bao gia")->assertOk()->json('payload.files');

        expect(collect($files)->pluck('id')->all())->toBe([$this->file->id]);
    });

    it('returns nothing for an agent outside the inbox of the file', function () {
        $outsider = User::factory()->create();
        AccountUser::factory()->create(['account_id' => $this->account->id, 'user_id' => $outsider->id]);
        $outsider->inboxes()->attach(Inbox::factory()->create(['account_id' => $this->account->id])->id);

        $this->actingAs($outsider)->getJson("{$this->url}/files?q=bao")
            ->assertOk()
            ->assertJsonPath('payload.files', []);
    });
});

// Mặt tiền API cho bên ngoài: cùng route, xác thực bằng header api_access_token.
describe('search with an api_access_token header', function () {
    it('answers files and messages without a session', function () {
        $this->firstMessage->attachments()->create([
            'account_id' => $this->account->id,
            'file_type' => Attachment::FILE_TYPE_FILE,
            'path' => 'attachments/test/test-file.pdf',
            'filename' => 'test-file.pdf',
            'content_type' => 'application/pdf',
            'byte_size' => 1024,
        ]);
        $token = $this->agent->accessToken->token;

        $this->withHeader('api_access_token', $token)->getJson("{$this->url}/files?q=test")
            ->assertOk()
            ->assertJsonPath('payload.files.0.file_name', 'test-file.pdf');
        $this->withHeader('api_access_token', $token)->getJson("{$this->url}/messages?q=test")
            ->assertOk()
            ->assertJsonCount(2, 'payload.messages');
    });

    it('rejects an unknown token', function () {
        $this->withHeader('api_access_token', 'not-a-real-token')->getJson("{$this->url}/files?q=test")
            ->assertUnauthorized();
    });

    it('rejects an agent bot token', function () {
        $bot = AgentBot::factory()->create(['account_id' => $this->account->id]);

        $this->withHeader('api_access_token', $bot->accessToken->token)->getJson("{$this->url}/files?q=test")
            ->assertUnauthorized();
    });
});

describe('GET /app/accounts/{id}/search/{tab}', function () {
    it('renders the search page on the files tab', function () {
        $this->actingAs($this->agent)->get("/app/accounts/{$this->account->id}/search/files?q=bao")
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('dashboard/search/SearchView')->where('tab', 'files'));
    });

    it('does not open the search page on an unknown tab', function () {
        $this->actingAs($this->agent)->get("/app/accounts/{$this->account->id}/search/unknown")
            ->assertInertia(fn ($page) => $page->component('dashboard/PlaceholderView'));
    });
});
