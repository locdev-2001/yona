<?php

namespace App\Http\Middleware;

use App\Http\Controllers\WebApi\Conversations\AssignmentsController;
use App\Http\Controllers\WebApi\Conversations\LabelsController as ConversationLabelsController;
use App\Http\Controllers\WebApi\Conversations\MessageForwardsController;
use App\Http\Controllers\WebApi\Conversations\MessagesController;
use App\Http\Controllers\WebApi\ConversationsController;
use App\Models\AccessToken;
use App\Models\AgentBot;
use App\Models\User;
use Closure;
use Illuminate\Contracts\Auth\Middleware\AuthenticatesRequests;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

// Cùng một endpoint nhận cả session
// (dashboard) lẫn header api_access_token (Application API). Header có mặt →
// token quyết định; token sai → 401 'Invalid Access Token'.
// Implement AuthenticatesRequests để nhận cùng bậc ưu tiên với middleware `auth`
// trong middlewarePriority — nếu không, `auth` bị đẩy lên chạy trước và chặn
// request token bằng 401 trước khi middleware này kịp xác thực.
class AuthenticateApiAccessToken implements AuthenticatesRequests
{
    // BOT_ACCESSIBLE_ENDPOINTS: bot chỉ được vào đúng những action này.
    private const BOT_ACCESSIBLE_ROUTES = [
        ConversationsController::class => ['show', 'store', 'update', 'toggleStatus', 'toggleTypingStatus', 'togglePriority'],
        MessagesController::class => ['store'],
        MessageForwardsController::class => ['store'],
        AssignmentsController::class => ['create'],
        ConversationLabelsController::class => ['index', 'create'],
    ];

    // Cho SetCurrentAccount biết request này xác thực bằng token (validate_token_api_access).
    public const AUTHENTICATED_BY_TOKEN = 'authenticatedByAccessToken';

    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->header('api_access_token');

        if ($token === null) {
            return $next($request);
        }

        $owner = AccessToken::query()->where('token', $token)->first()?->owner;

        if (! $owner instanceof User && ! $owner instanceof AgentBot) {
            return response()->json(['error' => 'Invalid Access Token'], 401);
        }

        if ($owner instanceof AgentBot && ! $this->botAccessible($request)) {
            return response()->json(['error' => 'Access to this endpoint is not authorized for bots'], 401);
        }

        $request->attributes->set(self::AUTHENTICATED_BY_TOKEN, true);
        Auth::setUser($owner);

        return $next($request);
    }

    private function botAccessible(Request $request): bool
    {
        $action = $request->route()?->getActionName();

        if (! is_string($action) || ! str_contains($action, '@')) {
            return false;
        }

        [$controller, $method] = explode('@', $action, 2);

        return in_array($method, self::BOT_ACCESSIBLE_ROUTES[$controller] ?? [], true);
    }
}
