<?php

namespace App\Http\Controllers\Concerns;

use App\Http\Requests\Stickers\ReorderStickersRequest;
use App\Http\Requests\Stickers\StickerPackRequest;
use App\Http\Requests\Stickers\UploadStickerRequest;
use App\Http\Resources\Stickers\LibraryStickerPackResource;
use App\Http\Resources\Stickers\LibraryStickerResource;
use App\Models\Account;
use App\Services\Stickers\LottieDocumentValidator;
use App\Services\Stickers\StickerLibraryManager;
use App\Services\Stickers\StickerUploadService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

// Thân chung của mọi mặt tiền quản trị kho sticker. Mặt tiền chỉ quyết chủ kho
// (null = kho chung) và quyền, rồi gọi các hàm dưới đây.
trait ManagesStickerLibrary
{
    protected function listPacks(Request $request, ?Account $owner): JsonResponse
    {
        return response()->json([
            'payload' => LibraryStickerPackResource::collection($this->stickerLibrary()->packs($owner))->toArray($request),
            'meta' => [
                'max_upload_kb' => intdiv(LottieDocumentValidator::MAX_UPLOAD_BYTES, 1024),
                'accepted_extensions' => StickerUploadService::ACCEPTED_EXTENSIONS,
            ],
        ]);
    }

    protected function storePack(StickerPackRequest $request, ?Account $owner): JsonResponse
    {
        $pack = $this->stickerLibrary()->createPack($owner, $request->packName());

        return response()->json(LibraryStickerPackResource::detail($pack, $request), 201);
    }

    protected function showPack(Request $request, ?Account $owner, int $packId): JsonResponse
    {
        return response()->json(LibraryStickerPackResource::detail($this->stickerLibrary()->findPack($owner, $packId), $request));
    }

    protected function updatePack(StickerPackRequest $request, ?Account $owner, int $packId): JsonResponse
    {
        $library = $this->stickerLibrary();
        $pack = $library->renamePack($library->findPack($owner, $packId), $request->packName());

        return response()->json(LibraryStickerPackResource::detail($pack, $request));
    }

    protected function publishPack(Request $request, ?Account $owner, int $packId, bool $published): JsonResponse
    {
        $library = $this->stickerLibrary();
        $pack = $library->setPublished($library->findPack($owner, $packId), $published);

        return response()->json(LibraryStickerPackResource::detail($pack, $request));
    }

    protected function destroyPack(?Account $owner, int $packId): JsonResponse
    {
        $library = $this->stickerLibrary();
        $library->deletePack($library->findPack($owner, $packId));

        return response()->json(null, 200);
    }

    protected function uploadSticker(UploadStickerRequest $request, ?Account $owner, int $packId): JsonResponse
    {
        $library = $this->stickerLibrary();
        $sticker = $library->upload($library->findPack($owner, $packId), $request->stickerFile(), $request->stickerLabel());

        return response()->json((new LibraryStickerResource($sticker->refresh()))->toArray($request), 201);
    }

    protected function reorderStickers(ReorderStickersRequest $request, ?Account $owner, int $packId): JsonResponse
    {
        $library = $this->stickerLibrary();
        $pack = $library->findPack($owner, $packId);
        $library->reorder($pack, $request->orderedStickerIds());

        return response()->json(LibraryStickerPackResource::detail($pack, $request));
    }

    protected function destroyLibrarySticker(?Account $owner, int $packId, int $stickerId): JsonResponse
    {
        $library = $this->stickerLibrary();
        $library->deleteSticker($library->findSticker($library->findPack($owner, $packId), $stickerId));

        return response()->json(null, 200);
    }

    private function stickerLibrary(): StickerLibraryManager
    {
        return app(StickerLibraryManager::class);
    }
}
