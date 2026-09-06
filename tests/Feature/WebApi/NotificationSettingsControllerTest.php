<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\NotificationSetting;
use App\Models\User;

// Port từ spec/controllers/api/v1/accounts/notification_settings_controller_spec.rb.

beforeEach(function () {
    $this->account = Account::factory()->create();
    $this->agent = User::factory()->create();
    AccountUser::factory()->create([
        'account_id' => $this->account->id,
        'user_id' => $this->agent->id,
        'role' => AccountUser::ROLE_AGENT,
    ]);
});

describe('GET /api/v1/accounts/{id}/notification_settings', function () {
    it('returns unauthorized for an unauthenticated user', function () {
        $this->getJson("/api/v1/accounts/{$this->account->id}/notification_settings")->assertUnauthorized();
    });

    it('returns the settings of the current user with every available flag', function () {
        $response = $this->actingAs($this->agent)
            ->getJson("/api/v1/accounts/{$this->account->id}/notification_settings")
            ->assertOk();

        expect($response->json('user_id'))->toBe($this->agent->id)
            ->and($response->json('account_id'))->toBe($this->account->id)
            ->and($response->json('all_email_flags'))->toHaveCount(8)
            ->and($response->json('selected_email_flags'))->toBe(['email_conversation_assignment'])
            ->and($response->json('selected_push_flags'))->toBe(['push_conversation_assignment']);
    });

    it('creates the missing setting for a membership made before the feature existed', function () {
        NotificationSetting::query()->where('user_id', $this->agent->id)->delete();

        $this->actingAs($this->agent)
            ->getJson("/api/v1/accounts/{$this->account->id}/notification_settings")
            ->assertOk();

        expect(NotificationSetting::query()->where('user_id', $this->agent->id)->count())->toBe(1);
    });
});

describe('PUT /api/v1/accounts/{id}/notification_settings', function () {
    it('returns unauthorized for an unauthenticated user', function () {
        $this->putJson("/api/v1/accounts/{$this->account->id}/notification_settings")->assertUnauthorized();
    });

    it('replaces the selected email and push flags', function () {
        $response = $this->actingAs($this->agent)
            ->putJson("/api/v1/accounts/{$this->account->id}/notification_settings", [
                'notification_settings' => [
                    'selected_email_flags' => ['email_conversation_mention', 'email_conversation_creation'],
                    'selected_push_flags' => [],
                ],
            ])
            ->assertOk();

        expect($response->json('selected_email_flags'))->toBe(['email_conversation_creation', 'email_conversation_mention'])
            ->and($response->json('selected_push_flags'))->toBe([]);
    });

    it('ignores unknown flag names', function () {
        $this->actingAs($this->agent)
            ->putJson("/api/v1/accounts/{$this->account->id}/notification_settings", [
                'notification_settings' => ['selected_email_flags' => ['email_nonsense', '']],
            ])
            ->assertOk()
            ->assertJsonPath('selected_email_flags', []);
    });
});
