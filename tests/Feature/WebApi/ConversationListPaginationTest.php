<?php

use App\Http\Resources\ConversationResource;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Contact;
use App\Models\ContactInbox;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use App\Models\Team;
use App\Models\User;
use Illuminate\Support\Facades\DB;

// Thẻ hội thoại đủ loại: tin của khách lẫn của agent, tin hoạt động đứng cuối,
// người được gán, nhóm, lần xem cuối — để lộ mọi truy vấn lặp theo từng thẻ.
function paginationListFixtures(int $conversationCount): array
{
    $account = Account::factory()->create();
    $admin = User::factory()->create();
    AccountUser::factory()->create([
        'account_id' => $account->id,
        'user_id' => $admin->id,
        'role' => AccountUser::ROLE_ADMINISTRATOR,
    ]);
    $inbox = Inbox::factory()->create(['account_id' => $account->id]);
    $team = Team::factory()->create(['account_id' => $account->id]);
    $team->members()->attach($admin->id);

    foreach (range(1, $conversationCount) as $index) {
        $contact = Contact::factory()->create(['account_id' => $account->id]);
        $contactInbox = ContactInbox::factory()->create(['contact_id' => $contact->id, 'inbox_id' => $inbox->id]);
        $conversation = Conversation::factory()->create([
            'account_id' => $account->id,
            'inbox_id' => $inbox->id,
            'contact_id' => $contact->id,
            'contact_inbox_id' => $contactInbox->id,
            'assignee_id' => $index % 2 === 0 ? $admin->id : null,
            'team_id' => $index % 3 === 0 ? $team->id : null,
            'agent_last_seen_at' => $index % 2 === 0 ? now()->subMinutes(30) : null,
        ]);

        $messageAttributes = ['account_id' => $account->id, 'inbox_id' => $inbox->id, 'conversation_id' => $conversation->id];
        Message::factory()->create([...$messageAttributes, 'message_type' => Message::TYPE_INCOMING, 'sender_type' => 'Contact', 'sender_id' => $contact->id, 'created_at' => now()->subHour()]);
        Message::factory()->create([...$messageAttributes, 'message_type' => Message::TYPE_INCOMING, 'sender_type' => 'Contact', 'sender_id' => $contact->id, 'created_at' => now()->subMinutes(10)]);
        $outgoingAt = now()->subMinutes(5);
        Message::factory()->create([...$messageAttributes, 'message_type' => Message::TYPE_OUTGOING, 'sender_type' => 'User', 'sender_id' => $admin->id, 'created_at' => $outgoingAt]);

        // Hai tin trùng mốc giờ: tin id lớn hơn phải là tin cuối ở cả hai đường dựng thẻ.
        if ($index % 4 === 0) {
            Message::factory()->create([...$messageAttributes, 'message_type' => Message::TYPE_OUTGOING, 'sender_type' => 'User', 'sender_id' => $admin->id, 'created_at' => $outgoingAt]);
        }

        if ($index % 2 === 1) {
            Message::factory()->create([...$messageAttributes, 'message_type' => Message::TYPE_ACTIVITY, 'created_at' => now()->subMinute()]);
        }
    }

    return [$account, $admin];
}

function countListQueries(Account $account, User $admin): int
{
    DB::flushQueryLog();
    DB::enableQueryLog();
    test()->actingAs($admin)->getJson("/api/v1/accounts/{$account->id}/conversations?status=all")->assertOk();
    $queryCount = count(DB::getQueryLog());
    DB::disableQueryLog();

    return $queryCount;
}

it('builds a full page of conversation cards with the same number of queries as a short page', function () {
    [$smallAccount, $smallAdmin] = paginationListFixtures(3);
    [$fullAccount, $fullAdmin] = paginationListFixtures(25);

    expect(countListQueries($fullAccount, $fullAdmin))->toBe(countListQueries($smallAccount, $smallAdmin));
});

it('renders preloaded cards exactly like cards built one by one', function () {
    [$account, $admin] = paginationListFixtures(8);
    $this->actingAs($admin);

    $conversations = Conversation::query()->where('account_id', $account->id)->orderBy('id')->get();
    $oneByOne = $conversations->map(
        fn (Conversation $conversation) => (new ConversationResource($conversation->fresh()))->toArray(request())
    )->all();

    $preloaded = ConversationResource::collectionFor(Conversation::query()->where('account_id', $account->id)->orderBy('id')->get());

    expect(json_encode($preloaded, JSON_PRETTY_PRINT))->toBe(json_encode($oneByOne, JSON_PRETTY_PRINT));
});

// Thẻ đơn lẻ dựng lại ở mỗi tin mới: truy vấn gộp theo hội thoại có thể rơi vào
// kế hoạch vòng lặp lồng nhau khi thống kê bảng cũ, chậm theo bậc ba số tin.
it('builds a single card from index lookups instead of the per-page aggregate', function () {
    [$account, $admin] = paginationListFixtures(1);
    $this->actingAs($admin);
    $conversation = Conversation::query()->where('account_id', $account->id)->firstOrFail();

    DB::flushQueryLog();
    DB::enableQueryLog();
    ConversationResource::pushEventData($conversation);
    $aggregateQueries = collect(DB::getQueryLog())->filter(fn (array $query) => str_contains($query['query'], '_aggregate'));
    DB::disableQueryLog();

    expect($aggregateQueries)->toBeEmpty();
});

it('hands out a cursor on the first page and serves later pages without tab counts', function () {
    [$account, $admin] = paginationListFixtures(27);

    $firstPage = $this->actingAs($admin)
        ->getJson("/api/v1/accounts/{$account->id}/conversations?status=all")
        ->assertOk();

    expect($firstPage->json('data.meta'))->toHaveKeys(['all_count', 'mine_count', 'assigned_count', 'unassigned_count', 'next_cursor'])
        ->and($firstPage->json('data.payload'))->toHaveCount(25);

    $secondPage = $this->getJson("/api/v1/accounts/{$account->id}/conversations?status=all&cursor={$firstPage->json('data.meta.next_cursor')}")
        ->assertOk();

    expect($secondPage->json('data.meta'))->toBe(['next_cursor' => null])
        ->and($secondPage->json('data.payload'))->toHaveCount(2)
        ->and(array_intersect(
            array_column($firstPage->json('data.payload'), 'id'),
            array_column($secondPage->json('data.payload'), 'id'),
        ))->toBe([]);
});

it('answers a malformed cursor with a validation error', function () {
    [$account, $admin] = paginationListFixtures(1);

    $this->actingAs($admin)
        ->getJson("/api/v1/accounts/{$account->id}/conversations?cursor=khong-hop-le")
        ->assertUnprocessable()
        ->assertJsonValidationErrors('cursor');
});
