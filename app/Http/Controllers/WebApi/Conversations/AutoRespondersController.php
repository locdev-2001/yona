<?php

namespace App\Http\Controllers\WebApi\Conversations;

use App\Http\Controllers\Controller;
use App\Http\Resources\ConversationResource;
use App\Models\Account;
use App\Services\Conversations\AutoResponderStopReason;
use App\Services\Conversations\ConversationAutoResponder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

// Công tắc "AI tự động" của một hội thoại (AI trả lời của inbox, Inbox::replyingAiAgent). Cùng nhóm
// route nhận cả phiên dashboard lẫn api_access_token, nên giao diện và API token đi chung
// một đường.
class AutoRespondersController extends Controller
{
    public function __construct(private readonly ConversationAutoResponder $autoResponder) {}

    public function store(Request $request, Account $account, int $conversationId): JsonResponse
    {
        $conversation = $this->fetchConversationForUser($request, $account, $conversationId);

        $this->autoResponder->enable($conversation, $request->user());

        return response()->json(ConversationResource::forViewer($conversation->refresh(), $request));
    }

    public function destroy(Request $request, Account $account, int $conversationId): JsonResponse
    {
        $conversation = $this->fetchConversationForUser($request, $account, $conversationId);

        $this->autoResponder->disable($conversation, AutoResponderStopReason::Manual, $request->user());

        return response()->json(ConversationResource::forViewer($conversation->refresh(), $request));
    }
}
