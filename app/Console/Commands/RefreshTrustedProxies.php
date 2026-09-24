<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Tải lại dải IP proxy tin cậy từ các nguồn trong `trustedproxy.sources` và
 * sinh lại `config/trustedproxy.php`. Mạng chỉ được gọi ở đây, không bao giờ
 * trong request. Một nguồn lỗi hoặc có dòng lạ thì không ghi gì.
 */
class RefreshTrustedProxies extends Command
{
    private const REQUEST_TIMEOUT_SECONDS = 10;

    private const CONFIG_FILE = 'trustedproxy.php';

    private const CONFIG_TEMPLATE = <<<'PHP'
        <?php

        // Proxy đứng trước app. Chỉ request có REMOTE_ADDR thuộc `proxies` mới được
        // đọc IP khách từ header; nguồn khác gửi header gì cũng bị bỏ qua.
        // Tệp này do `php artisan trusted-proxies:refresh` sinh lại, đừng sửa tay.

        return [
            'client_ip_header' => {client_ip_header},

            'sources' => [
        {sources}
            ],

            'proxies' => [
        {proxies}
            ],
        ];

        PHP;

    protected $signature = 'trusted-proxies:refresh';

    protected $description = 'Tải lại dải IP proxy tin cậy (Cloudflare) vào config/trustedproxy.php';

    public function handle(): int
    {
        $sources = (array) config('trustedproxy.sources', []);

        if ($sources === []) {
            $this->components->error('Chưa khai nguồn nào ở trustedproxy.sources.');

            return self::FAILURE;
        }

        try {
            $proxies = $this->fetchRanges($sources);
        } catch (RequestException|RuntimeException $exception) {
            $this->components->error('Không cập nhật: '.$exception->getMessage());

            return self::FAILURE;
        }

        file_put_contents(config_path(self::CONFIG_FILE), $this->renderConfig($sources, $proxies));

        $this->components->info(count($proxies).' dải IP đã ghi vào config/'.self::CONFIG_FILE.'.');

        if ($this->laravel->configurationIsCached()) {
            $this->components->warn('Config đang cache: chạy `php artisan config:cache` để áp dụng.');
        }

        return self::SUCCESS;
    }

    /**
     * @param  list<string>  $sources
     * @return list<string>
     */
    private function fetchRanges(array $sources): array
    {
        $ranges = [];

        foreach ($sources as $source) {
            $body = Http::timeout(self::REQUEST_TIMEOUT_SECONDS)->get($source)->throw()->body();
            $lines = array_values(array_filter(array_map(trim(...), preg_split('/\R/', $body) ?: [])));

            if ($lines === []) {
                throw new RuntimeException("{$source} trả về danh sách rỗng.");
            }

            foreach ($lines as $line) {
                if (! $this->isCidr($line)) {
                    throw new RuntimeException("{$source} có dòng không phải dải IP: {$line}");
                }

                $ranges[] = $line;
            }
        }

        return array_values(array_unique($ranges));
    }

    private function isCidr(string $range): bool
    {
        [$address, $prefix] = array_pad(explode('/', $range, 2), 2, null);

        if (filter_var($address, FILTER_VALIDATE_IP) === false || $prefix === null || ! ctype_digit($prefix)) {
            return false;
        }

        $maxPrefix = filter_var($address, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6) !== false ? 128 : 32;

        return (int) $prefix <= $maxPrefix;
    }

    /**
     * @param  list<string>  $sources
     * @param  list<string>  $proxies
     */
    private function renderConfig(array $sources, array $proxies): string
    {
        return strtr(self::CONFIG_TEMPLATE, [
            '{client_ip_header}' => var_export(config('trustedproxy.client_ip_header'), true),
            '{sources}' => $this->renderList($sources),
            '{proxies}' => $this->renderList($proxies),
        ]);
    }

    /** @param  list<string>  $values */
    private function renderList(array $values): string
    {
        return implode("\n", array_map(
            fn (string $value): string => '        '.var_export($value, true).',',
            $values,
        ));
    }
}
