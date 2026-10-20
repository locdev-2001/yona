<?php

namespace App\Services\Calls\Media\LiveKit;

use App\Services\Calls\Media\MediaModeration;
use App\Services\Calls\Media\MediaSource;

final readonly class LiveKitModeration implements MediaModeration
{
    public function __construct(private LiveKitRoomService $roomService) {}

    // LiveKit tắt theo track, nên tìm mọi track đang phát của nguồn đó rồi tắt từng cái.
    public function mute(string $room, string $identity, MediaSource $source): void
    {
        $grant = ['roomAdmin' => true, 'room' => $room];
        $participant = $this->roomService->call('GetParticipant', ['room' => $room, 'identity' => $identity], $grant);
        $sourceName = LiveKitSources::trackSourceName($source);

        foreach ($participant['tracks'] ?? [] as $track) {
            if (($track['source'] ?? null) !== $sourceName || ($track['muted'] ?? false)) {
                continue;
            }

            $this->roomService->call('MutePublishedTrack', [
                'room' => $room,
                'identity' => $identity,
                'trackSid' => $track['sid'],
                'muted' => true,
            ], $grant);
        }
    }

    public function remove(string $room, string $identity): void
    {
        $this->roomService->call('RemoveParticipant', ['room' => $room, 'identity' => $identity], ['roomAdmin' => true, 'room' => $room]);
    }
}
