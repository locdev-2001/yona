<?php

use App\Services\Calls\Media\LiveKit\LiveKitDriver;
use App\Services\Groups\Calls\GroupRoomPolicy;
use App\Services\Groups\Calls\GroupRoomPresence;
use App\Services\Groups\Calls\GroupRoomTrail;

// Cuộc gọi thoại/video. Lõi App\Services\Calls chỉ biết contract.
//   - `provider`/`drivers`: nhà cung cấp phòng media, chọn bằng MEDIA_PROVIDER; webhook của
//     nhà cung cấp vào POST /webhooks/media/{tên trong drivers}.
//   - `kinds`: mỗi loại cuộc gọi (`calls.kind`) do một module sở hữu, khai chính sách
//     (CallPolicy), dấu vết (CallTrail, tuỳ chọn) và bên nghe thay đổi trong phòng
//     (CallPresenceObserver, tuỳ chọn). Thêm loại = thêm một mục ở đây.
return [
    'provider' => env('MEDIA_PROVIDER', 'livekit'),

    'drivers' => [
        'livekit' => LiveKitDriver::class,
    ],

    'kinds' => [
        GroupRoomPolicy::KIND => [
            'policy' => GroupRoomPolicy::class,
            'trail' => GroupRoomTrail::class,
            'presence' => GroupRoomPresence::class,
        ],
    ],
];
