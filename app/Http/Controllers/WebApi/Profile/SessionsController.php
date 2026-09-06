<?php

namespace App\Http\Controllers\WebApi\Profile;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserSessionResource;
use App\Models\UserSession;
use App\Services\UserSessionRevoker;
use App\Support\CurrentUserSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

// Port api/v1/profile/sessions_controller.rb.
class SessionsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $currentClientId = CurrentUserSession::clientId($request);

        $sessions = $request->user()->userSessions()
            ->orderByDesc('last_activity_at')
            ->get()
            ->map(fn (UserSession $session) => (new UserSessionResource($session, $currentClientId))->toArray($request));

        return response()->json($sessions);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        /** @var UserSession $session */
        $session = $request->user()->userSessions()->findOrFail($id);

        if ($session->isCurrent(CurrentUserSession::clientId($request))) {
            return response()->json(
                ['error' => __('errors.sessions.cannot_revoke_current')],
                Response::HTTP_UNPROCESSABLE_ENTITY,
            );
        }

        app(UserSessionRevoker::class)->revoke($session);

        return response()->json([], Response::HTTP_OK);
    }
}
