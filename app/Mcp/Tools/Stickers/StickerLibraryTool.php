<?php

namespace App\Mcp\Tools\Stickers;

use App\Http\Middleware\AuthenticatePlatformApp;
use App\Http\Resources\Stickers\LibraryStickerPackResource;
use App\Http\Resources\Stickers\LibraryStickerResource;
use App\Models\Sticker;
use App\Models\StickerPack;
use App\Services\Stickers\StickerLibraryManager;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\JsonSchema\Types\Type;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\ResponseFactory;
use Laravel\Mcp\Server\Tool;

// Nền của mọi tool MCP kho sticker: chỉ thao tác kho chung (chủ kho = null) qua
// đúng StickerLibraryManager, trả cùng hình dạng với API quản trị kho.
abstract class StickerLibraryTool extends Tool
{
    protected const SHARED_LIBRARY_OWNER = null;

    public function handle(Request $request, StickerLibraryManager $library): Response|ResponseFactory
    {
        try {
            return $this->respond($request, $library);
        } catch (ModelNotFoundException) {
            return Response::error(__('errors.sticker_library.not_found'));
        }
    }

    abstract protected function respond(Request $request, StickerLibraryManager $library): Response|ResponseFactory;

    // Platform App gọi qua /mcp/stickers; không qua HTTP (test, stdio) thì dùng chung một khoá.
    protected function callerKey(): string
    {
        return (string) (request()->attributes->get(AuthenticatePlatformApp::PLATFORM_APP)?->getKey() ?? 'local');
    }

    protected function packIdSchema(JsonSchema $schema): Type
    {
        return $schema->integer()->min(1)->description('Mã bộ sticker (id trong list_sticker_packs).')->required();
    }

    protected function stickerIdSchema(JsonSchema $schema): Type
    {
        return $schema->integer()->min(1)->description('Mã sticker (id trong get_sticker_pack).')->required();
    }

    /** @return array<string, list<string>> */
    protected function packIdRules(): array
    {
        return ['pack_id' => ['required', 'integer', 'min:1']];
    }

    /** @return array<string, list<string>> */
    protected function stickerIdRules(): array
    {
        return ['sticker_id' => ['required', 'integer', 'min:1']];
    }

    protected function findPack(StickerLibraryManager $library, Request $request): StickerPack
    {
        return $library->findPack(self::SHARED_LIBRARY_OWNER, (int) $request->get('pack_id'));
    }

    protected function findSticker(StickerLibraryManager $library, Request $request): Sticker
    {
        return $library->findSticker($this->findPack($library, $request), (int) $request->get('sticker_id'));
    }

    protected function packResponse(StickerPack $pack): ResponseFactory
    {
        return Response::structured(LibraryStickerPackResource::detail($pack, request()));
    }

    protected function stickerResponse(Sticker $sticker): ResponseFactory
    {
        return Response::structured((new LibraryStickerResource($sticker))->toArray(request()));
    }
}
