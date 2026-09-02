<?php

use App\Jobs\ActionCableBroadcastJob;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Contact;
use App\Models\User;
use App\Support\OnlineStatusTracker;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Redis;

// Thay RoomChannel#subscribed/update_presence (spec/channels/room_channel_spec.rb):
// heartbeat ghi presence + bắn presence.update về pubsub_token người gọi.

beforeEach(function () {
    Redis::flushdb();
    Queue::fake();
});

it('returns unauthorized for guests', function () {
    $account = Account::factory()->create();

    $this->postJson("/api/v1/accounts/{$account->id}/presence")->assertUnauthorized();
});

it('returns 404 for non members', function () {
    $account = Account::factory()->create();

    $this->actingAs(User::factory()->create())
        ->postJson("/api/v1/accounts/{$account->id}/presence")->assertNotFound();
});

it('records presence and broadcasts presence.update to the caller', function () {
    $account = Account::factory()->create();
    $user = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $account->id, 'user_id' => $user->id]);
    $contact = Contact::factory()->create(['account_id' => $account->id]);
    OnlineStatusTracker::updatePresence($account->id, 'Contact', $contact->id);

    $response = $this->actingAs($user)->postJson("/api/v1/accounts/{$account->id}/presence")->assertOk();

    expect(OnlineStatusTracker::getPresence($account->id, 'User', $user->id))->toBeTrue()
        ->and($response->json())->toBe([
            'account_id' => $account->id,
            'users' => [$user->id => 'online'],
            'contacts' => [$contact->id => 'online'],
        ]);

    Queue::assertPushed(ActionCableBroadcastJob::class, fn (ActionCableBroadcastJob $job) => $job->members === [$user->pubsub_token]
        && $job->eventName === 'presence.update'
        && $job->data === $response->json());
});
