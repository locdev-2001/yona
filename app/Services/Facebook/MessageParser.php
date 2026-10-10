<?php

namespace App\Services\Facebook;

use App\Services\Meta\MessagingPayload;

/** Payload Messenger của trang Facebook: thêm nhận diện echo của chính app Yona. */
class MessageParser extends MessagingPayload
{
    public function appId(): ?string
    {
        $appId = data_get($this->messaging, 'message.app_id');

        return $appId === null ? null : (string) $appId;
    }

    /** Echo của tin Yona vừa gửi qua Graph — bỏ, nếu không sẽ nhân đôi. */
    public function isSentFromOwnApp(): bool
    {
        return filled($this->appId()) && $this->appId() === (string) config('services.facebook.app_id');
    }
}
