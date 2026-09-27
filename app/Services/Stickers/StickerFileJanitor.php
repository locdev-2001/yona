<?php

namespace App\Services\Stickers;

use App\Jobs\Stickers\RenderStickerJob;
use App\Models\Attachment;
use App\Models\Sticker;
use Illuminate\Support\Facades\Storage;

// Nơi duy nhất quyết định xoá tệp kho sticker. Tệp đặt theo hash nội dung nên
// dùng chung giữa các bộ (kể cả khác account), và tin đã gửi mượn thẳng ảnh
// tĩnh: chỉ xoá khi không còn sticker nào khác đang dùng hoặc đang dựng, và
// không còn đính kèm nào trỏ tới.
final class StickerFileJanitor
{
    // Mỗi hash kéo theo ba đường dẫn trong whereIn: giữ xa trần 65535 tham số
    // bind của PostgreSQL khi dọn cả kho của một account.
    private const HASHES_PER_LOOKUP = 500;

    public function releaseIfUnreferenced(string $contentHash, ?int $ignoredStickerId = null): bool
    {
        return $this->releaseAllUnreferenced([$contentHash], $ignoredStickerId) === [$contentHash];
    }

    /**
     * Kiểm tham chiếu theo lô: số truy vấn không tăng theo số sticker trong bộ.
     *
     * @param  iterable<string>  $contentHashes
     * @return list<string> các hash đã bị xoá tệp
     */
    public function releaseAllUnreferenced(iterable $contentHashes, ?int $ignoredStickerId = null): array
    {
        $released = [];
        foreach (collect($contentHashes)->unique()->values()->chunk(self::HASHES_PER_LOOKUP) as $hashBatch) {
            foreach ($this->unreferenced($hashBatch->values()->all(), $ignoredStickerId) as $contentHash) {
                $this->deleteFiles($contentHash);
                $released[] = $contentHash;
            }
        }

        return $released;
    }

    /**
     * @param  list<string>  $contentHashes
     * @return list<string>
     */
    private function unreferenced(array $contentHashes, ?int $ignoredStickerId): array
    {
        $hashByPath = [];
        foreach ($contentHashes as $contentHash) {
            foreach (RenderStickerJob::storagePaths($contentHash) as $path) {
                $hashByPath[$path] = $contentHash;
            }
        }

        $usedByAnotherSticker = Sticker::query()
            ->whereIn('content_hash', $contentHashes)
            ->when($ignoredStickerId !== null, fn ($query) => $query->whereKeyNot($ignoredStickerId))
            ->whereIn('status', [Sticker::STATUS_PROCESSING, Sticker::STATUS_READY])
            ->distinct()
            ->pluck('content_hash')
            ->all();
        $borrowedByMessage = Attachment::query()
            ->where('disk', Sticker::DISK)
            ->whereIn('path', array_keys($hashByPath))
            ->distinct()
            ->pluck('path')
            ->map(fn (string $path) => $hashByPath[$path])
            ->all();

        return array_values(array_diff($contentHashes, $usedByAnotherSticker, $borrowedByMessage));
    }

    private function deleteFiles(string $contentHash): void
    {
        $storagePaths = array_values(RenderStickerJob::storagePaths($contentHash));
        $disk = Storage::disk(Sticker::DISK);
        $disk->delete($storagePaths);
        $disk->deleteDirectory(dirname($storagePaths[0]));
    }
}
