<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Concerns\ServesStickerLibrary;
use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Services\Stickers\StickerLibraryTarget;
use Illuminate\Http\Request;

// REST kho sticker bằng token sticker (cùng cổng, cùng lõi với MCP /mcp/stickers):
// kho được chạm là kho mà token cấp, do AuthenticateStickerLibraryToken gắn vào.
class StickerLibraryPacksController extends Controller
{
    use ServesStickerLibrary;

    protected function libraryOwner(Request $request): ?Account
    {
        $target = StickerLibraryTarget::fromRequest($request);
        abort_if($target === null, 401);

        return $target->owner;
    }
}
