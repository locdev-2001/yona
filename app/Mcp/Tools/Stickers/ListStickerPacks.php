<?php

namespace App\Mcp\Tools\Stickers;

use App\Http\Resources\Stickers\LibraryStickerPackResource;
use App\Services\Stickers\LottieDocumentValidator;
use App\Services\Stickers\StickerLibraryManager;
use App\Services\Stickers\StickerUploadService;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\ResponseFactory;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Tools\Annotations\IsReadOnly;

#[Name('list_sticker_packs')]
#[Description('Liệt kê mọi bộ sticker trong kho mà token được cấp (kho riêng của một account hoặc kho nền tảng): id, tên, đã xuất bản chưa, số sticker, ảnh bìa; kèm giới hạn tải lên.')]
#[IsReadOnly]
class ListStickerPacks extends StickerLibraryTool
{
    protected function respond(Request $request, StickerLibraryManager $library): Response|ResponseFactory
    {
        return Response::structured([
            'packs' => LibraryStickerPackResource::collection($library->packs($this->libraryOwner()))->toArray(request()),
            'limits' => [
                'max_upload_kb' => intdiv(LottieDocumentValidator::MAX_UPLOAD_BYTES, 1024),
                'accepted_extensions' => StickerUploadService::ACCEPTED_EXTENSIONS,
                'max_stickers_per_pack' => StickerLibraryManager::MAX_STICKERS_PER_PACK,
            ],
        ]);
    }
}
