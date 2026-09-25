<?php

namespace App\Console\Commands;

use App\Support\Alerts\OpsAlerter;
use App\Support\Postgres\PostgresBinaries;
use Illuminate\Console\Command;
use Illuminate\Database\Connection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use RuntimeException;
use Symfony\Component\Process\Process;
use Throwable;

/**
 * Kiểm chứng bản sao lưu mới nhất phục hồi được, không chỉ "file có tồn tại".
 * Tự tạo database nháp `<db chính>_restore_drill`, phục hồi vào đó, đếm vài
 * bảng cốt lõi đối chiếu với DB đang chạy, rồi TỰ XOÁ database nháp — không để
 * lại rác dù thành công hay thất bại (docs/deployment.md mục "Sao lưu và
 * phục hồi").
 *
 * Yêu cầu vận hành: role DB_USERNAME phải có quyền CREATEDB (`ALTER ROLE
 * <role> CREATEDB;`), vì tạo/xoá database nháp cần quyền đó.
 */
class RestoreDrill extends Command
{
    /** Vài bảng cốt lõi đủ để phát hiện phục hồi rỗng hoặc thiếu dữ liệu. */
    private const SANITY_TABLES = ['accounts', 'contacts', 'conversations', 'messages'];

    protected $signature = 'db:restore-drill {file? : Đường dẫn file .dump; mặc định lấy bản mới nhất trong storage/app/backups}';

    protected $description = 'Phục hồi bản sao lưu mới nhất vào database nháp để kiểm tra tính toàn vẹn';

    public function __construct(private readonly OpsAlerter $alerter)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        try {
            $dumpFile = $this->resolveDumpFile();
        } catch (Throwable $e) {
            $this->error($e->getMessage());

            return self::FAILURE;
        }

        $config = config('database.connections.'.config('database.default'));
        $appDatabase = (string) $config['database'];
        $scratchDatabase = "{$appDatabase}_restore_drill";

        if ($scratchDatabase === $appDatabase) {
            $this->error('Database nháp trùng tên database chính — từ chối chạy.');

            return self::FAILURE;
        }

        $this->info("Phục hồi {$dumpFile} vào database nháp '{$scratchDatabase}'...");
        $startedAt = microtime(true);

        try {
            $this->dropScratchDatabase($config, $scratchDatabase);
            $this->createScratchDatabase($config, $scratchDatabase);
            $this->restoreDump($config, $scratchDatabase, $dumpFile);
            $this->reportSanityCounts($config, $scratchDatabase, $appDatabase);
        } catch (Throwable $e) {
            $this->alerter->send('db-restore-drill-failed', "Restore drill thất bại: {$e->getMessage()}");
            $this->error($e->getMessage());

            return self::FAILURE;
        } finally {
            DB::purge('restore_drill_scratch');
            $this->dropScratchDatabase($config, $scratchDatabase);
        }

        $duration = round(microtime(true) - $startedAt, 1);
        $this->info("Xong trong {$duration}s. Database nháp đã được xoá.");

        return self::SUCCESS;
    }

    private function resolveDumpFile(): string
    {
        $argument = $this->argument('file');
        if (is_string($argument) && $argument !== '') {
            if (! is_file($argument)) {
                throw new RuntimeException("Không tìm thấy file: {$argument}");
            }

            return $argument;
        }

        $directory = storage_path('app/backups');
        $candidates = File::glob("{$directory}/db-*.dump");

        if ($candidates === [] || $candidates === false) {
            throw new RuntimeException("Không có bản sao lưu nào trong {$directory}.");
        }

        usort($candidates, fn (string $a, string $b) => File::lastModified($b) <=> File::lastModified($a));

        return $candidates[0];
    }

    /** @param array<string, mixed> $config */
    private function dropScratchDatabase(array $config, string $database): void
    {
        $this->runPostgresBinary($config, 'dropdb', ['--if-exists', $database]);
    }

    /** @param array<string, mixed> $config */
    private function createScratchDatabase(array $config, string $database): void
    {
        $this->runPostgresBinary($config, 'createdb', ['--owner', (string) $config['username'], $database]);
    }

    /** @param array<string, mixed> $config */
    private function restoreDump(array $config, string $database, string $dumpFile): void
    {
        $process = new Process([
            PostgresBinaries::resolve('pg_restore'),
            '--no-owner',
            '--clean',
            '--if-exists',
            '-h', (string) $config['host'],
            '-p', (string) $config['port'],
            '-U', (string) $config['username'],
            '-d', $database,
            $dumpFile,
        ]);
        $process->setTimeout(3600);
        $this->withPgPassword($process, $config);
        $process->run();

        // pg_restore trả về khác 0 cả khi chỉ có warning vô hại (vd role không
        // tồn tại ở máy dev); coi là lỗi thật chỉ khi output không rỗng và
        // isSuccessful() vẫn false — vẫn phải chặn, vì "vô hại" không tự xác
        // định được ở đây, chỉ ghi rõ lỗi cho người vận hành tự đọc thay vì
        // giả định là an toàn.
        if (! $process->isSuccessful()) {
            throw new RuntimeException('pg_restore: '.(trim($process->getErrorOutput()) ?: 'pg_restore thất bại không rõ lý do'));
        }
    }

    /** @param array<string, mixed> $config */
    private function reportSanityCounts(array $config, string $scratchDatabase, string $appDatabase): void
    {
        config(['database.connections.restore_drill_scratch' => array_merge($config, [
            'database' => $scratchDatabase,
        ])]);

        $scratch = DB::connection('restore_drill_scratch');
        $live = DB::connection(config('database.default'));

        $this->table(['Bảng', "Nháp ({$scratchDatabase})", "Đang chạy ({$appDatabase})"], collect(self::SANITY_TABLES)
            ->map(function (string $table) use ($scratch, $live) {
                $scratchCount = $this->countIfExists($scratch, $table);
                $liveCount = $this->countIfExists($live, $table);

                if ($scratchCount === 0 && $liveCount > 0) {
                    $this->warn("Bảng '{$table}' rỗng trong bản phục hồi nhưng có {$liveCount} dòng ở DB đang chạy — nghi phục hồi thiếu dữ liệu.");
                }

                return [$table, $scratchCount, $liveCount];
            })
            ->all());
    }

    private function countIfExists(Connection $connection, string $table): int
    {
        $exists = (bool) $connection->selectOne(
            'select exists (select 1 from information_schema.tables where table_schema = ? and table_name = ?) as found',
            ['public', $table]
        )?->found;

        return $exists ? (int) $connection->table($table)->count() : 0;
    }

    /** @param array<string, mixed> $config @param list<string> $args */
    private function runPostgresBinary(array $config, string $binary, array $args): void
    {
        $process = new Process([
            PostgresBinaries::resolve($binary),
            '-h', (string) $config['host'],
            '-p', (string) $config['port'],
            '-U', (string) $config['username'],
            ...$args,
        ]);
        $process->setTimeout(120);
        $this->withPgPassword($process, $config);
        $process->run();

        if (! $process->isSuccessful()) {
            throw new RuntimeException("{$binary}: ".(trim($process->getErrorOutput()) ?: "{$binary} thất bại không rõ lý do"));
        }
    }

    /** @param array<string, mixed> $config */
    private function withPgPassword(Process $process, array $config): void
    {
        if (filled($config['password'] ?? null)) {
            $process->setEnv(['PGPASSWORD' => $config['password']]);
        }
    }
}
