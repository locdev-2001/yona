<?php

use App\Models\User;
use App\Models\UserSession;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

const PROXY_EDGE_IPV4 = '173.245.48.10';
const PROXY_EDGE_IPV6 = '2606:4700::1111';
const UNTRUSTED_SOURCE_IP = '198.51.100.20';
const REAL_CLIENT_IP = '203.0.113.7';
const OTHER_CLIENT_IP = '203.0.113.99';
const THROTTLED_LOGIN_PREFIX = 'Too many login attempts';

beforeEach(function () {
    Route::get('/__client-ip', fn (Request $request) => $request->ip());
    Route::get('/__client-origin', fn (Request $request) => $request->getSchemeAndHttpHost());
});

function clientIpSeenBy(string $remoteAddress, array $headers): string
{
    return test()->withServerVariables(['REMOTE_ADDR' => $remoteAddress])
        ->get('/__client-ip', $headers)
        ->assertOk()
        ->getContent();
}

function loginErrorThrough(string $remoteAddress, string $clientIp, string $email): string
{
    signInThrough($remoteAddress, $clientIp, $email, 'sai-mat-khau')->assertSessionHasErrors('email');

    return session('errors')->first('email');
}

function signInThrough(string $remoteAddress, string $clientIp, string $email, string $password)
{
    return test()->withServerVariables(['REMOTE_ADDR' => $remoteAddress])
        ->from('/app/login')
        ->post('/app/login', ['email' => $email, 'password' => $password], ['CF-Connecting-IP' => $clientIp]);
}

it('lấy IP khách từ header của proxy tin cậy', function (string $edge, array $headers, string $expectedIp) {
    expect(clientIpSeenBy($edge, $headers))->toBe($expectedIp);
})->with([
    'header IP khách qua IPv4' => [PROXY_EDGE_IPV4, ['CF-Connecting-IP' => REAL_CLIENT_IP], REAL_CLIENT_IP],
    'header IP khách qua IPv6' => [PROXY_EDGE_IPV6, ['CF-Connecting-IP' => '2001:db8::7'], '2001:db8::7'],
    'header IP khách thắng X-Forwarded-For khách tự gửi' => [
        PROXY_EDGE_IPV4,
        ['CF-Connecting-IP' => REAL_CLIENT_IP, 'X-Forwarded-For' => '192.0.2.66, '.REAL_CLIENT_IP],
        REAL_CLIENT_IP,
    ],
    'thiếu header IP khách thì lấy phần tử cuối X-Forwarded-For' => [
        PROXY_EDGE_IPV4,
        ['X-Forwarded-For' => '192.0.2.66, '.REAL_CLIENT_IP],
        REAL_CLIENT_IP,
    ],
    'header IP khách hỏng thì về X-Forwarded-For' => [
        PROXY_EDGE_IPV4,
        ['CF-Connecting-IP' => 'không-phải-ip', 'X-Forwarded-For' => REAL_CLIENT_IP],
        REAL_CLIENT_IP,
    ],
]);

it('bỏ qua header IP khi request không đến từ proxy tin cậy', function (string $remoteAddress) {
    $spoofedHeaders = ['CF-Connecting-IP' => REAL_CLIENT_IP, 'X-Forwarded-For' => REAL_CLIENT_IP];

    expect(clientIpSeenBy($remoteAddress, $spoofedHeaders))->toBe($remoteAddress);
})->with([
    'IP lạ trên mạng' => [UNTRUSTED_SOURCE_IP],
    'localhost (nginx dùng FastCGI, không phải proxy)' => ['127.0.0.1'],
]);

it('không tin Host và scheme do proxy chuyển tiếp', function () {
    $origin = $this->withServerVariables(['REMOTE_ADDR' => PROXY_EDGE_IPV4])
        ->get('/__client-origin', ['X-Forwarded-Host' => 'attacker.example', 'X-Forwarded-Proto' => 'https'])
        ->assertOk()
        ->getContent();

    expect($origin)->toStartWith('http://')->not->toContain('attacker.example');
});

it('đăng nhập qua proxy ghi IP thật vào hồ sơ và danh sách phiên', function () {
    $user = User::factory()->create();

    signInThrough(PROXY_EDGE_IPV4, REAL_CLIENT_IP, $user->email, 'Password1!')->assertRedirect('/app');

    expect($user->refresh()->current_sign_in_ip)->toBe(REAL_CLIENT_IP)
        ->and(UserSession::query()->where('user_id', $user->id)->pluck('ip_address')->all())->toBe([REAL_CLIENT_IP]);
});

it('khoá đăng nhập theo IP khách thật, không theo IP proxy dùng chung', function () {
    $user = User::factory()->create();

    foreach (range(1, 5) as $attempt) {
        loginErrorThrough(PROXY_EDGE_IPV4, REAL_CLIENT_IP, $user->email);
    }

    expect(loginErrorThrough(PROXY_EDGE_IPV4, REAL_CLIENT_IP, $user->email))->toStartWith(THROTTLED_LOGIN_PREFIX)
        ->and(loginErrorThrough(PROXY_EDGE_IPV4, OTHER_CLIENT_IP, $user->email))->toBe(__('auth.failed'));
});

it('đổi header IP giả từ nguồn không tin cậy không thoát được khoá đăng nhập', function () {
    $user = User::factory()->create();

    foreach (range(1, 5) as $attempt) {
        loginErrorThrough(UNTRUSTED_SOURCE_IP, "203.0.113.{$attempt}", $user->email);
    }

    expect(loginErrorThrough(UNTRUSTED_SOURCE_IP, '203.0.113.200', $user->email))->toStartWith(THROTTLED_LOGIN_PREFIX);
});
