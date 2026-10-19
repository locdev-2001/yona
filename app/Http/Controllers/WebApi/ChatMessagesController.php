<?php

namespace App\Http\Controllers\WebApi;

use App\Http\Controllers\Controller;
use App\Models\Chat;
use App\Models\ChatMessage;
use App\Services\Chat\ChatInbox;
use App\Services\Chat\ChatMemberships;
use App\Services\Chat\ChatMessageSender;
use App\Services\Chat\ChatPresenter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ChatMessagesController extends Controller
{
    public function __construct(
        private readonly ChatMemberships $memberships,
        private readonly ChatPresenter $presenter,
    ) {}

    public function index(Request $request, Chat $chat, ChatInbox $inbox): JsonResponse
    {
        $this->memberships->membership($request->user(), $chat);
        $before = $request->validate(['before' => ['sometimes', 'integer']])['before'] ?? null;
        $chat->load('members');
        $readUpTo = $this->presenter->readUpToFor($chat, $request->user());
        $messages = $inbox->messages($chat, $before);

        return response()->json([
            'payload' => $messages->map(fn (ChatMessage $message) => $this->presenter->message($message, $readUpTo, $chat->isGroup()))->values(),
            'meta' => ['has_more' => $messages->count() === ChatInbox::MESSAGES_PAGE_SIZE],
        ]);
    }

    public function store(Request $request, Chat $chat, ChatMessageSender $sender): JsonResponse
    {
        $data = $request->validate([
            'content' => ['required', 'string', 'max:10000'],
            'echo_id' => ['sometimes', 'nullable', 'uuid'],
            'in_reply_to' => ['sometimes', 'nullable', 'integer'],
            'mentions' => ['sometimes', 'array', 'max:50'],
            'mentions.*' => ['array'],
        ]);

        $message = $sender->sendText(
            $request->user(),
            $chat,
            $data['content'],
            $data['echo_id'] ?? null,
            $data['in_reply_to'] ?? null,
            $data['mentions'] ?? [],
        );

        return response()->json($this->presenter->message($message, inGroup: $chat->isGroup()));
    }
}
