<?php

namespace App\Services\Calls;

enum CallStatus: string
{
    case Ringing = 'ringing';
    case Active = 'active';
    case Ended = 'ended';
    case Missed = 'missed';
    case Declined = 'declined';
    case Cancelled = 'cancelled';
}
