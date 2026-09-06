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
use App\Models\Contact;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use App\Models\PlatformApp;
use App\Models\User;
use Illuminate\Database\Connection;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Support\ServiceProvider;

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
}
