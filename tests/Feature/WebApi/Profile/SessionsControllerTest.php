<?php

use App\Models\User;
use App\Models\UserSession;
use Tests\Support\StoredSessions;

// Port từ refs/chatwoot/spec/requests/api/v1/profile/sessions_controller_spec.rb.
// Khác gốc: Chatwoot lọc phiên theo token devise còn hạn; Yona dùng session của
// Laravel — mỗi dòng user_sessions ứng với một phiên còn sống nên không cần lọc.

describe('GET /api/v1/profile/sessions', function () {
    it('requires authentication', function () {
        $this->getJson('/api/v1/profile/sessions')->assertUnauthorized();
    });

    it('lists sessions newest activity first and marks the current one', function () {
        $user = User::factory()->create();
        // Đăng nhập thật để có dòng user_sessions mang đúng id phiên hiện tại;
        // middleware theo dõi hoạt động sẽ làm mới last_activity_at của phiên này.
        $this->post('/app/login', ['email' => $user->email, 'password' => 'Password1!']);
        $current = $user->userSessions()->sole();

        $older = UserSession::factory()->for($user)->create([
            'client_id' => 'other-client',
            'browser_name' => 'Firefox',
            'last_activity_at' => now()->subDays(2),
        ]);

        $response = $this->getJson('/api/v1/profile/sessions')->assertOk();

        expect($response->json('*.id'))->toBe([$current->id, $older->id]);
        expect(collect($response->json())->firstWhere('id', $current->id)['current'])->toBeTrue();
        expect(collect($response->json())->firstWhere('id', $older->id)['current'])->toBeFalse();
    });

    it('returns an empty array when there are no sessions', function () {
        $this->actingAs(User::factory()->create())
            ->getJson('/api/v1/profile/sessions')
            ->assertOk()
            ->assertExactJson([]);
    });
});

describe('DELETE /api/v1/profile/sessions/{id}', function () {
    it('revokes another session and destroys it on the session store', function () {
        $user = User::factory()->create();
        $other = UserSession::factory()->for($user)->create(['client_id' => 'other-client']);
        StoredSessions::put('other-client');

        $this->actingAs($user)->deleteJson("/api/v1/profile/sessions/{$other->id}")->assertOk();

        expect(UserSession::query()->find($other->id))->toBeNull()
            ->and(StoredSessions::exists('other-client'))->toBeFalse();
    });

    it('refuses to revoke the current session', function () {
        $user = User::factory()->create();
        $this->post('/app/login', ['email' => $user->email, 'password' => 'Password1!']);
        $current = $user->userSessions()->sole();

        $this->deleteJson("/api/v1/profile/sessions/{$current->id}")
            ->assertStatus(422)
            ->assertJson(['error' => __('errors.sessions.cannot_revoke_current')]);

        expect(UserSession::query()->find($current->id))->not->toBeNull();
    });

    it('returns 404 for an unknown session id', function () {
        $this->actingAs(User::factory()->create())
            ->deleteJson('/api/v1/profile/sessions/9999999')
            ->assertNotFound();
    });

    it('cannot revoke a session of another user', function () {
        $foreign = UserSession::factory()->create(['client_id' => 'foreign']);

        $this->actingAs(User::factory()->create())
            ->deleteJson("/api/v1/profile/sessions/{$foreign->id}")
            ->assertNotFound();

        expect(UserSession::query()->find($foreign->id))->not->toBeNull();
    });

    it('requires authentication', function () {
        $session = UserSession::factory()->create();

        $this->deleteJson("/api/v1/profile/sessions/{$session->id}")->assertUnauthorized();
    });
});
