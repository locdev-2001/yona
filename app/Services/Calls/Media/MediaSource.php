<?php

namespace App\Services\Calls\Media;

// Nguồn phát của một người trong phòng. Thoại, video, chia sẻ màn hình đều chỉ là quyền
// phát nguồn nào (ParticipantPermissions), không phải hệ thống riêng.
enum MediaSource: string
{
    case Microphone = 'microphone';
    case Camera = 'camera';
    case Screen = 'screen';
    case ScreenAudio = 'screen_audio';
}
