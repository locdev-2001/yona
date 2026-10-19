<?php

namespace App\Http\Controllers\WebApi;

use App\Http\Controllers\Controller;
use App\Models\Chat;
use App\Models\ChatMessage;
use App\Models\Sticker;
use App\Services\Chat\ChatInbox;
use App\Services\Chat\ChatMemberships;
use App\Services\Chat\ChatMessageActions;
use App\Services\Chat\ChatMessageSender;
use App\Services\Chat\ChatPresenter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

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

    // Một đường gửi cho chữ, ảnh/file (kèm chú thích) và sticker.
    public function store(Request $request, Chat $chat, ChatMessageSender $sender): JsonResponse
    {
        $data = $request->validate([
            'content' => ['nullable', 'string', 'max:10000', 'required_without_all:attachments,sticker_id'],
            'echo_id' => ['sometimes', 'nullable', 'uuid'],
            'in_reply_to' => ['sometimes', 'nullable', 'integer'],
            'mentions' => ['sometimes', 'array', 'max:50'],
            'mentions.*' => ['array'],
            'attachments' => ['sometimes', 'array', 'max:10'],
            'attachments.*' => ['file', 'max:40960'],
            'sticker_id' => ['sometimes', 'integer'],
        ]);
        $user = $request->user();
        $echoId = $data['echo_id'] ?? null;
        $replyTo = $data['in_reply_to'] ?? null;

        $message = match (true) {
            isset($data['sticker_id']) => $sender->sendSticker($user, $chat, $this->publishedSticker((int) $data['sticker_id']), $echoId),
            $request->hasFile('attachments') => $sender->sendFiles($user, $chat, $request->file('attachments'), $data['content'] ?? null, $echoId, $replyTo),
            default => $sender->sendText($user, $chat, (string) $data['content'], $echoId, $replyTo, $data['mentions'] ?? []),
        };

        return response()->json($this->presenter->message($message->load('attachments'), inGroup: $chat->isGroup()));
    }

    public function update(Request $request, Chat $chat, int $message, ChatMessageActions $actions): JsonResponse
    {
        $content = $request->validate(['content' => ['required', 'string', 'max:10000']])['content'];
        $edited = $actions->edit($request->user(), $chat, $this->messageOf($chat, $message), $content);

        return response()->json($this->presenter->message($edited, inGroup: $chat->isGroup()));
    }

    public function destroy(Request $request, Chat $chat, int $message, ChatMessageActions $actions): JsonResponse
    {
        $recalled = $actions->recall($request->user(), $chat, $this->messageOf($chat, $message));

        return response()->json($this->presenter->message($recalled, inGroup: $chat->isGroup()));
    }

    public function react(Request $request, Chat $chat, int $message, ChatMessageActions $actions): JsonResponse
    {
        $emoji = $request->validate(['emoji' => ['required', 'string', 'max:16']])['emoji'];
        $reacted = $actions->react($request->user(), $chat, $this->messageOf($chat, $message), $emoji);

        return response()->json($this->presenter->message($reacted, inGroup: $chat->isGroup()));
    }

    public function forward(Request $request, Chat $chat, int $message, ChatMessageSender $sender): Response
    {
        $targetIds = $request->validate(['chat_ids' => ['required', 'array', 'max:20'], 'chat_ids.*' => ['integer']])['chat_ids'];
        $this->memberships->membership($request->user(), $chat);
        $original = $this->messageOf($chat, $message);

        Chat::query()->whereKey($targetIds)->get()->each(fn (Chat $target) => $sender->forward($request->user(), $original, $target));

        return response()->noContent();
    }

    public function search(Request $request, Chat $chat, ChatMessageActions $actions): JsonResponse
    {
        $query = $request->validate(['q' => ['required', 'string', 'min:2', 'max:100']])['q'];
        $results = $actions->search($request->user(), $chat, $query);

        return response()->json(['payload' => $results->map(fn (ChatMessage $item) => $this->presenter->message($item, inGroup: $chat->isGroup()))->values()]);
    }

    private function messageOf(Chat $chat, int $messageId): ChatMessage
    {
        return $chat->messages()->with(['sender', 'attachments'])->findOrFail($messageId);
    }

    private function publishedSticker(int $stickerId): Sticker
    {
        return Sticker::query()
            ->whereKey($stickerId)
            ->where('status', Sticker::STATUS_READY)
            ->whereHas('stickerPack', fn ($pack) => $pack->whereNull('account_id')->published())
            ->firstOrFail();
    }
}
