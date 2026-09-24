<?php

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;

const IPV4_SOURCE = 'https://proxy.test/ips-v4';
const IPV6_SOURCE = 'https://proxy.test/ips-v6';

beforeEach(function () {
    $this->configDirectory = sys_get_temp_dir().'/trusted-proxies-'.uniqid();
    File::ensureDirectoryExists($this->configDirectory);
    $this->app->useConfigPath($this->configDirectory);

    config([
        'trustedproxy.client_ip_header' => 'CF-Connecting-IP',
        'trustedproxy.sources' => [IPV4_SOURCE, IPV6_SOURCE],
    ]);
});

afterEach(function () {
    File::deleteDirectory($this->configDirectory);
});

function generatedTrustedProxyConfig(): array
{
    return require config_path('trustedproxy.php');
}

it('ghi dải IP mới tải về vào config, giữ nguyên header và nguồn', function () {
    Http::fake([
        IPV4_SOURCE => Http::response("173.245.48.0/20\n103.21.244.0/22\n"),
        IPV6_SOURCE => Http::response("2400:cb00::/32\r\n2606:4700::/32"),
    ]);

    $this->artisan('trusted-proxies:refresh')
        ->expectsOutputToContain('4 dải IP')
        ->assertSuccessful();

    expect(generatedTrustedProxyConfig())->toBe([
        'client_ip_header' => 'CF-Connecting-IP',
        'sources' => [IPV4_SOURCE, IPV6_SOURCE],
        'proxies' => ['173.245.48.0/20', '103.21.244.0/22', '2400:cb00::/32', '2606:4700::/32'],
    ]);
});

it('không ghi gì khi một nguồn trả dòng không phải dải IP', function (string $invalidBody) {
    Http::fake([
        IPV4_SOURCE => Http::response("173.245.48.0/20\n"),
        IPV6_SOURCE => Http::response($invalidBody),
    ]);

    $this->artisan('trusted-proxies:refresh')->assertFailed();

    expect(File::exists(config_path('trustedproxy.php')))->toBeFalse();
})->with([
    'trang HTML' => ['<html>bảo trì</html>'],
    'thiếu độ dài mạng' => ['2400:cb00::'],
    'độ dài mạng vượt giới hạn' => ['10.0.0.0/33'],
    'rỗng' => [''],
]);

it('không ghi gì khi một nguồn lỗi HTTP', function () {
    Http::fake([
        IPV4_SOURCE => Http::response("173.245.48.0/20\n"),
        IPV6_SOURCE => Http::response('', 503),
    ]);

    $this->artisan('trusted-proxies:refresh')->assertFailed();

    expect(File::exists(config_path('trustedproxy.php')))->toBeFalse();
});
