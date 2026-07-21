<?php

namespace App\Http\Controllers\Inbox;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\WorkspaceMember;
use Illuminate\Http\JsonResponse;

/**
 * P07 — data panel phải thread (channel-agnostic): người phụ trách, label,
 * note nội bộ + danh sách member cho dropdown gán. 1 endpoint gọn thay vì
 * nhét vào index payload (nặng) hay stream (khác concern).
 */
class ConversationPanelController extends Controller
{
    public function __invoke(Conversation $conversation): JsonResponse
    {
        $this->authorize('view', $conversation);

        return response()->json([
            'assigned_user' => $conversation->assignedUser()->first(['id', 'name']),
            'tags' => $conversation->tags()->get(['tags.id', 'name', 'color'])
                ->map(fn ($t) => ['id' => $t->id, 'name' => $t->name, 'color' => $t->color]),
            'notes' => $conversation->notes()
                ->with('author:id,name')
                ->latest()
                ->get()
                ->map(fn ($n) => [
                    'id' => $n->id,
                    'body' => $n->body,
                    'author_name' => $n->author?->name,
                    'created_at' => $n->created_at->toIso8601String(),
                ]),
            'members' => WorkspaceMember::where('status', 'active')
                ->with('user:id,name')
                ->get()
                ->map(fn ($m) => ['id' => $m->user_id, 'name' => $m->user?->name])
                ->filter(fn ($m) => $m['name'] !== null)
                ->values(),
        ]);
    }
}
