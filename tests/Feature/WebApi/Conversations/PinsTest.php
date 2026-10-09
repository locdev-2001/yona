<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Contact;
use App\Models\ContactInbox;
use App\Models\Conversation;
use App\Models\ConversationPin;
use App\Models\Inbox;
use App\Models\User;

function pinsTestAdminOf(Account $account): User
{
    $user = User::factory()->create();
    AccountUser::factory()->create([
        'account_id' => $account->id,
        'user_id' => $user->id,
        'role' => AccountUser::ROLE_ADMINISTRATOR,
    ]);

    return $user;
}

/** @return list<Conversation> mới hoạt động nhất đứng đầu */
function pinsTestConversations(Account $account, int $count, array $attributes = []): array
{
    $inbox = Inbox::factory()->create(['account_id' => $account->id]);

    return collect(range(1, $count))->map(function (int $index) use ($account, $inbox, $attributes) {
        $contact = Contact::factory()->create(['account_id' => $account->id]);
        $contactInbox = ContactInbox::factory()->create(['contact_id' => $contact->id, 'inbox_id' => $inbox->id]);

        return Conversation::factory()->create([
            'account_id' => $account->id,
            'inbox_id' => $inbox->id,
            'contact_id' => $contact->id,
            'contact_inbox_id' => $contactInbox->id,
            'last_activity_at' => now()->subMinutes($index),
            ...$attributes,
        ]);
    })->all();
}

function pinsTestListIds(Account $account, User $viewer, string $query = 'status=all'): array
{
    return test()->actingAs($viewer)
        ->getJson("/api/v1/accounts/{$account->id}/conversations?{$query}")
        ->assertOk()
        ->json('data.payload.*.id');
}

