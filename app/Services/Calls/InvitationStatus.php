<?php

namespace App\Services\Calls;

enum InvitationStatus: string
{
    case Ringing = 'ringing';
    case Accepted = 'accepted';
    case Declined = 'declined';
    case Missed = 'missed';
}
