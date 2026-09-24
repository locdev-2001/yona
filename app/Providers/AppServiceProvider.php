<?php

namespace App\Providers;

use App\Database\PostgresConnection;
use App\Finders\ConversationFinder;
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
use App\Search\SearchEngine;
use App\Services\Analytics\PlausibleProxy;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Database\Connection;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use InvalidArgumentException;
use Laravel\Horizon\Horizon;

class AppServiceProvider extends ServiceProvider
{
    // Đủ cho một văn phòng nhiều nhân viên chung một IP NAT (mỗi trang ~2 sự kiện).
    private const ANALYTICS_EVENTS_PER_MINUTE = 300;

    // Mỗi lần đăng nhập bằng OAuth tốn hai request (đi + về): đủ cho khoảng 15
    // người chung một IP văn phòng vào cùng phút, vẫn chặn việc bắn liên tục vào
    // lượt đổi mã lấy token.
    public const OAUTH_SIGN_IN_REQUESTS_PER_MINUTE = 30;

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

        $this->app->bind(SearchEngine::class, function ($app): SearchEngine {
            $driver = (string) config('search.driver');
            $engineClass = config("search.drivers.{$driver}")
                ?? throw new InvalidArgumentException("Engine tìm kiếm [{$driver}] chưa đăng ký trong config/search.php.");

            return $app->make($engineClass);
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->registerObservabilityGates();
        $this->registerRateLimiters();
        $this->refreshConversationTabCountsOnChange();

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

    private function refreshConversationTabCountsOnChange(): void
    {
        $forget = fn (Conversation $conversation) => ConversationFinder::forgetTabCounts($conversation->account_id);

        Conversation::saved($forget);
        Conversation::deleted($forget);
    }

    private function registerRateLimiters(): void
    {
        // Băm theo IP khách đã giải qua header CDN: IP kết nối có thể là IP edge
        // của Cloudflare, gộp nhiều khách vào chung một hạn mức.
        RateLimiter::for(
            'analytics-proxy',
            fn (Request $request) => Limit::perMinute(self::ANALYTICS_EVENTS_PER_MINUTE)
                ->by(app(PlausibleProxy::class)->clientIp($request)),
        );

        RateLimiter::for(
            'oauth-sign-in',
            fn (Request $request) => Limit::perMinute(self::OAUTH_SIGN_IN_REQUESTS_PER_MINUTE)->by($request->ip()),
        );
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
        //
        // Phải kiểm tra lớp có thật: deploy chạy `artisan down` TRƯỚC
        // `composer install`, nên ở lần deploy đầu sau khi thêm gói (và ở mọi
        // lần rollback về commit chưa có nó) vendor chưa có Horizon. Gọi thẳng
        // là mọi lệnh artisan chết theo, kể cả lệnh đang dựng lại vendor.
        if (class_exists(Horizon::class)) {
            Horizon::auth(fn () => Auth::guard('super_admin')->check());
        }

        // Xoá file log từ giao diện web: không. Log là thứ duy nhất dựng lại
        // được chuyện gì đã xảy ra với tin nhắn khách khi có sự cố.
        Gate::define('deleteLogFile', fn (?Authenticatable $user = null) => false);
        Gate::define('deleteLogFolder', fn (?Authenticatable $user = null) => false);
    }
}
