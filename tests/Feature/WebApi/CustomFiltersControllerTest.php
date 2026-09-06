<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\CustomFilter;
use App\Models\User;
use Illuminate\Support\Facades\DB;

function customFilterApiUser(Account $account, int $role = AccountUser::ROLE_AGENT): User
{
    $user = User::factory()->create();
    AccountUser::factory()->create([
        'account_id' => $account->id,
        'user_id' => $user->id,
        'role' => $role,
    ]);

    return $user;
}

function customFilterPayload(array $overrides = []): array
{
    return ['custom_filter' => [
        'name' => 'vip-customers',
        'filter_type' => 'conversation',
        'query' => ['payload' => [[
            'values' => ['open'],
            'attribute_key' => 'status',
            'attribute_model' => 'standard',
            'filter_operator' => 'equal_to',
        ]]],
        ...$overrides,
    ]];
}

describe('custom_filters API', function () {
    it('requires authentication', function () {
        $account = Account::factory()->create();

        $this->getJson("/api/v1/accounts/{$account->id}/custom_filters")->assertUnauthorized();
    });

    it('lists only the filters of the current user for the requested type', function () {
        $account = Account::factory()->create();
        $user = customFilterApiUser($account);
        $mine = CustomFilter::factory()->create(['account_id' => $account->id, 'user_id' => $user->id]);
        CustomFilter::factory()->create([
            'account_id' => $account->id,
            'user_id' => $user->id,
            'filter_type' => CustomFilter::TYPE_CONTACT,
        ]);
        CustomFilter::factory()->create([
            'account_id' => $account->id,
            'user_id' => customFilterApiUser($account)->id,
        ]);

        $response = $this->actingAs($user)
            ->getJson("/api/v1/accounts/{$account->id}/custom_filters")
            ->assertOk();

        expect($response->json())->toHaveCount(1)
            ->and($response->json('0.name'))->toBe($mine->name)
            ->and($response->json('0.query'))->toBe($mine->query)
            ->and($response->json('0.filter_type'))->toBe('conversation');

        $contactFilters = $this->actingAs($user)
            ->getJson("/api/v1/accounts/{$account->id}/custom_filters?filter_type=contact")
            ->assertOk();

        expect($contactFilters->json())->toHaveCount(1)
            ->and($contactFilters->json('0.filter_type'))->toBe('contact');
    });

    it('creates a filter owned by the current user', function () {
        $account = Account::factory()->create();
        $user = customFilterApiUser($account);

        $response = $this->actingAs($user)
            ->postJson("/api/v1/accounts/{$account->id}/custom_filters", customFilterPayload())
            ->assertOk()
            ->assertJsonPath('name', 'vip-customers');

        $filter = CustomFilter::query()->findOrFail($response->json('id'));

        expect($filter->user_id)->toBe($user->id)
            ->and($filter->account_id)->toBe($account->id)
            ->and($filter->query['payload'][0]['values'])->toBe(['open']);
    });

    it('refuses to create past the per-user limit', function () {
        $account = Account::factory()->create();
        $user = customFilterApiUser($account);
        $now = now();
        DB::table('custom_filters')->insert(collect(range(1, CustomFilter::MAX_PER_USER))
            ->map(fn (int $index) => [
                'account_id' => $account->id,
                'user_id' => $user->id,
                'name' => "Filter {$index}",
                'filter_type' => 0,
                'query' => '{}',
                'created_at' => $now,
                'updated_at' => $now,
            ])->all());

        $this->actingAs($user)
            ->postJson("/api/v1/accounts/{$account->id}/custom_filters", customFilterPayload())
            ->assertStatus(422)
            ->assertJsonPath(
                'message',
                'Account Limit reached. The maximum number of allowed custom filters for a user per account is 1000.',
            );

        expect(CustomFilter::query()->count())->toBe(CustomFilter::MAX_PER_USER);
    });

    it('rejects a blank name', function () {
        $account = Account::factory()->create();
        $user = customFilterApiUser($account);

        $this->actingAs($user)
            ->postJson("/api/v1/accounts/{$account->id}/custom_filters", customFilterPayload(['name' => '  ']))
            ->assertStatus(422)
            ->assertJsonPath('message', "Name can't be blank");
    });

    it('updates its own filter', function () {
        $account = Account::factory()->create();
        $user = customFilterApiUser($account);
        $filter = CustomFilter::factory()->create(['account_id' => $account->id, 'user_id' => $user->id]);

        $this->actingAs($user)->patchJson(
            "/api/v1/accounts/{$account->id}/custom_filters/{$filter->id}",
            customFilterPayload(['query' => ['payload' => [[
                'values' => ['resolved'],
                'attribute_key' => 'status',
                'filter_operator' => 'equal_to',
            ]]]]),
        )->assertOk();

        $filter->refresh();

        expect($filter->name)->toBe('vip-customers')
            ->and($filter->filter_type)->toBe('conversation')
            ->and($filter->query['payload'][0]['values'])->toBe(['resolved']);
    });

    it('cannot touch a filter of another user or account', function () {
        $account = Account::factory()->create();
        $user = customFilterApiUser($account);
        $otherUsersFilter = CustomFilter::factory()->create([
            'account_id' => $account->id,
            'user_id' => customFilterApiUser($account)->id,
        ]);
        $otherAccountsFilter = CustomFilter::factory()->create();

        $this->actingAs($user)
            ->getJson("/api/v1/accounts/{$account->id}/custom_filters/{$otherUsersFilter->id}")
            ->assertNotFound();

        $this->actingAs($user)
            ->patchJson("/api/v1/accounts/{$account->id}/custom_filters/{$otherAccountsFilter->id}", customFilterPayload())
            ->assertNotFound();
    });

    it('deletes its own filter', function () {
        $account = Account::factory()->create();
        $user = customFilterApiUser($account);
        $filter = CustomFilter::factory()->create(['account_id' => $account->id, 'user_id' => $user->id]);

        $this->actingAs($user)
            ->deleteJson("/api/v1/accounts/{$account->id}/custom_filters/{$filter->id}")
            ->assertNoContent();

        expect(CustomFilter::query()->count())->toBe(0);
    });
});
