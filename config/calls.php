<?php

use App\Services\Calls\Media\LiveKit\LiveKitDriver;
use App\Services\Groups\Calls\GroupRoomPolicy;

// Cuộc gọi thoại/video. Lõi App\Services\Calls chỉ biết contract.
//   - `provider`/`drivers`: nhà cung cấp phòng media, chọn bằng MEDIA_PROVIDER; webhook của
//     nhà cung cấp vào POST /webhooks/media/{tên trong drivers}.
//   - `kinds`: mỗi loại cuộc gọi (`calls.kind`) do một module sở hữu, khai chính sách
//     (CallPolicy) và dấu vết (CallTrail, tuỳ chọn). Thêm loại = thêm một dòng ở đây.
return [
    'provider' => env('MEDIA_PROVIDER', 'livekit'),

    'drivers' => [
        'livekit' => LiveKitDriver::class,
    ],

    'kinds' => [
        GroupRoomPolicy::KIND => ['policy' => GroupRoomPolicy::class, 'trail' => null],
    ],
];
