<?php

namespace App\Http\Controllers\WebApi\Settings;

use App\Http\Controllers\Concerns\ManagesStickerLibrary;
use App\Http\Controllers\Controller;
use App\Http\Requests\Stickers\ReorderStickersRequest;
use App\Http\Requests\Stickers\StickerPackRequest;
use App\Http\Requests\Stickers\UploadStickerRequest;
use App\Models\Account;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

// Kho sticker riêng của account. Route chỉ tồn tại khi cờ custom_stickers bật
// (EnsureAccountFeatureEnabled trả 404); chỉ quản trị viên account được sửa.
class CustomStickerPacksController extends Controller
{
    use ManagesStickerLibrary;

    public function index(Request $request, Account $account): JsonResponse
    {
        $this->authorizeAdministrator($request);

        return $this->listPacks($request, $account);
    }

    public function store(StickerPackRequest $request, Account $account): JsonResponse
    {
        $this->authorizeAdministrator($request);

        return $this->storePack($request, $account);
    }

    public function show(Request $request, Account $account, int $packId): JsonResponse
    {
        $this->authorizeAdministrator($request);

        return $this->showPack($request, $account, $packId);
    }

    public function update(StickerPackRequest $request, Account $account, int $packId): JsonResponse
    {
        $this->authorizeAdministrator($request);

        return $this->updatePack($request, $account, $packId);
    }

    public function publish(Request $request, Account $account, int $packId): JsonResponse
    {
        $this->authorizeAdministrator($request);

        return $this->publishPack($request, $account, $packId, true);
    }

    public function unpublish(Request $request, Account $account, int $packId): JsonResponse
    {
        $this->authorizeAdministrator($request);

        return $this->publishPack($request, $account, $packId, false);
    }

    public function destroy(Request $request, Account $account, int $packId): JsonResponse
    {
        $this->authorizeAdministrator($request);

        return $this->destroyPack($account, $packId);
    }

    public function upload(UploadStickerRequest $request, Account $account, int $packId): JsonResponse
    {
        $this->authorizeAdministrator($request);

        return $this->uploadSticker($request, $account, $packId);
    }

    public function reorder(ReorderStickersRequest $request, Account $account, int $packId): JsonResponse
    {
        $this->authorizeAdministrator($request);

        return $this->reorderStickers($request, $account, $packId);
    }

    public function destroySticker(Request $request, Account $account, int $packId, int $stickerId): JsonResponse
    {
        $this->authorizeAdministrator($request);

        return $this->destroyLibrarySticker($account, $packId, $stickerId);
    }
}
