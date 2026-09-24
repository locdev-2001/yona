<?php

use App\Http\Controllers\Auth\SessionsController;
use App\Models\AccountUser;
use App\Models\SuperAdmin;
use App\Models\User;
use App\Models\UserSession;
use App\Notifications\ConfirmationInstructions;
use App\Providers\AppServiceProvider;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Testing\TestResponse;
use Laravel\Socialite\Socialite;
use Laravel\Socialite\Two\InvalidStateException;
use Laravel\Socialite\Two\User as SocialiteUser;
use OTPHP\TOTP;

const GOOGLE_CALLBACK = '/app/auth/oauth/google/callback';

function configureGoogleOAuth(): void
{
    config([
        'services.google.client_id' => 'yona-test.apps.googleusercontent.com',
        'services.google.client_secret' => 'test-secret',
    ]);
}

function fakeGoogleUser(array $attributes = []): void
{
    Socialite::fake('google', SocialiteUser::fake([
        'id' => '109876543210',
        'name' => 'Lan Nguyễn',
        'email' => 'lan@shop.vn',
        'email_verified' => true,
        ...$attributes,
    ]));
}

function assertBackOnLoginWithOAuthError(TestResponse $response, string $message): void
{
    $response->assertRedirect('/app/login')->assertSessionHasErrors(['oauth' => $message]);
    test()->assertGuest();
}

beforeEach(function () {
    config(['inertia.ssr.enabled' => false]);
});

describe('khi chưa cấu hình Google', function () {
    // Không phụ thuộc .env của máy đang chạy test.
    beforeEach(fn () => config(['services.google.client_id' => null, 'services.google.client_secret' => null]));

    it('ẩn nút ở trang đăng nhập và trang đăng ký', function () {
        $this->get('/app/login')->assertInertia(fn ($page) => $page->where('oauthProviders', []));
        $this->get('/app/auth/signup')->assertInertia(fn ($page) => $page->where('oauthProviders', []));
    });

    it('trả 404 cho cả lượt đi lẫn lượt về', function () {
        $this->get('/app/auth/oauth/google')->assertNotFound();
        $this->get(GOOGLE_CALLBACK.'?code=abc&state=xyz')->assertNotFound();
    });

    it('thiếu client secret vẫn coi là chưa cấu hình', function () {
        config(['services.google.client_id' => 'only-id', 'services.google.client_secret' => '']);

        $this->get('/app/login')->assertInertia(fn ($page) => $page->where('oauthProviders', []));
        $this->get('/app/auth/oauth/google')->assertNotFound();
    });
});

describe('khi đã cấu hình Google', function () {
    beforeEach(fn () => configureGoogleOAuth());

    it('hiện nút ở trang đăng nhập và trang đăng ký', function () {
        $this->get('/app/login')->assertInertia(fn ($page) => $page->where('oauthProviders', ['google']));
        $this->get('/app/auth/signup')->assertInertia(fn ($page) => $page->where('oauthProviders', ['google']));
    });

    it('chuyển sang Google với đúng client_id, redirect_uri và scope', function () {
        $location = $this->get('/app/auth/oauth/google')->assertRedirect()->headers->get('Location');

        $url = parse_url($location);
        parse_str($url['query'], $query);

        expect($url['host'])->toBe('accounts.google.com')
            ->and($query['client_id'])->toBe('yona-test.apps.googleusercontent.com')
            ->and($query['redirect_uri'])->toBe(url(GOOGLE_CALLBACK))
            ->and(explode(' ', $query['scope']))->toEqualCanonicalizing(['openid', 'email', 'profile'])
            ->and($query['response_type'])->toBe('code')
            ->and($query['prompt'])->toBe('select_account')
            ->and($query['state'])->not->toBeEmpty();
    });

    it('trả 404 cho nhà cung cấp không có trong sổ', function () {
        $this->get('/app/auth/oauth/github')->assertNotFound();
    });
});

