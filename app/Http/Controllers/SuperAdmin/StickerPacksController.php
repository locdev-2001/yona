<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Concerns\ManagesStickerLibrary;
use App\Http\Controllers\Controller;
use App\Http\Requests\Stickers\ReorderStickersRequest;
use App\Http\Requests\Stickers\StickerPackRequest;
use App\Http\Requests\Stickers\UploadStickerRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

// Kho sticker chung của Yona: mọi account đều thấy bộ đã xuất bản.
class StickerPacksController extends Controller
{
    use ManagesStickerLibrary;

    public const API_BASE_URL = '/super_admin/api';

    public function page(): Response
    {
        return Inertia::render('superadmin/StickerPacks', ['apiBaseUrl' => self::API_BASE_URL]);
    }

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

    public function destroySticker(int $packId, int $stickerId): JsonResponse
    {
        return $this->destroyLibrarySticker(null, $packId, $stickerId);
    }
}
