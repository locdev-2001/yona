<?php

namespace App\Agent\Kernel;

use Illuminate\Support\ServiceProvider;

// Composition root của nhân viên AI: nơi duy nhất gắn hiện thực vào Port
// (App\Agent\Contracts) và đăng ký công cụ, lệnh agent:*. Lõi chỉ biết lớp này qua
// đúng một dòng trong bootstrap/providers.php; không lớp nào khác dùng Kernel.
final class AgentServiceProvider extends ServiceProvider
{
    public function register(): void {}

    public function boot(): void {}
}
