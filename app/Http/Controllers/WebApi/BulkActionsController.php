<?php

namespace App\Http\Controllers\WebApi;

use App\Http\Controllers\Controller;
use App\Jobs\BulkActionsJob;
use App\Jobs\Contacts\BulkActionJob as ContactsBulkActionJob;
use App\Models\Account;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Str;

// Port từ Api::V1::Accounts::BulkActionsController — nhánh Conversation + Contact.
class BulkActionsController extends Controller
{
    public function create(Request $request, Account $account): JsonResponse|Response
    {
        return match (Str::studly((string) $request->input('type'))) {
            'Conversation' => $this->enqueueConversationJob($request, $account),
            'Contact' => $this->enqueueContactJob($request, $account),
            default => response()->json(['success' => false], 422),
        };
    }

    private function enqueueConversationJob(Request $request, Account $account): Response
    {
        BulkActionsJob::dispatch($account, $request->user(), $this->conversationParams($request));

        return response()->noContent(200);
    }

    private function enqueueContactJob(Request $request, Account $account): Response
    {
        // check_authorization_for_contact_action: chỉ hành động xoá cần quyền admin.
        if ($request->input('action_name') === 'delete') {
            $this->authorizeAdministrator($request);
        }

        ContactsBulkActionJob::dispatch($account, $request->user(), $this->commonBulkAttributes($request));

        return response()->noContent(200);
    }

    /** @return array<string, mixed> */
    private function conversationParams(Request $request): array
    {
        return [
            ...$this->commonBulkAttributes($request),
            'snoozed_until' => $request->input('snoozed_until'),
            'fields' => $request->has('fields')
                ? array_intersect_key((array) $request->input('fields'), array_flip(['status', 'assignee_id', 'team_id']))
                : null,
        ];
    }

    /** @return array<string, mixed> */
    private function commonBulkAttributes(Request $request): array
    {
        return [
            'type' => $request->input('type'),
            'action_name' => $request->input('action_name'),
            'ids' => array_map('intval', (array) $request->input('ids', [])),
            'labels' => [
                'add' => (array) $request->input('labels.add', []),
                'remove' => (array) $request->input('labels.remove', []),
            ],
        ];
    }
}
