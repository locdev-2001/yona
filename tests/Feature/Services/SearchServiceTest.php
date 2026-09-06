<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Contact;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use App\Models\User;
use App\Services\SearchService;

// Port từ spec/services/search_service_spec.rb.
// Bỏ các khối Elasticsearch/Searchkick (:opensearch + #advanced_search) — nhánh
// đó là enterprise, PHP không port (xem note e2).
beforeEach(function () {
    $this->account = Account::factory()->create();
    $this->user = User::factory()->create();
    $this->accountUser = AccountUser::factory()->create([
        'account_id' => $this->account->id,
        'user_id' => $this->user->id,
    ]);
    $this->inbox = Inbox::factory()->create(['account_id' => $this->account->id, 'enable_auto_assignment' => false]);
    $this->user->inboxes()->attach($this->inbox->id);

    $this->harry = Contact::factory()->create([
        'account_id' => $this->account->id,
        'name' => 'Harry Potter',
        'email' => 'test@test.com',
    ]);
    $this->conversation = Conversation::factory()->create([
        'account_id' => $this->account->id,
        'inbox_id' => $this->inbox->id,
        'contact_id' => $this->harry->id,
    ]);
    $this->message = Message::factory()->create([
        'account_id' => $this->account->id,
        'inbox_id' => $this->inbox->id,
        'conversation_id' => $this->conversation->id,
        'content' => 'Harry Potter is a wizard',
    ]);
});

function e2Search(array $params, string $searchType): SearchService
{
    return new SearchService(test()->user, test()->account->fresh(), $params, $searchType);
}

describe('#perform', function () {
    it('returns every collection for the "all" search type', function () {
        expect(array_keys(e2Search(['q' => 'Potter'], 'all')->perform()))
            ->toEqualCanonicalizing(['contacts', 'messages', 'conversations', 'articles']);
    });

    it('returns only the collection matching the search type', function (string $searchType, string $key) {
        expect(array_keys(e2Search(['q' => 'Potter'], $searchType)->perform()))->toBe([$key]);
    })->with([
        ['Contact', 'contacts'],
        ['Message', 'messages'],
        ['Conversation', 'conversations'],
        ['Article', 'articles'],
    ]);
});

describe('contact search', function () {
    it('searches name, email, phone_number and identifier ordered by last_activity_at', function () {
        Contact::factory()->create(['account_id' => $this->account->id]);
        // Liên hệ chưa xác định danh tính (không email/phone/identifier) không lên kết quả.
        Contact::factory()->create(['account_id' => $this->account->id, 'name' => 'Harry Potter']);
        $harry2 = Contact::factory()->create([
            'account_id' => $this->account->id,
            'email' => 'HarryPotter@test.com',
            'last_activity_at' => now()->subDays(2),
        ]);
        $harry3 = Contact::factory()->create([
            'account_id' => $this->account->id,
            'identifier' => 'Potter123',
            'last_activity_at' => now()->subDay(),
        ]);
        $harry4 = Contact::factory()->create([
            'account_id' => $this->account->id,
            'identifier' => 'Potter1235',
            'last_activity_at' => now()->subMinutes(2),
        ]);
        $this->harry->update(['last_activity_at' => now()->subDays(10)]);

        $ids = e2Search(['q' => 'Potter '], 'Contact')->perform()['contacts']->pluck('id')->all();

        expect($ids)->toBe([$harry4->id, $harry3->id, $harry2->id, $this->harry->id]);
    });
});

