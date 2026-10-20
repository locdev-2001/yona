<?php

namespace App\Services\Yona\Calls;

use App\Jobs\ActionCableBroadcastJob;
use App\Jobs\Calls\PushIncomingDirectCallJob;
use App\Models\Call;
use App\Models\User;
use App\Services\Branding\BrandAssets;
use App\Services\Calls\CallStatus;
use App\Services\Notification\PushDeliveryResult;
use App\Services\Notification\WebPushGateway;
use App\Services\Users\PersonalAccounts;
use App\Services\Yona\YonaRelay;

// Báo trạng thái cuộc gọi 1-1 tới cả hai người: sự kiện realtime `direct_call.updated` vào mọi
// tab của từng người (mỗi người nhìn từ phía mình: vai, người kia, hội thoại trong hộp thư mình).
// Lúc đổ chuông thì thêm Web Push cho người nhận, để tab ẩn hay đã đóng vẫn biết có người gọi.
final readonly class DirectCallSignals
{
    public const EVENT = 'direct_call.updated';

    public function __construct(
        private PersonalAccounts $accounts,
        private YonaRelay $relay,
        private WebPushGateway $push,
        private BrandAssets $brand,
    ) {}

    public function publish(Call $call): void
    {
        $caller = User::query()->find($call->caller_id);
        $callee = User::query()->find($call->callee_id);

        if ($caller === null || $callee === null) {
            return;
        }

        ActionCableBroadcastJob::dispatch([$caller->pubsub_token], self::EVENT, $this->viewFor($call, $caller, $callee));
        ActionCableBroadcastJob::dispatch([$callee->pubsub_token], self::EVENT, $this->viewFor($call, $callee, $caller));

        if ($call->status === CallStatus::Ringing) {
            PushIncomingDirectCallJob::dispatch($call->id);
        }
    }

    // Cuộc gọi nhìn từ phía `$viewer`: cùng hình với payload realtime và API.
    /** @return array<string, mixed> */
    public function viewFor(Call $call, User $viewer, User $peer): array
    {
        $account = $this->accounts->ensureFor($viewer);
        $conversation = $this->relay->openWith($account, $peer);

        return [
            'account_id' => $account->id,
            'call' => [
                'id' => $call->id,
                'status' => $call->status->value,
                'media' => $call->media->value,
                'role' => $viewer->id === $call->caller_id ? 'caller' : 'callee',
                'ringing_since' => $call->created_at?->toIso8601String(),
                'answered_at' => $call->answered_at?->toIso8601String(),
                'conversation_id' => $conversation->display_id,
                // `contact_id`: liên hệ của người kia trong hộp thư người xem, để ảnh đại diện trùng khung chat.
                'peer' => ['id' => $peer->id, 'contact_id' => $conversation->contact_id, 'name' => $peer->availableName(), 'avatar_url' => $peer->avatarUrl() ?: null],
            ],
        ];
    }

    // Chạy trong PushIncomingDirectCallJob: gọi ra máy chủ push của trình duyệt không chặn yêu cầu bấm gọi.
    public function ringByPush(Call $call): void
    {
        $caller = User::query()->find($call->caller_id);
        $callee = User::query()->find($call->callee_id);

        if ($caller === null || $callee === null || $call->status !== CallStatus::Ringing) {
            return;
        }

        $calleeView = $this->viewFor($call, $callee, $caller);
        $subscriptions = $callee->browserPushSubscriptions()->get();

        if ($subscriptions->isEmpty() || ! $this->push->isAvailable()) {
            return;
        }

        $url = route('inbox_conversation', ['account' => $calleeView['account_id'], 'conversationId' => $calleeView['call']['conversation_id']]);
        $locale = $this->accounts->ensureFor($callee)->locale ?? config('app.locale');
        $payload = [
            'title' => $caller->availableName(),
            'body' => __($call->media->value === 'video' ? 'calls.DIRECT.INCOMING_VIDEO' : 'calls.DIRECT.INCOMING_VOICE', [], $locale),
            'tag' => 'call_'.$call->id,
            'url' => $url,
            'icon' => url($this->brand->logoThumbnail()),
        ];

        foreach ($subscriptions as $subscription) {
            if ($this->push->send($subscription, $payload, $url) === PushDeliveryResult::SubscriptionGone) {
                $subscription->delete();
            }
        }
    }
}
