<?php

namespace App\Notifications\Concerns;

// Thư xác thực gửi qua hàng đợi để request đăng ký/quên mật khẩu không chờ SMTP.
// Worker không có ngôn ngữ của request nên chụp locale lúc tạo thư; chỉ xếp
// hàng sau commit để worker đọc được user vừa tạo.
trait QueuesAuthMail
{
    protected function queueForAuth(): void
    {
        $this->locale = app()->getLocale();
        $this->afterCommit();
        $this->onQueue('high');
    }
}