describe('ghim hội thoại', function () {
    it('đưa hội thoại đã ghim lên đầu danh sách của chính người ghim, kèm cờ pinned', function () {
        $account = Account::factory()->create();
        $pinner = pinsTestAdminOf($account);
        [$newest, $middle, $oldest] = pinsTestConversations($account, 3);

        $this->actingAs($pinner)
            ->postJson("/api/v1/accounts/{$account->id}/conversations/{$oldest->display_id}/pin")
            ->assertNoContent();

        $payload = $this->actingAs($pinner)
            ->getJson("/api/v1/accounts/{$account->id}/conversations?status=all")
            ->assertOk()
            ->json('data.payload');

        expect(array_column($payload, 'id'))->toBe([$oldest->display_id, $newest->display_id, $middle->display_id])
            ->and(array_column($payload, 'pinned'))->toBe([true, false, false]);
    });

    it('không đổi danh sách của nhân viên khác', function () {
        $account = Account::factory()->create();
        $pinner = pinsTestAdminOf($account);
        $colleague = pinsTestAdminOf($account);
        [$newest, $oldest] = pinsTestConversations($account, 2);
        ConversationPin::pin($pinner, $oldest);

        $payload = $this->actingAs($colleague)
            ->getJson("/api/v1/accounts/{$account->id}/conversations?status=all")
            ->json('data.payload');

        expect(array_column($payload, 'id'))->toBe([$newest->display_id, $oldest->display_id])
            ->and(array_column($payload, 'pinned'))->toBe([false, false]);
    });

    it('bỏ ghim trả hội thoại về đúng thứ tự cũ; ghim hay bỏ ghim lặp lại không lỗi', function () {
        $account = Account::factory()->create();
        $pinner = pinsTestAdminOf($account);
        [$newest, $oldest] = pinsTestConversations($account, 2);
        $pinUrl = "/api/v1/accounts/{$account->id}/conversations/{$oldest->display_id}/pin";

        $this->actingAs($pinner)->postJson($pinUrl)->assertNoContent();
        $this->actingAs($pinner)->postJson($pinUrl)->assertNoContent();
        expect(ConversationPin::query()->where('user_id', $pinner->id)->count())->toBe(1);

        $this->actingAs($pinner)->deleteJson($pinUrl)->assertNoContent();
        $this->actingAs($pinner)->deleteJson($pinUrl)->assertNoContent();

        expect(pinsTestListIds($account, $pinner))->toBe([$newest->display_id, $oldest->display_id]);
    });

    it('vẫn tôn trọng bộ lọc: hội thoại ghim không khớp trạng thái thì không hiện', function () {
        $account = Account::factory()->create();
        $pinner = pinsTestAdminOf($account);
        [$open] = pinsTestConversations($account, 1);
        [$resolved] = pinsTestConversations($account, 1, ['status' => Conversation::STATUS_RESOLVED]);
        ConversationPin::pin($pinner, $resolved);

        expect(pinsTestListIds($account, $pinner, 'status=open'))->toBe([$open->display_id]);
    });

    it('trang đầu trả trọn nhóm ghim, trang sau theo con trỏ không lặp lại nhóm đó', function () {
        $account = Account::factory()->create();
        $pinner = pinsTestAdminOf($account);
        $conversations = pinsTestConversations($account, 27);
        $pinned = end($conversations);
        ConversationPin::pin($pinner, $pinned);

        $firstPage = $this->actingAs($pinner)
            ->getJson("/api/v1/accounts/{$account->id}/conversations?status=all")
            ->assertOk();
        $firstIds = $firstPage->json('data.payload.*.id');
        $cursor = $firstPage->json('data.meta.next_cursor');

        expect($firstIds)->toHaveCount(26)
            ->and($firstIds[0])->toBe($pinned->display_id)
            ->and($cursor)->not->toBeNull();

        $secondIds = pinsTestListIds($account, $pinner, 'status=all&cursor='.$cursor);

        expect($secondIds)->toBe([$conversations[25]->display_id]);
    });

    it('danh sách lọc nâng cao cũng xếp hội thoại ghim lên đầu, số đếm giữ nguyên', function () {
        $account = Account::factory()->create();
        $pinner = pinsTestAdminOf($account);
        [$newest, $oldest] = pinsTestConversations($account, 2);
        ConversationPin::pin($pinner, $oldest);

        $response = $this->actingAs($pinner)->postJson("/api/v1/accounts/{$account->id}/conversations/filter", [
            'payload' => [['attribute_key' => 'status', 'filter_operator' => 'equal_to', 'values' => ['open'], 'query_operator' => null]],
        ])->assertOk();

        expect($response->json('data.payload.*.id'))->toBe([$oldest->display_id, $newest->display_id])
            ->and($response->json('data.meta.all_count'))->toBe(2);
    });

    it('không ghim được hội thoại của account khác', function () {
        $account = Account::factory()->create();
        [$foreign] = pinsTestConversations(Account::factory()->create(), 1);
        $outsider = pinsTestAdminOf($account);

        $this->actingAs($outsider)
            ->postJson("/api/v1/accounts/{$foreign->account_id}/conversations/{$foreign->display_id}/pin")
            ->assertNotFound();

        expect(ConversationPin::query()->count())->toBe(0);
    });

    it('nhân viên không thuộc hộp thư không ghim được hội thoại trong đó', function () {
        $account = Account::factory()->create();
        [$conversation] = pinsTestConversations($account, 1);
        $agent = User::factory()->create();
        AccountUser::factory()->create(['account_id' => $account->id, 'user_id' => $agent->id, 'role' => AccountUser::ROLE_AGENT]);

        $this->actingAs($agent)
            ->postJson("/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/pin")
            ->assertUnauthorized();
    });

    it('ghim qua API bằng api_access_token và trả cờ pinned ở payload một hội thoại', function () {
        $account = Account::factory()->create();
        $pinner = pinsTestAdminOf($account);
        [$conversation] = pinsTestConversations($account, 1);
        $headers = ['api_access_token' => $pinner->accessToken->token];

        $this->postJson("/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/pin", [], $headers)
            ->assertNoContent();

        $this->getJson("/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}", $headers)
            ->assertOk()
            ->assertJsonPath('pinned', true);
    });
    it('ghim mới đứng đầu nhóm ghim, payload mang pin_position', function () {
        $account = Account::factory()->create();
        $pinner = pinsTestAdminOf($account);
        [$newest, $middle, $oldest] = pinsTestConversations($account, 3);

        foreach ([$newest, $oldest] as $conversation) {
            $this->actingAs($pinner)
                ->postJson("/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/pin")
                ->assertNoContent();
        }

        $payload = $this->actingAs($pinner)
            ->getJson("/api/v1/accounts/{$account->id}/conversations?status=all")
            ->json('data.payload');

        expect(array_column($payload, 'id'))->toBe([$oldest->display_id, $newest->display_id, $middle->display_id])
            ->and(array_column($payload, 'pin_position'))->toBe([-2, -1, null]);
    });

    it('đổi thứ tự nhóm ghim, danh sách thường và lọc nâng cao theo thứ tự mới', function () {
        $account = Account::factory()->create();
        $pinner = pinsTestAdminOf($account);
        [$first, $second, $third, $unpinned] = pinsTestConversations($account, 4);
        foreach ([$third, $second, $first] as $conversation) {
            ConversationPin::pin($pinner, $conversation);
        }

        $this->actingAs($pinner)
            ->patchJson("/api/v1/accounts/{$account->id}/conversations/pins/order", [
                'conversation_ids' => [$third->display_id, $first->display_id, $second->display_id],
            ])
            ->assertOk()
            ->assertExactJson(['payload' => [
                ['id' => $third->display_id, 'pin_position' => 0],
                ['id' => $first->display_id, 'pin_position' => 1],
                ['id' => $second->display_id, 'pin_position' => 2],
            ]]);

        $expected = [$third->display_id, $first->display_id, $second->display_id, $unpinned->display_id];
        $filtered = $this->actingAs($pinner)->postJson("/api/v1/accounts/{$account->id}/conversations/filter", [
            'payload' => [['attribute_key' => 'status', 'filter_operator' => 'equal_to', 'values' => ['open'], 'query_operator' => null]],
        ])->json('data.payload.*.id');

        expect(pinsTestListIds($account, $pinner))->toBe($expected)
            ->and($filtered)->toBe($expected);
    });

    it('xếp một phần nhóm ghim chỉ đổi chỗ trong những ô đang chiếm, bỏ qua mã không ghim', function () {
        $account = Account::factory()->create();
        $pinner = pinsTestAdminOf($account);
        [$a, $b, $c, $d, $unpinned] = pinsTestConversations($account, 5);
        foreach ([$d, $c, $b, $a] as $conversation) {
            ConversationPin::pin($pinner, $conversation);
        }

        $this->actingAs($pinner)
            ->patchJson("/api/v1/accounts/{$account->id}/conversations/pins/order", [
                'conversation_ids' => [$d->display_id, $unpinned->display_id, 999999, $b->display_id],
            ])
            ->assertOk();

        expect(pinsTestListIds($account, $pinner))
            ->toBe([$a->display_id, $d->display_id, $c->display_id, $b->display_id, $unpinned->display_id]);
    });

    it('đổi thứ tự chỉ chạm nhóm ghim của chính người gọi trong account đó', function () {
        $account = Account::factory()->create();
        $pinner = pinsTestAdminOf($account);
        $colleague = pinsTestAdminOf($account);
        [$first, $second] = pinsTestConversations($account, 2);
        foreach ([$pinner, $colleague] as $user) {
            ConversationPin::pin($user, $second);
            ConversationPin::pin($user, $first);
        }
        $otherAccount = Account::factory()->create();
        AccountUser::factory()->create(['account_id' => $otherAccount->id, 'user_id' => $pinner->id, 'role' => AccountUser::ROLE_ADMINISTRATOR]);
        [$foreign] = pinsTestConversations($otherAccount, 1);
        ConversationPin::pin($pinner, $foreign);

        $this->actingAs($pinner)
            ->patchJson("/api/v1/accounts/{$account->id}/conversations/pins/order", [
                'conversation_ids' => [$second->display_id, $first->display_id],
            ])
            ->assertOk()
            ->assertJsonCount(2, 'payload');

        expect(pinsTestListIds($account, $pinner))->toBe([$second->display_id, $first->display_id])
            ->and(pinsTestListIds($account, $colleague))->toBe([$first->display_id, $second->display_id])
            ->and(ConversationPin::query()->where('conversation_id', $foreign->id)->value('position'))->toBe(-1);
    });

    it('từ chối danh sách đổi thứ tự rỗng hoặc sai kiểu', function (mixed $conversationIds) {
        $account = Account::factory()->create();
        $pinner = pinsTestAdminOf($account);

        $this->actingAs($pinner)
            ->patchJson("/api/v1/accounts/{$account->id}/conversations/pins/order", ['conversation_ids' => $conversationIds])
            ->assertUnprocessable();
    })->with([
        'rỗng' => [[]],
        'không phải mảng' => ['1,2'],
        'phần tử không phải số' => [['abc']],
    ]);

    it('sau khi đổi thứ tự, trang theo con trỏ vẫn không lặp nhóm ghim', function () {
        $account = Account::factory()->create();
        $pinner = pinsTestAdminOf($account);
        $conversations = pinsTestConversations($account, 28);
        [$lastPinned, $firstPinned] = [$conversations[26], $conversations[27]];
        ConversationPin::pin($pinner, $lastPinned);
        ConversationPin::pin($pinner, $firstPinned);
        ConversationPin::reorder($pinner, $account->id, [$lastPinned->display_id, $firstPinned->display_id]);

        $firstPage = $this->actingAs($pinner)->getJson("/api/v1/accounts/{$account->id}/conversations?status=all");
        $secondIds = pinsTestListIds($account, $pinner, 'status=all&cursor='.$firstPage->json('data.meta.next_cursor'));

        expect(array_slice($firstPage->json('data.payload.*.id'), 0, 2))->toBe([$lastPinned->display_id, $firstPinned->display_id])
            ->and($firstPage->json('data.payload.*.id'))->toHaveCount(27)
            ->and($secondIds)->toBe([$conversations[25]->display_id]);
    });
});
