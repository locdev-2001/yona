<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Concerns\ManagesStickerLibrary;
use App\Http\Controllers\Controller;
use App\Http\Requests\Stickers\MoveStickerPackRequest;
use App\Http\Requests\Stickers\ReorderStickersRequest;
use App\Http\Requests\Stickers\StickerPackRequest;
use App\Http\Requests\Stickers\UpdateStickerRequest;
use App\Http\Requests\Stickers\UploadStickerRequest;
use App\Models\Account;
use App\Support\SuperAdminArea;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

// Kho sticker riêng của một account, quản trị từ console: cùng lõi
// (ManagesStickerLibrary + StickerLibraryManager) với màn Cài đặt của tenant,
// chỉ khác chủ kho lấy từ URL thay vì account đang đăng nhập.
class AccountStickerPacksController extends Controller
{
    use ManagesStickerLibrary;

    public static function apiBaseUrl(int $accountId): string
    {
        return SuperAdminArea::url("api/accounts/{$accountId}");
    }

    public function page(int $accountId): Response
    {
        $account = $this->account($accountId);

        return Inertia::render('superadmin/StickerPacks', [
            'apiBaseUrl' => self::apiBaseUrl($account->id),
            'account' => [
                'id' => $account->id,
                'name' => $account->name,
                'overviewUrl' => SuperAdminArea::url("accounts/{$account->id}/overview"),
            ],
            'platformUrl' => SuperAdminArea::url('sticker_packs'),
        ]);
    }

    public function index(Request $request, int $accountId): JsonResponse
    {
        return $this->listPacks($request, $this->account($accountId));
    }

    public function store(StickerPackRequest $request, int $accountId): JsonResponse
    {
        return $this->storePack($request, $this->account($accountId));
    }

    public function show(Request $request, int $accountId, int $packId): JsonResponse
    {
        return $this->showPack($request, $this->account($accountId), $packId);
    }

    public function update(StickerPackRequest $request, int $accountId, int $packId): JsonResponse
    {
        return $this->updatePack($request, $this->account($accountId), $packId);
    }

    public function publish(Request $request, int $accountId, int $packId): JsonResponse
    {
        return $this->publishPack($request, $this->account($accountId), $packId, true);
    }

    public function unpublish(Request $request, int $accountId, int $packId): JsonResponse
    {
        return $this->publishPack($request, $this->account($accountId), $packId, false);
    }

    public function destroy(int $accountId, int $packId): JsonResponse
    {
        return $this->destroyPack($this->account($accountId), $packId);
    }

    public function upload(UploadStickerRequest $request, int $accountId, int $packId): JsonResponse
    {
        return $this->uploadSticker($request, $this->account($accountId), $packId);
    }

    public function reorder(ReorderStickersRequest $request, int $accountId, int $packId): JsonResponse
    {
        return $this->reorderStickers($request, $this->account($accountId), $packId);
    }

    public function updateSticker(UpdateStickerRequest $request, int $accountId, int $packId, int $stickerId): JsonResponse
    {
        return $this->updateLibrarySticker($request, $this->account($accountId), $packId, $stickerId);
    }

    public function stickerOriginal(int $accountId, int $packId, int $stickerId): StreamedResponse
    {
        return $this->libraryStickerOriginal($this->account($accountId), $packId, $stickerId);
    }

    public function destroySticker(int $accountId, int $packId, int $stickerId): JsonResponse
    {
        return $this->destroyLibrarySticker($this->account($accountId), $packId, $stickerId);
    }

    public function move(MoveStickerPackRequest $request, int $accountId, int $packId): JsonResponse
    {
        return $this->moveLibraryPack($request, $this->account($accountId), $packId, $request->movesToAccountLibrary());
    }

    private function account(int $accountId): Account
    {
        return Account::query()->findOrFail($accountId);
    }
}
