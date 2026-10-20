<?php

namespace App\Services\Email;

use App\Models\Message;
use Carbon\CarbonImmutable;
use Illuminate\Support\Str;
use RuntimeException;
use Spatie\Browsershot\Browsershot;
use Spatie\LaravelPdf\Facades\Pdf;
use Throwable;

/**
 * Dựng một thư đến thành tệp PDF giữ nguyên bố cục và ảnh, cho nơi không hiển thị
 * được HTML thư (chuyển tiếp sang kênh chat). Chromium chạy với JS tắt và mạng bị
 * chặn hết: mọi ảnh đã được SelfContainedHtml nhúng sẵn thành data URI.
 */
final class EmailPdfRenderer
{
    private const VIEW = 'pdf.email';

    private const NODE_MODULES_PATH = 'services/pdf-renderer/node_modules';

    private const CHROME_GLOB = 'services/pdf-renderer/.cache/puppeteer/chrome-headless-shell/*/chrome-headless-shell-*/chrome-headless-shell';

    /** Proxy không tồn tại: request http/https/ws nào lọt qua lớp làm sạch HTML cũng không ra được mạng. */
    private const UNREACHABLE_PROXY = '127.0.0.1:9';

    private const TIMEOUT_SECONDS = 60;

    private const FALLBACK_FILENAME = 'email';

    private const MAX_FILENAME_LENGTH = 100;

    private const DATE_FORMAT = 'd/m/Y H:i (P)';

    public function __construct(private readonly RemoteEmailImage $remoteImages) {}

    public function render(Message $email): EmailPdf
    {
        $mail = (array) data_get($email->content_attributes, 'email', []);
        $selfContained = new SelfContainedHtml($email->attachments, $this->remoteImages);
        $locale = $email->account->locale;

        $html = view(self::VIEW, [
            'locale' => $locale ?? app()->getLocale(),
            'subject' => (string) ($mail['subject'] ?? ''),
            'headers' => $this->headerRows($mail, $email, $locale),
            'body' => $selfContained->convert($this->bodyHtml($mail, $email)),
        ])->render();

        $contents = Pdf::html($html)
            ->format('a4')
            ->margins(12, 12, 12, 12)
            ->withBrowsershot(fn (Browsershot $browsershot) => $this->isolate($browsershot))
            ->generatePdfContent();

        return new EmailPdf($contents, $this->filename((string) ($mail['subject'] ?? '')), $selfContained->embeddedAttachmentIds());
    }

    private function isolate(Browsershot $browsershot): void
    {
        $browsershot
            ->setNodeModulePath(base_path(self::NODE_MODULES_PATH))
            ->disableJavascript()
            ->addChromiumArguments([
                'proxy-server' => self::UNREACHABLE_PROXY,
                'proxy-bypass-list' => '<-loopback>',
            ])
            ->timeout(self::TIMEOUT_SECONDS);

        if (blank(config('laravel-pdf.browsershot.chrome_path'))) {
            $browsershot->setChromePath(self::bundledChromePath());
        }
    }

    private static function bundledChromePath(): string
    {
        $candidates = glob(base_path(self::CHROME_GLOB)) ?: [];
        rsort($candidates, SORT_NATURAL);

        return $candidates[0] ?? throw new RuntimeException('Chưa cài chrome-headless-shell: chạy pnpm install trong services/pdf-renderer.');
    }

    /** @param  array<string, mixed>  $mail */
    private function bodyHtml(array $mail, Message $email): string
    {
        $html = data_get($mail, 'html_content.full');

        if (is_string($html) && filled($html)) {
            return $html;
        }

        $text = data_get($mail, 'text_content.full');
        $text = is_string($text) && filled($text) ? $text : (string) $email->content;

        return '<div style="white-space:pre-wrap">'.e($text).'</div>';
    }

    /**
     * @param  array<string, mixed>  $mail
     * @return list<array{label: string, value: string}>
     */
    private function headerRows(array $mail, Message $email, ?string $locale): array
    {
        $rows = [
            'FROM' => self::addresses($mail['from'] ?? null) ?: (string) $email->sender?->name,
            'TO' => self::addresses($mail['to'] ?? null),
            'CC' => self::addresses($mail['cc'] ?? null),
            'DATE' => self::date($mail['date'] ?? null) ?? $email->created_at?->format(self::DATE_FORMAT) ?? '',
        ];

        return array_values(array_map(
            fn (string $key) => ['label' => __("email_header.{$key}", [], $locale), 'value' => $rows[$key]],
            array_keys(array_filter($rows, 'filled')),
        ));
    }

    private static function addresses(mixed $value): string
    {
        return implode(', ', array_filter(array_map('strval', is_array($value) ? $value : [$value]), 'filled'));
    }

    private static function date(mixed $value): ?string
    {
        if (! is_string($value) || blank($value)) {
            return null;
        }

        try {
            return CarbonImmutable::parse($value)->format(self::DATE_FORMAT);
        } catch (Throwable) {
            return $value;
        }
    }

    private function filename(string $subject): string
    {
        $name = trim((string) preg_replace('/[\x00-\x1F\x7F\/\\\\:*?"<>|]+/u', ' ', $subject));
        $name = Str::limit((string) preg_replace('/\s+/u', ' ', $name), self::MAX_FILENAME_LENGTH, '');

        return ($name === '' ? self::FALLBACK_FILENAME : rtrim($name, '. ')).'.pdf';
    }
}
