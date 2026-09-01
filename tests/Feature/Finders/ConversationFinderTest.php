<?php

use App\Finders\ConversationFinder;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Contact;
use App\Models\ContactInbox;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Team;
use App\Models\User;

// Port từ spec/finders/conversation_finder_spec.rb.
// Bỏ ở B3: labels (B7), unread sort + conversation_type unattended (B8),
// participating/mention (B11), updated_within (realtime B4). Case agent bot
// thay bằng ghi thẳng assignee_agent_bot_id (bảng agent_bots chưa port).

function conversationFinderFixtures(): array
{
    $account = Account::factory()->create();

    $userOne = User::factory()->create();
    $userTwo = User::factory()->create();
    $admin = User::factory()->create();
    $accountUserOne = AccountUser::factory()->create(['account_id' => $account->id, 'user_id' => $userOne->id]);
    AccountUser::factory()->create(['account_id' => $account->id, 'user_id' => $userTwo->id]);
    $accountUserAdmin = AccountUser::factory()->create([
        'account_id' => $account->id,
        'user_id' => $admin->id,
        'role' => AccountUser::ROLE_ADMINISTRATOR,
    ]);

    $inbox = Inbox::factory()->create(['account_id' => $account->id]);
    $restrictedInbox = Inbox::factory()->create(['account_id' => $account->id]);
    $inbox->addMembers([$userOne->id, $userTwo->id]);

    $contact = Contact::factory()->create(['account_id' => $account->id]);
    $contactInbox = ContactInbox::factory()->create([
        'contact_id' => $contact->id,
        'inbox_id' => $inbox->id,
        'source_id' => 'testing_source_id',
    ]);

    $conversationAttributes = ['account_id' => $account->id, 'inbox_id' => $inbox->id];
    Conversation::factory()->create([...$conversationAttributes, 'assignee_id' => $userOne->id]);
    Conversation::factory()->create([...$conversationAttributes, 'assignee_id' => $userOne->id]);
    Conversation::factory()->create([
        ...$conversationAttributes,
        'assignee_id' => $userOne->id,
        'status' => Conversation::STATUS_RESOLVED,
    ]);
    Conversation::factory()->create([
        ...$conversationAttributes,
        'assignee_id' => $userTwo->id,
        'contact_id' => $contact->id,
        'contact_inbox_id' => $contactInbox->id,
    ]);
    Conversation::factory()->create($conversationAttributes);

    return compact('account', 'userOne', 'userTwo', 'admin', 'accountUserOne', 'accountUserAdmin', 'inbox', 'restrictedInbox');
}

function conversationFinderFor(array $fixtures, array $params, string $who = 'one'): ConversationFinder
{
    [$user, $accountUser] = $who === 'admin'
        ? [$fixtures['admin'], $fixtures['accountUserAdmin']]
        : [$fixtures['userOne'], $fixtures['accountUserOne']];

    return new ConversationFinder($user, $fixtures['account'], $accountUser, $params);
}

