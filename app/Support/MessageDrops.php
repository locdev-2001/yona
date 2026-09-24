<?php

namespace App\Support;

use App\Models\Contact;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use App\Models\User;

/**
 * Bộ biến mà
 * nội dung tin nhắn `outgoing`/`template` được phép tham chiếu.
 *
 * Chưa có nguồn dữ liệu nên bỏ: `inbox.avatar_url`, `inbox.email` (kênh email —
 * F1) và `conversation.recent_messages` (cần bộ render nội dung của Captain).
 */
final class MessageDrops
{
    /** @return array<string, mixed> */
    public static function forMessage(Message $message): array
    {
        $conversation = $message->conversation;
        $sender = $message->sender;

        return [
            'contact' => self::contact($conversation?->contact),
            'agent' => self::user($sender instanceof User ? $sender : $conversation?->assignee),
            'conversation' => self::conversation($conversation),
            'inbox' => self::inbox($message->inbox ?? $conversation?->inbox),
            'account' => [
                'id' => $conversation?->account_id,
                'name' => $conversation?->account?->name,
            ],
        ];
    }

    /** @return array<string, mixed> */
    private static function contact(?Contact $contact): array
    {
        return [
            'id' => $contact?->id,
            'name' => self::capitalizeWords($contact?->name),
            'first_name' => self::namePart($contact?->name, first: true),
            'last_name' => self::namePart($contact?->name, first: false),
            'email' => $contact?->email,
            'phone_number' => $contact?->phone_number,
            'custom_attribute' => $contact?->custom_attributes ?? [],
        ];
    }

    /** @return array<string, mixed> */
    private static function user(?User $user): array
    {
        return [
            'id' => $user?->id,
            'name' => self::capitalizeWords($user?->name),
            'available_name' => $user?->availableName(),
            'email' => $user?->email,
            'first_name' => self::namePart($user?->name, first: true),
            'last_name' => self::namePart($user?->name, first: false),
        ];
    }

    /** @return array<string, mixed> */
    private static function conversation(?Conversation $conversation): array
    {
        return [
            'id' => $conversation?->display_id,
            'display_id' => $conversation?->display_id,
            // ConversationDrop#contact_name: rơi về 'Customer' khi khách chưa có tên.
            'contact_name' => self::capitalizeFirst($conversation?->contact?->name) ?? 'Customer',
            'custom_attribute' => $conversation?->custom_attributes ?? [],
        ];
    }

    /** @return array<string, mixed> */
    private static function inbox(?Inbox $inbox): array
    {
        return [
            'id' => $inbox?->id,
            'name' => $inbox?->name,
            'business_name' => $inbox?->business_name,
        ];
    }

    private static function capitalizeWords(?string $name): ?string
    {
        if (blank($name)) {
            return null;
        }

        return collect(preg_split('/\s+/', trim($name)))
            ->map(fn (string $word) => self::capitalizeFirst($word))
            ->implode(' ');
    }

    private static function namePart(?string $name, bool $first): ?string
    {
        if (blank($name)) {
            return null;
        }

        $words = preg_split('/\s+/', trim($name));

        // UserDrop/ContactDrop#last_name chỉ trả về khi tên có từ 2 từ trở lên.
        if (! $first && count($words) < 2) {
            return null;
        }

        return self::capitalizeFirst($first ? reset($words) : end($words));
    }

    // Ruby String#capitalize: viết hoa chữ đầu, phần còn lại viết thường.
    private static function capitalizeFirst(?string $value): ?string
    {
        return blank($value)
            ? null
            : mb_strtoupper(mb_substr($value, 0, 1)).mb_strtolower(mb_substr($value, 1));
    }
}
