<?php

use App\Services\Calls\Media\LiveKit\LiveKitDriver;
use App\Services\Groups\Calls\GroupCallPolicy;
use App\Services\Groups\Calls\GroupCallPresence;
use App\Services\Groups\Calls\GroupCallTrail;
use App\Services\Groups\Calls\GroupRoomPolicy;
use App\Services\Groups\Calls\GroupRoomPresence;
use App\Services\Groups\Calls\GroupRoomTrail;
use App\Services\Yona\Calls\DirectCallPolicy;
use App\Services\Yona\Calls\DirectCallPresence;
use App\Services\Yona\Calls\DirectCallTrail;

// Cuộc gọi thoại/video. Lõi App\Services\Calls chỉ biết contract.
//   - `provider`/`drivers`: nhà cung cấp phòng media, chọn bằng MEDIA_PROVIDER; webhook của
//     nhà cung cấp vào POST /webhooks/media/{tên trong drivers}.
//   - `kinds`: mỗi loại cuộc gọi (`calls.kind`) do một module sở hữu, khai chính sách
//     (CallPolicy), dấu vết (CallTrail, tuỳ chọn) và bên nghe thay đổi trong phòng
//     (CallPresenceObserver, tuỳ chọn). Thêm loại = thêm một mục ở đây.
return [
    'provider' => env('MEDIA_PROVIDER', 'livekit'),

    // Chuông đổ bao lâu thì thành cuộc gọi nhỡ, chung mọi loại có đổ chuông (1-1, gọi nhóm).
    'ring_seconds' => 45,

    'drivers' => [
        'livekit' => LiveKitDriver::class,
    ],

    'kinds' => [
        GroupRoomPolicy::KIND => [
            'policy' => GroupRoomPolicy::class,
            'trail' => GroupRoomTrail::class,
            'presence' => GroupRoomPresence::class,
        ],
        GroupCallPolicy::KIND => [
            'policy' => GroupCallPolicy::class,
            'trail' => GroupCallTrail::class,
            'presence' => GroupCallPresence::class,
        ],
        DirectCallPolicy::KIND => [
            'policy' => DirectCallPolicy::class,
            'trail' => DirectCallTrail::class,
            'presence' => DirectCallPresence::class,
        ],
    ],
];
