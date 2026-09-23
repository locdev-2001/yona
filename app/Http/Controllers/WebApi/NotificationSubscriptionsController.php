<?php

namespace App\Http\Controllers\WebApi;

use App\Http\Controllers\Controller;
use App\Models\NotificationSubscription;
use App\Support\RecordInvalidResponse;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

// Port từ Api::V1::NotificationSubscriptionsController — `resource` (số ít),
// không gắn account: đăng ký thông báo đẩy thuộc về user, dùng cho mọi account.
class NotificationSubscriptionsController extends Controller
{
    private const ENDPOINT_MAX_LENGTH = 2048;

    // Khoá công khai P-256 dạng không nén (0x04 + X + Y) và bí mật auth của RFC 8291.
    private const P256DH_BYTES = 65;

    private const AUTH_SECRET_BYTES = 16;

    public function store(Request $request): JsonResponse
    {
        $payload = $this->validatedPayload($request);

        $subscription = NotificationSubscription::registerBrowserPush(
            $request->user(),
            $payload['subscription_attributes'],
        );

        return response()->json($this->subscriptionPayload($subscription));
    }

    // Bản gốc chỉ tìm theo push_token của FCM; đăng ký trình duyệt được nhận diện
    // bằng endpoint. Chỉ xoá được bản ghi của chính mình; không thấy vẫn 200.
    public function destroy(Request $request): Response
    {
        $endpoint = $request->input('endpoint');

        if (is_string($endpoint) && $endpoint !== '') {
            $request->user()->notificationSubscriptions()->where('identifier', $endpoint)->delete();
        }

        return response()->noContent(200);
    }

    // params.require(:notification_subscription) + ParamsWrapper: nhận cả dạng bọc
    // lẫn dạng phẳng mà pushHelper gửi.
    /** @return array{subscription_type: string, subscription_attributes: array{endpoint: string, p256dh: string, auth: string}} */
    private function validatedPayload(Request $request): array
    {
        $wrapped = $request->input('notification_subscription');
        $payload = collect(is_array($wrapped) ? $wrapped : $request->all())
            ->only(['subscription_type', 'subscription_attributes'])
            ->all();

        if ($payload === []) {
            abort(response()->json(
                ['error' => 'param is missing or the value is empty: notification_subscription'],
                422
            ));
        }

        $validated = RecordInvalidResponse::validatedOrAbort(Validator::make($payload, [
            'subscription_type' => ['required', Rule::in(array_keys(NotificationSubscription::SUBSCRIPTION_TYPES))],
            'subscription_attributes' => ['required', 'array'],
            'subscription_attributes.endpoint' => ['required', 'string', 'max:'.self::ENDPOINT_MAX_LENGTH, 'url:https'],
            'subscription_attributes.p256dh' => ['required', 'string', $this->base64UrlOfLength(self::P256DH_BYTES)],
            'subscription_attributes.auth' => ['required', 'string', $this->base64UrlOfLength(self::AUTH_SECRET_BYTES)],
        ]));

        $validated['subscription_attributes'] = collect($validated['subscription_attributes'])
            ->only(['endpoint', 'p256dh', 'auth'])
            ->all();

        return $validated;
    }

    private function base64UrlOfLength(int $bytes): Closure
    {
        return function (string $attribute, mixed $value, Closure $fail) use ($bytes) {
            $decoded = is_string($value) ? base64_decode(strtr($value, '-_', '+/'), true) : false;

            if ($decoded === false || strlen($decoded) !== $bytes) {
                $fail("{$attribute} is invalid");
            }
        };
    }

    /** @return array<string, mixed> */
    private function subscriptionPayload(NotificationSubscription $subscription): array
    {
        return [
            'id' => $subscription->id,
            'user_id' => $subscription->user_id,
            'subscription_type' => $subscription->subscriptionTypeName(),
            'subscription_attributes' => $subscription->subscription_attributes,
            'identifier' => $subscription->identifier,
            'created_at' => $subscription->created_at?->toISOString(),
            'updated_at' => $subscription->updated_at?->toISOString(),
        ];
    }
}
