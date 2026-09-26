<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Inbox;
use App\Models\User;
use App\Models\WidgetUpdate;
use Tests\Support\WidgetSession;

// Trang cài đặt "Bài cập nhật trên widget" — CRUD + đăng/gỡ đăng, administrator only.

function widgetUpdateAccountUser(Account $account, int $role): User
{
    $user = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $account->id, 'user_id' => $user->id, 'role' => $role]);

    return $user;
}

beforeEach(function () {
    $this->account = Account::factory()->create();
    $this->inbox = Inbox::factory()->webWidget()->create(['account_id' => $this->account->id]);
    $this->update = WidgetUpdate::query()->create([
        'account_id' => $this->account->id, 'title' => 'Giảm 15% men lam', 'tag' => 'promo', 'published_at' => null,
    ]);
    $this->admin = widgetUpdateAccountUser($this->account, AccountUser::ROLE_ADMINISTRATOR);
    $this->agent = widgetUpdateAccountUser($this->account, AccountUser::ROLE_AGENT);
});

describe('GET /api/v1/accounts/{id}/widget_updates', function () {
    it('returns unauthorized for an unauthenticated user', function () {
        $this->getJson("/api/v1/accounts/{$this->account->id}/widget_updates")->assertUnauthorized();
    });

    it('returns unauthorized for agents', function () {
        $this->actingAs($this->agent)
            ->getJson("/api/v1/accounts/{$this->account->id}/widget_updates")
            ->assertUnauthorized();
    });

    it('lists updates newest first, including drafts', function () {
        $newer = WidgetUpdate::query()->create(['account_id' => $this->account->id, 'title' => 'Hàng mới về']);

        $response = $this->actingAs($this->admin)
            ->getJson("/api/v1/accounts/{$this->account->id}/widget_updates")
            ->assertOk();

        expect(array_column($response->json('payload'), 'id'))->toBe([$newer->id, $this->update->id])
            ->and($response->json('payload.1.published'))->toBeFalse()
            ->and($response->json('payload.1.tag'))->toBe('promo');
    });

    it("does not leak another account's updates", function () {
        $foreignAccount = Account::factory()->create();
        WidgetUpdate::query()->create(['account_id' => $foreignAccount->id, 'title' => 'Của shop khác']);

        $response = $this->actingAs($this->admin)
            ->getJson("/api/v1/accounts/{$this->account->id}/widget_updates")
            ->assertOk();

        expect(array_column($response->json('payload'), 'id'))->toBe([$this->update->id]);
    });
});

