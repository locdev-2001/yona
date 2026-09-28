<?php

namespace App\Http\Controllers\Concerns;

use App\Http\Requests\Stickers\ReorderStickersRequest;
use App\Http\Requests\Stickers\StickerPackRequest;
use App\Http\Requests\Stickers\UpdateStickerRequest;
use App\Http\Requests\Stickers\UploadStickerRequest;
use App\Http\Resources\Stickers\LibraryStickerPackResource;
use App\Http\Resources\Stickers\LibraryStickerResource;
use App\Models\Account;
use App\Models\Sticker;
use App\Models\StickerPack;
use App\Services\Stickers\StickerLibraryManager;
use App\Services\Stickers\StickerTags;
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
            'meta' => $this->libraryLimits(),
        ]);
    }

    protected function storePack(StickerPackRequest $request, ?Account $owner): JsonResponse
    {
        $pack = $this->stickerLibrary()->createPack($owner, $request->packName());

        return $this->packDetailResponse($pack, $request, 201);
    }

    protected function showPack(Request $request, ?Account $owner, int $packId): JsonResponse
    {
        return $this->packDetailResponse($this->stickerLibrary()->findPack($owner, $packId), $request);
    }

    protected function updatePack(StickerPackRequest $request, ?Account $owner, int $packId): JsonResponse
    {
        $library = $this->stickerLibrary();
        $pack = $library->renamePack($library->findPack($owner, $packId), $request->packName());

        return $this->packDetailResponse($pack, $request);
    }

    protected function publishPack(Request $request, ?Account $owner, int $packId, bool $published): JsonResponse
    {
        $library = $this->stickerLibrary();
        $pack = $library->setPublished($library->findPack($owner, $packId), $published);

        return $this->packDetailResponse($pack, $request);
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
        $sticker = $library->upload(
            $library->findPack($owner, $packId),
            $request->stickerFile(),
            $request->stickerLabel(),
            $request->stickerKeywords(),
            $request->stickerEdit(),
        );

        // Cùng ảnh + cùng thông số chỉnh đã có trong bộ: trả sticker cũ, nhãn và từ khoá gửi kèm không ghi đè.
        $existing = ! $sticker->wasRecentlyCreated;

        return response()->json(
            [...(new LibraryStickerResource($sticker->refresh()))->toArray($request), 'existing' => $existing],
            $existing ? 200 : 201,
        );
    }

    protected function updateLibrarySticker(UpdateStickerRequest $request, ?Account $owner, int $packId, int $stickerId): JsonResponse
    {
        $library = $this->stickerLibrary();
        $sticker = $library->findSticker($library->findPack($owner, $packId), $stickerId);
        $library->updateSticker($sticker, $request->stickerLabel($sticker), $request->stickerKeywords($sticker));

        return response()->json((new LibraryStickerResource($sticker))->toArray($request));
    }

    protected function reorderStickers(ReorderStickersRequest $request, ?Account $owner, int $packId): JsonResponse
    {
        $library = $this->stickerLibrary();
        $pack = $library->findPack($owner, $packId);
        $library->reorder($pack, $request->orderedStickerIds());

        return $this->packDetailResponse($pack, $request);
    }

    protected function destroyLibrarySticker(?Account $owner, int $packId, int $stickerId): JsonResponse
    {
        $library = $this->stickerLibrary();
        $library->deleteSticker($library->findSticker($library->findPack($owner, $packId), $stickerId));

        return response()->json(null, 200);
    }

    private function packDetailResponse(StickerPack $pack, Request $request, int $status = 200): JsonResponse
    {
        return response()->json([...LibraryStickerPackResource::detail($pack, $request), 'meta' => $this->libraryLimits()], $status);
    }

    /** @return array<string, mixed> */
    private function libraryLimits(): array
    {
        return [
            'max_upload_kb' => intdiv(StickerUploadService::maxUploadBytes(), 1024),
            'accepted_extensions' => StickerUploadService::ACCEPTED_EXTENSIONS,
            'image_size' => Sticker::imageSize(),
            'max_label_length' => StickerTags::MAX_LABEL_LENGTH,
            'max_keywords' => StickerTags::MAX_KEYWORDS,
            'max_keyword_length' => StickerTags::MAX_KEYWORD_LENGTH,
            'max_stickers' => StickerLibraryManager::MAX_STICKERS_PER_PACK,
            'max_pack_name_length' => StickerPackRequest::MAX_NAME_LENGTH,
        ];
    }

    private function stickerLibrary(): StickerLibraryManager
    {
        return app(StickerLibraryManager::class);
    }
}
