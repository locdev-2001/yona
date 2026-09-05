<?php

namespace App\Http\Controllers\WebApi;

use App\Http\Controllers\Controller;
use App\Jobs\BulkActionsJob;
use App\Models\Account;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Str;

// Port từ Api::V1::Accounts::BulkActionsController — nhánh Conversation.
// Nhánh Contact (Contacts::BulkActionJob) thuộc nhóm sau.
class BulkActionsController extends Controller
{
    public function create(Request $request, Account $account): JsonResponse|Response
    {
        if (Str::studly((string) $request->input('type')) !== 'Conversation') {
            return response()->json(['success' => false], 422);
        }

        BulkActionsJob::dispatch($account, $request->user(), $this->conversationParams($request));

        return response()->noContent(200);
    }

    /** @return array<string, mixed> */
    private function conversationParams(Request $request): array
    {
        return [
            'type' => $request->input('type'),
            'action_name' => $request->input('action_name'),
            'ids' => array_map('intval', (array) $request->input('ids', [])),
            'snoozed_until' => $request->input('snoozed_until'),
            'fields' => $request->has('fields')
                ? array_intersect_key((array) $request->input('fields'), array_flip(['status', 'assignee_id', 'team_id']))
                : null,
            // Nhãn để chỗ cắm cho B7 — job chưa xử lý.
            'labels' => [
                'add' => (array) $request->input('labels.add', []),
                'remove' => (array) $request->input('labels.remove', []),
            ],
        ];
    }
}
