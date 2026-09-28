<?php

namespace App\Mcp\Tools\Stickers;

use App\Services\Stickers\StickerLibraryManager;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\ResponseFactory;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Tools\Annotations\IsDestructive;

#[Name('delete_sticker')]
#[Description('Xoá một sticker khỏi bộ của kho chung. Tin đã gửi trước đó vẫn hiện ảnh. Trả về bộ sau khi xoá.')]
#[IsDestructive]
class DeleteSticker extends StickerLibraryTool
{
    /** @return array<string, mixed> */
    public function schema(JsonSchema $schema): array
    {
        return [
            'pack_id' => $this->packIdSchema($schema),
            'sticker_id' => $this->stickerIdSchema($schema),
        ];
    }

    protected function respond(Request $request, StickerLibraryManager $library): Response|ResponseFactory
    {
        $request->validate([...$this->packIdRules(), ...$this->stickerIdRules()]);
        $pack = $this->findPack($library, $request);
        $library->deleteSticker($library->findSticker($pack, (int) $request->get('sticker_id')));

        return $this->packResponse($pack);
    }
}
