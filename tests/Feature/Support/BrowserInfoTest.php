<?php

use App\Support\BrowserInfo;
use Illuminate\Http\Request;

// Thay gem `browser` của Chatwoot — bộ khóa phải khớp panel hội thoại.

function browserRequest(?string $userAgent = null, ?string $acceptLanguage = null): Request
{
    // Request::create tự điền User-Agent/Accept-Language mặc định — đặt chuỗi
    // rỗng để mô phỏng request KHÔNG có header đó.
    return Request::create('/', 'GET', [], [], [], [
        'HTTP_USER_AGENT' => (string) $userAgent,
        'HTTP_ACCEPT_LANGUAGE' => (string) $acceptLanguage,
    ]);
}

it('reads browser, platform and device out of the user agent', function (string $userAgent, array $expected) {
    expect(BrowserInfo::fromRequest(browserRequest($userAgent)))->toMatchArray($expected);
})->with([
    'chrome on mac' => [
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        ['browser_name' => 'Chrome', 'browser_version' => '120.0.0.0', 'platform_name' => 'Mac', 'platform_version' => '10.15.7', 'device_name' => 'Unknown'],
    ],
    'safari on iphone' => [
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        ['browser_name' => 'Safari', 'platform_name' => 'iOS', 'platform_version' => '17.0', 'device_name' => 'iPhone'],
    ],
    'edge on windows' => [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
        ['browser_name' => 'Microsoft Edge', 'browser_version' => '120.0.0.0', 'platform_name' => 'Windows', 'platform_version' => '10.0'],
    ],
    'firefox on linux' => [
        'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0',
        ['browser_name' => 'Firefox', 'browser_version' => '121.0', 'platform_name' => 'Linux', 'platform_version' => ''],
    ],
]);

it('falls back to Unknown without a user agent', function () {
    expect(BrowserInfo::fromRequest(browserRequest()))->toBe([
        'browser_name' => 'Unknown',
        'browser_version' => '',
        'device_name' => 'Unknown',
        'platform_name' => 'Unknown',
        'platform_version' => '',
    ]);
});

it('takes the first language code of Accept-Language', function () {
    expect(BrowserInfo::browserLanguage(browserRequest(null, 'vi-VN,vi;q=0.9,en-US;q=0.8')))->toBe('vi');
    expect(BrowserInfo::browserLanguage(browserRequest(null, 'en-US,en;q=0.9')))->toBe('en');
    expect(BrowserInfo::browserLanguage(browserRequest()))->toBeNull();
});
