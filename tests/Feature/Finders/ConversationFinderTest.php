<?php

use App\Finders\ConversationFinder;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Contact;
use App\Models\ContactInbox;
use App\Models\Conversation;
use App\Models\ConversationParticipant;
use App\Models\Inbox;
use App\Models\Mention;
use App\Models\Message;
use App\Models\Team;
use App\Models\User;

// Port từ spec/finders/conversation_finder_spec.rb.
// Bỏ: custom view (E1). Case agent bot thay bằng ghi thẳng
// assignee_agent_bot_id (bảng agent_bots chưa port).

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

describe('updated_within', function () {
    it('returns every filtered conversation in the time range without pagination', function () {
        $fixtures = conversationFinderFixtures();
        $attributes = [
            'account_id' => $fixtures['account']->id,
            'inbox_id' => $fixtures['inbox']->id,
            'assignee_id' => null,
            'created_at' => now()->subSeconds(30),
            'updated_at' => now()->subSeconds(30),
        ];
        $conversations = Conversation::factory()->count(40)->create($attributes);
        $conversations->take(28)->each(fn (Conversation $conversation) => $conversation->forceFill(['updated_at' => now()->subSeconds(10)])->save());

        $result = conversationFinderFor(
            $fixtures,
            ['updated_within' => 20, 'assignee_type' => 'unassigned', 'sort_by' => 'created_at_asc'],
            'admin',
        )->perform();

        // 28 vừa cập nhật + 1 conversation chưa gán tạo lúc dựng fixture — vượt trang 25.
        expect($result['conversations'])->toHaveCount(29)
            ->and($result['conversations']->pluck('created_at')->map->getTimestamp()->all())
            ->toBe($result['conversations']->pluck('created_at')->map->getTimestamp()->sort()->values()->all());
    });
});

describe('sort_by unread', function () {
    it('returns conversations with the highest unread count first', function () {
        $fixtures = conversationFinderFixtures();
        $attributes = ['account_id' => $fixtures['account']->id, 'inbox_id' => $fixtures['inbox']->id];
        $mostUnread = Conversation::factory()->create([...$attributes, 'agent_last_seen_at' => now()->subHour()]);
        $unread = Conversation::factory()->create([...$attributes, 'agent_last_seen_at' => now()->subHour()]);
        $read = Conversation::factory()->create([...$attributes, 'agent_last_seen_at' => now()->addMinute()]);
        $resolvedUnread = Conversation::factory()->create([...$attributes, 'agent_last_seen_at' => now()->subHour()]);

        foreach ([$mostUnread, $unread, $read, $resolvedUnread] as $conversation) {
            Message::factory()->create([
                'account_id' => $fixtures['account']->id,
                'conversation_id' => $conversation->id,
                'created_at' => now()->subMinutes(5),
            ]);
        }
        Message::factory()->create([
            'account_id' => $fixtures['account']->id,
            'conversation_id' => $mostUnread->id,
            'created_at' => now()->subMinutes(4),
        ]);
        // Tin incoming mở lại hội thoại đã resolve nên phải resolve SAU khi có tin.
        $resolvedUnread->update(['status' => Conversation::STATUS_RESOLVED]);
        $read->forceFill(['last_activity_at' => now()->addMinute()])->save();
        $unread->forceFill(['last_activity_at' => now()->addMinutes(2)])->save();

        $result = conversationFinderFor($fixtures, ['status' => 'open', 'sort_by' => 'unread'])->perform();
        $ids = $result['conversations']->pluck('id')->all();

        expect($ids)->toContain($mostUnread->id, $unread->id, $read->id)
            ->and($ids)->not->toContain($resolvedUnread->id)
            ->and(array_search($mostUnread->id, $ids, true))->toBeLessThan(array_search($unread->id, $ids, true))
            ->and(array_search($unread->id, $ids, true))->toBeLessThan(array_search($read->id, $ids, true));
    });
});