describe('message search', function () {
    it('searches message content and returns created_at desc', function () {
        $message2 = Message::factory()->create([
            'account_id' => $this->account->id,
            'inbox_id' => $this->inbox->id,
            'conversation_id' => $this->conversation->id,
            'content' => 'harry is cool',
            'created_at' => now()->addSecond(),
        ]);
        // Tin ở account khác.
        Message::factory()->create(['content' => 'Harry Potter is a wizard']);
        // Tin ở inbox người dùng không có quyền.
        $otherInbox = Inbox::factory()->create(['account_id' => $this->account->id]);
        Message::factory()->create([
            'account_id' => $this->account->id,
            'inbox_id' => $otherInbox->id,
            'content' => 'Harry Potter is a wizard',
        ]);

        $ids = e2Search(['q' => 'Harry'], 'Message')->perform()['messages']->pluck('id')->all();

        expect($ids)->toBe([$message2->id, $this->message->id]);
    });

    it('returns the same messages with GIN search as with ILIKE search', function () {
        $message3 = Message::factory()->create([
            'account_id' => $this->account->id,
            'inbox_id' => $this->inbox->id,
            'conversation_id' => $this->conversation->id,
            'content' => 'Harry is a wizard apprentice',
        ]);

        $likeIds = e2Search(['q' => 'Harry'], 'Message')->perform()['messages']->pluck('id')->all();

        $this->account->forceFill(['feature_flags' => ['search_with_gin' => true]])->save();
        $ginService = e2Search(['q' => 'Harry'], 'Message');
        expect($ginService->useGinSearch())->toBeTrue();
        $ginIds = $ginService->perform()['messages']->pluck('id')->all();

        expect($ginIds)->toEqualCanonicalizing($likeIds)
            ->and($ginIds)->toContain($this->message->id, $message3->id);
    });

    it('orders with id as tiebreaker when created_at collides', function () {
        $sameMoment = now()->subMinute();
        $first = Message::factory()->create([
            'account_id' => $this->account->id,
            'inbox_id' => $this->inbox->id,
            'conversation_id' => $this->conversation->id,
            'content' => 'phoenix feather',
            'created_at' => $sameMoment,
        ]);
        $second = Message::factory()->create([
            'account_id' => $this->account->id,
            'inbox_id' => $this->inbox->id,
            'conversation_id' => $this->conversation->id,
            'content' => 'phoenix wand',
            'created_at' => $sameMoment,
        ]);

        $ids = e2Search(['q' => 'phoenix'], 'Message')->perform()['messages']->pluck('id')->all();

        expect($ids)->toBe([$second->id, $first->id]);
    });

    it('only searches messages from the last three months', function () {
        Message::factory()->create([
            'account_id' => $this->account->id,
            'inbox_id' => $this->inbox->id,
            'conversation_id' => $this->conversation->id,
            'content' => 'Harry ancient message',
            'created_at' => now()->subMonths(4),
        ]);

        $ids = e2Search(['q' => 'Harry'], 'Message')->perform()['messages']->pluck('id')->all();

        expect($ids)->toBe([$this->message->id]);
    });

    describe('advanced_search filters', function () {
        beforeEach(function () {
            $this->account->forceFill(['feature_flags' => ['advanced_search' => true]])->save();
            $this->agent = User::factory()->create();
            AccountUser::factory()->create(['account_id' => $this->account->id, 'user_id' => $this->agent->id]);
            $this->inbox2 = Inbox::factory()->create(['account_id' => $this->account->id]);
            $this->user->inboxes()->attach($this->inbox2->id);

            $conversation2 = Conversation::factory()->create([
                'account_id' => $this->account->id,
                'inbox_id' => $this->inbox2->id,
            ]);

            $this->oldMessage = Message::factory()->create([
                'account_id' => $this->account->id,
                'inbox_id' => $this->inbox->id,
                'conversation_id' => $this->conversation->id,
                'content' => 'old wizard message',
                'sender_type' => 'Contact',
                'sender_id' => $this->harry->id,
                'created_at' => now()->subDays(80),
            ]);
            $this->recentMessage = Message::factory()->create([
                'account_id' => $this->account->id,
                'inbox_id' => $this->inbox->id,
                'conversation_id' => $this->conversation->id,
                'content' => 'recent wizard message',
                'sender_type' => 'Contact',
                'sender_id' => $this->harry->id,
                'created_at' => now()->subDay(),
            ]);
            $this->agentMessage = Message::factory()->create([
                'account_id' => $this->account->id,
                'inbox_id' => $this->inbox->id,
                'conversation_id' => $this->conversation->id,
                'content' => 'wizard from agent',
                'sender_type' => 'User',
                'sender_id' => $this->agent->id,
                'created_at' => now()->subDay(),
            ]);
            $this->inbox2Message = Message::factory()->create([
                'account_id' => $this->account->id,
                'inbox_id' => $this->inbox2->id,
                'conversation_id' => $conversation2->id,
                'content' => 'wizard in inbox2',
                'sender_type' => 'Contact',
                'sender_id' => $this->harry->id,
                'created_at' => now()->subDay(),
            ]);
        });

        it('filters messages by time range', function () {
            $ids = e2Search(['q' => 'wizard', 'since' => now()->subDays(50)->timestamp], 'Message')
                ->perform()['messages']->pluck('id')->all();

            expect($ids)->toContain($this->recentMessage->id, $this->agentMessage->id, $this->inbox2Message->id)
                ->and($ids)->not->toContain($this->oldMessage->id);
        });

        it('filters messages by contact sender', function () {
            $ids = e2Search(['q' => 'wizard', 'from' => "contact:{$this->harry->id}"], 'Message')
                ->perform()['messages']->pluck('id')->all();

            expect($ids)->toContain($this->recentMessage->id, $this->oldMessage->id, $this->inbox2Message->id)
                ->and($ids)->not->toContain($this->agentMessage->id);
        });

        it('filters messages by agent sender', function () {
            $ids = e2Search(['q' => 'wizard', 'from' => "agent:{$this->agent->id}"], 'Message')
                ->perform()['messages']->pluck('id')->all();

            expect($ids)->toBe([$this->agentMessage->id]);
        });

        it('ignores an invalid from parameter', function () {
            $ids = e2Search(['q' => 'wizard', 'from' => 'invalid:format'], 'Message')
                ->perform()['messages']->pluck('id')->all();

            expect($ids)->toContain($this->agentMessage->id, $this->recentMessage->id);
        });

        it('filters messages by inbox', function () {
            $ids = e2Search(['q' => 'wizard', 'inbox_id' => $this->inbox2->id], 'Message')
                ->perform()['messages']->pluck('id')->all();

            expect($ids)->toBe([$this->inbox2Message->id]);
        });

        it('combines every filter', function () {
            $ids = e2Search([
                'q' => 'wizard',
                'since' => now()->subDays(50)->timestamp,
                'inbox_id' => $this->inbox->id,
                'from' => "contact:{$this->harry->id}",
            ], 'Message')->perform()['messages']->pluck('id')->all();

            expect($ids)->toBe([$this->recentMessage->id]);
        });

        it('silently caps since to ninety days ago', function () {
            $ids = e2Search(['q' => 'wizard', 'since' => now()->subDays(200)->timestamp], 'Message')
                ->perform()['messages']->pluck('id')->all();

            expect($ids)->toContain($this->oldMessage->id);
        });
    });
});

