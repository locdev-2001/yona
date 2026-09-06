<?php

use App\Jobs\Notification\DeleteNotificationJob;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Conversation;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Support\Facades\Queue;

// Port từ spec/controllers/api/v1/accounts/notifications_controller_spec.rb.

function notificationForAdminUser(Account $account, User $admin, array $attributes = []): Notification
{
    $conversation = Conversation::factory()->create(['account_id' => $account->id]);

    return Notification::factory()->create([
        'account_id' => $account->id,
        'user_id' => $admin->id,
        'primary_actor_id' => $conversation->id,
        ...$attributes,
    ]);
}

beforeEach(function () {
    $this->account = Account::factory()->create();
    $this->admin = User::factory()->create();
    AccountUser::factory()->create([
        'account_id' => $this->account->id,
        'user_id' => $this->admin->id,
        'role' => AccountUser::ROLE_ADMINISTRATOR,
    ]);
});

describe('GET /api/v1/accounts/{id}/notifications', function () {
    it('returns unauthorized for an unauthenticated user', function () {
        $this->getJson("/api/v1/accounts/{$this->account->id}/notifications")->assertUnauthorized();
    });

    it('returns notifications newest first with the meta counts', function () {
        $first = notificationForAdminUser($this->account, $this->admin, ['last_activity_at' => now()->subMinute()]);
        $second = notificationForAdminUser($this->account, $this->admin, ['last_activity_at' => now()]);

        $response = $this->actingAs($this->admin)
            ->getJson("/api/v1/accounts/{$this->account->id}/notifications")
            ->assertOk();

        expect($response->json('data.meta.unread_count'))->toBe(2)
            ->and($response->json('data.meta.count'))->toBe(2)
            ->and($response->json('data.meta.current_page'))->toBe(1)
            ->and($response->json('data.payload.0.id'))->toBe($second->id)
            ->and($response->json('data.payload.1.id'))->toBe($first->id)
            ->and($response->json('data.payload.0.primary_actor'))->not->toBeNull()
            ->and($response->json('data.payload.0.notification_type'))->toBe('conversation_creation');
    });
});

describe('POST /api/v1/accounts/{id}/notifications/read_all', function () {
    it('returns unauthorized for an unauthenticated user', function () {
        $this->postJson("/api/v1/accounts/{$this->account->id}/notifications/read_all")->assertUnauthorized();
    });

    it('marks every notification as read', function () {
        $first = notificationForAdminUser($this->account, $this->admin);
        $second = notificationForAdminUser($this->account, $this->admin);

        $this->actingAs($this->admin)
            ->postJson("/api/v1/accounts/{$this->account->id}/notifications/read_all")
            ->assertOk();

        expect($first->fresh()->read_at)->not->toBeNull()
            ->and($second->fresh()->read_at)->not->toBeNull();
    });

    it('marks only the notifications of the given primary actor', function () {
        $first = notificationForAdminUser($this->account, $this->admin);
        $second = notificationForAdminUser($this->account, $this->admin);

        $this->actingAs($this->admin)
            ->postJson("/api/v1/accounts/{$this->account->id}/notifications/read_all", [
                'primary_actor_id' => $first->primary_actor_id,
                'primary_actor_type' => $first->primary_actor_type,
            ])
            ->assertOk();

        expect($first->fresh()->read_at)->not->toBeNull()
            ->and($second->fresh()->read_at)->toBeNull();
    });
});