describe('conversation_type', function () {
    it('keeps only unattended conversations', function () {
        $fixtures = conversationFinderFixtures();
        $attended = Conversation::factory()->create([
            'account_id' => $fixtures['account']->id,
            'inbox_id' => $fixtures['inbox']->id,
            'first_reply_created_at' => now(),
        ]);
        $attended->forceFill(['waiting_since' => null])->save();

        $result = conversationFinderFor($fixtures, ['status' => 'open', 'conversation_type' => 'unattended'])->perform();

        expect($result['conversations']->pluck('id'))->not->toContain($attended->id)
            ->and($result['conversations'])->toHaveCount(4)
            ->and($result['count']['all_count'])->toBe(4);
    });

    it('returns nothing for mention when nobody was mentioned', function () {
        $fixtures = conversationFinderFixtures();

        $result = conversationFinderFor($fixtures, ['status' => 'all', 'conversation_type' => 'mention'])->perform();

        expect($result['conversations'])->toHaveCount(0)
            ->and($result['count'])->toBe([
                'mine_count' => 0,
                'assigned_count' => 0,
                'unassigned_count' => 0,
                'all_count' => 0,
            ]);
    });

    // Giao hội thoại cho agent tự đưa họ vào participants (ParticipationListener)
    // nên tab Participating luôn có sẵn các hội thoại đang gán cho mình.
    it('returns conversations assigned to the current user under participating', function () {
        $fixtures = conversationFinderFixtures();

        $result = conversationFinderFor($fixtures, ['status' => 'all', 'conversation_type' => 'participating'])->perform();

        expect($result['conversations'])->toHaveCount(3)
            ->and($result['count']['all_count'])->toBe(3);
    });

    it('returns only conversations where the current user was mentioned', function () {
        $fixtures = conversationFinderFixtures();
        $mentioned = Conversation::factory()->create([
            'account_id' => $fixtures['account']->id,
            'inbox_id' => $fixtures['inbox']->id,
        ]);
        $otherUserMention = Conversation::factory()->create([
            'account_id' => $fixtures['account']->id,
            'inbox_id' => $fixtures['inbox']->id,
        ]);
        Mention::factory()->create(['conversation_id' => $mentioned->id, 'user_id' => $fixtures['userOne']->id]);
        Mention::factory()->create(['conversation_id' => $otherUserMention->id, 'user_id' => $fixtures['userTwo']->id]);

        $result = conversationFinderFor($fixtures, ['status' => 'all', 'conversation_type' => 'mention'])->perform();

        expect($result['conversations']->pluck('id')->all())->toBe([$mentioned->id])
            ->and($result['count']['all_count'])->toBe(1);
    });

    it('excludes participating conversations from inboxes the user no longer has access to', function () {
        $fixtures = conversationFinderFixtures();
        $accessible = Conversation::factory()->create([
            'account_id' => $fixtures['account']->id,
            'inbox_id' => $fixtures['inbox']->id,
        ]);
        $revoked = Conversation::factory()->create([
            'account_id' => $fixtures['account']->id,
            'inbox_id' => $fixtures['restrictedInbox']->id,
        ]);
        $fixtures['restrictedInbox']->addMembers([$fixtures['userOne']->id]);
        ConversationParticipant::factory()->create(['conversation_id' => $accessible->id, 'user_id' => $fixtures['userOne']->id]);
        ConversationParticipant::factory()->create(['conversation_id' => $revoked->id, 'user_id' => $fixtures['userOne']->id]);
        $fixtures['restrictedInbox']->inboxMembers()->where('user_id', $fixtures['userOne']->id)->delete();

        $result = conversationFinderFor($fixtures, ['status' => 'all', 'conversation_type' => 'participating'])->perform();
        $metaResult = conversationFinderFor($fixtures, ['status' => 'all', 'conversation_type' => 'participating'])->performMetaOnly();

        expect($result['conversations']->pluck('id')->all())->toContain($accessible->id)
            ->and($result['conversations']->pluck('id')->all())->not->toContain($revoked->id)
            ->and($metaResult['count']['all_count'])->toBe($result['conversations']->count());
    });

    it('applies the conversation type to meta only counts as well', function () {
        $fixtures = conversationFinderFixtures();
        $attended = Conversation::factory()->create([
            'account_id' => $fixtures['account']->id,
            'inbox_id' => $fixtures['inbox']->id,
            'first_reply_created_at' => now(),
        ]);
        $attended->forceFill(['waiting_since' => null])->save();

        $metaResult = conversationFinderFor($fixtures, ['status' => 'open', 'conversation_type' => 'unattended'])->performMetaOnly();
        $fullResult = conversationFinderFor($fixtures, ['status' => 'open', 'conversation_type' => 'unattended'])->perform();

        expect($metaResult['count'])->toBe($fullResult['count'])
            ->and($metaResult['count']['all_count'])->toBe(4);
    });
});