describe('lượt về từ Google', function () {
    beforeEach(fn () => configureGoogleOAuth());

    it('email trùng tài khoản có sẵn thì đăng nhập vào đúng tài khoản đó', function () {
        $user = User::factory()->create(['email' => 'lan@shop.vn']);
        fakeGoogleUser(['email' => 'Lan@Shop.VN']);

        $this->get(GOOGLE_CALLBACK)->assertRedirect('/app');

        $this->assertAuthenticatedAs($user);
        expect(User::query()->where('email', 'lan@shop.vn')->count())->toBe(1)
            ->and($user->refresh()->sign_in_count)->toBe(1)
            ->and($user->userSessions()->count())->toBe(1);
    });

    it('email mới thì tạo tài khoản qua đường đăng ký chung rồi đăng nhập', function () {
        Notification::fake();
        fakeGoogleUser(['email' => 'minh@hoa.vn', 'name' => 'Minh Trần']);

        $this->get(GOOGLE_CALLBACK)->assertRedirect('/app');

        $user = User::query()->where('email', 'minh@hoa.vn')->sole();
        $account = $user->accounts()->sole();
        $this->assertAuthenticatedAs($user);
        expect($user->isConfirmed())->toBeTrue()
            ->and($user->name)->toBe('Minh Trần')
            ->and($user->accountUsers()->sole()->role)->toBe(AccountUser::ROLE_ADMINISTRATOR)
            ->and($account->name)->toBe('Minh Trần')
            ->and($account->onboardingStep())->toBe('account_details')
            ->and($user->userSessions()->count())->toBe(1);
        Notification::assertNotSentTo($user, ConfirmationInstructions::class);

        $this->get('/app')->assertRedirect("/app/accounts/{$account->id}/dashboard");
    });

    it('từ chối email Google chưa xác minh và không tạo tài khoản', function () {
        fakeGoogleUser(['email' => 'moi@hoa.vn', 'email_verified' => false]);

        assertBackOnLoginWithOAuthError($this->get(GOOGLE_CALLBACK), __('auth.oauth.unverified_email'));

        expect(User::query()->where('email', 'moi@hoa.vn')->exists())->toBeFalse();
    });

    it('từ chối email chưa xác minh kể cả khi đã có tài khoản', function () {
        User::factory()->create(['email' => 'lan@shop.vn']);
        fakeGoogleUser(['email_verified' => false]);

        assertBackOnLoginWithOAuthError($this->get(GOOGLE_CALLBACK), __('auth.oauth.unverified_email'));
    });

    it('tài khoản bật 2FA vẫn phải nhập mã trước khi có phiên', function () {
        $user = User::factory()->withMfa()->create(['email' => 'lan@shop.vn']);
        fakeGoogleUser();

        $this->get(GOOGLE_CALLBACK)->assertRedirect('/app/login');

        $this->assertGuest();
        expect($user->userSessions()->count())->toBe(0);

        $loginPage = $this->get('/app/login')
            ->assertInertia(fn ($page) => $page->component('v3/views/login/Index')->where('mfaRequired', true));
        $mfaToken = $loginPage->viewData('page')['props']['mfaToken'];
        expect($mfaToken)->toBeString()->not->toBeEmpty();

        $this->post('/app/login', [
            'mfa_token' => $mfaToken,
            'otp_code' => TOTP::createFromSecret($user->refresh()->otp_secret)->now(),
        ], ['X-Inertia' => 'true'])->assertStatus(409);

        $this->assertAuthenticatedAs($user);
    });

    it('mã 2FA chờ nhập chỉ hiện một lần, tải lại trang về form thường', function () {
        User::factory()->withMfa()->create(['email' => 'lan@shop.vn']);
        fakeGoogleUser();

        $this->get(GOOGLE_CALLBACK);
        $this->get('/app/login')->assertInertia(fn ($page) => $page->where('mfaRequired', true));

        $this->get('/app/login')->assertInertia(fn ($page) => $page->missing('mfaRequired'));
        expect(session(SessionsController::PENDING_MFA_TOKEN))->toBeNull();
    });

    it('super admin không đăng nhập bằng Google được', function () {
        SuperAdmin::factory()->create(['email' => 'lan@shop.vn']);
        fakeGoogleUser();

        assertBackOnLoginWithOAuthError($this->get(GOOGLE_CALLBACK), __('auth.oauth.not_allowed'));

        $this->assertGuest('super_admin');
    });

    it('tài khoản chưa xác nhận được xác nhận và mật khẩu cũ không còn dùng được', function () {
        $user = User::factory()->unconfirmed()->create([
            'email' => 'lan@shop.vn',
            'confirmation_token' => 'pending-token',
        ]);
        fakeGoogleUser();

        $this->get(GOOGLE_CALLBACK)->assertRedirect('/app');

        $user->refresh();
        $this->assertAuthenticatedAs($user);
        expect($user->isConfirmed())->toBeTrue()
            ->and($user->confirmation_token)->toBeNull()
            ->and(Hash::check('Password1!', $user->password))->toBeFalse();
    });

    it('chạm trần số phiên thì tự bỏ phiên cũ nhất thay vì hỏi lại', function () {
        $user = User::factory()->create(['email' => 'lan@shop.vn']);
        UserSession::factory()->count(config('yona.max_user_sessions'))->for($user)
            ->sequence(fn ($sequence) => ['last_activity_at' => now()->subDays(30 - $sequence->index)])
            ->create();
        $oldest = $user->userSessions()->orderBy('last_activity_at')->first();
        fakeGoogleUser();

        $this->get(GOOGLE_CALLBACK)->assertRedirect('/app');

        $this->assertAuthenticatedAs($user);
        expect(UserSession::query()->find($oldest->id))->toBeNull()
            ->and($user->userSessions()->count())->toBe((int) config('yona.max_user_sessions'));
    });

    it('đưa về trang người dùng định vào trước khi bị bắt đăng nhập', function () {
        User::factory()->create(['email' => 'lan@shop.vn']);
        fakeGoogleUser();

        $this->withSession(['url.intended' => url('/app/accounts/1/contacts')])
            ->get(GOOGLE_CALLBACK)
            ->assertRedirect(url('/app/accounts/1/contacts'));
    });

    it('tên miền email bị chặn thì không đăng ký được', function () {
        config(['yona.blocked_email_domains' => 'spamdomain\\.com']);
        fakeGoogleUser(['email' => 'ai@spamdomain.com']);

        assertBackOnLoginWithOAuthError($this->get(GOOGLE_CALLBACK), __('auth.signup.invalid_email'));

        expect(User::query()->where('email', 'ai@spamdomain.com')->exists())->toBeFalse();
    });

    it('state không khớp thì báo lỗi ở trang đăng nhập', function () {
        Socialite::fake('google', fn () => throw new InvalidStateException);

        assertBackOnLoginWithOAuthError($this->get(GOOGLE_CALLBACK.'?code=abc&state=forged'), __('auth.oauth.failed'));
    });

    it('người dùng huỷ ở màn đồng ý thì quay về trang đăng nhập, không đổi mã', function () {
        Socialite::fake('google', fn () => throw new RuntimeException('không được gọi tới'));

        assertBackOnLoginWithOAuthError($this->get(GOOGLE_CALLBACK.'?error=access_denied&state=xyz'), __('auth.oauth.failed'));
    });

    it('người đã đăng nhập mở lại lượt về thì chỉ được đưa vào app', function () {
        $user = User::factory()->create();
        fakeGoogleUser();

        $this->actingAs($user)->get(GOOGLE_CALLBACK)->assertRedirect('/app');
    });

    it('giới hạn số lượt gọi theo IP', function () {
        fakeGoogleUser(['email_verified' => false]);

        foreach (range(1, AppServiceProvider::OAUTH_SIGN_IN_REQUESTS_PER_MINUTE) as $attempt) {
            $this->get(GOOGLE_CALLBACK)->assertRedirect('/app/login');
        }

        $this->get(GOOGLE_CALLBACK)->assertTooManyRequests();
    });
});
