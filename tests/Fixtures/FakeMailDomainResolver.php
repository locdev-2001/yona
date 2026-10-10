<?php

namespace Tests\Fixtures;

use App\Services\Email\Verification\MailDomainResolver;

/**
 * DNS giả cho kiểm địa chỉ email: tên miền khai trong $mxHosts / $addressDomains, còn lại
 * coi như không tồn tại (hoặc đều nhận thư khi $everyDomainReceivesMail); $failingDomains
 * mô phỏng tra cứu lỗi. Đếm số lần tra để kiểm cache.
 */
final class FakeMailDomainResolver implements MailDomainResolver
{
    public int $lookups = 0;

    /**
     * @param  array<string, list<string>>  $mxHosts
     * @param  list<string>  $addressDomains
     * @param  list<string>  $failingDomains
     */
    public function __construct(
        private readonly array $mxHosts = [],
        private readonly array $addressDomains = [],
        private readonly array $failingDomains = [],
        private readonly bool $everyDomainReceivesMail = false,
    ) {}

    /** Mặc định của mọi test (TestCase): tên miền nào cũng nhận thư, không ra mạng. */
    public static function receivingEveryDomain(): self
    {
        return new self(everyDomainReceivesMail: true);
    }

    public static function bind(array $mxHosts = [], array $addressDomains = [], array $failingDomains = []): self
    {
        $resolver = new self($mxHosts, $addressDomains, $failingDomains);
        app()->instance(MailDomainResolver::class, $resolver);

        return $resolver;
    }

    public function mxHosts(string $domain): ?array
    {
        $this->lookups++;

        if (in_array($domain, $this->failingDomains, true)) {
            return null;
        }

        return $this->mxHosts[$domain] ?? ($this->everyDomainReceivesMail ? ['mx.'.$domain] : []);
    }

    public function hasAddressRecord(string $domain): ?bool
    {
        return in_array($domain, $this->failingDomains, true) ? null : in_array($domain, $this->addressDomains, true);
    }
}
