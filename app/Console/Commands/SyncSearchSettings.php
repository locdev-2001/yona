<?php

namespace App\Console\Commands;

use App\Search\ConfiguresIndexSettings;
use App\Search\SearchEngine;
use Illuminate\Console\Command;

class SyncSearchSettings extends Command
{
    protected $signature = 'search:sync-settings';

    protected $description = 'Tạo chỉ mục và áp cấu hình tìm kiếm (trường tìm, lọc, xếp hạng) cho engine hiện tại';

    public function handle(SearchEngine $engine): int
    {
        if (! $engine instanceof ConfiguresIndexSettings) {
            $this->info('Engine hiện tại tìm thẳng trong PostgreSQL — không có chỉ mục riêng để cấu hình.');

            return self::SUCCESS;
        }

        $engine->syncIndexSettings();
        $this->info('Đã áp cấu hình chỉ mục. Chạy search:reindex nếu chỉ mục còn trống.');

        return self::SUCCESS;
    }
}
