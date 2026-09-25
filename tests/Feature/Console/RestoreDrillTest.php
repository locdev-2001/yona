<?php

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

beforeEach(function () {
    File::deleteDirectory(storage_path('app/backups'));
    config(['database_backup.offsite_disk' => null]);
});

afterEach(function () {
    File::deleteDirectory(storage_path('app/backups'));
});

function scratchDatabaseName(): string
{
    return config('database.connections.'.config('database.default').'.database').'_restore_drill';
}

function scratchDatabaseExists(): bool
{
    return (bool) DB::connection(config('database.default'))
        ->selectOne('select exists (select 1 from pg_database where datname = ?) as found', [scratchDatabaseName()])
        ?->found;
}

it('phục hồi bản sao lưu mới nhất vào database nháp rồi tự xoá nó', function () {
    $this->artisan('db:backup')->assertSuccessful();

    $this->artisan('db:restore-drill')
        ->expectsOutputToContain('Xong trong')
        ->assertSuccessful();

    expect(scratchDatabaseExists())->toBeFalse();
});

it('nhận đúng file được chỉ định thay vì bản mới nhất', function () {
    $this->artisan('db:backup')->assertSuccessful();
    $dump = File::glob(storage_path('app/backups/db-*.dump'))[0];

    $this->artisan('db:restore-drill', ['file' => $dump])->assertSuccessful();

    expect(scratchDatabaseExists())->toBeFalse();
});

it('thất bại rõ ràng khi không có bản sao lưu nào', function () {
    $this->artisan('db:restore-drill')->assertFailed();
});

it('thất bại rõ ràng khi file được chỉ định không tồn tại', function () {
    $this->artisan('db:restore-drill', ['file' => '/khong/ton-tai.dump'])->assertFailed();
});
