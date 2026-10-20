<?php

namespace App\Services\Calls\Media;

enum RoomEventType
{
    case RoomStarted;
    case RoomFinished;
    case ParticipantJoined;
    case ParticipantLeft;
    case TrackPublished;
    case TrackUnpublished;
}
