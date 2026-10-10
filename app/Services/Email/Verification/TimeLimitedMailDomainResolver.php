<?php

namespace App\Services\Email\Verification;

use React\Dns\Config\Config;
use React\Dns\Model\Message;
use React\Dns\RecordNotFoundException;
use React\Dns\Resolver\Factory;
use React\EventLoop\StreamSelectLoop;
use Throwable;

/**
 * Tra DNS có hạn chờ: `dns_get_record` không đặt được timeout nên DNS chậm làm treo request.
 * Mỗi lượt tra chạy một vòng sự kiện riêng của react/dns và dừng hẳn sau TIMEOUT_SECONDS;
 * quá hạn hay máy chủ DNS lỗi đều là "tra cứu lỗi" (null) để bên gọi cho qua.
 */
final class TimeLimitedMailDomainResolver implements MailDomainResolver
{
    private const TIMEOUT_SECONDS = 2.5;

    // NOERROR/NODATA và NXDOMAIN: tên miền không có bản ghi loại này, không phải lỗi tra cứu.
    private const NO_RECORD_CODES = [Message::RCODE_OK, Message::RCODE_NAME_ERROR];

    public function mxHosts(string $domain): ?array
    {
        $records = $this->resolveAll($domain, Message::TYPE_MX);

        return $records === null ? null : array_values(array_map(
            static fn (mixed $record) => rtrim((string) (is_array($record) ? ($record['target'] ?? '') : ''), '.'),
            $records,
        ));
    }

    public function hasAddressRecord(string $domain): ?bool
    {
        foreach ([Message::TYPE_A, Message::TYPE_AAAA] as $type) {
            $records = $this->resolveAll($domain, $type);

            if ($records === null) {
                return null;
            }

            if ($records !== []) {
                return true;
            }
        }

        return false;
    }

    /** @return list<mixed>|null [] khi không có bản ghi, null khi tra lỗi hoặc quá hạn */
    private function resolveAll(string $domain, int $type): ?array
    {
        $loop = new StreamSelectLoop;

        try {
            $config = Config::loadSystemConfigBlocking();
            $resolver = (new Factory)->create($config, $loop);
        } catch (Throwable) {
            return null;
        }

        $settled = false;
        $records = null;

        $promise = $resolver->resolveAll($domain, $type)->then(
            static function (array $answers) use (&$settled, &$records, $loop) {
                [$settled, $records] = [true, array_values($answers)];
                $loop->stop();
            },
            static function (Throwable $error) use (&$settled, &$records, $loop) {
                $noRecord = $error instanceof RecordNotFoundException && in_array($error->getCode(), self::NO_RECORD_CODES, true);
                [$settled, $records] = [true, $noRecord ? [] : null];
                $loop->stop();
            },
        );

        if (! $settled) {
            $deadline = $loop->addTimer(self::TIMEOUT_SECONDS, static fn () => $loop->stop());
            $loop->run();
            $loop->cancelTimer($deadline);
        }

        if (! $settled) {
            $promise->cancel();
        }

        return $records;
    }
}
