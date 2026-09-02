<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Filesystem\Filesystem;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;
use RuntimeException;
use Symfony\Component\Finder\SplFileInfo;

/**
 * Sinh bundle frontend từ lang/{locale}/*.php — nguồn chân lý duy nhất cho mọi chuỗi giao diện.
 *
 * Mỗi file lang/en/<name>.php là một namespace Chatwoot: strtoupper(<name>) (conversation.php → CONVERSATION).
 * Chuỗi được chép nguyên văn (placeholder `{name}`), chỉ kiểm tra cấu trúc và độ phủ key giữa các locale.
 */
class GenerateI18nBundles extends Command
{
    protected $signature = 'i18n:generate
        {--check : Chỉ so bundle hiện có với lang/, lỗi nếu lệch (dùng cho CI)}
        {--output= : Thư mục ghi bundle (mặc định resources/js/i18n/generated)}';

    protected $description = 'Sinh bundle i18n frontend (resources/js/i18n/generated) từ lang/{locale}/*.php';

    public function __construct(private readonly Filesystem $files)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        try {
            $bundles = $this->buildBundles();
        } catch (RuntimeException $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        $outputDir = $this->option('output') ?: resource_path('js/i18n/generated');
        $expectedFiles = $this->renderFiles($bundles);

        if ($this->option('check')) {
            return $this->verifyUpToDate($outputDir, $expectedFiles);
        }

        $this->files->ensureDirectoryExists($outputDir);
        foreach ($expectedFiles as $fileName => $content) {
            $this->files->put("$outputDir/$fileName", $content);
        }
        $this->components->info(sprintf(
            'Đã sinh %d locale (%s) → %s',
            count($bundles),
            implode(', ', array_keys($bundles)),
            $outputDir,
        ));

        return self::SUCCESS;
    }

    /** @return array<string, array<string, mixed>> locale → { NAMESPACE → cây key } */
    private function buildBundles(): array
    {
        $langPath = $this->laravel->langPath();
        $bundles = [];

        foreach ($this->files->directories($langPath) as $localeDir) {
            $locale = basename($localeDir);
            $bundles[$locale] = [];

            foreach ($this->files->files($localeDir) as $file) {
                if ($file->getExtension() !== 'php') {
                    continue;
                }
                $namespace = Str::upper($file->getFilenameWithoutExtension());
                $bundles[$locale][$namespace] = $this->assertStringTree($this->loadLangFile($file), "$locale/{$file->getFilename()}");
            }
        }

        if ($bundles === []) {
            throw new RuntimeException("Không có locale nào trong $langPath");
        }

        $this->assertNoMissingKeys($bundles);

        return $bundles;
    }

    /** @return array<string, mixed> */
    private function loadLangFile(SplFileInfo $file): array
    {
        $tree = require $file->getPathname();

        if (! is_array($tree)) {
            throw new RuntimeException("{$file->getPathname()} phải return array");
        }

        return $tree;
    }

    /** @return array<string, mixed> */
    private function assertStringTree(array $tree, string $origin): array
    {
        foreach ($tree as $key => $value) {
            if (is_array($value)) {
                $this->assertStringTree($value, $origin);
            } elseif (! is_string($value)) {
                throw new RuntimeException("$origin: key `$key` phải là string hoặc array");
            }
        }

        return $tree;
    }

    /** @param array<string, array<string, mixed>> $bundles */
    private function assertNoMissingKeys(array $bundles): void
    {
        $referenceLocale = config('app.fallback_locale');
        if (! isset($bundles[$referenceLocale])) {
            throw new RuntimeException("Thiếu locale gốc `$referenceLocale` trong lang/");
        }
        $referenceKeys = array_keys(Arr::dot($bundles[$referenceLocale]));

        $problems = [];
        foreach ($bundles as $locale => $tree) {
            if ($locale === $referenceLocale) {
                continue;
            }
            $localeKeys = array_keys(Arr::dot($tree));
            foreach (array_diff($referenceKeys, $localeKeys) as $missingKey) {
                $problems[] = "lang/$locale thiếu key: $missingKey";
            }
            foreach (array_diff($localeKeys, $referenceKeys) as $unknownKey) {
                $this->components->warn("lang/$locale có key không tồn tại ở $referenceLocale: $unknownKey");
            }
        }

        if ($problems !== []) {
            throw new RuntimeException(implode("\n", $problems));
        }
    }

    /**
     * @param  array<string, array<string, mixed>>  $bundles
     * @return array<string, string> tên file → nội dung
     */
    private function renderFiles(array $bundles): array
    {
        $header = '// Sinh bởi `php artisan i18n:generate` từ lang/{locale}/*.php — KHÔNG SỬA TAY.';
        $files = [];
        foreach ($bundles as $locale => $tree) {
            $json = json_encode($tree, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
            $files["$locale.ts"] = "$header\nconst messages: Record<string, unknown> = $json;\n\nexport default messages;\n";
        }

        $imports = '';
        $entries = '';
        foreach (array_keys($bundles) as $locale) {
            $identifier = Str::camel($locale);
            $imports .= "import $identifier from './$locale';\n";
            $entries .= "    '$locale': $identifier,\n";
        }
        $defaultLocale = config('app.fallback_locale');
        $files['index.ts'] = "$header\n$imports\nexport const locales: Record<string, Record<string, unknown>> = {\n$entries};\n\nexport const defaultLocale = '$defaultLocale';\n";

        return $files;
    }

    /** @param array<string, string> $expectedFiles */
    private function verifyUpToDate(string $outputDir, array $expectedFiles): int
    {
        $stale = [];
        foreach ($expectedFiles as $fileName => $content) {
            $path = "$outputDir/$fileName";
            if (! $this->files->exists($path) || $this->files->get($path) !== $content) {
                $stale[] = $fileName;
            }
        }

        if ($stale !== []) {
            $this->error('Bundle i18n lệch với lang/: '.implode(', ', $stale).' — chạy `php artisan i18n:generate`.');

            return self::FAILURE;
        }
        $this->components->info('Bundle i18n khớp lang/.');

        return self::SUCCESS;
    }
}
