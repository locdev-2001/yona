<?php

namespace App\Channels;

/**
 * Kênh tự khai mình thuộc nền tảng nào (logo, tên thương hiệu). Tách khỏi
 * DeclaresCapabilities vì danh tính không phải năng lực. Lõi hỏi qua
 * `Inbox::platform()`, không map theo `channel_type`.
 */
interface DeclaresPlatform
{
    public function platform(): ChannelPlatform;
}
