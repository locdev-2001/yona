<?php

namespace App\Support;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use Psr\Http\Message\UriInterface;

// Cổng duy nhất kiểm tra URL do người dùng nhập trước khi máy chủ tự gọi ra ngoài
// (webhook tài khoản/inbox/agent bot, avatar theo URL). Tương đương ssrf_filter mà
// lib/safe_fetch.rb của bản gốc dùng: chặn loopback, mạng nội bộ, link-local
// (gồm 169.254.169.254 của metadata cloud) và mọi dải dành riêng khác.
final class SafeHttp
{
    private const ALLOWED_SCHEMES = ['http', 'https'];

    public static function assertPublicUrl(string $url): void
    {
        $parts = parse_url($url);
        $scheme = strtolower((string) ($parts['scheme'] ?? ''));
        $host = (string) ($parts['host'] ?? '');

        if (! in_array($scheme, self::ALLOWED_SCHEMES, true) || $host === '') {
            throw new UnsafeUrlException("URL không hợp lệ: {$url}");
        }

        if (self::allowsPrivateNetworks()) {
            return;
        }

        $addresses = self::resolve($host);

        if ($addresses === []) {
            throw new UnsafeUrlException("Không phân giải được tên miền: {$host}");
        }

        foreach ($addresses as $address) {
            if (! self::isPublicAddress($address)) {
                throw new UnsafeUrlException("URL trỏ vào địa chỉ nội bộ: {$host} ({$address})");
            }
        }
    }

    /**
     * Request đọc theo luồng, mỗi lần chuyển hướng cũng qua `assertPublicUrl`: máy chủ ngoài
     * trả 302 về 169.254.169.254 thì hop đó bị chặn như URL gốc. Bên gọi vẫn phải tự
     * `assertPublicUrl` URL đầu tiên.
     */
    public static function streamingRequest(int $connectTimeoutSeconds, int $timeoutSeconds, int $maxRedirects = 3): PendingRequest
    {
        return self::guarded(Http::withOptions(['stream' => true]), $connectTimeoutSeconds, $timeoutSeconds, $maxRedirects);
    }

    /** Cùng hàng rào chuyển hướng cho một request dựng sẵn, ví dụ từng request trong `Http::pool`. */
    public static function guarded(PendingRequest $request, int $connectTimeoutSeconds, int $timeoutSeconds, int $maxRedirects = 3): PendingRequest
    {
        return $request->connectTimeout($connectTimeoutSeconds)
            ->timeout($timeoutSeconds)
            ->withOptions([
                'allow_redirects' => [
                    'max' => $maxRedirects,
                    'protocols' => self::ALLOWED_SCHEMES,
                    'on_redirect' => static function ($request, $response, UriInterface $uri): void {
                        self::assertPublicUrl((string) $uri);
                    },
                ],
            ]);
    }

    public static function allowsPrivateNetworks(): bool
    {
        return (bool) config('safe_http.allow_private_networks');
    }

    /** @return list<string> */
    private static function resolve(string $host): array
    {
        $host = trim($host, '[]');

        if (filter_var($host, FILTER_VALIDATE_IP) !== false) {
            return [$host];
        }

        $records = @dns_get_record($host, DNS_A + DNS_AAAA) ?: [];
        $addresses = [];

        foreach ($records as $record) {
            $address = $record['ip'] ?? $record['ipv6'] ?? null;

            if ($address !== null) {
                $addresses[] = $address;
            }
        }

        if ($addresses === []) {
            $resolved = gethostbyname($host);
            // gethostbyname trả lại chính tên miền khi hỏng.
            if ($resolved !== $host) {
                $addresses[] = $resolved;
            }
        }

        return $addresses;
    }

    private static function isPublicAddress(string $address): bool
    {
        return filter_var(
            $address,
            FILTER_VALIDATE_IP,
            FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE,
        ) !== false;
    }
}
