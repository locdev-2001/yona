<?php

namespace App\Services\Email\Verification;

use Illuminate\Support\Facades\Cache;

/**
 * Kiểm một địa chỉ email có thể nhận thư: đúng cú pháp và tên miền nhận thư (MX, không có
 * MX thì A/AAAA theo RFC 5321 §5.1). Không dò hộp thư bằng SMTP RCPT: máy chủ lớn chặn và
 * trả lời không tin được; hộp thư không tồn tại được bắt khi thư bị trả về.
 * Tra DNS lỗi tạm thời thì cho qua (không chặn nhầm người trực) và nhớ ngắn 60 giây, để
 * DNS chậm không làm mỗi lần kiểm lại chờ thêm một lượt tra.
 */
class EmailAddressVerifier
{
    private const CACHE_PREFIX = 'email_domain_verdict:';

    private const CACHE_TTL_SECONDS = 3600;

    private const LOOKUP_FAILED_TTL_SECONDS = 60;

    private const MAX_ADDRESS_LENGTH = 254;

    private const MAX_LOCAL_PART_LENGTH = 64;

    private const DELIVERABLE = 'deliverable';

    private const LOOKUP_FAILED = 'lookup_failed';

    public function __construct(private readonly MailDomainResolver $resolver) {}

    public function verify(string $email): EmailAddressVerification
    {
        $email = trim($email);
        $domain = $this->asciiDomain($email);

        if ($domain === null) {
            return new EmailAddressVerification($email, EmailAddressVerification::INVALID_SYNTAX);
        }

        return new EmailAddressVerification($email, $this->domainReason($domain));
    }

    private function asciiDomain(string $email): ?string
    {
        $at = strrpos($email, '@');

        if ($at === false || strlen($email) > self::MAX_ADDRESS_LENGTH || $at > self::MAX_LOCAL_PART_LENGTH) {
            return null;
        }

        $domain = strtolower(substr($email, $at + 1));

        if (function_exists('idn_to_ascii') && preg_match('/[^\x20-\x7e]/', $domain) === 1) {
            $domain = idn_to_ascii($domain, IDNA_DEFAULT, INTL_IDNA_VARIANT_UTS46) ?: '';
        }

        $ascii = substr($email, 0, $at).'@'.$domain;

        if (filter_var($ascii, FILTER_VALIDATE_EMAIL) === false || ! str_contains($domain, '.')) {
            return null;
        }

        return $domain;
    }

    private function domainReason(string $domain): ?string
    {
        $cached = Cache::get(self::CACHE_PREFIX.$domain);

        if (is_string($cached)) {
            return in_array($cached, [self::DELIVERABLE, self::LOOKUP_FAILED], true) ? null : $cached;
        }

        $reason = $this->lookup($domain);

        if ($reason === false) {
            Cache::put(self::CACHE_PREFIX.$domain, self::LOOKUP_FAILED, self::LOOKUP_FAILED_TTL_SECONDS);

            return null;
        }

        Cache::put(self::CACHE_PREFIX.$domain, $reason ?? self::DELIVERABLE, self::CACHE_TTL_SECONDS);

        return $reason;
    }

    /** @return string|null|false lý do không nhận thư, null khi nhận được, false khi tra cứu lỗi */
    private function lookup(string $domain): string|null|false
    {
        $mxHosts = $this->resolver->mxHosts($domain);

        if ($mxHosts === null) {
            return false;
        }

        if ($mxHosts !== []) {
            $nullMx = array_filter($mxHosts, static fn (string $host) => $host === '' || $host === '.') !== [];

            return $nullMx && count($mxHosts) === 1 ? EmailAddressVerification::DOMAIN_NO_MAIL : null;
        }

        $hasAddress = $this->resolver->hasAddressRecord($domain);

        return match ($hasAddress) {
            null => false,
            true => null,
            false => EmailAddressVerification::DOMAIN_NOT_FOUND,
        };
    }
}
