<?php

namespace App\Services\Calls\Media\LiveKit;

use App\Services\Calls\Media\MediaSource;

// Tên nguồn phát phía LiveKit: trong grant của vé, và trong TrackInfo.source (protojson).
final class LiveKitSources
{
    public static function grantName(MediaSource $source): string
    {
        return match ($source) {
            MediaSource::Microphone => 'microphone',
            MediaSource::Camera => 'camera',
            MediaSource::Screen => 'screen_share',
            MediaSource::ScreenAudio => 'screen_share_audio',
        };
    }

    public static function trackSourceName(MediaSource $source): string
    {
        return strtoupper(self::grantName($source));
    }

    public static function fromTrackSource(?string $trackSource): ?MediaSource
    {
        foreach (MediaSource::cases() as $source) {
            if (self::trackSourceName($source) === $trackSource) {
                return $source;
            }
        }

        return null;
    }
}
