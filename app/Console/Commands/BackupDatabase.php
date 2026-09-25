<?php

namespace App\Console\Commands;

use App\Support\Alerts\OpsAlerter;
use App\Support\Postgres\PostgresBinaries;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Throwable;

/**
 * Sao lưu PostgreSQL bằng `pg_dump -Fc` (docs/deployment.md mục "Sao lưu và
 * phục hồi"). Mật khẩu DB đi qua biến môi trường PGPASSWORD của tiến trình
 * con, không bao giờ nằm trên argv hay trong log.
 *
 * `--with-files` thêm một bản tar.gz của storage/app/public (đính kèm khách
 * hàng — Attachment::disk() mặc định 'public'); lịch chạy ở routes/console.php
 * dùng cờ này mỗi tuần, còn bản DB chạy mỗi ngày.
 */
class BackupDatabase extends Command
{
    protected $signature = 'db:backup {--with-files : Kèm tar.gz đính kèm khách hàng (storage/app/public)}';

    protected $description = 'Sao lưu database (pg_dump -Fc), tuỳ chọn kèm tệp đính kèm, rồi dọn bản cũ';

    private const KEEP_DAYS = 14;

    public function __construct(private readonly OpsAlerter $alerter)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $directory = storage_path('app/backups');
        File::ensureDirectoryExists($directory);

        $timestamp = Carbon::now('Asia/Ho_Chi_Minh')->format('Ymd-His');

        try {
            $dumpPath = $this->dumpDatabase($directory, $timestamp);
            $this->info("Đã sao lưu database: {$dumpPath}");
            $this->copyOffsite($dumpPath);
            $this->rotate($directory, 'db-*.dump');
        } catch (Throwable $e) {
            $this->alerter->send('db-backup-failed', "Sao lưu database thất bại: {$e->getMessage()}");
            $this->error($e->getMessage());

            return self::FAILURE;
        }

        if ($this->option('with-files')) {
            try {
                $archivePath = $this->archiveAttachments($directory, $timestamp);
                $this->info("Đã sao lưu tệp đính kèm: {$archivePath}");
                $this->copyOffsite($archivePath);
                $this->rotate($directory, 'files-*.tar.gz');
            } catch (Throwable $e) {
                $this->alerter->send('db-backup-files-failed', "Sao lưu tệp đính kèm thất bại: {$e->getMessage()}");
                $this->error($e->getMessage());

                return self::FAILURE;
            }
        }

        return self::SUCCESS;
    }

    private function dumpDatabase(string $directory, string $timestamp): string
    {
        $path = "{$directory}/db-{$timestamp}.dump";
        $config = config('database.connections.'.config('database.default'));

        $env = filled($config['password'] ?? null) ? ['PGPASSWORD' => $config['password']] : [];

        $result = Process::timeout(3600)->env($env)->run([
            PostgresBinaries::resolve('pg_dump'),
            '-Fc',
            '-h', (string) $config['host'],
            '-p', (string) $config['port'],
            '-U', (string) $config['username'],
            '-f', $path,
            (string) $config['database'],
        ]);

        // pg_dump tạo file ngay khi mở `-f`, kể cả khi xác thực thất bại sau đó —
        // để lại file 0 byte trông như một bản sao lưu hợp lệ nếu không dọn.
        if ($result->failed() || ! is_file($path) || filesize($path) === 0) {
            File::delete($path);

            throw new RuntimeException('pg_dump: '.(trim($result->errorOutput()) ?: 'pg_dump thất bại không rõ lý do'));
        }

        chmod($path, 0600);

        return $path;
    }

    private function archiveAttachments(string $directory, string $timestamp): string
    {
        $path = "{$directory}/files-{$timestamp}.tar.gz";
        $source = storage_path('app/public');

        if (! is_dir($source)) {
            throw new RuntimeException("Không có thư mục đính kèm: {$source}");
        }

        $result = Process::timeout(3600)->run(['tar', '-czf', $path, '-C', $source, '.']);

        if ($result->failed() || ! is_file($path)) {
            File::delete($path);

            throw new RuntimeException('tar: '.(trim($result->errorOutput()) ?: 'nén tệp đính kèm thất bại không rõ lý do'));
        }

        chmod($path, 0600);

        return $path;
    }

    private function copyOffsite(string $localPath): void
    {
        $disk = (string) config('filesystems.backup_disk');

        if ($disk === '') {
            $this->warn('BACKUP_DISK chưa cấu hình — bản sao lưu này chưa có bản ngoài server.');

            return;
        }

        $stream = fopen($localPath, 'r');
        if ($stream === false) {
            throw new RuntimeException("Không đọc được file để đẩy ra ngoài server: {$localPath}");
        }

        try {
            $ok = Storage::disk($disk)->put('backups/'.basename($localPath), $stream);
        } finally {
            if (is_resource($stream)) {
                fclose($stream);
            }
        }

        if ($ok !== true) {
            throw new RuntimeException("Đẩy bản sao lưu lên disk '{$disk}' thất bại.");
        }
    }

    private function rotate(string $directory, string $pattern): void
    {
        $cutoff = Carbon::now()->subDays(self::KEEP_DAYS);

        foreach (File::glob("{$directory}/{$pattern}") as $file) {
            if (Carbon::createFromTimestamp(File::lastModified($file))->lt($cutoff)) {
                File::delete($file);
            }
        }

        $disk = (string) config('filesystems.backup_disk');
        if ($disk === '') {
            return;
        }

        $prefix = explode('*', $pattern)[0];

        try {
            $storage = Storage::disk($disk);
            foreach ($storage->files('backups') as $file) {
                if (! str_starts_with(basename($file), $prefix)) {
                    continue;
                }

                if (Carbon::createFromTimestamp($storage->lastModified($file))->lt($cutoff)) {
                    $storage->delete($file);
                }
            }
        } catch (Throwable $e) {
            $this->warn("Không dọn được bản cũ trên disk '{$disk}': {$e->getMessage()}");
        }
    }
}
