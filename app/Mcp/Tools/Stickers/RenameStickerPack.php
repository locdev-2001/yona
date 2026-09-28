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
use Laravel\Mcp\Server\Tools\Annotations\IsIdempotent;

#[Name('rename_sticker_pack')]
#[Description('Đổi tên một bộ sticker trong kho của token.')]
#[IsIdempotent]
class RenameStickerPack extends StickerLibraryTool
{
    /** @return array<string, mixed> */
    public function schema(JsonSchema $schema): array
    {
        return [
            'pack_id' => $this->packIdSchema($schema),
            'name' => $schema->string()->max(StickerPackRequest::MAX_NAME_LENGTH)->description('Tên mới của bộ.')->required(),
        ];
    }

    protected function respond(Request $request, StickerLibraryManager $library): Response|ResponseFactory
    {
        $validated = $request->validate([...$this->packIdRules(), ...StickerPackRequest::nameRules()]);

        return $this->packResponse($library->renamePack($this->findPack($library, $request), trim($validated['name'])));
    }
}
