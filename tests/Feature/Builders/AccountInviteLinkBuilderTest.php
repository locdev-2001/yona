<?php

use App\Builders\AccountInviteLinkBuilder;
use App\Models\Account;
use App\Models\AccountInviteLink;
use App\Models\AccountUser;
use App\Models\User;

function inviteLinkBuilderFor(Account $account, User $creator, array $overrides = []): AccountInviteLinkBuilder
{
    return new AccountInviteLinkBuilder(...array_merge([
        'account' => $account,
        'creator' => $creator,
        'role' => 'agent',
        'expiresInDays' => 7,
        'maxUses' => null,
    ], $overrides));
}

describe('AccountInviteLinkBuilder#perform', function () {
    it('creates a link and returns the raw token only once', function () {
        $account = Account::factory()->create();
        $admin = User::factory()->create();

        $result = inviteLinkBuilderFor($account, $admin)->perform();

        expect($result['token'])->toBeString()->not->toBeEmpty();

        $link = $result['link'];
        expect($link)->toBeInstanceOf(AccountInviteLink::class)
            ->and($link->account_id)->toBe($account->id)
            ->and($link->created_by_id)->toBe($admin->id)
            ->and($link->role)->toBe(AccountUser::ROLE_AGENT)
            ->and($link->use_count)->toBe(0)
            ->and($link->token_digest)->toBe(AccountInviteLink::hashToken($result['token']))
            ->and($link->token_digest)->not->toBe($result['token']);
    });

    it('sets expiry from the requested number of days', function () {
        $account = Account::factory()->create();
        $admin = User::factory()->create();

        $result = inviteLinkBuilderFor($account, $admin, ['expiresInDays' => 30])->perform();

        expect($result['link']->expires_at->diffInDays(now()))->toBeLessThanOrEqual(30)
            ->and($result['link']->expires_at->isFuture())->toBeTrue();
    });

    it('maps role name to the administrator constant', function () {
        $account = Account::factory()->create();
        $admin = User::factory()->create();

        $result = inviteLinkBuilderFor($account, $admin, ['role' => 'administrator'])->perform();

        expect($result['link']->role)->toBe(AccountUser::ROLE_ADMINISTRATOR);
    });

    it('stores an optional max_uses limit', function () {
        $account = Account::factory()->create();
        $admin = User::factory()->create();

        $result = inviteLinkBuilderFor($account, $admin, ['maxUses' => 5])->perform();

        expect($result['link']->max_uses)->toBe(5);
    });
});
