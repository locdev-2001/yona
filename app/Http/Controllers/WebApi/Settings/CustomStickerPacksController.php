<?php

namespace App\Http\Controllers\WebApi\Settings;

use App\Http\Controllers\Concerns\ManagesStickerLibrary;
use App\Http\Controllers\Controller;
use App\Http\Requests\Stickers\MoveStickerPackRequest;
use App\Http\Requests\Stickers\ReorderStickersRequest;
use App\Http\Requests\Stickers\StickerPackRequest;
use App\Http\Requests\Stickers\UpdateStickerRequest;
use App\Http\Requests\Stickers\UploadStickerRequest;
use App\Models\Account;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

// Kho sticker riêng của account. Quyền do EnsureStickerLibraryAccess:account ở
// route quyết (StickerLibraryAccess); riêng chuyển bộ qua lại kho nền tảng do
// EnsureStickerLibraryAccess:transfer.
class CustomStickerPacksController extends Controller
{
    use ManagesStickerLibrary;

    public function index(Request $request, Account $account): JsonResponse
    {
        return $this->listPacks($request, $account);
    }

    public function store(StickerPackRequest $request, Account $account): JsonResponse
    {
        return $this->storePack($request, $account);
    }

    public function show(Request $request, Account $account, int $packId): JsonResponse
    {
        return $this->showPack($request, $account, $packId);
    }

    public function update(StickerPackRequest $request, Account $account, int $packId): JsonResponse
    {
        return $this->updatePack($request, $account, $packId);
    }

    public function publish(Request $request, Account $account, int $packId): JsonResponse
    {
        return $this->publishPack($request, $account, $packId, true);
    }

    public function unpublish(Request $request, Account $account, int $packId): JsonResponse
    {
        return $this->publishPack($request, $account, $packId, false);
    }

    public function destroy(Account $account, int $packId): JsonResponse
    {
        return $this->destroyPack($account, $packId);
    }

    public function upload(UploadStickerRequest $request, Account $account, int $packId): JsonResponse
    {
        return $this->uploadSticker($request, $account, $packId);
    }

    public function updateSticker(UpdateStickerRequest $request, Account $account, int $packId, int $stickerId): JsonResponse
    {
        return $this->updateLibrarySticker($request, $account, $packId, $stickerId);
    }

    public function reorder(ReorderStickersRequest $request, Account $account, int $packId): JsonResponse
    {
        return $this->reorderStickers($request, $account, $packId);
    }

    public function destroySticker(Account $account, int $packId, int $stickerId): JsonResponse
    {
        return $this->destroyLibrarySticker($account, $packId, $stickerId);
    }

    public function move(MoveStickerPackRequest $request, Account $account, int $packId): JsonResponse
    {
        return $this->moveLibraryPack($request, $account, $packId, $request->movesToAccountLibrary());
    }
}
