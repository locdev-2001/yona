<?php

namespace App\Mcp\Servers;

use App\Mcp\Prompts\DesignStickerPackPrompt;
use App\Mcp\Resources\LottieAuthoringGuide;
use App\Mcp\Tools\Stickers\CreateStickerPack;
use App\Mcp\Tools\Stickers\DeleteSticker;
use App\Mcp\Tools\Stickers\GetStickerPack;
use App\Mcp\Tools\Stickers\ListStickerPacks;
use App\Mcp\Tools\Stickers\PreviewSticker;
use App\Mcp\Tools\Stickers\RenameStickerPack;
use App\Mcp\Tools\Stickers\SetStickerPackPublished;
use App\Mcp\Tools\Stickers\UpdateSticker;
use App\Mcp\Tools\Stickers\UploadSticker;
use Laravel\Mcp\Server;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Attributes\Version;

// MCP của kho sticker Yona. Xác thực bằng token sticker tạo trong Cài đặt
// (AuthenticateStickerLibraryToken ở route); mỗi token chỉ chạm một kho: kho riêng
// của account tạo token hoặc kho nền tảng. Mọi tool đi qua StickerLibraryManager
// như REST /api/v1/sticker_library.
#[Name('Yona Stickers')]
#[Version('1.0.0')]
class StickerLibraryServer extends Server
{
    public const PATH = '/mcp/stickers';

    public static function endpointUrl(): string
    {
        return rtrim((string) config('app.url'), '/').self::PATH;
    }

    private const INTRODUCTION = <<<'MARKDOWN'
        Máy chủ này quản lý đúng một kho sticker Yona, do token quyết: kho riêng của một
        account (bộ đã xuất bản chỉ hiện trong account đó) hoặc kho nền tảng (hiện cho mọi account).
        Quy trình: list_sticker_packs → create_sticker_pack → với mỗi sticker: preview_sticker xem
        ảnh poster để tự kiểm, sửa tới khi đạt → upload_sticker (kèm label và keywords) →
        get_sticker_pack chờ mọi sticker `ready` → hỏi người dùng rồi mới set_sticker_pack_published.
        Sticker `failed` thì đọc failure_message, sửa Lottie rồi tải lại.
        Tạo trọn một bộ đồng bộ một nhân vật: dùng prompt `design_sticker_pack` (skill đầy đủ các bước).


        MARKDOWN;

    protected array $tools = [
        ListStickerPacks::class,
        GetStickerPack::class,
        CreateStickerPack::class,
        RenameStickerPack::class,
        PreviewSticker::class,
        UploadSticker::class,
        UpdateSticker::class,
        SetStickerPackPublished::class,
        DeleteSticker::class,
    ];

    protected array $prompts = [
        DesignStickerPackPrompt::class,
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