describe('POST /api/v1/accounts/{id}/widget_updates', function () {
    it('returns unauthorized for agents', function () {
        $this->actingAs($this->agent)
            ->postJson("/api/v1/accounts/{$this->account->id}/widget_updates", ['title' => 'test'])
            ->assertUnauthorized();
    });

    it('creates a draft update (no published_at) for administrators', function () {
        $response = $this->actingAs($this->admin)
            ->postJson("/api/v1/accounts/{$this->account->id}/widget_updates", [
                'title' => 'Hàng mới về', 'body' => 'Cốc men hoả biến', 'tag' => 'new',
            ])
            ->assertOk();

        expect($response->json('title'))->toBe('Hàng mới về')
            ->and($response->json('published'))->toBeFalse()
            ->and($response->json('published_at'))->toBeNull();
    });

    it('accepts a website inbox of the same account', function () {
        $response = $this->actingAs($this->admin)
            ->postJson("/api/v1/accounts/{$this->account->id}/widget_updates", [
                'title' => 'test', 'inbox_id' => $this->inbox->id,
            ])
            ->assertOk();

        expect($response->json('inbox.id'))->toBe($this->inbox->id);
    });

    it("rejects another account's inbox", function () {
        $foreignInbox = Inbox::factory()->webWidget()->create();

        $this->actingAs($this->admin)
            ->postJson("/api/v1/accounts/{$this->account->id}/widget_updates", [
                'title' => 'test', 'inbox_id' => $foreignInbox->id,
            ])
            ->assertUnprocessable();
    });

    it('rejects a non-website inbox', function () {
        $emailInbox = Inbox::factory()->email()->create(['account_id' => $this->account->id]);

        $this->actingAs($this->admin)
            ->postJson("/api/v1/accounts/{$this->account->id}/widget_updates", [
                'title' => 'test', 'inbox_id' => $emailInbox->id,
            ])
            ->assertUnprocessable();
    });

    it('rejects a javascript: cover or cta url', function () {
        $this->actingAs($this->admin)
            ->postJson("/api/v1/accounts/{$this->account->id}/widget_updates", [
                'title' => 'test', 'cover_url' => 'javascript:alert(1)',
            ])
            ->assertUnprocessable();

        $this->actingAs($this->admin)
            ->postJson("/api/v1/accounts/{$this->account->id}/widget_updates", [
                'title' => 'test', 'cta_url' => 'javascript:alert(1)', 'cta_label' => 'Xem',
            ])
            ->assertUnprocessable();
    });

    it('rejects a data: url', function () {
        $this->actingAs($this->admin)
            ->postJson("/api/v1/accounts/{$this->account->id}/widget_updates", [
                'title' => 'test', 'cover_url' => 'data:text/html,x',
            ])
            ->assertUnprocessable();
    });

    it('accepts a real http(s) url', function () {
        $this->actingAs($this->admin)
            ->postJson("/api/v1/accounts/{$this->account->id}/widget_updates", [
                'title' => 'test', 'cover_url' => 'https://gommoc.vn/anh.jpg',
                'cta_url' => 'https://gommoc.vn/bo-suu-tap', 'cta_label' => 'Xem bộ sưu tập',
            ])
            ->assertOk()
            ->assertJsonPath('cover_url', 'https://gommoc.vn/anh.jpg')
            ->assertJsonPath('cta_url', 'https://gommoc.vn/bo-suu-tap');
    });

    it('requires cta_label when cta_url is present', function () {
        $this->actingAs($this->admin)
            ->postJson("/api/v1/accounts/{$this->account->id}/widget_updates", [
                'title' => 'test', 'cta_url' => 'https://gommoc.vn/bo-suu-tap',
            ])
            ->assertUnprocessable();
    });

    it('rejects an invalid tag', function () {
        $this->actingAs($this->admin)
            ->postJson("/api/v1/accounts/{$this->account->id}/widget_updates", ['title' => 'test', 'tag' => 'vip'])
            ->assertUnprocessable();
    });

    it('rejects a title over 120 characters', function () {
        $this->actingAs($this->admin)
            ->postJson("/api/v1/accounts/{$this->account->id}/widget_updates", ['title' => str_repeat('a', 121)])
            ->assertUnprocessable();
    });
});

describe('PATCH /api/v1/accounts/{id}/widget_updates/{updateId}', function () {
    it('returns unauthorized for agents', function () {
        $this->actingAs($this->agent)
            ->patchJson("/api/v1/accounts/{$this->account->id}/widget_updates/{$this->update->id}", ['title' => 'test'])
            ->assertUnauthorized();
    });

    it('updates the content without touching published_at', function () {
        $published = WidgetUpdate::query()->create([
            'account_id' => $this->account->id, 'title' => 'Đã đăng', 'published_at' => now()->subDay(),
        ]);

        $response = $this->actingAs($this->admin)
            ->patchJson("/api/v1/accounts/{$this->account->id}/widget_updates/{$published->id}", ['title' => 'Đã sửa'])
            ->assertOk();

        expect($response->json('title'))->toBe('Đã sửa')
            ->and($response->json('published'))->toBeTrue();
    });

    it("returns not found for another account's update", function () {
        $foreign = WidgetUpdate::query()->create(['account_id' => Account::factory()->create()->id, 'title' => 'x']);

        $this->actingAs($this->admin)
            ->patchJson("/api/v1/accounts/{$this->account->id}/widget_updates/{$foreign->id}", ['title' => 'test'])
            ->assertNotFound();
    });

    it('touching an unrelated field does not wipe an existing CTA', function () {
        $withCta = WidgetUpdate::query()->create([
            'account_id' => $this->account->id, 'title' => 'Có CTA',
            'cta_label' => 'Xem ngay', 'cta_url' => 'https://gommoc.vn/x',
        ]);

        $response = $this->actingAs($this->admin)
            ->patchJson("/api/v1/accounts/{$this->account->id}/widget_updates/{$withCta->id}", ['title' => 'Đổi tiêu đề'])
            ->assertOk();

        expect($response->json('cta_label'))->toBe('Xem ngay')
            ->and($response->json('cta_url'))->toBe('https://gommoc.vn/x');
    });
});

