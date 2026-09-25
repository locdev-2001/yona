<?php

use App\Exceptions\Account\InviteLinkUnusable;
use App\Exceptions\Account\UserExists;
use App\Models\Account;
use App\Models\AccountInviteLink;
use App\Models\AccountUser;
use App\Models\User;
use App\Services\AccountInviteAcceptanceService;

function service(): AccountInviteAcceptanceService
{
    return app(AccountInviteAcceptanceService::class);
}

describe('acceptForNewUser', function () {
    it('creates a confirmed user and joins the account with the link role', function () {
        $link = AccountInviteLink::factory()->administrator()->create();

        $accountUser = service()->acceptForNewUser($link, 'new@example.com', 'Password1!', 'New Person');

        expect($accountUser)->toBeInstanceOf(AccountUser::class)
            ->and($accountUser->account_id)->toBe($link->account_id)
            ->and($accountUser->role)->toBe(AccountUser::ROLE_ADMINISTRATOR)
            ->and($accountUser->invite_link_id)->toBe($link->id)
            ->and($accountUser->inviter_id)->toBe($link->created_by_id);

        $user = User::fromEmail('new@example.com');
        expect($user)->not->toBeNull()
            ->and($user->name)->toBe('New Person')
            ->and($user->isConfirmed())->toBeTrue();

        expect($link->refresh()->use_count)->toBe(1);
    });

    it('falls back to the email local part when name is blank', function () {
        $link = AccountInviteLink::factory()->create();

        service()->acceptForNewUser($link, 'jane@example.com', 'Password1!', null);

        expect(User::fromEmail('jane@example.com')->name)->toBe('jane');
    });

    it('rejects an email that already belongs to a user', function () {
        $link = AccountInviteLink::factory()->create();
        $existing = User::factory()->create(['email' => 'exists@example.com']);

        expect(fn () => service()->acceptForNewUser($link, 'exists@example.com', 'Password1!', null))
            ->toThrow(UserExists::class);

        expect($link->refresh()->use_count)->toBe(0)
            ->and($existing->accountUsers()->count())->toBe(0);
    });

    it('rejects revoked links without creating a user', function () {
        $link = AccountInviteLink::factory()->revoked()->create();

        expect(fn () => service()->acceptForNewUser($link, 'blocked@example.com', 'Password1!', null))
            ->toThrow(InviteLinkUnusable::class);

        expect(User::fromEmail('blocked@example.com'))->toBeNull();
    });

    it('rejects expired links', function () {
        $link = AccountInviteLink::factory()->expired()->create();

        $exception = null;
        try {
            service()->acceptForNewUser($link, 'late@example.com', 'Password1!', null);
        } catch (InviteLinkUnusable $caught) {
            $exception = $caught;
        }

        expect($exception)->not->toBeNull()->and($exception->reason)->toBe('expired');
    });

    it('rejects links that have reached max_uses', function () {
        $link = AccountInviteLink::factory()->create(['max_uses' => 1, 'use_count' => 1]);

        $exception = null;
        try {
            service()->acceptForNewUser($link, 'toolate@example.com', 'Password1!', null);
        } catch (InviteLinkUnusable $caught) {
            $exception = $caught;
        }

        expect($exception)->not->toBeNull()->and($exception->reason)->toBe('exhausted');
    });
});

describe('acceptForExistingUser', function () {
    it('adds the current user as a new member with the link role', function () {
        $link = AccountInviteLink::factory()->create();
        $user = User::factory()->create();

        $accountUser = service()->acceptForExistingUser($link, $user);

        expect($accountUser->account_id)->toBe($link->account_id)
            ->and($accountUser->user_id)->toBe($user->id)
            ->and($accountUser->invite_link_id)->toBe($link->id);
        expect($link->refresh()->use_count)->toBe(1);
    });

    it('is idempotent when the user is already a member and does not consume a use', function () {
        $account = Account::factory()->create();
        $link = AccountInviteLink::factory()->create(['account_id' => $account->id]);
        $user = User::factory()->create();
        $existingMembership = AccountUser::factory()->create([
            'account_id' => $account->id,
            'user_id' => $user->id,
        ]);

        $result = service()->acceptForExistingUser($link, $user);

        expect($result->is($existingMembership))->toBeTrue()
            ->and($link->refresh()->use_count)->toBe(0)
            ->and($user->accountUsers()->count())->toBe(1);
    });

    it('rejects an unusable link for an existing user not yet a member', function () {
        $link = AccountInviteLink::factory()->revoked()->create();
        $user = User::factory()->create();

        expect(fn () => service()->acceptForExistingUser($link, $user))
            ->toThrow(InviteLinkUnusable::class);
    });
});
