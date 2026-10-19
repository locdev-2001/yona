<?php

namespace App\Services\Chat;

use App\Exceptions\Chat\ChatActionRefused;
use App\Models\Chat;
use App\Models\ChatMember;
use App\Models\User;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;

// Hội thoại 1-1: mỗi cặp người dùng có đúng một hội thoại (khoá direct_key).
// Người mở là thành viên chính thức; người nhận vào hộp tin chờ cho tới khi trả lời
// hoặc chấp nhận.
class DirectChats
{
    public function __construct(private readonly UserBlocks $blocks) {}

    /** @throws ChatActionRefused */
    public function open(User $opener, User $recipient): Chat
    {
        if ($opener->is($recipient)) {
            throw ChatActionRefused::cannotMessageSelf();
        }

        if ($this->blocks->isBlockedBetween($opener, $recipient)) {
            throw ChatActionRefused::blocked();
        }

        $key = Chat::directKey($opener->getKey(), $recipient->getKey());

        $chat = Chat::query()->where('direct_key', $key)->first() ?? $this->create($key, $opener, $recipient);
        $this->restoreHidden($chat, $opener);

        return $chat;
    }

    // Người đã xoá hội thoại 1-1 khỏi danh sách: mở lại, hoặc được nhắn tới, thì nó hiện lại.
    public function restoreHidden(Chat $chat, User $user): void
    {
        $chat->members()
            ->where('user_id', $user->getKey())
            ->where('status', ChatMember::STATUS_LEFT)
            ->update(['status' => ChatMember::STATUS_ACTIVE]);
        $chat->unsetRelation('members');
    }

    public function counterpart(Chat $chat, User $viewer): ?User
    {
        return $chat->members->firstWhere('user_id', '!=', $viewer->getKey())?->user;
    }

    private function create(string $key, User $opener, User $recipient): Chat
    {
        try {
            return DB::transaction(function () use ($key, $opener, $recipient) {
                $chat = Chat::query()->create([
                    'kind' => Chat::KIND_DIRECT,
                    'direct_key' => $key,
                    'created_by' => $opener->getKey(),
                    'member_count' => 2,
                    'last_activity_at' => now(),
                ]);

                $chat->members()->createMany([
                    ['user_id' => $opener->getKey(), 'status' => ChatMember::STATUS_ACTIVE, 'joined_at' => now()],
                    ['user_id' => $recipient->getKey(), 'status' => ChatMember::STATUS_PENDING, 'joined_at' => now(), 'invited_by' => $opener->getKey()],
                ]);

                return $chat->refresh();
            });
        } catch (UniqueConstraintViolationException) {
            // Hai bên mở cùng lúc: bên thua lấy hội thoại bên kia vừa tạo.
            return Chat::query()->where('direct_key', $key)->firstOrFail();
        }
    }
}
