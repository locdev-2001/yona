<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Campaign;
use App\Models\Inbox;
use App\Models\User;

// Port từ spec/controllers/api/v1/accounts/campaigns_controller_spec.rb.
// Nhánh one_off (inbox Twilio SMS + audience nhãn) thuộc E4 — chưa có kênh đó.

function campaignAccountUser(Account $account, int $role): User
{
    $user = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $account->id, 'user_id' => $user->id, 'role' => $role]);

    return $user;
}

beforeEach(function () {
    $this->account = Account::factory()->create();
    // Factory :inbox của Chatwoot mặc định là kênh Website; ở yona phải khai rõ.
    $this->inbox = Inbox::factory()->webWidget()->create(['account_id' => $this->account->id]);
    $this->campaign = Campaign::factory()->create([
        'account_id' => $this->account->id,
        'inbox_id' => $this->inbox->id,
        'trigger_rules' => ['url' => 'https://test.com'],
    ])->refresh();
    $this->admin = campaignAccountUser($this->account, AccountUser::ROLE_ADMINISTRATOR);
    $this->agent = campaignAccountUser($this->account, AccountUser::ROLE_AGENT);
});

describe('GET /api/v1/accounts/{id}/campaigns', function () {
    it('returns unauthorized for an unauthenticated user', function () {
        $this->getJson("/api/v1/accounts/{$this->account->id}/campaigns")->assertUnauthorized();
    });

    it('returns unauthorized for agents', function () {
        $this->actingAs($this->agent)
            ->getJson("/api/v1/accounts/{$this->account->id}/campaigns")
            ->assertUnauthorized();
    });

    it('returns all campaigns to administrators', function () {
        $response = $this->actingAs($this->admin)
            ->getJson("/api/v1/accounts/{$this->account->id}/campaigns")
            ->assertOk();

        expect($response->json('0.id'))->toBe($this->campaign->display_id)
            ->and($response->json('0.campaign_type'))->toBe('ongoing')
            ->and($response->json('0.campaign_status'))->toBe('active')
            ->and($response->json('0.inbox.id'))->toBe($this->inbox->id)
            ->and($response->json('0.sender'))->toBe([])
            ->and($response->json('0.trigger_rules'))->toBe(['url' => 'https://test.com'])
            // one_off mới có scheduled_at/audience (jbuilder rẽ nhánh theo campaign_type).
            ->and($response->json('0'))->not->toHaveKey('scheduled_at');
    });
});

describe('GET /api/v1/accounts/{id}/campaigns/{displayId}', function () {
    it('returns unauthorized for an unauthenticated user', function () {
        $this->getJson("/api/v1/accounts/{$this->account->id}/campaigns/{$this->campaign->display_id}")
            ->assertUnauthorized();
    });

    it('returns unauthorized for agents', function () {
        $this->actingAs($this->agent)
            ->getJson("/api/v1/accounts/{$this->account->id}/campaigns/{$this->campaign->display_id}")
            ->assertUnauthorized();
    });

    it('shows the campaign for administrators', function () {
        $this->actingAs($this->admin)
            ->getJson("/api/v1/accounts/{$this->account->id}/campaigns/{$this->campaign->display_id}")
            ->assertOk()
            ->assertJsonPath('id', $this->campaign->display_id);
    });
});

