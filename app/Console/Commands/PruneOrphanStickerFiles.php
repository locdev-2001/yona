<?php

namespace App\Console\Commands;

use App\Models\Sticker;
use App\Services\Stickers\StickerFileJanitor;
use App\Services\Stickers\StickerFileLayout;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;
use League\Flysystem\StorageAttributes;

/**
 * Xoá thư mục tệp trên disk `stickers` không còn sticker nào dùng lẫn đính kèm nào
 * trỏ tới. Janitor chỉ dọn lúc xoá sticker; xoá sticker trước rồi mới xoá tin đã
 * gửi thì tệp bị bỏ lại vì lúc đó tin vẫn còn mượn.
 *
 * Bỏ qua thư mục vừa ghi: tải sticker lên ghi ảnh gốc trước khi tạo bản ghi.
 */
class PruneOrphanStickerFiles extends Command
{
    private const RECENT_WRITE_GRACE_HOURS = 24;

    protected $signature = 'stickers:prune-orphan-files
        {--dry-run : Chỉ đếm, không xoá gì}';

    protected $description = 'Xoá tệp sticker không còn sticker hay tin nhắn nào dùng';

    public function handle(StickerFileJanitor $janitor): int
    {
        $candidates = $this->settledContentHashes();
        $dryRun = (bool) $this->option('dry-run');

        $orphans = $dryRun
            ? $janitor->unreferencedAmong($candidates)
            : $janitor->releaseAllUnreferenced($candidates);

        $this->components->info(($dryRun ? 'Sẽ xoá ' : 'Đã xoá ').count($orphans).' thư mục tệp sticker.');

        return self::SUCCESS;
    }

    /** @return list<string> */
    private function settledContentHashes(): array
    {
        $cutoff = now()->subHours(self::RECENT_WRITE_GRACE_HOURS)->getTimestamp();
        $lastWriteByHash = [];

        foreach (Storage::disk(Sticker::DISK)->listContents('', true) as $entry) {
            if (! $entry instanceof StorageAttributes || ! $entry->isFile()) {
                continue;
            }

            $contentHash = StickerFileLayout::contentHashOf($entry->path());
            if ($contentHash !== null) {
                $lastWriteByHash[$contentHash] = max($lastWriteByHash[$contentHash] ?? 0, $entry->lastModified() ?? PHP_INT_MAX);
            }
        }

        return array_keys(array_filter($lastWriteByHash, fn (int $lastWrite) => $lastWrite < $cutoff));
    }
}
