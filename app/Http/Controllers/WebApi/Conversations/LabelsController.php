<?php

namespace App\Http\Controllers\WebApi\Conversations;

use App\Http\Controllers\Controller;
use App\Models\Account;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

// Port từ Api::V1::Accounts::Conversations::LabelsController + LabelConcern.
// Logic gán nhãn nằm ở trait Labelable của model — controller chỉ chọn model.
class LabelsController extends Controller
{
    public function index(Request $request, Account $account, int $conversationId): JsonResponse
    {
        $conversation = $this->fetchConversationForUser($request, $account, $conversationId);

        return response()->json(['payload' => $conversation->labelList()]);
    }

    public function create(Request $request, Account $account, int $conversationId): JsonResponse
    {
        $conversation = $this->fetchConversationForUser($request, $account, $conversationId);
        $conversation->updateLabels($request->input('labels'));

        return response()->json(['payload' => $conversation->labelList()]);
    }
}
