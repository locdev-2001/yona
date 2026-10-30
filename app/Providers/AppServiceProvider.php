<?php

namespace App\Providers;

use App\Database\PostgresConnection;
use App\Finders\ConversationFinder;
use App\Http\RateLimiting\MessagingRateLimiters;
use App\Listeners\Alerts\AlertOnJobFailure;
use App\Listeners\Alerts\AlertOnLongWaitDetected;
use App\Livewire\Pulse\SearchOutboxCard;
use App\Messaging\Delivery\DeliveryPlanner;
use App\Messaging\Structured\StructuredTypeRegistry;
use App\Models\Account;
use App\Models\AgentBot;
use App\Models\Channel\Api;
use App\Models\Channel\Email;
use App\Models\Channel\FacebookPage;
use App\Models\Channel\Instagram;
use App\Models\Channel\Line;
use App\Models\Channel\MessengerPersonal;
use App\Models\Channel\Sms;
use App\Models\Channel\Telegram;
use App\Models\Channel\Tiktok;
use App\Models\Channel\TwilioSms;
use App\Models\Channel\TwitterProfile;
use App\Models\Channel\WebWidget;
use App\Models\Channel\Whatsapp;
use App\Models\Channel\Yona;
use App\Models\Channel\Zalo;
use App\Models\Contact;
use App\Models\Conversation;
use App\Models\Friendship;
use App\Models\Inbox;
use App\Models\Message;
use App\Models\PlatformApp;
use App\Models\User;
use App\Models\YonaGroup;
use App\Search\SearchEngine;
use App\Services\Analytics\PlausibleProxy;
use App\Services\Calls\Media\MediaDrivers;
use App\Services\Calls\Media\MediaModeration;
use App\Services\Calls\Media\MediaRooms;
use App\Services\Calls\Media\MediaTickets;
use App\Services\Email\MailServerProbe;
use App\Services\Email\SocketMailServerProbe;
use App\Services\Email\Verification\MailDomainResolver;
use App\Services\Email\Verification\TimeLimitedMailDomainResolver;
use App\Services\Stickers\StickerLibraryManager;
use App\Support\MessengerBridgeLog;
use App\Support\Queue\SlowJobBreakdown;
use App\Support\SharedModels;
use App\Support\SystemAccess;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Contracts\Validation\Factory as ValidationFactory;
use Illuminate\Database\Connection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Foundation\Http\Events\RequestHandled;
use Illuminate\Http\Request;
use Illuminate\Queue\Events\JobFailed;
use Illuminate\Queue\Events\JobProcessed;
use Illuminate\Queue\Events\JobProcessing;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use InvalidArgumentException;
use Laravel\Horizon\Events\LongWaitDetected;
use Laravel\Horizon\Horizon;
use Laravel\Pulse\Facades\Pulse;
use Livewire\Livewire;
use Opcodes\LogViewer\Facades\LogViewer;

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

        $this->app->singleton(StructuredTypeRegistry::class, fn ($app) => new StructuredTypeRegistry(
            array_map(fn (string $type) => $app->make($type), config('messaging.structured_types')),
            $app->make(ValidationFactory::class),
        ));

        $this->app->singleton(DeliveryPlanner::class, fn ($app) => new DeliveryPlanner(
            $app->make(StructuredTypeRegistry::class),
            collect(config('messaging.delivery_renderers'))->map(fn (string $renderer) => $app->make($renderer))->all(),
        ));

        $this->app->bind(MailServerProbe::class, SocketMailServerProbe::class);
        $this->app->bind(MailDomainResolver::class, TimeLimitedMailDomainResolver::class);
        $this->app->scoped(SharedModels::class);

        $this->app->bind(SearchEngine::class, function ($app): SearchEngine {
            $driver = (string) config('search.driver');
            $engineClass = config("search.drivers.{$driver}")
                ?? throw new InvalidArgumentException("Engine tìm kiếm [{$driver}] chưa đăng ký trong config/search.php.");

            return $app->make($engineClass);
        });

        // Lõi cuộc gọi nhận từng vai media của nhà cung cấp đang chọn (config/calls.php).
        $this->app->bind(MediaRooms::class, fn ($app) => $app->make(MediaDrivers::class)->default()->rooms());
        $this->app->bind(MediaTickets::class, fn ($app) => $app->make(MediaDrivers::class)->default()->tickets());
        $this->app->bind(MediaModeration::class, fn ($app) => $app->make(MediaDrivers::class)->default()->moderation());
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->registerObservabilityGates();
        Livewire::component('pulse.search-outbox', SearchOutboxCard::class);
        $this->describePulseUsers();
        $this->registerRateLimiters();
        $this->refreshConversationTabCountsOnChange();
        $this->scopeSharedModels();
        $this->registerOpsAlerts();
        // Polymorphic type lưu đúng tên lớp Ruby ('Channel::Api',
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
            'Channel::Yona' => Yona::class,
            'Channel::MessengerPersonal' => MessengerPersonal::class,
            'User' => User::class,
            'Contact' => Contact::class,
            'Inbox' => Inbox::class,
            'Message' => Message::class,
            'Conversation' => Conversation::class,
            'Friendship' => Friendship::class,
            'AgentBot' => AgentBot::class,
            'Account' => Account::class,
            'PlatformApp' => PlatformApp::class,
            'YonaGroup' => YonaGroup::class,
        ]);
    }

    private function registerOpsAlerts(): void
    {
        Event::listen(JobFailed::class, AlertOnJobFailure::class);
        Event::listen(LongWaitDetected::class, AlertOnLongWaitDetected::class);
        SlowJobBreakdown::register($this->app['events']);
    }

    private function scopeSharedModels(): void
    {
        $flush = function (): void {
            if ($this->app->resolved(SharedModels::class)) {
                $this->app->make(SharedModels::class)->flush();
            }
        };

        Event::listen([RequestHandled::class, JobProcessing::class, JobProcessed::class], $flush);

        $forget = function (Model $model): void {
            if ($this->app->resolved(SharedModels::class)) {
                $this->app->make(SharedModels::class)->forgetUnless($model);
            }
        };

        foreach ([Account::class, Contact::class, User::class] as $model) {
            $model::saved($forget);
            $model::deleted($forget);
        }
    }

    private function refreshConversationTabCountsOnChange(): void
    {
        $forget = fn (Conversation $conversation) => ConversationFinder::forgetTabCounts($conversation->account_id);

        Conversation::saved($forget);
        Conversation::deleted($forget);
    }

    private function registerRateLimiters(): void
    {
        MessagingRateLimiters::register();

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

        // Khoá theo kho: kho riêng theo account, kho nền tảng theo người quản trị:
        // một bên không làm nghẽn hàng đợi render của cả hệ thống. Chỉ lượt đẩy
        // job render tính hạn mức: sửa sticker không kèm `edit` thì không tính.
        RateLimiter::for('sticker-uploads', fn (Request $request) => $request->isMethod('PATCH') && ! $request->has('edit') ? Limit::none() : Limit::perMinute(StickerLibraryManager::UPLOADS_PER_MINUTE)
            ->by(match (true) {
                $request->route('account') !== null => 'account:'.$request->route('account'),
                $request->user('super_admin') !== null => 'super-admin:'.$request->user('super_admin')->getAuthIdentifier(),
                default => 'user:'.$request->user()?->getAuthIdentifier(),
            })
            ->response(fn (Request $request, array $headers) => response()->json([
                'message' => __('errors.sticker_library.upload_throttled'),
                'retry_after' => (int) ($headers['Retry-After'] ?? 60),
            ], 429, $headers)));
    }

    /**
     * Ba dashboard vận hành (/horizon, /pulse, /logs) đã nằm sau middleware
     * EnsureOperationsDashboardAccess (khai trong config của từng gói). Gate
     * riêng của từng gói gọi đúng điều kiện của middleware đó —
     * SystemAccess::canOpenOperationsDashboards() — không tự viết lại, nên
     * đổi ai được vào chỉ cần sửa một chỗ.
     */
    private function registerObservabilityGates(): void
    {
        $canOpen = fn (?Authenticatable $user = null): bool => SystemAccess::canOpenOperationsDashboards();

        foreach (['viewPulse', 'viewLogViewer'] as $ability) {
            Gate::define($ability, $canOpen);
        }

        // Horizon không đi qua Gate mà qua callback riêng; mặc định của nó là
        // `environment('local')`, tức production 403 cho mọi người.
        //
        // Phải kiểm tra lớp có thật: deploy chạy `artisan down` TRƯỚC
        // `composer install`, nên ở lần deploy đầu sau khi thêm gói (và ở mọi
        // lần rollback về commit chưa có nó) vendor chưa có Horizon. Gọi thẳng
        // là mọi lệnh artisan chết theo, kể cả lệnh đang dựng lại vendor.
        if (class_exists(Horizon::class)) {
            Horizon::auth(fn () => $canOpen());
        }

        LogViewer::extend(MessengerBridgeLog::TYPE, MessengerBridgeLog::class);

        // Xoá file log từ giao diện web: không. Log là thứ duy nhất dựng lại
        // được chuyện gì đã xảy ra với tin nhắn khách khi có sự cố.
        Gate::define('deleteLogFile', fn (?Authenticatable $user = null) => false);
        Gate::define('deleteLogFolder', fn (?Authenticatable $user = null) => false);
    }

    /**
     * Thẻ người dùng của Pulse đọc `$user->avatar` như URL ảnh, còn ở Yona đó là
     * quan hệ tới tệp đính kèm: model lọt vào HTML và vào cache của thẻ, lần đọc
     * lại từ Redis thành đối tượng hỏng và /pulse trả 500.
     */
    private function describePulseUsers(): void
    {
        if (! class_exists(Pulse::class)) {
            return;
        }

        Pulse::user(fn (User $user): array => [
            'name' => $user->name,
            'extra' => $user->email,
            'avatar' => $user->avatarUrl() ?: null,
        ]);
    }
}
