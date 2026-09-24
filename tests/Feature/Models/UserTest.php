<?php

use App\Models\User;

describe('pubsub_token', function () {
    it('is generated on create', function () {
        $user = User::factory()->create();

        expect($user->pubsub_token)->not->toBeNull();
    });

    it('changes when the password changes', function () {
        $user = User::factory()->create();
        $pubsubToken = $user->pubsub_token;

        $user->update(['password' => 'NewPassword1!']);

        expect($user->refresh()->pubsub_token)->not->toBe($pubsubToken);
    });

    it('does not change when other attributes change', function () {
        $user = User::factory()->create();
        $pubsubToken = $user->pubsub_token;

        $user->update(['name' => 'New Name']);

        expect($user->refresh()->pubsub_token)->toBe($pubsubToken);
    });
});

describe('email normalization', function () {
    it('downcases the email and defaults uid to email', function () {
        $user = User::factory()->create(['email' => 'John@Acme.INC']);

        expect($user->email)->toBe('john@acme.inc')
            ->and($user->uid)->toBe('john@acme.inc')
            ->and($user->provider)->toBe('email');
    });
});
