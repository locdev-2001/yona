<?php

namespace App\Mcp\Tools\Stickers;

use App\Http\Resources\Stickers\LibraryStickerPackResource;
use App\Http\Resources\Stickers\LibraryStickerResource;
use App\Models\Account;
use App\Models\Sticker;
use App\Models\StickerPack;
use App\Services\Stickers\StickerLibraryManager;
use App\Services\Stickers\StickerLibraryTarget;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\JsonSchema\Types\Type;
use Illuminate\Support\Facades\RateLimiter;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\ResponseFactory;
use Laravel\Mcp\Server\Tool;

// Nền của mọi tool MCP kho sticker: chỉ thao tác đúng kho mà token cấp
// (StickerLibraryTarget do AuthenticateStickerLibraryToken gắn vào request) qua
// StickerLibraryManager, trả cùng hình dạng với API quản trị kho. Không có kho
// được cấp thì từ chối, không rơi về kho nào mặc định.
abstract class StickerLibraryTool extends Tool
{
    private const THROTTLE_WINDOW_SECONDS = 60;

    private ?StickerLibraryTarget $target = null;

    public function handle(Request $request, StickerLibraryManager $library): Response|ResponseFactory
    {
        $this->target = StickerLibraryTarget::fromRequest(request());

        if ($this->target === null) {
            return Response::error(__('errors.sticker_library.forbidden'));
        }

        try {
            return $this->respond($request, $library);
        } catch (ModelNotFoundException) {
            return Response::error(__('errors.sticker_library.not_found'));
        }
    }

    abstract protected function respond(Request $request, StickerLibraryManager $library): Response|ResponseFactory;

    protected function libraryTarget(): StickerLibraryTarget
    {
        return $this->target ?? throw new \LogicException('Tool kho sticker chạy khi chưa có kho được cấp.');
    }

    // Mỗi kho một nhịp riêng cho từng loại thao tác; còn lượt thì tính luôn lượt này.
    protected function throttled(string $keyPrefix, int $perMinute): bool
    {
        $throttleKey = $keyPrefix.$this->libraryTarget()->rateLimitKey();
        if (RateLimiter::tooManyAttempts($throttleKey, $perMinute)) {
            return true;
        }
        RateLimiter::hit($throttleKey, self::THROTTLE_WINDOW_SECONDS);

        return false;
    }

    protected function libraryOwner(): ?Account
    {
        return $this->libraryTarget()->owner;
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
        return $library->findPack($this->libraryOwner(), (int) $request->get('pack_id'));
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
