<?php

namespace App\Providers;

use App\Models\Channel\Api;
use App\Models\Contact;
use App\Models\Inbox;
use App\Models\User;
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
        // Polymorphic type lưu đúng tên lớp Ruby của Chatwoot ('Channel::Api',
        // 'User', 'Contact'…) để DB + payload API khớp bản gốc.
        Relation::morphMap([
            'Channel::Api' => Api::class,
            'User' => User::class,
            'Contact' => Contact::class,
            'Inbox' => Inbox::class,
        ]);
    }
}
