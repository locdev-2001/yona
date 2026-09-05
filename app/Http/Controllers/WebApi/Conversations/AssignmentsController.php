<?php

namespace App\Http\Controllers\WebApi\Conversations;

use App\Http\Controllers\Controller;
use App\Http\Resources\AgentResource;
use App\Models\Account;
use App\Models\Conversation;
use App\Services\Conversations\AssignmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

// Port từ Api::V1::Accounts::Conversations::AssignmentsController.
// Bỏ nhánh assignee_type=AgentBot (AgentBot chưa port).
class AssignmentsController extends Controller
{
    public function create(Request $request, Account $account, int $conversationId): JsonResponse
    {
        $conversation = $this->fetchConversationForUser($request, $account, $conversationId);

        if ($request->has('assignee_id')) {
            return $this->setAgent($request, $account, $conversation);
        }

        if ($request->has('team_id')) {
            return $this->setTeam($request, $account, $conversation);
        }

        return $this->nullJson();
    }

    private function setAgent(Request $request, Account $account, Conversation $conversation): JsonResponse
    {
        $agent = (new AssignmentService($conversation, $request->input('assignee_id')))->perform();

        return $agent === null
            ? $this->nullJson()
            : response()->json((new AgentResource($agent, $account))->toArray($request));
    }

    private function setTeam(Request $request, Account $account, Conversation $conversation): JsonResponse
    {
        $teamId = (int) $request->input('team_id');
        $team = $teamId > 0 ? $account->teams()->findOrFail($teamId) : null;

        DB::transaction(function () use ($conversation, $team) {
            $conversation->newModelQuery()->whereKey($conversation->id)->lockForUpdate()->get();
            $conversation->team_id = $team?->id;
            $conversation->save();
        });

        return $team === null ? $this->nullJson() : response()->json($team);
    }

    // `render json: nil` của Rails trả đúng chữ `null`; JsonResponse của Laravel
    // biến null thành `{}` nên phải đặt nội dung thẳng.
    private function nullJson(): JsonResponse
    {
        return response()->json()->setContent('null');
    }
}
