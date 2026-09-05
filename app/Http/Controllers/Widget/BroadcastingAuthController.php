<?php

namespace App\Http\Controllers\Widget;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Broadcast;

// Cửa auth kênh realtime CHO KHÁCH. Không dùng /broadcasting/auth của dashboard
// vì đường đó nằm trong nhóm `web`: đòi cookie phiên + CSRF, mà widget chạy
// trong iframe trên tên miền của khách hàng nên cookie bên thứ ba thường bị chặn.
//
// Quyết định ai được nghe kênh nào vẫn nằm ở routes/channels.php (guard
// `widget` tra contact_inbox theo pubsub_token) — đây chỉ là mặt tiền.
class BroadcastingAuthController extends WidgetController
{
    public function authenticate(Request $request): JsonResponse
    {
        $contactInbox = $this->contactInbox($request);

        // Chỉ ký cho ĐÚNG kênh của phiên khách đang gọi.
        abort_unless(
            $request->input('channel_name') === 'private-'.$contactInbox->pubsub_token,
            403,
            'You are not authorized to do this action'
        );

        $request->merge(['pubsub_token' => $contactInbox->pubsub_token]);

        return response()->json(Broadcast::auth($request));
    }
}
