<?php

namespace App\Agent\Contracts\Ports;

use App\Agent\ValueObjects\ConversationRef;
use App\Agent\ValueObjects\CustomerProfile;

interface CustomerProfileReader
{
    // Hồ sơ khách của đúng hội thoại này; null khi hội thoại không tồn tại trong account.
    public function profile(ConversationRef $conversation): ?CustomerProfile;
}
