<?php

namespace App\Http\Controllers\WebApi;

use App\Http\Controllers\Controller;
use App\Models\Chat;
use App\Models\User;
use App\Services\Chat\ChatInbox;
use App\Services\Chat\ChatMemberships;
use App\Services\Chat\ChatPresenter;
use App\Services\Chat\DirectChats;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\Rule;

class ChatsController extends Controller
{
    public function __construct(
        private readonly ChatInbox $inbox,
        private readonly ChatMemberships $memberships,
        private readonly ChatPresenter $presenter,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $query = $request->validate([
            'tab' => ['sometimes', Rule::in([ChatInbox::TAB_ALL, ChatInbox::TAB_REQUESTS])],
            'before' => ['sometimes', 'integer'],
        ]);
        $user = $request->user();
        $chats = $this->inbox->chats($user, $query['tab'] ?? ChatInbox::TAB_ALL, $query['before'] ?? null);

        return response()->json([
            'payload' => $chats->map(fn (Chat $chat) => $this->presenter->chat($chat, $user, $this->memberships))->values(),
            'meta' => [
                'request_count' => $this->inbox->requestCount($user),
                'has_more' => $chats->count() === ChatInbox::PAGE_SIZE,
            ],
        ]);
    }

    // Mở (hoặc lấy lại) hội thoại 1-1 với một người.
    public function storeDirect(Request $request, DirectChats $directChats): JsonResponse
    {
        $recipientId = (int) $request->validate(['user_id' => ['required', 'integer', 'exists:users,id']])['user_id'];
        $chat = $directChats->open($request->user(), User::query()->findOrFail($recipientId));

        return response()->json($this->presenter->chat($chat, $request->user(), $this->memberships));
    }

    public function show(Request $request, Chat $chat): JsonResponse
    {
        $this->memberships->membership($request->user(), $chat);

        return response()->json($this->presenter->chat($chat, $request->user(), $this->memberships));
    }

    public function accept(Request $request, Chat $chat): JsonResponse
    {
        $this->memberships->accept($request->user(), $chat);

        return response()->json($this->presenter->chat($chat->refresh(), $request->user(), $this->memberships));
    }

    public function destroy(Request $request, Chat $chat): Response
    {
        $this->memberships->remove($request->user(), $chat);

        return response()->noContent();
    }

    public function read(Request $request, Chat $chat): Response
    {
        $messageId = $request->validate(['message_id' => ['sometimes', 'nullable', 'integer']])['message_id'] ?? null;
        $this->memberships->markRead($request->user(), $chat, $messageId);

        return response()->noContent();
    }

    public function typing(Request $request, Chat $chat): Response
    {
        $isTyping = (bool) $request->validate(['typing' => ['required', 'boolean']])['typing'];
        $this->memberships->typing($request->user(), $chat, $isTyping);

        return response()->noContent();
    }
}
