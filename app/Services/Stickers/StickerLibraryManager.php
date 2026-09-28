<?php

namespace App\Services\Stickers;

use App\Models\Account;
use App\Models\Sticker;
use App\Models\StickerPack;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

// Lõi quản trị kho sticker, dùng chung cho Super Admin (kho chung, chủ = null)
// và tenant (kho riêng, chủ = account). Mặt tiền chỉ quyết chủ kho và quyền.
final class StickerLibraryManager
{
    // Trần tài nguyên của một kho: bảng chọn và hàng đợi render giữ được nhẹ.
    public const MAX_STICKERS_PER_PACK = 120;

    public const MAX_PACKS_PER_ACCOUNT = 30;

    // Mỗi lượt tải đẩy một job render vào hàng đợi dùng chung của mọi tenant.
    public const UPLOADS_PER_MINUTE = 30;

    public function __construct(
        private readonly StickerUploadService $uploads,
        private readonly StickerFileJanitor $janitor,
    ) {}

    /** @return Collection<int, StickerPack> */
    public function packs(?Account $owner): Collection
    {
        return $this->ownedPacks($owner)
            ->withCount('stickers')
            ->with(['stickers' => fn ($query) => $query->where('status', Sticker::STATUS_READY)->orderBy('position')->limit(1)])
            ->orderBy('position')
            ->orderBy('id')
            ->get();
    }

    public function findPack(?Account $owner, int $packId): StickerPack
    {
        return $this->ownedPacks($owner)->findOrFail($packId);
    }

    public function findSticker(StickerPack $pack, int $stickerId): Sticker
    {
        return $pack->stickers()->findOrFail($stickerId);
    }

    public function createPack(?Account $owner, string $name): StickerPack
    {
        // Kho chung do đội Yona tự quản nên chỉ kho riêng của account bị giới hạn số bộ.
        if ($owner !== null && $this->ownedPacks($owner)->count() >= self::MAX_PACKS_PER_ACCOUNT) {
            throw ValidationException::withMessages([
                'name' => __('errors.sticker_library.too_many_packs', ['max' => self::MAX_PACKS_PER_ACCOUNT]),
            ]);
        }

        $lastPosition = $this->ownedPacks($owner)->max('position');

        return StickerPack::query()->create([
            'account_id' => $owner?->id,
            'name' => $name,
            'position' => $lastPosition === null ? 0 : (int) $lastPosition + 1,
        ]);
    }

    public function renamePack(StickerPack $pack, string $name): StickerPack
    {
        $pack->update(['name' => $name]);

        return $pack;
    }

    public function setPublished(StickerPack $pack, bool $published): StickerPack
    {
        $pack->update(['published_at' => $published ? ($pack->published_at ?? now()) : null]);

        return $pack;
    }

    /** @param  array<mixed>  $keywords */
    public function upload(StickerPack $pack, UploadedFile $file, ?string $label = null, array $keywords = [], ?string $editJson = null): Sticker
    {
        return $this->uploads->upload($pack, $file, $label, $keywords, $editJson, fn () => $this->ensureRoomFor($pack));
    }

    /** @param  array<mixed>  $keywords */
    public function updateSticker(Sticker $sticker, ?string $label, array $keywords): Sticker
    {
        $sticker->update([
            'label' => StickerTags::label($label),
            'keywords' => StickerTags::keywords($keywords),
        ]);

        return $sticker;
    }

    /** @param  list<int>  $orderedStickerIds */
    public function reorder(StickerPack $pack, array $orderedStickerIds): void
    {
        $ownedIds = $pack->stickers()->whereKey($orderedStickerIds)->pluck('id')->all();

        DB::transaction(function () use ($pack, $orderedStickerIds, $ownedIds) {
            foreach (array_values(array_intersect($orderedStickerIds, $ownedIds)) as $position => $stickerId) {
                $pack->stickers()->whereKey($stickerId)->update(['position' => $position]);
            }
        });
    }

    // Tin đã gửi vẫn hiện ảnh: payload tin tự mang đường dẫn, đính kèm mượn
    // ảnh tĩnh, và janitor giữ tệp khi còn đính kèm trỏ tới.
    public function deleteSticker(Sticker $sticker): void
    {
        $contentHash = $sticker->content_hash;
        $sticker->delete();

        $this->janitor->releaseIfUnreferenced($contentHash);
    }

    public function deletePack(StickerPack $pack): void
    {
        $contentHashes = $pack->stickers()->pluck('content_hash')->unique()->all();
        $pack->delete();

        $this->janitor->releaseAllUnreferenced($contentHashes);
    }

    // Xoá account chỉ cascade hàng DB: bộ, sticker và cả đính kèm của tin (bảng
    // attachments nối account bằng FK, không nối tin). Tệp kho riêng phải dọn
    // sau khi cascade xong thì janitor mới thấy đúng tham chiếu còn lại, nên
    // gom hash trước khi xoá rồi gọi releaseFilesOf() sau khi xoá.
    /** @return list<string> */
    public function contentHashesOf(Account $owner): array
    {
        return Sticker::query()
            ->whereIn('sticker_pack_id', $this->ownedPacks($owner)->select('id'))
            ->distinct()
            ->pluck('content_hash')
            ->all();
    }

    /** @param  list<string>  $contentHashes */
    public function releaseFilesOf(array $contentHashes): void
    {
        $this->janitor->releaseAllUnreferenced($contentHashes);
    }

    private function ensureRoomFor(StickerPack $pack): void
    {
        if ($pack->stickers()->count() >= self::MAX_STICKERS_PER_PACK) {
            throw ValidationException::withMessages([
                'file' => __('errors.sticker_library.pack_full', ['max' => self::MAX_STICKERS_PER_PACK]),
            ]);
        }
    }

    /** @return Builder<StickerPack> */
    private function ownedPacks(?Account $owner): Builder
    {
        return StickerPack::query()->when(
            $owner === null,
            fn (Builder $query) => $query->whereNull('account_id'),
            fn (Builder $query) => $query->where('account_id', $owner->id),
        );
    }
}