describe('DELETE /api/v1/accounts/{id}/widget_updates/{updateId}', function () {
    it('returns unauthorized for agents', function () {
        $this->actingAs($this->agent)
            ->deleteJson("/api/v1/accounts/{$this->account->id}/widget_updates/{$this->update->id}")
            ->assertUnauthorized();
    });

    it('deletes the update for administrators', function () {
        $this->actingAs($this->admin)
            ->deleteJson("/api/v1/accounts/{$this->account->id}/widget_updates/{$this->update->id}")
            ->assertOk();

        expect(WidgetUpdate::query()->whereKey($this->update->id)->exists())->toBeFalse();
    });

    it("returns not found for another account's update", function () {
        $foreign = WidgetUpdate::query()->create(['account_id' => Account::factory()->create()->id, 'title' => 'x']);

        $this->actingAs($this->admin)
            ->deleteJson("/api/v1/accounts/{$this->account->id}/widget_updates/{$foreign->id}")
            ->assertNotFound();
    });
});

describe('publish/unpublish', function () {
    it('returns unauthorized for agents', function () {
        $this->actingAs($this->agent)
            ->postJson("/api/v1/accounts/{$this->account->id}/widget_updates/{$this->update->id}/publish")
            ->assertUnauthorized();
    });

    it('publishing a draft sets published_at to now, and the widget can then see it', function () {
        $session = WidgetSession::make();
        $admin = widgetUpdateAccountUser($session->account, AccountUser::ROLE_ADMINISTRATOR);
        $update = WidgetUpdate::query()->create(['account_id' => $session->account->id, 'title' => 'Hàng mới về']);

        $this->actingAs($admin)
            ->postJson("/api/v1/accounts/{$session->account->id}/widget_updates/{$update->id}/publish")
            ->assertOk()
            ->assertJsonPath('published', true);

        expect($update->refresh()->published_at)->not->toBeNull();

        $payload = $this->getJson($session->url('updates'), $session->headers())->assertOk()->json('payload');
        expect(array_column($payload, 'id'))->toContain($update->id);
    });

    it('unpublishing sets published_at back to null, and the widget stops seeing it', function () {
        $session = WidgetSession::make();
        $admin = widgetUpdateAccountUser($session->account, AccountUser::ROLE_ADMINISTRATOR);
        $update = WidgetUpdate::query()->create([
            'account_id' => $session->account->id, 'title' => 'Hàng mới về', 'published_at' => now(),
        ]);

        $this->actingAs($admin)
            ->postJson("/api/v1/accounts/{$session->account->id}/widget_updates/{$update->id}/unpublish")
            ->assertOk()
            ->assertJsonPath('published', false);

        expect($update->refresh()->published_at)->toBeNull();

        $payload = $this->getJson($session->url('updates'), $session->headers())->assertOk()->json('payload');
        expect(array_column($payload, 'id'))->not->toContain($update->id);
    });
});
