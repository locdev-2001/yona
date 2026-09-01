<?php

namespace App\Providers;

use App\Models\Channel\Api;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // channel_type lưu đúng tên lớp Ruby của Chatwoot ('Channel::Api'…)
        // để DB + payload API khớp bản gốc; thêm kênh mới = thêm dòng map.
        Relation::morphMap([
            'Channel::Api' => Api::class,
        ]);
    }
}
