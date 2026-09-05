<?php

namespace App\Support;

use Illuminate\Http\Request;

// Thay gem `browser` của Chatwoot (dùng trong Api::V1::Widget::BaseController
// #browser_params và #timestamp_params): đọc User-Agent + Accept-Language rồi
// trả đúng bộ khóa mà panel hội thoại của dashboard đang hiển thị.
final class BrowserInfo
{
    private const UNKNOWN = 'Unknown';

    /** Thứ tự QUAN TRỌNG: Edge/Chrome/Safari đều mang chuỗi cũ của nhau trong UA. */
    private const BROWSERS = [
        'Microsoft Edge' => '/edg(?:e|a|ios)?\/([\d.]+)/i',
        'Opera' => '/(?:opr|opera)\/([\d.]+)/i',
        'Samsung Internet' => '/samsungbrowser\/([\d.]+)/i',
        'Internet Explorer' => '/(?:msie |rv:)([\d.]+)\)?(?=.*trident)/i',
        'Firefox' => '/(?:firefox|fxios)\/([\d.]+)/i',
        'Chrome' => '/(?:chrome|crios|chromium)\/([\d.]+)/i',
        'Safari' => '/version\/([\d.]+).*safari/i',
    ];

    private const PLATFORMS = [
        'Windows Phone' => '/windows phone(?: os)? ([\d.]+)/i',
        'Windows' => '/windows nt ([\d.]+)/i',
        'iOS' => '/(?:iphone|ipad|ipod).*? os ([\d_]+)/i',
        'Android' => '/android ([\d.]+)/i',
        'Mac' => '/mac os x ([\d_.]+)/i',
        'Chrome OS' => '/cros \S+ ([\d.]+)/i',
        // Linux không kèm số hiệu bản phát hành trong UA — nhóm bắt để rỗng.
        'Linux' => '/linux()/i',
    ];

    private const DEVICES = [
        'iPhone' => '/iphone/i',
        'iPad' => '/ipad/i',
        'iPod' => '/ipod/i',
        'Android' => '/android/i',
    ];

    /** browser_params của base_controller.rb @return array<string, string> */
    public static function fromRequest(Request $request): array
    {
        $userAgent = (string) $request->userAgent();
        [$browserName, $browserVersion] = self::match(self::BROWSERS, $userAgent);
        [$platformName, $platformVersion] = self::match(self::PLATFORMS, $userAgent);

        return [
            'browser_name' => $browserName,
            'browser_version' => $browserVersion,
            'device_name' => self::deviceName($userAgent),
            'platform_name' => $platformName,
            'platform_version' => str_replace('_', '.', $platformVersion),
        ];
    }

    /** browser.accept_language.first&.code — mã ngôn ngữ ưu tiên nhất. */
    public static function browserLanguage(Request $request): ?string
    {
        $header = (string) $request->header('Accept-Language');

        if (! preg_match('/^\s*([a-zA-Z]{1,8})(?:-[a-zA-Z\d]{1,8})*/', $header, $matches)) {
            return null;
        }

        return strtolower($matches[1]);
    }

    /**
     * @param  array<string, string>  $patterns
     * @return array{0: string, 1: string}
     */
    private static function match(array $patterns, string $userAgent): array
    {
        foreach ($patterns as $name => $pattern) {
            if (preg_match($pattern, $userAgent, $matches)) {
                return [$name, $matches[1]];
            }
        }

        return [self::UNKNOWN, ''];
    }

    private static function deviceName(string $userAgent): string
    {
        foreach (self::DEVICES as $name => $pattern) {
            if (preg_match($pattern, $userAgent)) {
                return $name;
            }
        }

        return self::UNKNOWN;
    }
}
