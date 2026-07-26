<?php

namespace App\Http\Controllers\Chat;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Modules\Chat\Port\Capability\SupportsPhoneVerification;
use App\Modules\Chat\Port\ChannelRegistry;
use App\Modules\Chat\Store\PhoneEnrichmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;

/**
 * P05 — nhập tay SĐT khách + verify qua kênh (findUser: uid phải khớp sender_uid).
 * Verify pass → phone_source='manual_verified' (nguồn mạnh nhất). Verify fail
 * (số không dùng Zalo HOẶC uid không khớp) → TỪ CHỐI lưu (LOW-2: cả 2 nhánh).
 */
class ConversationPhoneController extends Controller
{
    public function update(Request $request, Conversation $conversation, PhoneEnrichmentService $phoneEnrichment): JsonResponse
    {
        $this->authorize('update', $conversation);

        $validated = $request->validate([
            'phone' => ['required', 'string', 'regex:/^[0-9+][0-9 .\-()]{7,19}$/'],
        ]);

        if ($conversation->isGroup()) {
            return response()->json(['message' => 'Hội thoại nhóm không có SĐT khách.'], 422);
        }

        // Review MED-1: mỗi verify = 1 findUser API không chính thức. Throttle
        // 5/phút/(user,workspace) — chặn burst bot-like (vector khóa acc) + chặn
        // oracle dò SĐT (iterate phone → true/false thuộc sender_uid).
        $rateKey = 'phone-verify:'.$conversation->workspace_id.':'.auth()->id();
        if (! RateLimiter::attempt($rateKey, 5, fn () => true, 60)) {
            return response()->json([
                'message' => 'Xác minh quá nhanh — thử lại sau 1 phút.',
                'error_code' => 'verify_rate_limited',
            ], 429);
        }

        $driver = app(ChannelRegistry::class)->driver($conversation->channel);

        // Kênh chưa hỗ trợ xác minh → KHÔNG nhận số nhập tay. Lưu số chưa xác
        // minh là làm bẩn nguồn định danh mạnh nhất của hệ thống.
        if (! $driver instanceof SupportsPhoneVerification) {
            return response()->json(['message' => 'Kênh này chưa hỗ trợ xác minh SĐT.', 'error_code' => 'verify_unsupported'], 422);
        }

        try {
            $verified = $driver->verifySenderPhone($conversation, $validated['phone']);
        } catch (\Throwable $e) {
            report($e);

            return response()->json(['message' => 'Không xác minh được — kết nối Zalo chưa sẵn sàng.', 'error_code' => 'verify_unavailable'], 422);
        }

        if (! $verified) {
            return response()->json([
                'message' => 'SĐT không khớp với tài khoản Zalo của khách này. Không lưu.',
                'error_code' => 'phone_mismatch',
            ], 422);
        }

        $applied = $phoneEnrichment->applyPhone($conversation, $validated['phone'], 'manual_verified', now());

        if (! $applied) {
            return response()->json(['message' => 'SĐT không hợp lệ.'], 422);
        }

        $conversation->refresh();

        return response()->json([
            'ok' => true,
            'peer_phone' => $conversation->peer_phone,
            'phone_source' => $conversation->phone_source,
            'contact_id' => $conversation->contact_id,
        ]);
    }
}
