<?php

namespace App\Support;

use App\Models\Contact;

// Port từ `Current.contact` của refs/chatwoot (lib/current.rb), do
// WebsiteTokenHelper#set_contact gán. Model đọc nó để biết thay đổi đến từ
// KHÁCH chứ không phải agent (ví dụ nội dung activity "Conversation was
// resolved by <tên khách>").
final class CurrentContact
{
    private static ?Contact $contact = null;

    public static function get(): ?Contact
    {
        return self::$contact;
    }

    public static function reset(): void
    {
        self::$contact = null;
    }

    /**
     * @template T
     *
     * @param  callable(): T  $callback
     * @return T
     */
    public static function run(?Contact $contact, callable $callback): mixed
    {
        $previous = self::$contact;
        self::$contact = $contact;

        try {
            return $callback();
        } finally {
            self::$contact = $previous;
        }
    }
}
