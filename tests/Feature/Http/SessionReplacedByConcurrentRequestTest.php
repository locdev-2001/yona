<?php

use App\Models\SuperAdmin;
use App\Models\User;
use Illuminate\Contracts\Session\Session;
use Illuminate\Session\SessionManager;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Route;

// Agent và console quản trị dùng chung một cookie phiên. Đăng nhập console xoay
// id phiên (chống session fixation) và huỷ id cũ trên store; request của tab agent
// đang chạy dở lúc đó không được hồi sinh phiên đã huỷ hay trả cookie trỏ về nó.

const WHOAMI_ROUTE = '/__test/session/whoami';
const SLOW_AGENT_ROUTE = '/__test/session/slow-agent-request';

dataset('session drivers', [
    'database (local)' => 'database',
    'file, ghi đè như redis (production)' => 'file',
]);

beforeEach(function () {
    $this->sessionFilesPath = storage_path('framework/testing/sessions-'.uniqid());
    File::ensureDirectoryExists($this->sessionFilesPath);
    config(['session.files' => $this->sessionFilesPath]);

    Route::middleware('web')->get(WHOAMI_ROUTE, fn () => [
        'web' => Auth::guard('web')->id(),
        'super_admin' => Auth::guard('super_admin')->id(),
    ]);
});

afterEach(function () {
    File::deleteDirectory($this->sessionFilesPath);
});

// Một store riêng như ở một tiến trình PHP khác: chung nơi lưu, không chung bộ nhớ.
function storeOfAnotherProcess(): Session
{
    return (new SessionManager(app()))->driver();
}

function signedInAgentSessionId(User $agent): string
{
    $session = storeOfAnotherProcess();
    $session->start();
    $session->put(Auth::guard('web')->getName(), $agent->getAuthIdentifier());
    $session->save();

    return $session->getId();
}

// Đúng những gì đăng nhập console làm với store: guard login() xoay id và huỷ id
// cũ, rồi regenerate() xoay tiếp và đổi CSRF token.
function signInConsoleFromAnotherTab(string $sessionId, SuperAdmin $superAdmin): string
{
    $session = storeOfAnotherProcess();
    $session->setId($sessionId);
    $session->start();
    $session->put(Auth::guard('super_admin')->getName(), $superAdmin->getAuthIdentifier());
    $session->migrate(true);
    $session->regenerate();
    $session->save();

    return $session->getId();
}

function storedSessionPayload(string $sessionId): string
{
    return storeOfAnotherProcess()->getHandler()->read($sessionId);
}

// Mỗi request test phải đọc phiên từ cookie như trình duyệt, không mượn trạng
// thái phiên còn trong bộ nhớ từ request trước.
function browserWithSessionCookie($test, string $sessionId)
{
    app('session')->forgetDrivers();
    app()->forgetInstance('session.store');
    Auth::forgetGuards();

    return $test->withCookie(config('session.cookie'), $sessionId);
}

function sendWithSessionCookie($test, string $sessionId, string $uri)
{
    return browserWithSessionCookie($test, $sessionId)->get($uri);
}

it('request agent chạy dở không ghi đè phiên mới khi console vừa đăng nhập', function (string $driver) {
    config(['session.driver' => $driver]);
    $agent = User::factory()->create();
    $superAdmin = SuperAdmin::factory()->create();
    $agentSessionId = signedInAgentSessionId($agent);
    $consoleSessionId = null;

    Route::middleware('web')->get(SLOW_AGENT_ROUTE, function () use ($agentSessionId, $superAdmin, &$consoleSessionId) {
        $consoleSessionId = signInConsoleFromAnotherTab($agentSessionId, $superAdmin);

        return response('dữ liệu tab agent');
    });

    $slowResponse = sendWithSessionCookie($this, $agentSessionId, SLOW_AGENT_ROUTE);

    $slowResponse->assertOk()
        ->assertSee('dữ liệu tab agent')
        ->assertCookieMissing(config('session.cookie'))
        ->assertCookieMissing('XSRF-TOKEN');
    expect(storedSessionPayload($agentSessionId))->toBe('');

    sendWithSessionCookie($this, $consoleSessionId, WHOAMI_ROUTE)
        ->assertExactJson(['web' => $agent->id, 'super_admin' => $superAdmin->id]);
})->with('session drivers');

it('request thường vẫn lưu phiên và trả cookie phiên như cũ', function (string $driver) {
    config(['session.driver' => $driver]);
    $agent = User::factory()->create();
    $agentSessionId = signedInAgentSessionId($agent);

    sendWithSessionCookie($this, $agentSessionId, WHOAMI_ROUTE)
        ->assertCookie(config('session.cookie'), $agentSessionId)
        ->assertCookie('XSRF-TOKEN')
        ->assertExactJson(['web' => $agent->id, 'super_admin' => null]);
    expect(storedSessionPayload($agentSessionId))->not->toBe('');
})->with('session drivers');

it('cookie trỏ tới phiên đã hết hạn vẫn nhận phiên mới được lưu', function (string $driver) {
    config(['session.driver' => $driver]);
    $expiredSessionId = str_repeat('a', 40);

    sendWithSessionCookie($this, $expiredSessionId, WHOAMI_ROUTE)
        ->assertCookie(config('session.cookie'), $expiredSessionId)
        ->assertCookie('XSRF-TOKEN');
    expect(storedSessionPayload($expiredSessionId))->not->toBe('');
})->with('session drivers');

it('đăng nhập console xoay id phiên, huỷ id cũ và giữ nguyên đăng nhập agent', function (string $driver) {
    config(['session.driver' => $driver]);
    $agent = User::factory()->create();
    $superAdmin = SuperAdmin::factory()->create(['password' => 'Password1!']);
    $agentSessionId = signedInAgentSessionId($agent);

    $signIn = browserWithSessionCookie($this, $agentSessionId)
        ->post('/super_admin/sign_in', ['super_admin' => ['email' => $superAdmin->email, 'password' => 'Password1!']]);

    $signIn->assertRedirect('/super_admin');
    $consoleSessionId = $signIn->getCookie(config('session.cookie'))->getValue();

    expect($consoleSessionId)->not->toBe('')->not->toBe($agentSessionId)
        ->and(storedSessionPayload($agentSessionId))->toBe('');

    sendWithSessionCookie($this, $consoleSessionId, WHOAMI_ROUTE)
        ->assertExactJson(['web' => $agent->id, 'super_admin' => $superAdmin->id]);
})->with('session drivers');
