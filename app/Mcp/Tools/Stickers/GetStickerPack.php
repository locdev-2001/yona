<?php

namespace App\Mcp\Tools\Stickers;

use App\Services\Stickers\StickerLibraryManager;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\ResponseFactory;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Tools\Annotations\IsReadOnly;

#[Name('get_sticker_pack')]
#[Description('Xem một bộ sticker của kho chung kèm từng sticker: nhãn, từ khoá, trạng thái (processing / ready / failed) và câu lỗi khi hỏng. Gọi lại sau upload_sticker để biết sticker đã dựng xong chưa.')]
#[IsReadOnly]
class GetStickerPack extends StickerLibraryTool
{
    /** @return array<string, mixed> */
    public function schema(JsonSchema $schema): array
    {
        return ['pack_id' => $this->packIdSchema($schema)];
    }

    protected function respond(Request $request, StickerLibraryManager $library): Response|ResponseFactory
    {
        $request->validate($this->packIdRules());

        return $this->packResponse($this->findPack($library, $request));
    }
}
