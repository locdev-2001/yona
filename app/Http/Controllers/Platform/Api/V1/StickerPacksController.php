<?php

namespace App\Http\Controllers\Platform\Api\V1;

use App\Http\Controllers\Concerns\ServesSharedStickerLibrary;

// Kho sticker chung qua Platform API: cùng action với console Super Admin, cùng
// lõi với MCP `/mcp/stickers`. Kho riêng của tenant không mở ở mặt tiền này.
class StickerPacksController extends PlatformController
{
    use ServesSharedStickerLibrary;
}
