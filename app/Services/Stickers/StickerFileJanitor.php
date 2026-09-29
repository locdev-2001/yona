<?php

namespace App\Services\Stickers;

use App\Models\Attachment;
use App\Models\Sticker;
use Illuminate\Support\Facades\Storage;

// Nơi duy nhất quyết định xoá tệp kho sticker. Tệp đặt theo hash nội dung nên
// dùng chung giữa các bộ (kể cả khác account), và tin đã gửi mượn thẳng ảnh
// tĩnh: chỉ xoá khi không còn sticker nào khác đang dùng hoặc đang dựng, và
// không còn đính kèm nào trỏ tới. Xoá là xoá cả thư mục hash, gồm ảnh gốc và
// tệp của thời sticker Lottie.
final class StickerFileJanitor
{
    // Mỗi hash kéo theo hai đường dẫn trong whereIn: giữ xa trần 65535 tham số
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
        $released = $this->unreferencedAmong($contentHashes, $ignoredStickerId);
        foreach ($released as $contentHash) {
            Storage::disk(Sticker::DISK)->deleteDirectory(StickerFileLayout::directory($contentHash));
        }

        return $released;
    }

    /**
     * @param  iterable<string>  $contentHashes
     * @return list<string> các hash không còn sticker nào dùng lẫn đính kèm nào trỏ tới
     */
    public function unreferencedAmong(iterable $contentHashes, ?int $ignoredStickerId = null): array
    {
        $unreferenced = [];
        foreach (collect($contentHashes)->unique()->values()->chunk(self::HASHES_PER_LOOKUP) as $hashBatch) {
            array_push($unreferenced, ...$this->unreferenced($hashBatch->values()->all(), $ignoredStickerId));
        }

        return $unreferenced;
    }

    /**
     * @param  list<string>  $contentHashes
     * @return list<string>
     */
    private function unreferenced(array $contentHashes, ?int $ignoredStickerId): array
    {
        $hashByDirectory = [];
        foreach ($contentHashes as $contentHash) {
            $hashByDirectory[StickerFileLayout::directory($contentHash)] = $contentHash;
        }

        $usedByAnotherSticker = Sticker::query()
            ->whereIn('content_hash', $contentHashes)
            ->when($ignoredStickerId !== null, fn ($query) => $query->whereKeyNot($ignoredStickerId))
            ->whereIn('status', [Sticker::STATUS_PROCESSING, Sticker::STATUS_READY])
            ->distinct()
            ->pluck('content_hash')
            ->all();
        // Theo thư mục chứ không theo tên tệp: tin cũ có thể mượn tệp của cỡ trước.
        $borrowedByMessage = Attachment::query()
            ->where('disk', Sticker::DISK)
            ->where(fn ($query) => collect(array_keys($hashByDirectory))
                ->each(fn (string $directory) => $query->orWhere('path', 'like', "{$directory}/%")))
            ->distinct()
            ->pluck('path')
            ->map(fn (string $path) => $hashByDirectory[dirname($path)] ?? null)
            ->filter()
            ->values()
            ->all();

        return array_values(array_diff($contentHashes, $usedByAnotherSticker, $borrowedByMessage));
    }
}
