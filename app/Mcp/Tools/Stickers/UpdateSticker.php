<?php

namespace App\Mcp\Tools\Stickers;

use App\Services\Stickers\StickerLibraryManager;
use App\Services\Stickers\StickerTags;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\ResponseFactory;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Tools\Annotations\IsIdempotent;

#[Name('update_sticker')]
#[Description('Sửa nhãn và/hoặc từ khoá của một sticker trong kho của token. Khoá nào không gửi thì giữ nguyên. Từ khoá là chữ agent/khách gõ để hiện gợi ý sticker (ví dụ "cảm ơn", "ok", "haha").')]
#[IsIdempotent]
class UpdateSticker extends StickerLibraryTool
{
    /** @return array<string, mixed> */
    public function schema(JsonSchema $schema): array
    {
        return [
            'pack_id' => $this->packIdSchema($schema),
            'sticker_id' => $this->stickerIdSchema($schema),
            ...StickerTagSchema::properties($schema),
        ];
    }

    protected function respond(Request $request, StickerLibraryManager $library): Response|ResponseFactory
    {
        $request->validate([...$this->packIdRules(), ...$this->stickerIdRules(), ...StickerTags::validationRules()]);
        $sticker = $this->findSticker($library, $request);
        $arguments = $request->all();

        $library->updateSticker(
            $sticker,
            array_key_exists('label', $arguments) ? $arguments['label'] : $sticker->label,
            array_key_exists('keywords', $arguments) ? ($arguments['keywords'] ?? []) : $sticker->keywords,
        );

        return $this->stickerResponse($sticker);
    }
}
