<?php

namespace App\Builders;

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\Notification;
use App\Models\NotificationSetting;
use App\Models\User;

// Port từ refs/chatwoot/app/builders/notification_builder.rb — cổng DUY NHẤT
// tạo Notification: mọi nhánh của NotificationListener đều đi qua đây.
class NotificationBuilder
{
    public function __construct(
        private readonly string $notificationType,
        private readonly User $user,
        private readonly Account $account,
        private readonly Conversation $primaryActor,
        private readonly ?Message $secondaryActor = null,
    ) {}

    public function perform(): ?Notification
    {
        // conversation_creation chỉ tạo khi người dùng có bật kênh nhận nào đó.
        if ($this->notificationType === 'conversation_creation' && ! $this->userSubscribed()) {
            return null;
        }

        // Hội thoại của liên hệ bị chặn: chỉ còn nhánh nhắc tên được thông báo.
        if ($this->primaryActor->contact?->blocked && $this->notificationType !== 'conversation_mention') {
            return null;
        }

        if (! $this->userCanAccessConversation()) {
            return null;
        }

        // secondary_actor mặc định là người đang thao tác (Current.user).
        $secondaryActor = $this->secondaryActor ?? auth()->user();

        return $this->user->notifications()->create([
            'notification_type' => Notification::typeValue($this->notificationType),
            'account_id' => $this->account->id,
            'primary_actor_type' => $this->primaryActor->getMorphClass(),
            'primary_actor_id' => $this->primaryActor->id,
            'secondary_actor_type' => $secondaryActor?->getMorphClass(),
            'secondary_actor_id' => $secondaryActor?->getKey(),
        ]);
    }

    private function userSubscribed(): bool
    {
        $setting = NotificationSetting::query()
            ->where('account_id', $this->account->id)
            ->where('user_id', $this->user->id)
            ->first();

        if ($setting === null) {
            return false;
        }

        foreach (NotificationSetting::DELIVERY_TYPES as $deliveryType) {
            if ($setting->hasFlag($deliveryType, $this->notificationType)) {
                return true;
            }
        }

        return false;
    }

    private function userCanAccessConversation(): bool
    {
        $accountUser = AccountUser::query()
            ->where('account_id', $this->account->id)
            ->where('user_id', $this->user->id)
            ->first();

        if ($accountUser === null) {
            return false;
        }

        return $this->primaryActor->isVisibleTo($this->user, $accountUser);
    }
}
