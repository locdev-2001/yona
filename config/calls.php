<?php

use App\Services\Calls\Media\LiveKit\LiveKitDriver;

// Cuộc gọi thoại/video. Lõi App\Services\Calls chỉ biết contract media; nhà cung cấp
// chọn bằng MEDIA_PROVIDER, mỗi nhà cung cấp là một driver đăng ký ở `drivers`. Webhook
// của nhà cung cấp vào POST /webhooks/media/{tên trong drivers}.
return [
    'provider' => env('MEDIA_PROVIDER', 'livekit'),

    'drivers' => [
        'livekit' => LiveKitDriver::class,
    ],
];
