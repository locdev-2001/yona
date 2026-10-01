<?php

namespace App\Models\Channel;

use App\Channels\Capability;
use App\Channels\CapabilitySet;
use App\Channels\ChannelConnection;
use App\Channels\ChannelPlatform;
use App\Channels\ConnectionMethod;
use App\Channels\DeclaresCapabilities;
use App\Channels\DeclaresConnection;
use App\Channels\DeclaresPlatform;
use App\Channels\TextFormat;
use App\Models\Channel\Concerns\Channelable;
use App\Models\Concerns\Reauthorizable;
use Database\Factories\Channel\TiktokFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Tiktok extends Model implements DeclaresCapabilities, DeclaresConnection, DeclaresPlatform
{
    /** @use HasFactory<TiktokFactory> */
    use Channelable, HasFactory, Reauthorizable;

    public const AUTHORIZATION_ERROR_THRESHOLD = 1;

    protected $table = 'channel_tiktok';

    protected $fillable = [
        'account_id', 'business_id', 'access_token', 'expires_at',
        'refresh_token', 'refresh_token_expires_at',
    ];

    protected function casts(): array
    {
        return [
            'access_token' => 'encrypted',
            'refresh_token' => 'encrypted',
            'expires_at' => 'datetime',
            'refresh_token_expires_at' => 'datetime',
        ];
    }

    public function name(): string
    {
        return 'Tiktok';
    }

    public function platform(): ChannelPlatform
    {
        return ChannelPlatform::of('tiktok', 'TikTok');
    }

    public static function channelRules(): array
    {
        return [
            'business_id' => ['required', 'string', 'max:255'],
            'access_token' => ['required', 'string'],
            'refresh_token' => ['required', 'string'],
            'expires_at' => ['required', 'date'],
            'refresh_token_expires_at' => ['required', 'date'],
        ];
    }

    /** Luồng ủy quyền TikTok chưa có ở backend nên chưa mở cho khách. */
    public static function connection(): ChannelConnection
    {
        return ChannelConnection::of('tiktok', ConnectionMethod::OauthRedirect)->ordered(85)->available(false);
    }

    /** TikTok DM: driver hiện chỉ dựng tin chữ, chưa kéo đính kèm về (nợ có tên). */
    public function capabilities(): CapabilitySet
    {
        return CapabilitySet::of(
            Capability::InboundText,
            Capability::OutboundText,
            Capability::OutboundReplyTo,
            Capability::ProfileName,
            Capability::ProfileAvatar,
            Capability::IdentityStableId,
            Capability::ThreadingContinuous,
            Capability::SessionOauth,
            Capability::SessionReauth,
            Capability::SettingsSingleConversation,
        )->withTextFormat(TextFormat::Plain);
    }
}
