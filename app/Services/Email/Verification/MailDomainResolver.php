<?php

namespace App\Services\Email\Verification;

/** Tra DNS của tên miền nhận thư; bọc lại để test thay bằng bản giả, không gọi mạng. */
interface MailDomainResolver
{
    /** @return list<string>|null Máy chủ MX (chuỗi rỗng là MX rỗng "." của RFC 7505); null khi tra cứu lỗi. */
    public function mxHosts(string $domain): ?array;

    /** Tên miền có bản ghi A/AAAA; null khi tra cứu lỗi. */
    public function hasAddressRecord(string $domain): ?bool;
}