describe('POST /api/v1/accounts/{id}/campaigns', function () {
    it('returns unauthorized for an unauthenticated user', function () {
        $this->postJson("/api/v1/accounts/{$this->account->id}/campaigns", [
            'inbox_id' => $this->inbox->id, 'title' => 'test', 'message' => 'test message',
        ])->assertUnauthorized();
    });

    it('returns unauthorized for agents', function () {
        $this->actingAs($this->agent)
            ->postJson("/api/v1/accounts/{$this->account->id}/campaigns", [
                'inbox_id' => $this->inbox->id, 'title' => 'test', 'message' => 'test message',
            ])->assertUnauthorized();
    });

    it('creates a new campaign', function () {
        $this->actingAs($this->admin)
            ->postJson("/api/v1/accounts/{$this->account->id}/campaigns", [
                'inbox_id' => $this->inbox->id, 'title' => 'test', 'message' => 'test message',
            ])
            ->assertOk()
            ->assertJsonPath('title', 'test');
    });

    it('creates a new ongoing campaign', function () {
        $this->actingAs($this->admin)
            ->postJson("/api/v1/accounts/{$this->account->id}/campaigns", [
                'inbox_id' => $this->inbox->id, 'title' => 'test', 'message' => 'test message',
                'trigger_rules' => ['url' => 'https://test.com', 'time_on_page' => 10],
            ])
            ->assertOk()
            ->assertJsonPath('title', 'test')
            ->assertJsonPath('campaign_type', 'ongoing')
            ->assertJsonPath('trigger_rules.time_on_page', 10);
    });

    it('throws an error when an invalid url is provided for an ongoing campaign', function () {
        $this->actingAs($this->admin)
            ->postJson("/api/v1/accounts/{$this->account->id}/campaigns", [
                'inbox_id' => $this->inbox->id, 'title' => 'test', 'message' => 'test message',
                'trigger_rules' => ['url' => 'javascript'],
            ])
            ->assertUnprocessable();
    });

    it('stores the sender when it belongs to the account', function () {
        $response = $this->actingAs($this->admin)
            ->postJson("/api/v1/accounts/{$this->account->id}/campaigns", [
                'inbox_id' => $this->inbox->id, 'title' => 'test', 'message' => 'test message',
                'sender_id' => $this->admin->id,
            ])
            ->assertOk();

        expect($response->json('sender.id'))->toBe($this->admin->id);
    });
});

describe('PATCH /api/v1/accounts/{id}/campaigns/{displayId}', function () {
    it('returns unauthorized for an unauthenticated user', function () {
        $this->patchJson("/api/v1/accounts/{$this->account->id}/campaigns/{$this->campaign->display_id}", [
            'inbox_id' => $this->inbox->id, 'title' => 'test', 'message' => 'test message',
        ])->assertUnauthorized();
    });

    it('returns unauthorized for agents', function () {
        $this->actingAs($this->agent)
            ->patchJson("/api/v1/accounts/{$this->account->id}/campaigns/{$this->campaign->display_id}", [
                'inbox_id' => $this->inbox->id, 'title' => 'test', 'message' => 'test message',
            ])->assertUnauthorized();
    });

    it('updates the campaign', function () {
        $this->actingAs($this->admin)
            ->patchJson("/api/v1/accounts/{$this->account->id}/campaigns/{$this->campaign->display_id}", [
                'inbox_id' => $this->inbox->id, 'title' => 'test', 'message' => 'test message',
            ])
            ->assertOk()
            ->assertJsonPath('title', 'test');
    });

    // Cột `enabled` là công tắc bật/tắt trên thẻ campaign của dashboard.
    it('toggles the enabled flag', function () {
        $this->actingAs($this->admin)
            ->patchJson("/api/v1/accounts/{$this->account->id}/campaigns/{$this->campaign->display_id}", [
                'enabled' => false,
            ])
            ->assertOk()
            ->assertJsonPath('enabled', false);
    });

    it('keeps the trigger url validated on update', function () {
        $this->actingAs($this->admin)
            ->patchJson("/api/v1/accounts/{$this->account->id}/campaigns/{$this->campaign->display_id}", [
                'trigger_rules' => ['url' => 'javascript'],
            ])
            ->assertUnprocessable();
    });
});

describe('DELETE /api/v1/accounts/{id}/campaigns/{displayId}', function () {
    it('returns unauthorized for an unauthenticated user', function () {
        $this->deleteJson("/api/v1/accounts/{$this->account->id}/campaigns/{$this->campaign->display_id}")
            ->assertUnauthorized();
    });

    it('returns unauthorized for agents', function () {
        $this->actingAs($this->agent)
            ->deleteJson("/api/v1/accounts/{$this->account->id}/campaigns/{$this->campaign->display_id}")
            ->assertUnauthorized();
    });

    it('deletes the campaign for administrators', function () {
        $this->actingAs($this->admin)
            ->deleteJson("/api/v1/accounts/{$this->account->id}/campaigns/{$this->campaign->display_id}")
            ->assertOk();

        expect(Campaign::query()->whereKey($this->campaign->id)->exists())->toBeFalse();
    });
});
