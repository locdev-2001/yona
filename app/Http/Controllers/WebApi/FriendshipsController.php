<?php

namespace App\Http\Controllers\WebApi;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Users\Friendships;
use App\Services\Users\UserDirectory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

// Lời mời kết bạn của người đang đăng nhập: xem lời mời đang chờ, gửi, chấp nhận,
// từ chối/huỷ/huỷ kết bạn (cùng là xoá), và trạng thái với một người cụ thể.
class FriendshipsController extends Controller
{
    public function __construct(
        private readonly Friendships $friendships,
        private readonly UserDirectory $directory,
    ) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json(['payload' => $this->friendships->pendingFor($request->user())]);
    }

    public function show(Request $request, int $userId): JsonResponse
    {
        $person = User::query()->whereNotNull('username')->findOrFail($userId);

        return response()->json(['payload' => $this->profilePayload($request->user(), $person)]);
    }

    public function store(Request $request): JsonResponse
    {
        $userId = (int) $request->validate(['user_id' => ['required', 'integer', 'exists:users,id']])['user_id'];
        $person = User::query()->findOrFail($userId);

        $this->friendships->request($request->user(), $person);

        return response()->json(['payload' => $this->profilePayload($request->user(), $person)], 201);
    }

    public function accept(Request $request, int $friendshipId): JsonResponse
    {
        $friendship = $this->friendships->accept($this->friendships->find($request->user(), $friendshipId), $request->user());

        return response()->json(['payload' => $this->profilePayload($request->user(), User::query()->findOrFail($friendship->requester_id))]);
    }

    public function destroy(Request $request, int $friendshipId): Response
    {
        $this->friendships->remove($this->friendships->find($request->user(), $friendshipId), $request->user());

        return response()->noContent();
    }

    /** @return array<string, mixed> */
    private function profilePayload(User $viewer, User $person): array
    {
        return [
            'person' => [...$this->directory->card($person), 'joined_at' => $person->created_at?->toISOString()],
            ...$this->friendships->stateWith($viewer, $person->id),
        ];
    }
}
