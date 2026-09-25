<?php

namespace App\Http\Controllers\Widget;

use App\Http\Resources\Widget\WidgetConfigResource;
use App\Support\WidgetTokenService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

// Cửa vào của mọi phiên khách — KHÔNG ghi DB: token hợp lệ thì dùng lại đúng
// phiên cũ, token thiếu/hỏng thì chỉ cấp một source_id "treo" (chưa có bản ghi
// contact_inbox nào mang nó). Contact + contact_inbox chỉ dựng khi khách có
// hành động thật đầu tiên, ở ResolveOrCreateWidgetContact.
class ConfigsController extends WidgetController
{
    public function store(Request $request): JsonResponse
    {
        $channel = $this->channel($request);
        $contactInbox = $this->contactInbox($request);

        $token = WidgetTokenService::generate([
            'source_id' => $contactInbox?->source_id ?? $this->pendingSourceId($request),
            'inbox_id' => $channel->inbox->id,
        ]);

        return response()->json(
            WidgetConfigResource::make($channel, $contactInbox, $contactInbox?->contact, $token)
        );
    }

    // Giữ nguyên source_id đã cấp trong request (nếu có) để tải lại nhiều lần
    // không đổi định danh phiên dù chưa có hành động thật nào; garbage/không có
    // token thì cấp UUID mới.
    private function pendingSourceId(Request $request): string
    {
        $existing = $this->authPayload($request)['source_id'] ?? null;

        return is_string($existing) && $existing !== '' ? $existing : (string) Str::uuid();
    }
}
