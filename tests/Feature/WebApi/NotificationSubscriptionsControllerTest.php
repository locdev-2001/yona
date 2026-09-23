<?php

use App\Models\NotificationSubscription;
use App\Models\User;
use Tests\Support\BrowserPushSubscription;

// Port từ spec/controllers/api/v1/notification_subscriptions_controller_spec.rb
// + spec/builders/notification_subscription_builder_spec.rb.

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->browser = BrowserPushSubscription::make();
});

function browserPushPayload(BrowserPushSubscription $browser): array
{
    return [
        'subscription_type' => 'browser_push',
        'subscription_attributes' => $browser->attributes(),
    ];
}

describe('POST /api/v1/notification_subscriptions', function () {
    it('returns unauthorized for an unauthenticated user', function () {
        $this->postJson('/api/v1/notification_subscriptions', browserPushPayload($this->browser))
            ->assertUnauthorized();

        expect(NotificationSubscription::query()->count())->toBe(0);
    });

    it('stores the browser subscription for the current user, keyed by its endpoint', function () {
        $response = $this->actingAs($this->user)
            ->postJson('/api/v1/notification_subscriptions', browserPushPayload($this->browser))
            ->assertOk();

        $subscription = NotificationSubscription::query()->sole();

        expect($subscription->user_id)->toBe($this->user->id)
            ->and($subscription->isBrowserPush())->toBeTrue()
            ->and($subscription->identifier)->toBe($this->browser->endpoint)
            ->and($subscription->subscription_attributes)->toEqual($this->browser->attributes())
            ->and($response->json('subscription_type'))->toBe('browser_push')
            ->and($response->json('identifier'))->toBe($this->browser->endpoint)
            ->and($response->json('user_id'))->toBe($this->user->id);
    });

    it('accepts the payload wrapped under notification_subscription', function () {
        $this->actingAs($this->user)
            ->postJson('/api/v1/notification_subscriptions', [
                'notification_subscription' => browserPushPayload($this->browser),
            ])
            ->assertOk();

        expect(NotificationSubscription::query()->count())->toBe(1);
    });

    it('updates the keys of an endpoint already registered instead of duplicating it', function () {
        $this->actingAs($this->user)
            ->postJson('/api/v1/notification_subscriptions', browserPushPayload($this->browser))
            ->assertOk();

        $renewedKeys = BrowserPushSubscription::make($this->browser->endpoint);

        $this->actingAs($this->user)
            ->postJson('/api/v1/notification_subscriptions', browserPushPayload($renewedKeys))
            ->assertOk();

        expect(NotificationSubscription::query()->count())->toBe(1)
            ->and(NotificationSubscription::query()->sole()->subscription_attributes)->toEqual($renewedKeys->attributes());
    });

    it('moves the endpoint to whoever signs in on the same browser next', function () {
        $previousUser = User::factory()->create();
        NotificationSubscription::registerBrowserPush($previousUser, $this->browser->attributes());

        $this->actingAs($this->user)
            ->postJson('/api/v1/notification_subscriptions', browserPushPayload($this->browser))
            ->assertOk();

        expect(NotificationSubscription::query()->sole()->user_id)->toBe($this->user->id);
    });

    it('authenticates with the api_access_token header like the other dashboard APIs', function () {
        $this->withHeader('api_access_token', $this->user->accessToken->token)
            ->postJson('/api/v1/notification_subscriptions', browserPushPayload($this->browser))
            ->assertOk();

        expect(NotificationSubscription::query()->sole()->user_id)->toBe($this->user->id);
    });

    it('rejects an endpoint that is not https', function () {
        $payload = browserPushPayload($this->browser);
        $payload['subscription_attributes']['endpoint'] = 'http://127.0.0.1:6379/push';

        $this->actingAs($this->user)
            ->postJson('/api/v1/notification_subscriptions', $payload)
            ->assertStatus(422)
            ->assertJsonPath('attributes', ['subscription_attributes.endpoint']);

        expect(NotificationSubscription::query()->count())->toBe(0);
    });

    it('rejects keys the browser could not have produced', function () {
        $payload = browserPushPayload($this->browser);
        $payload['subscription_attributes']['p256dh'] = 'not-a-key';
        $payload['subscription_attributes']['auth'] = base64_encode(random_bytes(8));

        $this->actingAs($this->user)
            ->postJson('/api/v1/notification_subscriptions', $payload)
            ->assertStatus(422)
            ->assertJsonPath('attributes', ['subscription_attributes.p256dh', 'subscription_attributes.auth']);
    });

    it('rejects the mobile fcm type Yona does not support', function () {
        $this->actingAs($this->user)
            ->postJson('/api/v1/notification_subscriptions', [
                'subscription_type' => 'fcm',
                'subscription_attributes' => ['device_id' => 'abc', 'push_token' => 'xyz'],
            ])
            ->assertStatus(422);

        expect(NotificationSubscription::query()->count())->toBe(0);
    });

    it('keeps only the three Web Push attributes', function () {
        $payload = browserPushPayload($this->browser);
        $payload['subscription_attributes']['extra'] = 'ignored';

        $this->actingAs($this->user)
            ->postJson('/api/v1/notification_subscriptions', $payload)
            ->assertOk();

        expect(array_keys(NotificationSubscription::query()->sole()->subscription_attributes))
            ->toEqualCanonicalizing(['endpoint', 'p256dh', 'auth']);
    });
});

describe('DELETE /api/v1/notification_subscriptions', function () {
    it('returns unauthorized for an unauthenticated user', function () {
        $this->deleteJson('/api/v1/notification_subscriptions', ['endpoint' => $this->browser->endpoint])
            ->assertUnauthorized();
    });

    it('removes the subscription of the current user for that endpoint', function () {
        NotificationSubscription::registerBrowserPush($this->user, $this->browser->attributes());

        $this->actingAs($this->user)
            ->deleteJson('/api/v1/notification_subscriptions', ['endpoint' => $this->browser->endpoint])
            ->assertOk();

        expect(NotificationSubscription::query()->count())->toBe(0);
    });

    it('never removes a subscription that belongs to someone else', function () {
        $otherUser = User::factory()->create();
        NotificationSubscription::registerBrowserPush($otherUser, $this->browser->attributes());

        $this->actingAs($this->user)
            ->deleteJson('/api/v1/notification_subscriptions', ['endpoint' => $this->browser->endpoint])
            ->assertOk();

        expect(NotificationSubscription::query()->sole()->user_id)->toBe($otherUser->id);
    });
});
