<?php

namespace App\Console\Commands;

use App\Search\SearchEngine;
use App\Search\SearchTarget;
use Illuminate\Console\Command;

/**
 * Dựng lại chỉ mục tìm kiếm từ PostgreSQL. Đọc từng lô id theo khoá chính
 * (chunkById, SELECT thường không khoá) nên chạy được khi hệ thống đang nhận tin.
 */
class ReindexSearch extends Command
{
    public const CHUNK_SIZE = 1000;

    protected $signature = 'search:reindex
        {--account= : ID account cần dựng lại (bỏ trống = mọi account)}
        {--type= : Loại tài liệu: conversations, messages, contacts, files (bỏ trống = tất cả)}';

    protected $description = 'Dựng lại chỉ mục tìm kiếm từ PostgreSQL theo lô';

    public function handle(SearchEngine $engine): int
    {
        if (! $engine->keepsSeparateIndex()) {
            $this->info('Engine hiện tại tìm thẳng trong PostgreSQL — không có chỉ mục riêng để dựng lại.');

            return self::SUCCESS;
        }

        $type = $this->option('type');
        $targets = filled($type) ? [SearchTarget::tryFrom((string) $type)] : SearchTarget::cases();

        if (in_array(null, $targets, true)) {
            $this->error("Loại tài liệu [{$type}] không hợp lệ.");

            return self::INVALID;
        }

        $accountId = filled($this->option('account')) ? (int) $this->option('account') : null;

        foreach ($targets as $target) {
            $this->line("{$target->value}: ".$this->reindexTarget($engine, $target, $accountId).' tài liệu');
        }

        return self::SUCCESS;
    }

    private function reindexTarget(SearchEngine $engine, SearchTarget $target, ?int $accountId): int
    {
        $documents = $target->documents($accountId);
        $keyColumn = $documents->getModel()->getQualifiedKeyName();
        $indexed = 0;

        $documents->select($keyColumn)->toBase()->chunkById(self::CHUNK_SIZE, function ($rows) use ($engine, $target, &$indexed) {
            $ids = $rows->map(fn (object $row) => (int) $row->id)->all();
            $engine->index($target, $ids);
            $indexed += count($ids);
        }, $keyColumn, 'id');

        return $indexed;
    }
}