describe('perform', function () {
    it('filters conversations by status and assignee_type me', function () {
        $fixtures = conversationFinderFixtures();

        $result = conversationFinderFor($fixtures, ['status' => 'open', 'assignee_type' => 'me'])->perform();

        expect($result['conversations'])->toHaveCount(2);
    });

    it('returns open conversations by default without assignee filter', function () {
        $fixtures = conversationFinderFixtures();

        $result = conversationFinderFor($fixtures, [])->perform();

        expect($result['conversations'])->toHaveCount(4);
    });

    it('returns all conversations with status all', function () {
        $fixtures = conversationFinderFixtures();

        $result = conversationFinderFor($fixtures, ['status' => 'all'])->perform();

        expect($result['conversations'])->toHaveCount(5);
    });

    it('filters conversations by assignee type unassigned excluding bot assigned ones', function () {
        $fixtures = conversationFinderFixtures();
        $botConversation = Conversation::factory()->create([
            'account_id' => $fixtures['account']->id,
            'inbox_id' => $fixtures['inbox']->id,
            'assignee_agent_bot_id' => 99,
        ]);

        $result = conversationFinderFor($fixtures, ['assignee_type' => 'unassigned'])->perform();

        expect($result['conversations'])->toHaveCount(1)
            ->and($result['conversations']->pluck('id'))->not->toContain($botConversation->id);
    });

    it('filters conversations by assignee type assigned including bot assigned ones', function () {
        $fixtures = conversationFinderFixtures();
        $botConversation = Conversation::factory()->create([
            'account_id' => $fixtures['account']->id,
            'inbox_id' => $fixtures['inbox']->id,
            'assignee_agent_bot_id' => 99,
        ]);

        $result = conversationFinderFor($fixtures, ['assignee_type' => 'assigned'])->perform();

        expect($result['conversations'])->toHaveCount(4)
            ->and($result['conversations']->pluck('id'))->toContain($botConversation->id)
            ->and($result['count'])->toBe([
                'mine_count' => 2,
                'assigned_count' => 4,
                'unassigned_count' => 1,
                'all_count' => 5,
            ]);
    });

    describe('with inbox', function () {
        it('returns conversation from any inbox if its admin', function () {
            $fixtures = conversationFinderFixtures();
            $restrictedConversation = Conversation::factory()->create([
                'account_id' => $fixtures['account']->id,
                'inbox_id' => $fixtures['restrictedInbox']->id,
            ]);

            $result = conversationFinderFor($fixtures, ['inbox_id' => $fixtures['restrictedInbox']->id], 'admin')->perform();

            expect($result['conversations']->pluck('id'))->toContain($restrictedConversation->id);
        });

        it('returns conversation from inbox if agent is its member', function () {
            $fixtures = conversationFinderFixtures();
            $restrictedConversation = Conversation::factory()->create([
                'account_id' => $fixtures['account']->id,
                'inbox_id' => $fixtures['restrictedInbox']->id,
            ]);
            $fixtures['restrictedInbox']->addMembers([$fixtures['userOne']->id]);

            $result = conversationFinderFor($fixtures, ['inbox_id' => $fixtures['restrictedInbox']->id])->perform();

            expect($result['conversations']->pluck('id'))->toContain($restrictedConversation->id);
        });

        it('does not return conversations from inboxes where agent is not a member', function () {
            $fixtures = conversationFinderFixtures();
            $restrictedConversation = Conversation::factory()->create([
                'account_id' => $fixtures['account']->id,
                'inbox_id' => $fixtures['restrictedInbox']->id,
            ]);

            $result = conversationFinderFor($fixtures, ['inbox_id' => $fixtures['restrictedInbox']->id])->perform();

            expect($result['conversations']->pluck('id'))->not->toContain($restrictedConversation->id);
        });

        it('returns only the conversations from the inbox if inbox_id filter is passed', function () {
            $fixtures = conversationFinderFixtures();
            $restrictedConversation = Conversation::factory()->create([
                'account_id' => $fixtures['account']->id,
                'inbox_id' => $fixtures['restrictedInbox']->id,
            ]);
            $otherConversation = Conversation::factory()->create([
                'account_id' => $fixtures['account']->id,
                'inbox_id' => $fixtures['inbox']->id,
            ]);

            $result = conversationFinderFor($fixtures, ['inbox_id' => $fixtures['restrictedInbox']->id], 'admin')->perform();

            expect($result['conversations']->pluck('id'))->toContain($restrictedConversation->id)
                ->and($result['conversations']->pluck('id'))->not->toContain($otherConversation->id);
        });
    });

    it('filters conversations by team', function () {
        $fixtures = conversationFinderFixtures();
        $team = Team::factory()->create(['account_id' => $fixtures['account']->id]);
        Conversation::factory()->create([
            'account_id' => $fixtures['account']->id,
            'inbox_id' => $fixtures['inbox']->id,
            'team_id' => $team->id,
        ]);

        $result = conversationFinderFor($fixtures, ['team_id' => $team->id])->perform();

        expect($result['conversations'])->toHaveCount(1);
    });

    it('filters conversations by source id', function () {
        $fixtures = conversationFinderFixtures();

        $result = conversationFinderFor($fixtures, ['source_id' => 'testing_source_id'])->perform();

        expect($result['conversations'])->toHaveCount(1);
    });

    it('returns paginated conversations with 25 per page', function () {
        $fixtures = conversationFinderFixtures();
        Conversation::factory()->count(30)->create([
            'account_id' => $fixtures['account']->id,
            'inbox_id' => $fixtures['inbox']->id,
            'assignee_id' => $fixtures['userOne']->id,
        ]);

        $result = conversationFinderFor($fixtures, ['status' => 'open', 'assignee_type' => 'me', 'page' => 1])->perform();

        expect($result['conversations'])->toHaveCount(25);
    });

    describe('with sort_by', function () {
        it('sorts by last_activity_at desc by default', function () {
            $fixtures = conversationFinderFixtures();
            $attributes = ['account_id' => $fixtures['account']->id, 'inbox_id' => $fixtures['inbox']->id];
            $older = Conversation::factory()->create([...$attributes, 'last_activity_at' => now()->subDays(3)]);
            $newest = Conversation::factory()->create([...$attributes, 'last_activity_at' => now()->addDay()]);

            $result = conversationFinderFor($fixtures, [], 'admin')->perform();

            expect($result['conversations']->first()->id)->toBe($newest->id)
                ->and($result['conversations']->pluck('id'))->toContain($older->id);
        });

        it('sorts by created_at asc when requested', function () {
            $fixtures = conversationFinderFixtures();
            $attributes = ['account_id' => $fixtures['account']->id, 'inbox_id' => $fixtures['inbox']->id];
            $oldest = Conversation::factory()->create([...$attributes, 'created_at' => now()->subYear()]);

            $result = conversationFinderFor($fixtures, ['sort_by' => 'created_at_asc'], 'admin')->perform();

            expect($result['conversations']->first()->id)->toBe($oldest->id);
        });
    });
});

describe('perform_meta_only', function () {
    it('returns only count without conversations', function () {
        $fixtures = conversationFinderFixtures();

        $result = conversationFinderFor($fixtures, ['assignee_type' => 'assigned'])->performMetaOnly();

        expect($result)->toHaveKey('count')
            ->not->toHaveKey('conversations');
    });

    it('returns the correct counts', function () {
        $fixtures = conversationFinderFixtures();

        $result = conversationFinderFor($fixtures, ['assignee_type' => 'assigned'])->performMetaOnly();

        expect($result['count'])->toBe([
            'mine_count' => 2,
            'assigned_count' => 3,
            'unassigned_count' => 1,
            'all_count' => 4,
        ]);
    });

    it('returns same counts as perform', function () {
        $fixtures = conversationFinderFixtures();

        $metaResult = conversationFinderFor($fixtures, ['assignee_type' => 'assigned'])->performMetaOnly();
        $fullResult = conversationFinderFor($fixtures, ['assignee_type' => 'assigned'])->perform();

        expect($metaResult['count'])->toBe($fullResult['count']);
    });
});
