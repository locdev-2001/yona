<?php

namespace App\Mcp\Tools\Stickers;

use App\Services\Stickers\StickerLibraryManager;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\ResponseFactory;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Tools\Annotations\IsIdempotent;

#[Name('set_sticker_pack_published')]
#[Description('Xuất bản (published = true) hoặc gỡ xuất bản một bộ trong kho của token. Bộ đã xuất bản thì các sticker đã dựng xong (ready) hiện ngay: kho nền tảng hiện với MỌI account Yona, kho riêng chỉ hiện trong account đó; chỉ xuất bản khi đã kiểm tra bằng get_sticker_pack.')]
#[IsIdempotent]
class SetStickerPackPublished extends StickerLibraryTool
{
    /** @return array<string, mixed> */
    public function schema(JsonSchema $schema): array
    {
        return [
            'pack_id' => $this->packIdSchema($schema),
            'published' => $schema->boolean()->description('true để xuất bản, false để gỡ xuất bản.')->required(),
        ];
    }

    protected function respond(Request $request, StickerLibraryManager $library): Response|ResponseFactory
    {
        $validated = $request->validate([...$this->packIdRules(), 'published' => ['required', 'boolean']]);

        return $this->packResponse($library->setPublished($this->findPack($library, $request), (bool) $validated['published']));
    }
}
