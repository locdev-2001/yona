<?php

namespace App\Modules\Identity;

use App\Modules\Identity\Contracts\IdentityResolver;
use App\Modules\Identity\Resolve\IdentityResolveService;
use Illuminate\Support\ServiceProvider;

/**
 * Tầng định danh — nằm DƯỚI cả Chat lẫn CRM, không cạnh.
 *
 * Chat chỉ biết `Contracts\IdentityResolver`. Ràng buộc đó là thứ giữ cho Chat
 * không quay lại gọi thẳng `ContactService`.
 */
class IdentityModuleServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(IdentityResolver::class, IdentityResolveService::class);
    }
}
