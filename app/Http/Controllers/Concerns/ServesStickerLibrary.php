<?php

namespace App\Http\Controllers\Concerns;

use App\Http\Requests\Stickers\ReorderStickersRequest;
use App\Http\Requests\Stickers\StickerPackRequest;
use App\Http\Requests\Stickers\UpdateStickerRequest;
use App\Http\Requests\Stickers\UploadStickerRequest;
use App\Models\Account;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

// Các action quản trị kho sticker cho mặt tiền không có {account} trên URL.
// Mặt tiền chỉ nói kho nào (libraryOwner: null = kho nền tảng); quyền do
// middleware của từng mặt tiền quyết.
trait ServesStickerLibrary
{
    use ManagesStickerLibrary;

    abstract protected function libraryOwner(Request $request): ?Account;

    public function index(Request $request): JsonResponse
    {
        return $this->listPacks($request, $this->libraryOwner($request));
    }

    public function store(StickerPackRequest $request): JsonResponse
    {
        return $this->storePack($request, $this->libraryOwner($request));
    }

    public function show(Request $request, int $packId): JsonResponse
    {
        return $this->showPack($request, $this->libraryOwner($request), $packId);
    }

    public function update(StickerPackRequest $request, int $packId): JsonResponse
    {
        return $this->updatePack($request, $this->libraryOwner($request), $packId);
    }

    public function publish(Request $request, int $packId): JsonResponse
    {
        return $this->publishPack($request, $this->libraryOwner($request), $packId, true);
    }

    public function unpublish(Request $request, int $packId): JsonResponse
    {
        return $this->publishPack($request, $this->libraryOwner($request), $packId, false);
    }

    public function destroy(Request $request, int $packId): JsonResponse
    {
        return $this->destroyPack($this->libraryOwner($request), $packId);
    }

    public function upload(UploadStickerRequest $request, int $packId): JsonResponse
    {
        return $this->uploadSticker($request, $this->libraryOwner($request), $packId);
    }

    public function reorder(ReorderStickersRequest $request, int $packId): JsonResponse
    {
        return $this->reorderStickers($request, $this->libraryOwner($request), $packId);
    }

    public function updateSticker(UpdateStickerRequest $request, int $packId, int $stickerId): JsonResponse
    {
        return $this->updateLibrarySticker($request, $this->libraryOwner($request), $packId, $stickerId);
    }

    public function destroySticker(Request $request, int $packId, int $stickerId): JsonResponse
    {
        return $this->destroyLibrarySticker($this->libraryOwner($request), $packId, $stickerId);
    }
}
