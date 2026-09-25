<?php

namespace App\Http\Controllers\Widget;

use App\Messaging\Structured\Types\WebviewType;
use App\Models\Message;
use App\Services\Messaging\PublicFlowService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

// Widget mở Sheet (iframe) tới trang công khai bằng cách xin URL ở đây thay vì
// tự ghép — token luôn phát ở máy chủ, khách không đoán/sửa được cặp (tin, trang).
class MessageFlowLinksController extends WidgetController
{
    public function store(Request $request, int $messageId, PublicFlowService $flows): JsonResponse
    {
        $data = $request->validate([
            'page' => ['required', 'string', 'in:'.implode(',', WebviewType::PAGES)],
            'item_id' => ['nullable', 'string', 'max:64'],
        ]);

        $message = $this->visitorMessage($request, $messageId);
        $itemId = $data['item_id'] ?? null;

        abort_if($flows->describe($message, $data['page'], $itemId) === null, 404);

        return response()->json(['url' => $flows->issue($message, $data['page'], $itemId)]);
    }

    // Chỉ tin nằm trong hội thoại của ĐÚNG khách đang gọi — không phải tin của
    // khách khác trong cùng hộp thư (cùng luật fetchVisitorMessage của MessagesController).
    private function visitorMessage(Request $request, int $messageId): Message
    {
        $conversationIds = $this->conversationsQuery($request)->pluck('conversations.id');

        return Message::query()
            ->whereIn('conversation_id', $conversationIds)
            ->whereKey($messageId)
            ->firstOrFail();
    }
}
