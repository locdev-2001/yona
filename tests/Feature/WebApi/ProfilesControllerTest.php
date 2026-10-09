<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\User;
use App\Notifications\ConfirmationInstructions;
use App\Support\OnlineStatusTracker;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;

// Port từ spec/controllers/api/v1/profiles_controller_spec.rb —
// access_token/reset_access_token (F8), auto_offline (AccountScopeTest),
// set_active_account (khi account switcher cần) chưa port.

describe('GET /api/v1/profile', function () {
    it('returns unauthorized for unauthenticated user', function () {
        $this->getJson('/api/v1/profile')->assertUnauthorized();
    });

    it('returns current user information', function () {
        $user = User::factory()->create(['custom_attributes' => ['test' => 'test']]);

        $response = $this->actingAs($user)->getJson('/api/v1/profile')->assertOk();

        expect($response->json('id'))->toBe($user->id)
            ->and($response->json('email'))->toBe($user->email)
            ->and($response->json('custom_attributes.test'))->toBe('test')
            ->and($response->json('message_signature'))->toBeNull();
    });
});

describe('PUT /api/v1/profile', function () {
    it('returns unauthorized for unauthenticated user', function () {
        $this->putJson('/api/v1/profile')->assertUnauthorized();
    });

    it('updates the name', function () {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->putJson('/api/v1/profile', ['name' => 'test'])->assertOk();

        expect($response->json('id'))->toBe($user->id)
            ->and($response->json('name'))->toBe('test')
            ->and($user->refresh()->name)->toBe('test');
    });

    it('updates custom attributes phone number', function () {
        $user = User::factory()->create();

        $this->actingAs($user)->putJson('/api/v1/profile', ['phone_number' => '+123456789'])->assertOk();

        expect($user->refresh()->custom_attributes['phone_number'])->toBe('+123456789');
    });

    it('updates the message signature', function () {
        $user = User::factory()->create();

        $response = $this->actingAs($user)
            ->putJson('/api/v1/profile', ['name' => 'test', 'message_signature' => "Thanks\nMy Signature"])
            ->assertOk();

        expect($response->json('name'))->toBe('test')
            ->and($response->json('message_signature'))->toBe("Thanks\nMy Signature")
            ->and($user->refresh()->name)->toBe('test');
    });

    it('updates the password when current password is provided', function () {
        $user = User::factory()->create(['password' => 'Test123!']);

        $this->actingAs($user)->putJson('/api/v1/profile', [
            'current_password' => 'Test123!',
            'password' => 'Test1234!',
            'password_confirmation' => 'Test1234!',
        ])->assertOk();

        expect(Hash::check('Test1234!', $user->refresh()->password))->toBeTrue();
    });

    it('does not reset the display name when updating the password', function () {
        $user = User::factory()->create(['password' => 'Test123!', 'display_name' => 'Salvatore']);

        $this->actingAs($user)->putJson('/api/v1/profile', [
            'current_password' => 'Test123!',
            'password' => 'Test1234!',
            'password_confirmation' => 'Test1234!',
        ])->assertOk();

        expect($user->refresh()->display_name)->toBe('Salvatore');
    });

    it('throws error when current password provided is invalid', function () {
        $user = User::factory()->create(['password' => 'Test123!']);

        $this->actingAs($user)->putJson('/api/v1/profile', [
            'current_password' => 'Test',
            'password' => 'Test1234!',
            'password_confirmation' => 'Test1234!',
        ])->assertUnprocessable()->assertJson(['message' => 'Invalid current password']);
    });

    it('validates name length', function () {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->putJson('/api/v1/profile', ['name' => str_repeat('test', 999)])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('name');
    });

    it('updates avatar', function () {
        Storage::fake('public');
        $user = User::factory()->create();

        expect($user->avatar)->toBeNull();

        $response = $this->actingAs($user)->put('/api/v1/profile', [
            'avatar' => UploadedFile::fake()->image('avatar.png'),
        ], ['Accept' => 'application/json'])->assertOk();

        $user->refresh();
        expect($user->avatar)->not->toBeNull()
            ->and($response->json('avatar_url'))->not->toBe('');
        Storage::disk('public')->assertExists($user->avatar->path);
    });

    it('replaces the previous avatar attachment on re-upload', function () {
        Storage::fake('public');
        $user = User::factory()->create();

        $this->actingAs($user)->put('/api/v1/profile', [
            'avatar' => UploadedFile::fake()->image('first.png'),
        ], ['Accept' => 'application/json'])->assertOk();
        $firstPath = $user->refresh()->avatar->path;

        $this->actingAs($user)->put('/api/v1/profile', [
            'avatar' => UploadedFile::fake()->image('second.png'),
        ], ['Accept' => 'application/json'])->assertOk();

        $user->refresh()->load('avatar');
        expect($user->avatar()->count())->toBe(1);
        Storage::disk('public')->assertMissing($firstPath);
    });

    it('updates the ui settings', function () {
        $user = User::factory()->create();

        $response = $this->actingAs($user)
            ->putJson('/api/v1/profile', ['ui_settings' => ['is_contact_sidebar_open' => false]])
            ->assertOk();

        expect($response->json('ui_settings.is_contact_sidebar_open'))->toBeFalse();
    });

    it('merges ui settings instead of replacing them', function () {
        $user = User::factory()->create(['ui_settings' => ['font_size' => '18px']]);

        $response = $this->actingAs($user)
            ->putJson('/api/v1/profile', ['ui_settings' => ['editor_message_key' => 'enter']])
            ->assertOk();

        expect($response->json('ui_settings'))
            ->toBe(['font_size' => '18px', 'editor_message_key' => 'enter']);
    });

    it('lưu tuỳ chọn âm báo tin mới vào ui_settings, giữ nguyên các tuỳ chọn khác', function () {
        $user = User::factory()->create(['ui_settings' => ['font_size' => '18px']]);
        $preference = ['enabled' => true, 'tone' => 'chime', 'scope' => 'assigned', 'only_when_hidden' => true];

        $this->actingAs($user)
            ->putJson('/api/v1/profile', ['ui_settings' => ['notification_sound' => $preference]])
            ->assertOk()
            ->assertJsonPath('ui_settings.notification_sound.tone', 'chime')
            ->assertJsonPath('ui_settings.font_size', '18px');

        expect($user->fresh()->ui_settings['notification_sound'])->toEqual($preference);
    });

    it('từ chối tuỳ chọn âm báo sai', function (array $preference, string $invalidField) {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->putJson('/api/v1/profile', ['ui_settings' => ['notification_sound' => $preference]])
            ->assertUnprocessable()
            ->assertJsonValidationErrors("ui_settings.notification_sound{$invalidField}");

        expect($user->fresh()->ui_settings)->toBeEmpty();
    })->with([
        'âm không có trong danh sách' => [['enabled' => true, 'tone' => 'coi-xe', 'scope' => 'all', 'only_when_hidden' => false], '.tone'],
        'phạm vi lạ' => [['enabled' => true, 'tone' => 'ding', 'scope' => 'team', 'only_when_hidden' => false], '.scope'],
        'thiếu cờ bật/tắt' => [['tone' => 'ding', 'scope' => 'all', 'only_when_hidden' => false], '.enabled'],
        'khoá lạ' => [['enabled' => true, 'tone' => 'ding', 'scope' => 'all', 'only_when_hidden' => false, 'volume' => 11], ''],
    ]);

    it('đổi ngôn ngữ giao diện của riêng mình: dashboard đổi ngữ ngay, ngôn ngữ tài khoản giữ nguyên', function () {
        $account = Account::factory()->create(['locale' => 'en']);
        $user = User::factory()->create(['ui_settings' => ['font_size' => '18px']]);
        AccountUser::factory()->create(['account_id' => $account->id, 'user_id' => $user->id]);
        $dashboardHtml = fn () => $this->actingAs($user)->get("/app/accounts/{$account->id}/profile/settings")->assertOk()->getContent();

        $this->actingAs($user)
            ->putJson('/api/v1/profile', ['ui_settings' => ['locale' => 'vi']])
            ->assertOk()
            ->assertJsonPath('ui_settings.locale', 'vi')
            ->assertJsonPath('ui_settings.font_size', '18px');

        expect($dashboardHtml())->toMatch('/<html\b[^>]*\blang="vi"/')
            ->and($account->fresh()->locale)->toBe('en');

        $this->actingAs($user)->putJson('/api/v1/profile', ['ui_settings' => ['locale' => null]])->assertOk();

        expect($dashboardHtml())->toMatch('/<html\b[^>]*\blang="en"/');
    });

    it('từ chối ngôn ngữ giao diện chưa có bản dịch', function () {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->putJson('/api/v1/profile', ['ui_settings' => ['locale' => 'fr']])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('ui_settings.locale');

        expect($user->fresh()->ui_settings)->toBeEmpty();
    });

    it('lưu chế độ màu của portal vào ui_settings, giữ nguyên các tuỳ chọn khác', function (string $scheme) {
        $user = User::factory()->create(['ui_settings' => ['font_size' => '18px']]);

        $this->actingAs($user)
            ->putJson('/api/v1/profile', ['ui_settings' => ['color_scheme' => $scheme]])
            ->assertOk()
            ->assertJsonPath('ui_settings.color_scheme', $scheme)
            ->assertJsonPath('ui_settings.font_size', '18px');
    })->with(['light', 'dark']);

    it('từ chối chế độ màu không có', function () {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->putJson('/api/v1/profile', ['ui_settings' => ['color_scheme' => 'sepia']])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('ui_settings.color_scheme');

        expect($user->fresh()->ui_settings)->toBeEmpty();
    });

    it('populates the unconfirmed email and sends confirmation to the new address', function () {
        Notification::fake();
        $user = User::factory()->create(['email' => 'old@example.com']);

        $this->actingAs($user)->putJson('/api/v1/profile', ['email' => 'NEW@example.com'])->assertOk();

        $user->refresh();
        expect($user->email)->toBe('old@example.com')
            ->and($user->unconfirmed_email)->toBe('new@example.com');

        Notification::assertSentTo($user, ConfirmationInstructions::class, function ($notification, $channels, $notifiable) use ($user) {
            return $notifiable->routeNotificationFor('mail', $notification) === 'new@example.com' && $user->confirmation_token !== null;
        });
    });
});

