<?php

use App\Http\Middleware\HandleInertiaRequests;
use App\Support\SessionExpiryResponses;
use Illuminate\Session\TokenMismatchException;
use Illuminate\Support\Facades\Route;

// CSRF tắt khi chạy test nên dựng route ném đúng exception mà middleware CSRF
// ném khi cookie XSRF-TOKEN/phiên đã hết hạn.
beforeEach(function () {
    Route::middleware('web')->post('/__test/token-mismatch', fn () => throw new TokenMismatchException);
    Route::middleware('web')->post('/api/v1/__test/token-mismatch', fn () => throw new TokenMismatchException);
});

function inertiaHeaders(): array
{
    return [
        'X-Inertia' => 'true',
        'X-Inertia-Version' => (string) app(HandleInertiaRequests::class)->version(request()),
    ];
}

describe('expired CSRF token (419)', function () {
    it('sends an Inertia form back with a page_expired error instead of the framework error page', function () {
        $this->from('/app/login')
            ->post('/__test/token-mismatch', [], inertiaHeaders())
            ->assertRedirect('/app/login')
            ->assertSessionHasErrors([SessionExpiryResponses::PAGE_EXPIRED_ERROR => __('auth.page_expired')]);
    });

    it('sends a plain HTML form back the same way', function () {
        $this->from('/admin/sign_in')
            ->post('/__test/token-mismatch')
            ->assertRedirect('/admin/sign_in')
            ->assertSessionHasErrors(SessionExpiryResponses::PAGE_EXPIRED_ERROR);
    });

    it('keeps the real 419 for JSON clients so the frontend can recover on its own', function () {
        $this->postJson('/__test/token-mismatch')->assertStatus(419);
    });

    it('keeps the real 419 on /api paths even without a JSON Accept header', function () {
        $this->post('/api/v1/__test/token-mismatch')->assertStatus(419);
    });
});

describe('Inertia visit after the session is gone', function () {
    it('forces a full page load to the login page and remembers the page being opened', function () {
        $this->get('/app/accounts/1/dashboard', inertiaHeaders())
            ->assertStatus(409)
            ->assertHeader('X-Inertia-Location', url('/app/login'));

        expect(session('url.intended'))->toBe(url('/app/accounts/1/dashboard'));
    });

    it('sends the super admin console to its own sign-in page', function () {
        $this->get('/admin', inertiaHeaders())
            ->assertStatus(409)
            ->assertHeader('X-Inertia-Location', url('/admin/sign_in'));
    });

    it('still answers JSON clients with 401', function () {
        $this->getJson('/api/v1/profile')->assertUnauthorized();
    });
});
