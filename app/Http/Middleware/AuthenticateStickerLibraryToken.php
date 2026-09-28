<?php

namespace App\Http\Middleware;

use App\Models\StickerMcpToken;
use App\Services\Stickers\StickerLibraryAccess;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

// Cổng chung của MCP /mcp/stickers và REST /api/v1/sticker_library: nhận
// `Authorization: Bearer <token sticker>`, kiểm lại quyền của người tạo ngay lúc
// dùng rồi gắn kho được chạm (StickerLibraryTarget) vào request.
class AuthenticateStickerLibraryToken
{
    public function __construct(private readonly StickerLibraryAccess $access) {}

    public function handle(Request $request, Closure $next): Response
    {
        $token = StickerMcpToken::findByPlainTextToken((string) $request->bearerToken());

        if ($token === null) {
            return response()->json(['error' => __('errors.sticker_library.invalid_token')], 401, ['WWW-Authenticate' => 'Bearer']);
        }

        $target = $this->access->targetFor($token);

        if ($target === null) {
            return response()->json(['error' => __('errors.sticker_library.forbidden')], 403);
        }

        $token->forceFill(['last_used_at' => now()])->saveQuietly();
        $target->attachTo($request);

        return $next($request);
    }
}
