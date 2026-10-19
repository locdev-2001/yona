<?php

namespace App\Notifications;

use App\Models\Chat;
use App\Models\ChatMessage;
use App\Models\User;
use App\Notifications\Channels\WebPushChannel;
use App\Services\Branding\BrandAssets;
use App\Services\Chat\ChatPresenter;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Str;

// Thông báo đẩy khi có tin mới trong hội thoại giữa người dùng.
class ChatMessageNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly Chat $chat,
        public readonly User $sender,
        public readonly ChatMessage $message,
    ) {}

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        return $notifiable instanceof User && $notifiable->browserPushSubscriptions()->exists() ? [WebPushChannel::class] : [];
    }

    /** @return array{title: string, body: string, tag: string, url: string, icon: string} */
    public function toWebPush(object $notifiable): array
    {
        return [
            'title' => $this->chat->isGroup()
                ? $this->sender->availableName().' · '.$this->chat->title
                : $this->sender->availableName(),
            'body' => Str::limit(app(ChatPresenter::class)->preview($this->message), 120),
            'tag' => 'chat-'.$this->chat->id,
            'url' => route('chat.show', $this->chat),
            'icon' => url(app(BrandAssets::class)->logoThumbnail()),
        ];
    }
}
