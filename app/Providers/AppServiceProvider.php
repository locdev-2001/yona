<?php

namespace App\Providers;

use App\Database\PostgresConnection;
use App\Models\Account;
use App\Models\AgentBot;
use App\Models\Channel\Api;
use App\Models\Channel\Email;
use App\Models\Channel\FacebookPage;
use App\Models\Channel\Instagram;
use App\Models\Channel\Line;
use App\Models\Channel\Sms;
use App\Models\Channel\Telegram;
use App\Models\Channel\Tiktok;
use App\Models\Channel\TwilioSms;
use App\Models\Channel\TwitterProfile;
use App\Models\Channel\WebWidget;
use App\Models\Channel\Whatsapp;
use App\Models\Channel\Zalo;
use App\Models\Contact;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use App\Models\PlatformApp;
use App\Models\User;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Database\Connection;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Laravel\Horizon\Horizon;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Mọi model + query builder ghi datetime kèm micro-giây như Rails
        // (một điểm duy nhất thay vì $dateFormat trên từng model).
        Connection::resolverFor(
            'pgsql',
            fn ($pdo, string $database, string $prefix, array $config) => new PostgresConnection($pdo, $database, $prefix, $config),
        );
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->registerObservabilityGates();

        // Polymorphic type lưu đúng tên lớp Ruby của Chatwoot ('Channel::Api',
        // 'User', 'Contact'…) để DB + payload API khớp bản gốc.
        Relation::morphMap([
            'Channel::Api' => Api::class,
            'Channel::WebWidget' => WebWidget::class,
            'Channel::Email' => Email::class,
            'Channel::FacebookPage' => FacebookPage::class,
            'Channel::Instagram' => Instagram::class,
            'Channel::Telegram' => Telegram::class,
            'Channel::Line' => Line::class,
            'Channel::Sms' => Sms::class,
            'Channel::TwilioSms' => TwilioSms::class,
            'Channel::Whatsapp' => Whatsapp::class,
            'Channel::Tiktok' => Tiktok::class,
            'Channel::TwitterProfile' => TwitterProfile::class,
            'Channel::Zalo' => Zalo::class,
            'User' => User::class,
            'Contact' => Contact::class,
            'Inbox' => Inbox::class,
            'Message' => Message::class,
            'Conversation' => Conversation::class,
            'AgentBot' => AgentBot::class,
            'Account' => Account::class,
            'PlatformApp' => PlatformApp::class,
        ]);
    }

    /**
     * Ba dashboard vận hành (/horizon, /pulse, /log-viewer) đã nằm sau
     * middleware `auth:super_admin`. Gate riêng của từng gói lại đọc user ở
     * guard mặc định — guard đó luôn null với phiên super admin — nên phải khai
     * lại cho khớp, nếu không super admin qua được middleware vẫn bị gate chặn.
     */
    private function registerObservabilityGates(): void
    {
        $isSuperAdmin = fn (?Authenticatable $user = null) => Auth::guard('super_admin')->check();

        foreach (['viewPulse', 'viewLogViewer'] as $ability) {
            Gate::define($ability, $isSuperAdmin);
        }

        // Horizon không đi qua Gate mà qua callback riêng; mặc định của nó là
        // `environment('local')`, tức production 403 cho cả super admin.
        Horizon::auth(fn () => Auth::guard('super_admin')->check());

        // Xoá file log từ giao diện web: không. Log là thứ duy nhất dựng lại
        // được chuyện gì đã xảy ra với tin nhắn khách khi có sự cố.
        Gate::define('deleteLogFile', fn (?Authenticatable $user = null) => false);
        Gate::define('deleteLogFolder', fn (?Authenticatable $user = null) => false);
    }
}
