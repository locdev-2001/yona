<?php

namespace App\Http\Controllers\Concerns;

use App\Http\Requests\Stickers\ReorderStickersRequest;
use App\Http\Requests\Stickers\StickerPackRequest;
use App\Http\Requests\Stickers\UpdateStickerRequest;
use App\Http\Requests\Stickers\UploadStickerRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

// Các action của kho sticker chung (chủ kho = null). Dùng chung cho console Super
// Admin và Platform API; quyền do middleware của từng mặt tiền quyết.
trait ServesSharedStickerLibrary
{
    use ManagesStickerLibrary;

    public function index(Request $request): JsonResponse
    {
        return $this->listPacks($request, null);
    }

    public function store(StickerPackRequest $request): JsonResponse
    {
        return $this->storePack($request, null);
    }

    public function show(Request $request, int $packId): JsonResponse
    {
        return $this->showPack($request, null, $packId);
    }

    public function update(StickerPackRequest $request, int $packId): JsonResponse
    {
        return $this->updatePack($request, null, $packId);
    }

    public function publish(Request $request, int $packId): JsonResponse
    {
        return $this->publishPack($request, null, $packId, true);
    }

    public function unpublish(Request $request, int $packId): JsonResponse
    {
        return $this->publishPack($request, null, $packId, false);
    }

    public function destroy(int $packId): JsonResponse
    {
        return $this->destroyPack(null, $packId);
    }

    public function upload(UploadStickerRequest $request, int $packId): JsonResponse
    {
        return $this->uploadSticker($request, null, $packId);
    }

    public function reorder(ReorderStickersRequest $request, int $packId): JsonResponse
    {
        return $this->reorderStickers($request, null, $packId);
    }

    public function updateSticker(UpdateStickerRequest $request, int $packId, int $stickerId): JsonResponse
    {
        return $this->updateLibrarySticker($request, null, $packId, $stickerId);
    }

    public function destroySticker(int $packId, int $stickerId): JsonResponse
    {
        return $this->destroyLibrarySticker(null, $packId, $stickerId);
    }
}