describe('PATCH /api/v1/accounts/{id}/notifications/{id}', function () {
    it('returns unauthorized for an unauthenticated user', function () {
        $notification = notificationForAdminUser($this->account, $this->admin);

        $this->patchJson("/api/v1/accounts/{$this->account->id}/notifications/{$notification->id}")->assertUnauthorized();
    });

    it('marks the notification as read', function () {
        $notification = notificationForAdminUser($this->account, $this->admin);

        $this->actingAs($this->admin)
            ->patchJson("/api/v1/accounts/{$this->account->id}/notifications/{$notification->id}")
            ->assertOk();

        expect($notification->fresh()->read_at)->not->toBeNull();
    });

    it('does not touch a notification reached through another account', function () {
        $notification = notificationForAdminUser($this->account, $this->admin);
        $otherAccount = Account::factory()->create();
        AccountUser::factory()->create([
            'account_id' => $otherAccount->id,
            'user_id' => $this->admin->id,
            'role' => AccountUser::ROLE_ADMINISTRATOR,
        ]);

        $this->actingAs($this->admin)
            ->patchJson("/api/v1/accounts/{$otherAccount->id}/notifications/{$notification->id}")
            ->assertNotFound();

        expect($notification->fresh()->read_at)->toBeNull();
    });
});

describe('POST /api/v1/accounts/{id}/notifications/{id}/unread', function () {
    it('clears read_at', function () {
        $notification = notificationForAdminUser($this->account, $this->admin, ['read_at' => now()]);

        $this->actingAs($this->admin)
            ->postJson("/api/v1/accounts/{$this->account->id}/notifications/{$notification->id}/unread")
            ->assertOk();

        expect($notification->fresh()->read_at)->toBeNull();
    });
});

describe('GET /api/v1/accounts/{id}/notifications/unread_count', function () {
    it('returns unauthorized for an unauthenticated user', function () {
        $this->getJson("/api/v1/accounts/{$this->account->id}/notifications/unread_count")->assertUnauthorized();
    });

    it('returns the bare number of unread notifications', function () {
        notificationForAdminUser($this->account, $this->admin);
        notificationForAdminUser($this->account, $this->admin);

        $response = $this->actingAs($this->admin)
            ->getJson("/api/v1/accounts/{$this->account->id}/notifications/unread_count")
            ->assertOk();

        expect($response->json())->toBe(2);
    });
});

describe('DELETE /api/v1/accounts/{id}/notifications/{id}', function () {
    it('deletes the notification', function () {
        $notification = notificationForAdminUser($this->account, $this->admin);

        $this->actingAs($this->admin)
            ->deleteJson("/api/v1/accounts/{$this->account->id}/notifications/{$notification->id}")
            ->assertOk();

        expect(Notification::query()->count())->toBe(0);
    });
});

describe('POST /api/v1/accounts/{id}/notifications/{id}/snooze', function () {
    it('stores the snooze time and clears the last snooze marker', function () {
        $notification = notificationForAdminUser($this->account, $this->admin, ['meta' => ['last_snoozed_at' => '2026-01-01']]);
        $snoozedUntil = now()->addDay()->getTimestamp();

        $this->actingAs($this->admin)
            ->postJson("/api/v1/accounts/{$this->account->id}/notifications/{$notification->id}/snooze", [
                'snoozed_until' => $snoozedUntil,
            ])
            ->assertOk();

        $notification->refresh();

        expect($notification->snoozed_until->getTimestamp())->toBe($snoozedUntil)
            ->and($notification->meta['last_snoozed_at'])->toBeNull();
    });
});

describe('POST /api/v1/accounts/{id}/notifications/destroy_all', function () {
    it('queues the delete job for read notifications', function () {
        Queue::fake();

        $this->actingAs($this->admin)
            ->postJson("/api/v1/accounts/{$this->account->id}/notifications/destroy_all", ['type' => 'read'])
            ->assertOk();

        Queue::assertPushed(DeleteNotificationJob::class);
    });

    it('deletes every notification of the user', function () {
        notificationForAdminUser($this->account, $this->admin);
        notificationForAdminUser($this->account, $this->admin, ['read_at' => now()]);

        $this->actingAs($this->admin)
            ->postJson("/api/v1/accounts/{$this->account->id}/notifications/destroy_all")
            ->assertOk();

        expect(Notification::query()->count())->toBe(0);
    });
});
