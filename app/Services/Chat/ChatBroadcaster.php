<?php

namespace App\Services\Chat;

use App\Events\RealtimeBroadcast;
use App\Models\Chat;
use App\Models\ChatMember;
use App\Models\User;
use Throwable;

// Nơi duy nhất phát sự kiện realtime của hội thoại giữa người dùng: tới kênh riêng
// (pubsub_token) của từng thành viên còn trong hội thoại.
class ChatBroadcaster
{
    public const MESSAGE_CREATED = 'chat.message.created';

    public const MESSAGE_UPDATED = 'chat.message.updated';

    public const CHAT_UPDATED = 'chat.updated';

    public const READ = 'chat.read';

    public const TYPING = 'chat.typing';

    /** @param array<string, mixed> $data */
    public function toMembers(Chat $chat, string $event, array $data, ?User $except = null): void
    {
        $tokens = User::query()
            ->whereIn('id', $chat->members()
                ->whereIn('status', [ChatMember::STATUS_ACTIVE, ChatMember::STATUS_PENDING])
                ->when($except, fn ($members) => $members->where('user_id', '!=', $except->getKey()))
                ->select('user_id'))
            ->pluck('pubsub_token')
            ->filter()
            ->values()
            ->all();

        if ($tokens !== []) {
            $this->dispatch(new RealtimeBroadcast($tokens, $event, ['chat_id' => $chat->id, ...$data]));
        }
    }

    /** @param array<string, mixed> $data */
    public function toUser(User $user, string $event, array $data): void
    {
        if (filled($user->pubsub_token)) {
            $this->dispatch(new RealtimeBroadcast([$user->pubsub_token], $event, $data));
        }
    }

    // Tin đã lưu thì việc gửi coi như xong: máy chủ realtime trục trặc chỉ ghi log,
    // người nhận vẫn thấy tin khi tải lại.
    private function dispatch(RealtimeBroadcast $event): void
    {
        try {
            broadcast($event);
        } catch (Throwable $exception) {
            report($exception);
        }
    }
}