describe('DELETE /api/v1/profile/avatar', function () {
    it('returns unauthorized for unauthenticated user', function () {
        $this->deleteJson('/api/v1/profile/avatar')->assertUnauthorized();
    });

    it('deletes the avatar', function () {
        Storage::fake('public');
        $user = User::factory()->create();
        $this->actingAs($user)->put('/api/v1/profile', [
            'avatar' => UploadedFile::fake()->image('avatar.png'),
        ], ['Accept' => 'application/json'])->assertOk();
        $path = $user->refresh()->avatar->path;
        $updatedAtBeforeRemoval = $user->updated_at;
        $this->travel(1)->minutes();

        $response = $this->actingAs($user)->deleteJson('/api/v1/profile/avatar')->assertOk();

        expect($response->json('avatar_url'))->toBe('')
            ->and($user->refresh()->avatar)->toBeNull()
            ->and($user->updated_at->greaterThan($updatedAtBeforeRemoval))->toBeTrue();
        Storage::disk('public')->assertMissing($path);
    });
});

describe('email change confirmation', function () {
    it('swaps the new email in after the confirmation link is visited', function () {
        Notification::fake();
        $user = User::factory()->create(['email' => 'old@example.com']);

        $this->actingAs($user)->putJson('/api/v1/profile', ['email' => 'new@example.com'])->assertOk();
        $token = $user->refresh()->confirmation_token;

        $this->get('/app/auth/confirmation?confirmation_token='.$token)->assertRedirect('/app');

        $user->refresh();
        expect($user->email)->toBe('new@example.com')
            ->and($user->uid)->toBe('new@example.com')
            ->and($user->unconfirmed_email)->toBeNull()
            ->and($user->confirmation_token)->toBeNull();
    });
});

describe('POST /api/v1/accounts/{id}/profile/availability', function () {
    it('returns unauthorized for unauthenticated user', function () {
        $account = Account::factory()->create();

        $this->postJson("/api/v1/accounts/{$account->id}/profile/availability")->assertUnauthorized();
    });

    it('updates the availability status in redis', function () {
        $account = Account::factory()->create();
        OnlineStatusTracker::clearAccount($account->id);
        $agent = User::factory()->create();
        AccountUser::factory()->create(['account_id' => $account->id, 'user_id' => $agent->id]);

        $this->actingAs($agent)
            ->postJson("/api/v1/accounts/{$account->id}/profile/availability", ['availability' => 'busy'])
            ->assertOk();

        expect(OnlineStatusTracker::getStatus($account->id, $agent->id))->toBe('busy');
    });
});
