<?php

namespace App\Http\Controllers\WebApi\Conversations;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Support\ConversationDraftMessage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

// Port từ Api::V1::Accounts::Conversations::DraftMessagesController — tuyến
// singular resource: một bản nháp cho mỗi conversation, không có id riêng.
class DraftMessagesController extends Controller
{
    public function show(Request $request, Account $account, int $conversationId): JsonResponse
    {
        $conversation = $this->fetchConversationForUser($request, $account, $conversationId);
        $draft = ConversationDraftMessage::get($conversation->id);

        if ($draft === null) {
            return response()->json(['has_draft' => false]);
        }

        return response()->json(['has_draft' => true, 'message' => $draft]);
    }

    public function update(Request $request, Account $account, int $conversationId): Response
    {
        $conversation = $this->fetchConversationForUser($request, $account, $conversationId);
        // params.dig(:draft_message, :message) || '' — thiếu tham số vẫn ghi chuỗi
        // rỗng, nên bản nháp rỗng vẫn tính là "có nháp".
        $message = $request->input('draft_message.message');

        ConversationDraftMessage::put($conversation->id, is_string($message) ? $message : '');

        return response()->noContent(200);
    }

    public function destroy(Request $request, Account $account, int $conversationId): Response
    {
        $conversation = $this->fetchConversationForUser($request, $account, $conversationId);
        ConversationDraftMessage::forget($conversation->id);

        return response()->noContent(200);
    }
}
