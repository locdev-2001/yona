<?php

namespace App\Http\Controllers\Public;

use App\Builders\Messages\MessageBuilder;
use App\Http\Controllers\Controller;
use App\Messaging\Structured\InvalidStructuredPayload;
use App\Models\MessageAccessToken;
use App\Services\Branding\BrandAssets;
use App\Services\Messaging\PublicFlowService;
use App\Services\Messaging\SubmissionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

// Trang công khai theo token (`/m/{token}`, phase-05 §C) — link Yona duy nhất
// khách mở ngoài widget (Zalo/SMS gửi kèm link). Không đăng nhập, không session:
// bằng chứng danh tính DUY NHẤT là token trên URL, hết hạn sau 14 ngày.
class FlowsController extends Controller
{
    // Trang chỉ trả lời một lần (chọn lịch, điền form) thì khoá token sau khi
    // gửi; trang chỉ xem (theo dõi đơn, chuyển khoản) hoặc trang đặt hàng (khách
    // có thể quay lại đặt thêm) thì giữ token sống tới khi hết hạn.
    private const CONSUMED_ON_SUBMIT = ['schedule', 'form'];

    public function page(string $token, PublicFlowService $flows, Request $request): Response
    {
        $record = $flows->resolve($token);
        abort_if($record === null, 404);

        $response = response()->view('flows', ['globalConfig' => $this->globalConfig()]);
        $policy = $flows->frameAncestorsHeader($record->message, $request->headers->get('Origin'));

        return $policy === null ? $response : $response->header('Content-Security-Policy', $policy);
    }

    public function show(string $token, PublicFlowService $flows): JsonResponse
    {
        $record = $flows->resolve($token);
        abort_if($record === null, 404);

        $page = $flows->describe($record->message, $record->purpose, $record->item_id);
        abort_if($page === null, 404);

        return response()->json([
            'purpose' => $record->purpose,
            'org_name' => $record->message->inbox->name,
            ...$page,
        ]);
    }

    public function submit(Request $request, string $token, PublicFlowService $flows, SubmissionService $submissions): JsonResponse
    {
        $record = $flows->resolve($token);
        abort_if($record === null, 404);

        try {
            $this->handleSubmission($record, $request, $submissions);
        } catch (InvalidStructuredPayload $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }

        if (in_array($record->purpose, self::CONSUMED_ON_SUBMIT, true)) {
            $flows->consume($record);
        }

        return response()->json(['ok' => true]);
    }

    private function handleSubmission(MessageAccessToken $record, Request $request, SubmissionService $submissions): void
    {
        match ($record->purpose) {
            'schedule', 'form' => $submissions->submit($record->message, $request->input('submitted_values')),
            'product' => $this->submitOrderRequest($record, $request),
            default => throw InvalidStructuredPayload::notAnswerable($record->purpose),
        };
    }

    // "Đặt mua" từ trang sản phẩm: tạo tin order_request incoming trong ĐÚNG hội
    // thoại của thẻ gốc. OrderRequestType tự đối chiếu variant/giá với thẻ gốc,
    // khách không tự đặt giá được (app/Messaging/Structured/Types/OrderRequestType.php).
    private function submitOrderRequest(MessageAccessToken $record, Request $request): void
    {
        abort_if($record->item_id === null, 404);

        $attributes = $request->validate([
            'selections' => ['nullable', 'array'],
            'quantity' => ['required', 'integer', 'min:1', 'max:999'],
            'note' => ['nullable', 'string', 'max:300'],
        ]);

        $message = $record->message;

        (new MessageBuilder(
            user: null,
            conversation: $message->conversation,
            params: [
                'message_type' => 'incoming',
                'content_type' => 'order_request',
                'content_attributes' => [
                    'source_message_id' => $message->id,
                    'item_id' => $record->item_id,
                    ...$attributes,
                ],
            ],
            incomingAllowed: true,
        ))->perform();
    }

    /** @return array<string, mixed> */
    private function globalConfig(): array
    {
        return [
            'LOGO_THUMBNAIL' => app(BrandAssets::class)->logoThumbnail(),
            'BRAND_NAME' => config('yona.branding.brand_name'),
            'WIDGET_BRAND_URL' => config('yona.branding.widget_brand_url'),
            'INSTALLATION_NAME' => config('yona.branding.installation_name'),
        ];
    }
}
