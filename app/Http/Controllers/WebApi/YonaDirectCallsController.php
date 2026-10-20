<?php

namespace App\Http\Controllers\WebApi;

use App\Http\Controllers\Controller;
use App\Http\Resources\CallResource;
use App\Models\Account;
use App\Models\Call;
use App\Models\User;
use App\Services\Calls\CallJoin;
use App\Services\Calls\CallMedia;
use App\Services\Yona\Calls\DirectCalls;
use App\Services\Yona\Calls\DirectCallSignals;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

// Gọi 1-1 trên Yona: hỏi gọi được người trong hội thoại không, bắt đầu gọi, nghe máy, cúp máy,
// và cuộc gọi đang sống của mình (tải lại trang giữa lúc đổ chuông).
class YonaDirectCallsController extends Controller
{
    public function __construct(
        private readonly DirectCalls $directCalls,
        private readonly DirectCallSignals $signals,
    ) {}

    public function eligibility(Request $request, Account $account, int $conversationId): JsonResponse
    {
        $eligibility = $this->directCalls->eligibility($account, $conversationId, $request->user());

        return response()->json(['callable' => $eligibility['callable']]);
    }

    public function store(Request $request, Account $account, int $conversationId): JsonResponse
    {
        $join = $this->directCalls->start($account, $conversationId, $request->user(), $this->mediaOf($request));

        return $this->joinResponse($join, $request->user());
    }

    public function accept(Request $request, Account $account, int $callId): JsonResponse
    {
        $join = $this->directCalls->accept($callId, $request->user(), $this->mediaOf($request));

        return $this->joinResponse($join, $request->user());
    }

    public function destroy(Request $request, Account $account, int $callId): JsonResponse
    {
        $call = $this->directCalls->hangUp($callId, $request->user());

        return response()->json(['direct_call' => $this->viewOf($call, $request->user())]);
    }

    public function current(Request $request, Account $account): JsonResponse
    {
        $call = $this->directCalls->liveCallOf($request->user());

        return response()->json(['direct_call' => $call === null ? null : $this->viewOf($call, $request->user())]);
    }

    private function mediaOf(Request $request): CallMedia
    {
        $input = $request->validate(['media' => ['sometimes', Rule::enum(CallMedia::class)]]);

        return CallMedia::tryFrom($input['media'] ?? '') ?? CallMedia::Audio;
    }

    private function joinResponse(CallJoin $join, User $viewer): JsonResponse
    {
        return response()->json([
            'call' => CallResource::from($join->call),
            'ticket' => $join->ticket?->toArray(),
            'awaiting_approval' => $join->isAwaitingApproval(),
            'direct_call' => $this->viewOf($join->call, $viewer),
        ]);
    }

    /** @return array<string, mixed>|null */
    private function viewOf(Call $call, User $viewer): ?array
    {
        $peer = $this->directCalls->peerOf($call, $viewer);

        return $peer === null ? null : $this->signals->viewFor($call, $viewer, $peer);
    }
}
