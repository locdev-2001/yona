<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Contact;
use App\Models\User;
use App\Support\OnlineStatusTracker;
use Illuminate\Support\Facades\Redis;

// Port từ spec/lib/online_status_tracker_spec.rb (Redis DB 4 — phpunit.xml).

function trackerAccountWithUsers(): array
{
    $account = Account::factory()->create();
    $users = User::factory()->count(3)->create();
    $users->each(fn (User $user) => AccountUser::factory()->create(['account_id' => $account->id, 'user_id' => $user->id]));

    return [$account, ...$users->all()];
}

beforeEach(function () {
    Redis::flushdb();
});

describe('getAvailableUsers', function () {
    it('returns only the online user ids with presence', function () {
        [$account, $user1, $user2, $user3] = trackerAccountWithUsers();
        OnlineStatusTracker::updatePresence($account->id, 'User', $user1->id);
        OnlineStatusTracker::updatePresence($account->id, 'User', $user2->id);

        $available = OnlineStatusTracker::getAvailableUsers($account->id);

        expect(array_keys($available))->toEqualCanonicalizing([$user1->id, $user2->id])
            ->and($available)->not->toHaveKey($user3->id);
    });

    it('returns agents who have auto offline configured false', function () {
        [$account, $user1, $user2] = trackerAccountWithUsers();
        OnlineStatusTracker::updatePresence($account->id, 'User', $user1->id);
        AccountUser::query()->where('user_id', $user2->id)->update(['auto_offline' => false]);

        expect(array_keys(OnlineStatusTracker::getAvailableUsers($account->id)))
            ->toEqualCanonicalizing([$user1->id, $user2->id]);
    });

    it('returns the availability from the db if it is not present in redis and sets it in redis', function () {
        [$account, $user1, $user2] = trackerAccountWithUsers();
        OnlineStatusTracker::updatePresence($account->id, 'User', $user1->id);
        OnlineStatusTracker::updatePresence($account->id, 'User', $user2->id);
        AccountUser::query()->where('account_id', $account->id)->where('user_id', $user2->id)
            ->update(['availability' => AccountUser::AVAILABILITY_OFFLINE]);
        Redis::del(OnlineStatusTracker::statusKey($account->id));

        $available = OnlineStatusTracker::getAvailableUsers($account->id);

        expect($available[$user1->id])->toBe('online')
            ->and($available[$user2->id])->toBe('offline')
            ->and(OnlineStatusTracker::getStatus($account->id, $user1->id))->toBe('online')
            ->and(OnlineStatusTracker::getStatus($account->id, $user2->id))->toBe('offline');
    });

    it('returns an empty map when nobody is online', function () {
        [$account] = trackerAccountWithUsers();

        expect(OnlineStatusTracker::getAvailableUsers($account->id))->toBe([]);
    });
});

describe('getAvailableContacts', function () {
    function trackerContacts(): array
    {
        $account = Account::factory()->create();
        $online = Contact::factory()->create(['account_id' => $account->id]);
        $offline = Contact::factory()->create(['account_id' => $account->id]);

        OnlineStatusTracker::updatePresence($account->id, 'Contact', $online->id);
        $stale = now()->getTimestamp() - (config('yona.contact_presence_duration') + 20);
        Redis::zadd(OnlineStatusTracker::presenceKey($account->id, 'Contact'), $stale, (string) $offline->id);

        return [$account, $online, $offline];
    }

    it('returns only the online contact ids with presence', function () {
        [$account, $online] = trackerContacts();

        expect(array_keys(OnlineStatusTracker::getAvailableContacts($account->id)))->toBe([$online->id])
            ->and(OnlineStatusTracker::getAvailableContacts($account->id)[$online->id])->toBe('online');
    });

    it('flushes the stale records from sorted set after the duration', function () {
        [$account, , $offline] = trackerContacts();

        OnlineStatusTracker::getAvailableContacts($account->id);

        expect(Redis::zscore(OnlineStatusTracker::presenceKey($account->id, 'Contact'), (string) $offline->id))->toBeFalsy();
    });
});

describe('getPresence', function () {
    it('is true right after update_presence and false when stale', function () {
        $account = Account::factory()->create();
        $contact = Contact::factory()->create(['account_id' => $account->id]);

        expect(OnlineStatusTracker::getPresence($account->id, 'Contact', $contact->id))->toBeFalse();

        OnlineStatusTracker::updatePresence($account->id, 'Contact', $contact->id);
        expect(OnlineStatusTracker::getPresence($account->id, 'Contact', $contact->id))->toBeTrue()
            ->and($contact->availabilityStatus())->toBe('online');

        $stale = now()->getTimestamp() - config('yona.contact_presence_duration') - 1;
        Redis::zadd(OnlineStatusTracker::presenceKey($account->id, 'Contact'), $stale, (string) $contact->id);
        expect(OnlineStatusTracker::getPresence($account->id, 'Contact', $contact->id))->toBeFalse();
    });

    it('agent vừa qua một nhịp ping 20 giây của dashboard mà chưa kịp ping lại vẫn trực tuyến', function () {
        $account = Account::factory()->create();
        $lastPing = now()->getTimestamp() - 21;
        Redis::zadd(OnlineStatusTracker::presenceKey($account->id, 'User'), $lastPing, '7');

        expect(OnlineStatusTracker::getPresence($account->id, 'User', 7))->toBeTrue();
    });

    it('uses the shorter presence window for users', function () {
        $account = Account::factory()->create();
        $stale = now()->getTimestamp() - config('yona.presence_duration') - 1;
        Redis::zadd(OnlineStatusTracker::presenceKey($account->id, 'User'), $stale, '7');

        expect(OnlineStatusTracker::getPresence($account->id, 'User', 7))->toBeFalse();
    });
});

describe('status', function () {
    it('stores and reads the status hash per account', function () {
        OnlineStatusTracker::setStatus(1, 5, 'busy');

        expect(OnlineStatusTracker::getStatus(1, 5))->toBe('busy')
            ->and(OnlineStatusTracker::getStatus(1, 6))->toBeNull()
            ->and(OnlineStatusTracker::getStatus(2, 5))->toBeNull();
    });

    it('clearAccount removes presence and status keys', function () {
        OnlineStatusTracker::setStatus(1, 5, 'busy');
        OnlineStatusTracker::updatePresence(1, 'User', 5);
        OnlineStatusTracker::updatePresence(1, 'Contact', 9);

        OnlineStatusTracker::clearAccount(1);

        expect(OnlineStatusTracker::getStatus(1, 5))->toBeNull()
            ->and(OnlineStatusTracker::getPresence(1, 'User', 5))->toBeFalse()
            ->and(OnlineStatusTracker::getPresence(1, 'Contact', 9))->toBeFalse();
    });
});
