<?php

namespace App\Agent\Contracts\Ports;

use App\Agent\ValueObjects\ConversationRef;
use App\Agent\ValueObjects\CustomerDetails;
use App\Agent\ValueObjects\ProfileUpdate;

interface CustomerProfileWriter
{
    /**
     * Ghi lời khai của khách vào hồ sơ của đúng hội thoại này: chỉ trường còn trống và
     * thuộc tính shop đã định nghĩa; không ghi đè, không bao giờ gộp hồ sơ. null khi hội
     * thoại không tồn tại trong account.
     */
    public function save(ConversationRef $conversation, CustomerDetails $details): ?ProfileUpdate;
}