describe('q', function () {
    function searchableConversation(array $fixtures, array $contactAttributes, array $conversationAttributes = []): Conversation
    {
        $contact = Contact::factory()->create(['account_id' => $fixtures['account']->id, ...$contactAttributes]);

        return Conversation::factory()->create([
            'account_id' => $fixtures['account']->id,
            'inbox_id' => $fixtures['inbox']->id,
            'contact_id' => $contact->id,
            ...$conversationAttributes,
        ]);
    }

    it('keeps only conversations matching contact name, phone, email, id or message content', function () {
        $fixtures = conversationFinderFixtures();
        $byName = searchableConversation($fixtures, ['name' => 'Nguyễn Thị Xoàizz']);
        $byPhone = searchableConversation($fixtures, ['name' => 'Khách A', 'phone_number' => '+84901234567']);
        $byEmail = searchableConversation($fixtures, ['name' => 'Khách B', 'email' => 'xoaizz.shop@example.com']);
        $byContent = searchableConversation($fixtures, ['name' => 'Khách C']);
        Message::factory()->create([
            'account_id' => $fixtures['account']->id,
            'inbox_id' => $fixtures['inbox']->id,
            'conversation_id' => $byContent->id,
            'content' => 'Chị Xoàizz ơi, đơn này giao chiều nay nhé',
        ]);

        $ids = fn (string $q) => conversationFinderFor($fixtures, ['status' => 'all', 'q' => $q])
            ->perform()['conversations']->pluck('id')->sort()->values()->all();

        expect($ids('xoaizz'))->toBe(collect([$byName->id, $byEmail->id, $byContent->id])->sort()->values()->all())
            ->and($ids('901234567'))->toBe([$byPhone->id])
            ->and($ids((string) $byPhone->display_id))->toContain($byPhone->id)
            ->and($ids('#'.$byPhone->display_id))->toContain($byPhone->id)
            ->and($ids('giao chieu'))->toBe([$byContent->id]);
    });

    it('keeps the status, assignee tab and inbox filters of the list and counts only matches', function () {
        $fixtures = conversationFinderFixtures();
        $mineOpen = searchableConversation($fixtures, ['name' => 'Xoàizz mở'], ['assignee_id' => $fixtures['userOne']->id]);
        searchableConversation($fixtures, ['name' => 'Xoàizz đã xong'], [
            'assignee_id' => $fixtures['userOne']->id,
            'status' => Conversation::STATUS_RESOLVED,
        ]);
        $unassignedOpen = searchableConversation($fixtures, ['name' => 'Xoàizz chưa gán']);

        $params = ['status' => 'open', 'assignee_type' => 'me', 'inbox_id' => $fixtures['inbox']->id, 'q' => 'xoaizz'];
        $result = conversationFinderFor($fixtures, $params)->perform();
        $meta = conversationFinderFor($fixtures, $params)->performMetaOnly();

        expect($result['conversations']->pluck('id')->all())->toBe([$mineOpen->id])
            ->and($result['count'])->toBe([
                'mine_count' => 1,
                'assigned_count' => 1,
                'unassigned_count' => 1,
                'all_count' => 2,
            ])
            ->and($meta['count'])->toBe($result['count'])
            ->and($unassignedOpen->id)->not->toBe($mineOpen->id);
    });

    it('never returns matches from inboxes the agent cannot see', function () {
        $fixtures = conversationFinderFixtures();
        $contact = Contact::factory()->create(['account_id' => $fixtures['account']->id, 'name' => 'Xoàizz bí mật']);
        Conversation::factory()->create([
            'account_id' => $fixtures['account']->id,
            'inbox_id' => $fixtures['restrictedInbox']->id,
            'contact_id' => $contact->id,
        ]);

        $result = conversationFinderFor($fixtures, ['status' => 'all', 'q' => 'xoaizz'])->perform();

        expect($result['conversations'])->toHaveCount(0)
            ->and($result['count']['all_count'])->toBe(0);
    });

    it('ignores a blank query', function () {
        $fixtures = conversationFinderFixtures();

        $withBlank = conversationFinderFor($fixtures, ['status' => 'all', 'q' => '   '])->perform();
        $without = conversationFinderFor($fixtures, ['status' => 'all'])->perform();

        expect($withBlank['count'])->toBe($without['count']);
    });
});
