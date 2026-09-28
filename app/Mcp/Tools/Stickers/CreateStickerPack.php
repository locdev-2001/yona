<?php

namespace App\Mcp\Tools\Stickers;

use App\Http\Requests\Stickers\StickerPackRequest;
use App\Services\Stickers\StickerLibraryManager;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\ResponseFactory;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Attributes\Name;

#[Name('create_sticker_pack')]
#[Description('Tạo một bộ sticker mới trong kho chung (chưa xuất bản, chưa ai thấy). Trả về bộ vừa tạo kèm id để tải sticker vào.')]
class CreateStickerPack extends StickerLibraryTool
{
    /** @return array<string, mixed> */
    public function schema(JsonSchema $schema): array
    {
        return [
            'name' => $schema->string()->max(StickerPackRequest::MAX_NAME_LENGTH)->description('Tên bộ, hiện cho agent và khách.')->required(),
        ];
    }

    protected function respond(Request $request, StickerLibraryManager $library): Response|ResponseFactory
    {
        $validated = $request->validate(StickerPackRequest::nameRules());

        return $this->packResponse($library->createPack(self::SHARED_LIBRARY_OWNER, trim($validated['name'])));
    }
}
