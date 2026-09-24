<?php

namespace App\Http\Controllers\WebApi\Conversations;

use App\Channels\Capability;
use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Services\Conversations\GroupMembersService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Thành viên của hội thoại nhóm để agent nhắc tên khi trả lời. Hội thoại không
 * phải nhóm trả danh sách rỗng; kênh không có luồng nhóm thì 422 như mọi năng lực
 * chưa khai (docs/channel-capabilities.md §1.4).
 */
class GroupMembersController extends Controller
{
    public function index(Request $request, Account $account, int $conversationId, GroupMembersService $groupMembers): JsonResponse
    {
        $conversation = $this->fetchConversationForUser($request, $account, $conversationId);

        abort_unless($conversation->inbox->supports(Capability::GroupThreads), 422, 'capability_not_supported');

        return response()->json(['payload' => $groupMembers->forConversation($conversation)]);
    }
}
