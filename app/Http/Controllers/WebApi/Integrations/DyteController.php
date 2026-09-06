<?php

namespace App\Http\Controllers\WebApi\Integrations;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\Message;
use App\Services\Integrations\Dyte\ProcessorService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

// Port từ Api::V1::Accounts::Integrations::DyteController (DyteController#authorize_request
// → ConversationPolicy#show?, tái dùng Controller::fetchConversationForUser).
class DyteController extends Controller
{
    public function createAMeeting(Request $request, Account $account): JsonResponse
    {
        $conversation = $this->fetchConversationForUser($request, $account, (int) $request->input('conversation_id'));

        $response = (new ProcessorService($account, $conversation))->createAMeeting($request->user());

        return $this->renderResponse($response);
    }

    public function addParticipantToMeeting(Request $request, Account $account): JsonResponse
    {
        $message = Message::query()->where('account_id', $account->id)->findOrFail((int) $request->input('message_id'));
        $conversation = $this->fetchConversationForUser($request, $account, $message->conversation->display_id);

        if ($message->content_type !== Message::CONTENT_TYPES['integrations']) {
            return response()->json(['error' => 'Invalid message type. Action not permitted'], 422);
        }

        $response = (new ProcessorService($account, $conversation))->addParticipantToMeeting(
            $message->content_attributes['data']['meeting_id'] ?? '',
            $request->user(),
            $message,
        );

        return $this->renderResponse($response);
    }

    private function renderResponse(array $response): JsonResponse
    {
        return response()->json($response, filled($response['error'] ?? null) ? 422 : 200);
    }
}
