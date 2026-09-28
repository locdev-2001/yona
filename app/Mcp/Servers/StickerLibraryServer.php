<?php

namespace App\Mcp\Servers;

use App\Mcp\Resources\LottieAuthoringGuide;
use App\Mcp\Tools\Stickers\CreateStickerPack;
use App\Mcp\Tools\Stickers\DeleteSticker;
use App\Mcp\Tools\Stickers\GetStickerPack;
use App\Mcp\Tools\Stickers\ListStickerPacks;
use App\Mcp\Tools\Stickers\RenameStickerPack;
use App\Mcp\Tools\Stickers\SetStickerPackPublished;
use App\Mcp\Tools\Stickers\UpdateSticker;
use App\Mcp\Tools\Stickers\UploadSticker;
use Laravel\Mcp\Server;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Attributes\Version;

// MCP của kho sticker chung Yona (chỉ kho chung, account_id null). Xác thực bằng
// token Platform App ở route; mọi tool đi qua StickerLibraryManager như Platform API.
#[Name('Yona Stickers')]
#[Version('1.0.0')]
class StickerLibraryServer extends Server
{
    public const PATH = '/mcp/stickers';

    private const INTRODUCTION = <<<'MARKDOWN'
        Máy chủ này quản lý kho sticker CHUNG của Yona: bộ đã xuất bản hiện cho mọi account.
        Quy trình: list_sticker_packs → create_sticker_pack → upload_sticker (mỗi sticker kèm
        label và keywords) → get_sticker_pack chờ mọi sticker `ready` → set_sticker_pack_published.
        Sticker `failed` thì đọc failure_message, sửa Lottie rồi tải lại.


        MARKDOWN;

    protected array $tools = [
        ListStickerPacks::class,
        GetStickerPack::class,
        CreateStickerPack::class,
        RenameStickerPack::class,
        UploadSticker::class,
        UpdateSticker::class,
        SetStickerPackPublished::class,
        DeleteSticker::class,
    ];

    protected array $resources = [
        LottieAuthoringGuide::class,
    ];

    // Hướng dẫn viết Lottie đi kèm ngay lúc initialize: client không đọc resource vẫn thấy giới hạn.
    protected function boot(): void
    {
        $this->instructions = self::INTRODUCTION.LottieAuthoringGuide::markdown();
    }
}
