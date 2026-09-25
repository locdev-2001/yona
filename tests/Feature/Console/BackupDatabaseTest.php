<?php

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    File::deleteDirectory(storage_path('app/backups'));
    config([
        'services.alert_telegram.bot_token' => 'test-token',
        'services.alert_telegram.chat_id' => '999',
    ]);
});

afterEach(function () {
    File::deleteDirectory(storage_path('app/backups'));
});

it('tạo file pg_dump cục bộ và cảnh báo "chưa có bản ngoài server" khi thiếu BACKUP_DISK', function () {
    config(['filesystems.backup_disk' => null]);

    $this->artisan('db:backup')
        ->expectsOutputToContain('chưa có bản ngoài server')
        ->assertSuccessful();

    $dumps = File::glob(storage_path('app/backups/db-*.dump'));
    expect($dumps)->toHaveCount(1);
    expect(filesize($dumps[0]))->toBeGreaterThan(0);
});

it('đẩy bản sao lưu lên disk ngoài server khi có cấu hình BACKUP_DISK', function () {
    Storage::fake('backup_offsite');
    config(['filesystems.backup_disk' => 'backup_offsite']);

    $this->artisan('db:backup')->assertSuccessful();

    $dumps = File::glob(storage_path('app/backups/db-*.dump'));
    Storage::disk('backup_offsite')->assertExists('backups/'.basename($dumps[0]));
});

it('dọn bản sao lưu cục bộ và ngoài server cũ hơn 14 ngày (BackupDatabase::KEEP_DAYS)', function () {
    Storage::fake('backup_offsite');
    config(['filesystems.backup_disk' => 'backup_offsite']);

    File::ensureDirectoryExists(storage_path('app/backups'));
    $staleLocal = storage_path('app/backups/db-20200101-000000.dump');
    File::put($staleLocal, 'old');
    touch($staleLocal, now()->subDays(30)->timestamp);

    Storage::disk('backup_offsite')->put('backups/db-20200101-000000.dump', 'old');
    // Storage fake driver không cho set lastModified trực tiếp; ghi thẳng vào
    // thư mục tạm của disk fake rồi touch file thật để mô phỏng file cũ.
    touch(Storage::disk('backup_offsite')->path('backups/db-20200101-000000.dump'), now()->subDays(30)->timestamp);

    $this->artisan('db:backup')->assertSuccessful();

    expect(File::exists($staleLocal))->toBeFalse();
    Storage::disk('backup_offsite')->assertMissing('backups/db-20200101-000000.dump');
});

it('kèm tar.gz đính kèm khách hàng khi dùng --with-files', function () {
    Storage::fake('backup_offsite');
    config(['filesystems.backup_disk' => 'backup_offsite']);

    File::ensureDirectoryExists(storage_path('app/public/attachment-drill'));
    File::put(storage_path('app/public/attachment-drill/sample.txt'), 'nội dung mẫu');

    $this->artisan('db:backup', ['--with-files' => true])->assertSuccessful();

    $archives = File::glob(storage_path('app/backups/files-*.tar.gz'));
    expect($archives)->toHaveCount(1);
    Storage::disk('backup_offsite')->assertExists('backups/'.basename($archives[0]));

    File::deleteDirectory(storage_path('app/public/attachment-drill'));
});

it('thất bại và cảnh báo khi pg_dump không kết nối được', function () {
    Http::fake(['api.telegram.org/*' => Http::response(['ok' => true])]);

    config(['database.connections.'.config('database.default').'.username' => 'vai_tro_khong_ton_tai_xyz']);

    $this->artisan('db:backup')->assertFailed();

    Http::assertSent(fn ($request) => str_contains($request['text'], 'Sao lưu database thất bại'));
    expect(File::glob(storage_path('app/backups/db-*.dump')))->toBe([]);
});
