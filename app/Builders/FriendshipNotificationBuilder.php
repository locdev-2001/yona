<?php

namespace App\Builders;

use App\Models\Friendship;
use App\Models\Notification;
use App\Models\User;
use App\Services\Users\PersonalAccounts;

// Thông báo về lời mời kết bạn, rơi vào hộp thư cá nhân của người nhận. Người còn
// lại của lời mời đi kèm làm secondary_actor để thẻ thông báo hiện tên và ảnh.
class FriendshipNotificationBuilder
{
    public function __construct(
        private readonly string $notificationType,
        private readonly User $recipient,
        private readonly Friendship $friendship,
    ) {}

    public function perform(): Notification
    {
        $otherUserId = $this->friendship->otherUserId($this->recipient);

        return $this->recipient->notifications()->create([
            'notification_type' => Notification::typeValue($this->notificationType),
            'account_id' => app(PersonalAccounts::class)->ensureFor($this->recipient)->id,
            'primary_actor_type' => $this->friendship->getMorphClass(),
            'primary_actor_id' => $this->friendship->id,
            'secondary_actor_type' => (new User)->getMorphClass(),
            'secondary_actor_id' => $otherUserId,
        ]);
    }
}
