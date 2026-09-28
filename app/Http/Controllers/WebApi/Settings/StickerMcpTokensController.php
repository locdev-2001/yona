<?php

namespace App\Http\Controllers\WebApi\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Stickers\StoreStickerMcpTokenRequest;
use App\Http\Resources\Stickers\StickerMcpTokenResource;
use App\Mcp\Prompts\DesignStickerPackPrompt;
use App\Mcp\Servers\StickerLibraryServer;
use App\Models\Account;
use App\Models\StickerMcpToken;
use App\Services\Stickers\StickerLibraryAccess;
use App\Services\Stickers\StickerPackSkill;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

// Token MCP/REST kho sticker trong Cài đặt: mỗi quản trị viên chỉ thấy, tạo và
// thu hồi token của những phạm vi mình đang được dùng (StickerLibraryAccess).
class StickerMcpTokensController extends Controller
{
    public function __construct(private readonly StickerLibraryAccess $access) {}

    public function index(Request $request, Account $account): JsonResponse
    {
        $scopes = $this->usableScopes($request, $account);

        $tokens = StickerMcpToken::query()
            ->with('user')
            ->where('account_id', $account->id)
            ->whereIn('scope', $scopes)
            ->latest('id')
            ->get();

        return response()->json([
            'payload' => StickerMcpTokenResource::collection($tokens)->toArray($request),
            'meta' => [
                'usable_scopes' => $scopes,
                'mcp_url' => StickerLibraryServer::endpointUrl(),
                'skill' => ['name' => StickerPackSkill::NAME, 'prompt' => DesignStickerPackPrompt::NAME],
            ],
        ]);
    }

    public function store(StoreStickerMcpTokenRequest $request, Account $account): JsonResponse
    {
        $scope = $request->tokenScope();
        abort_unless(in_array($scope, $this->usableScopes($request, $account), true), 403, __('errors.sticker_library.forbidden'));

        ['token' => $token, 'plainTextToken' => $plainTextToken] = StickerMcpToken::issue($account, $request->user(), $request->tokenName(), $scope);

        return response()->json([
            ...(new StickerMcpTokenResource($token->load('user')))->toArray($request),
            'token' => $plainTextToken,
            'mcp_url' => StickerLibraryServer::endpointUrl(),
        ], 201);
    }

    public function destroy(Request $request, Account $account, int $tokenId): JsonResponse
    {
        $scopes = $this->usableScopes($request, $account);
        $token = StickerMcpToken::query()->where('account_id', $account->id)->findOrFail($tokenId);
        abort_unless(in_array($token->scope, $scopes, true), 403, __('errors.sticker_library.forbidden'));

        $token->delete();

        return response()->json(null, 200);
    }

    // Tệp SKILL.md dạy trợ lý AI tạo bộ sticker: ai tạo được token MCP thì tải được.
    public function skill(Request $request, Account $account): BinaryFileResponse
    {
        $this->usableScopes($request, $account);

        return response()->download(StickerPackSkill::path(), StickerPackSkill::DOWNLOAD_NAME, ['Content-Type' => StickerPackSkill::MIME_TYPE]);
    }

    /** @return list<string> */
    private function usableScopes(Request $request, Account $account): array
    {
        $this->authorizeAdministrator($request);
        $scopes = $this->access->usableScopes($request->user(), $account);
        abort_if($scopes === [], 403, __('errors.sticker_library.forbidden'));

        return $scopes;
    }
}
