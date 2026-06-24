<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Translation\PotentiallyTranslatedString;

/**
 * Validates that a URL is publicly reachable via HTTPS and not a private/loopback address.
 *
 * Rejects:
 *   - Non-HTTPS schemes
 *   - Loopback:      127.0.0.0/8, ::1
 *   - Private:       10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
 *   - Link-local:    169.254.0.0/16, fe80::/10
 *
 * Prevents SSRF in future proxy/cache-fetch flows (BR-X16).
 * v1 does not fetch the URL — the validation is defense-in-depth.
 */
class PublicHttpUrl implements ValidationRule
{
    /** @param  Closure(string, string=): PotentiallyTranslatedString  $fail */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value)) {
            $fail('validation.url')->translate();

            return;
        }

        $parsed = parse_url($value);

        if ($parsed === false || empty($parsed['host'])) {
            $fail('validation.url')->translate();

            return;
        }

        if (($parsed['scheme'] ?? '') !== 'https') {
            $fail('The :attribute must use HTTPS.')->translate();

            return;
        }

        $host = $parsed['host'];
        // Strip IPv6 brackets: [::1] → ::1
        $host = ltrim(rtrim($host, ']'), '[');

        if ($this->isPrivateOrLoopback($host)) {
            $fail('The :attribute must be a publicly reachable URL.')->translate();
        }
    }

    private function isPrivateOrLoopback(string $host): bool
    {
        // Resolve hostname to IP for DNS-based SSRF bypass prevention.
        // If resolution fails we allow — we cannot block unknown hosts.
        $ip = filter_var($host, FILTER_VALIDATE_IP) !== false
            ? $host
            : gethostbyname($host);

        if ($ip === $host && filter_var($ip, FILTER_VALIDATE_IP) === false) {
            // Could not resolve and not a bare IP — allow (non-IP hostname)
            return false;
        }

        // IPv6 loopback
        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6) !== false) {
            // ::1 and fe80::/10
            if ($ip === '::1') {
                return true;
            }
            // fe80::/10 link-local
            if (stripos($ip, 'fe80:') === 0 || stripos($ip, 'fe8') === 0) {
                return true;
            }

            return false;
        }

        // IPv4 checks via FILTER_FLAG_NO_PRIV_RANGE + FILTER_FLAG_NO_RES_RANGE
        // covers loopback (127/8), private (10/8, 172.16/12, 192.168/16), link-local (169.254/16)
        return filter_var(
            $ip,
            FILTER_VALIDATE_IP,
            FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE
        ) === false;
    }
}
