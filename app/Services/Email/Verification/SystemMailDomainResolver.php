<?php

namespace App\Services\Email\Verification;

final class SystemMailDomainResolver implements MailDomainResolver
{
    public function mxHosts(string $domain): ?array
    {
        $records = @dns_get_record($domain.'.', DNS_MX);

        if ($records === false) {
            return null;
        }

        return array_values(array_map(
            static fn (array $record) => rtrim((string) ($record['target'] ?? ''), '.'),
            $records,
        ));
    }

    public function hasAddressRecord(string $domain): ?bool
    {
        $records = @dns_get_record($domain.'.', DNS_A | DNS_AAAA);

        return $records === false ? null : $records !== [];
    }
}
