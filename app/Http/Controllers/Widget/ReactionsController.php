<?php

namespace App\Http\Controllers\Widget;

use App\Http\Resources\Widget\WidgetMessageResource;
use App\Models\Message;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Khách thả/gỡ biểu cảm trên tin trong hội thoại của chính mình. Mỗi khách giữ tối
 * đa một biểu cảm trên một tin (thả cái khác là đổi), giống phía agent.
 */
class ReactionsController extends WidgetController
{
    private const ACTOR_PREFIX = 'contact:';

    public function store(Request $request, int $messageId): JsonResponse
    {
        $emoji = $request->validate([
            'emoji' => ['required', 'string', Rule::in(config('messaging.widget_reactions'))],
        ])['emoji'];

        return $this->apply($request, $messageId, $emoji);
    }

    public function destroy(Request $request, int $messageId): JsonResponse
    {
        return $this->apply($request, $messageId, null);
    }

    private function apply(Request $request, int $messageId, ?string $emoji): JsonResponse
    {
        $message = Message::query()
            ->whereIn('conversation_id', $this->conversationsQuery($request)->pluck('conversations.id'))
            ->whereKey($messageId)
            ->firstOrFail();

        abort_if($message->isDeleted(), 404);

        $message->setReaction(self::ACTOR_PREFIX.$this->contact($request)->id, $emoji);

        return response()->json(WidgetMessageResource::listItem($message->fresh()));
    }
}
