<?php

namespace App\Http\Controllers\Chat;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\WorkspaceMember;
use App\Support\Activity\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * P07 — gán người phụ trách hội thoại (channel-agnostic, RBAC hiện có).
 * user_id null = bỏ gán. Ghi activity 'conversation.assigned'.
 */
class ConversationAssignController extends Controller
{
    public function update(Request $request, Conversation $conversation, ActivityLogger $activityLogger): JsonResponse
    {
        $this->authorize('update', $conversation);

        $validated = $request->validate([
            'user_id' => ['nullable', 'integer'],
        ]);
        $userId = $validated['user_id'] ?? null;

        // Chỉ member ACTIVE của workspace mới gán được
        $memberName = null;
        if ($userId !== null) {
            $member = WorkspaceMember::where('user_id', $userId)
                ->where('status', 'active')
                ->with('user:id,name')
                ->first();

            if ($member === null) {
                return response()->json(['message' => 'Người này không phải thành viên workspace.'], 422);
            }
            $memberName = $member->user?->name;
        }

        $conversation->forceFill(['assigned_user_id' => $userId])->save();

        $activityLogger->log($conversation, 'conversation.assigned', [
            'assigned_user_id' => $userId,
            'assigned_user_name' => $memberName,
        ]);

        return response()->json([
            'ok' => true,
            'assigned_user' => $userId === null ? null : ['id' => $userId, 'name' => $memberName],
        ]);
    }
}
