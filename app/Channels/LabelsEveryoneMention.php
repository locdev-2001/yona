<?php

namespace App\Channels;

/**
 * Kênh có chữ riêng cho mục nhắc cả nhóm (Messenger: "@mọi người"). Kênh không khai
 * thì ô soạn dùng chữ mặc định `@All` như Zalo.
 */
interface LabelsEveryoneMention
{
    public function everyoneMentionLabel(): string;
}
