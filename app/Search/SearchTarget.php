<?php

namespace App\Search;

// Loại bản ghi một lượt tìm trả về.
enum SearchTarget: string
{
    case Conversations = 'conversations';
    case Messages = 'messages';
    case Contacts = 'contacts';
    case Files = 'files';

    // Tin và tệp: phạm vi (hộp thư, hội thoại, người gửi, mốc nhìn lại) đi theo tin.
    public function isMessageBound(): bool
    {
        return $this === self::Messages || $this === self::Files;
    }
}