describe('conversation search', function () {
    it('searches conversations through contact information ordered by created_at desc', function () {
        $random = Contact::factory()->create(['account_id' => $this->account->id]);
        Conversation::factory()->create([
            'account_id' => $this->account->id,
            'inbox_id' => $this->inbox->id,
            'contact_id' => $random->id,
        ]);
        $conversation2 = Conversation::factory()->create([
            'account_id' => $this->account->id,
            'inbox_id' => $this->inbox->id,
            'contact_id' => $this->harry->id,
            'created_at' => now()->addSecond(),
        ]);

        $ids = e2Search(['q' => 'Harry'], 'Conversation')->perform()['conversations']->pluck('id')->all();

        expect($ids)->toBe([$conversation2->id, $this->conversation->id]);
    });

    it('searches conversations by display id', function () {
        $random = Contact::factory()->create([
            'account_id' => $this->account->id,
            'name' => 'random',
            'email' => 'random@random.test',
            'identifier' => 'random',
        ]);
        $newConversation = Conversation::factory()->create([
            'account_id' => $this->account->id,
            'inbox_id' => $this->inbox->id,
            'contact_id' => $random->id,
        ]);

        $ids = e2Search(['q' => (string) $newConversation->display_id], 'Conversation')
            ->perform()['conversations']->pluck('id')->all();

        expect($ids)->toContain($newConversation->id);
    });

    it('caps the since filter to ninety days ago when advanced_search is on', function () {
        $this->account->forceFill(['feature_flags' => ['advanced_search' => true]])->save();
        $oldConversation = Conversation::factory()->create([
            'account_id' => $this->account->id,
            'inbox_id' => $this->inbox->id,
            'contact_id' => $this->harry->id,
            'last_activity_at' => now()->subDays(100),
        ]);
        $recentConversation = Conversation::factory()->create([
            'account_id' => $this->account->id,
            'inbox_id' => $this->inbox->id,
            'contact_id' => $this->harry->id,
            'last_activity_at' => now()->subDay(),
        ]);

        $ids = e2Search(['q' => 'Harry', 'since' => now()->subDays(100)->timestamp], 'Conversation')
            ->perform()['conversations']->pluck('id')->all();

        expect($ids)->toContain($recentConversation->id)->and($ids)->not->toContain($oldConversation->id);
    });
});

describe('message base query inbox scoping', function () {
    it('does not filter by inbox for an administrator', function () {
        $this->accountUser->update(['role' => AccountUser::ROLE_ADMINISTRATOR]);
        Inbox::factory()->create(['account_id' => $this->account->id]);

        expect(e2Search(['q' => 'test'], 'Message')->messageBaseQuery()->toSql())->not->toContain('inbox_id');
    });

    it('filters by accessible inbox when the agent has limited access', function () {
        Inbox::factory()->create(['account_id' => $this->account->id]);

        $sql = e2Search(['q' => 'test'], 'Message')->messageBaseQuery()->toSql();

        expect($sql)->toContain('created_at')->and($sql)->toContain('inbox_id');
    });

    it('skips inbox filtering when the agent can access every inbox', function () {
        $otherInbox = Inbox::factory()->create(['account_id' => $this->account->id]);
        $this->user->inboxes()->attach($otherInbox->id);

        expect(e2Search(['q' => 'test'], 'Message')->messageBaseQuery()->toSql())->not->toContain('inbox_id');
    });
});

describe('#useGinSearch', function () {
    it('follows the search_with_gin feature flag', function () {
        expect(e2Search(['q' => 'test'], 'Message')->useGinSearch())->toBeFalse();

        $this->account->forceFill(['feature_flags' => ['search_with_gin' => true]])->save();

        expect(e2Search(['q' => 'test'], 'Message')->useGinSearch())->toBeTrue();
    });
});

describe('pagination', function () {
    it('returns fifteen records per page', function () {
        Contact::factory()->count(20)->create([
            'account_id' => $this->account->id,
            'identifier' => fn () => fake()->unique()->uuid(),
            'name' => 'Magic contact',
        ]);

        expect(e2Search(['q' => 'Magic'], 'Contact')->perform()['contacts'])->toHaveCount(15)
            ->and(e2Search(['q' => 'Magic', 'page' => 2], 'Contact')->perform()['contacts'])->toHaveCount(5);
    });
});
