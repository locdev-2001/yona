<?php

namespace App\Models\Channel;

use App\Channels\CapabilitySet;
use App\Channels\ChannelPlatform;
use App\Channels\DeclaresCapabilities;
use App\Channels\DeclaresPlatform;
use App\Models\Channel\Concerns\Channelable;
use Database\Factories\Channel\TwitterProfileFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

// Port từ refs/chatwoot/app/models/channel/twitter_profile.rb — CHỈ khung (đăng ký
// kênh + CRC webhook). Gem Twitty và luồng gửi/nhận DM chưa port, xem note F2-F5.
class TwitterProfile extends Model implements DeclaresCapabilities, DeclaresPlatform
{
    /** @use HasFactory<TwitterProfileFactory> */
    use Channelable, HasFactory;

    protected $table = 'channel_twitter_profiles';

    /** @var list<string> */
    public const EDITABLE_ATTRS = ['tweets_enabled'];

    protected $fillable = [
        'account_id', 'profile_id', 'twitter_access_token', 'twitter_access_token_secret', 'tweets_enabled',
    ];

    protected $attributes = ['tweets_enabled' => true];

    protected function casts(): array
    {
        return [
            'tweets_enabled' => 'boolean',
            'twitter_access_token' => 'encrypted',
            'twitter_access_token_secret' => 'encrypted',
        ];
    }

    public function name(): string
    {
        return 'Twitter';
    }

    public function platform(): ChannelPlatform
    {
        return ChannelPlatform::of('x', 'X');
    }

    public static function channelRules(): array
    {
        return [
            'profile_id' => ['required', 'string', 'max:255'],
            'twitter_access_token' => ['required', 'string'],
            'twitter_access_token_secret' => ['required', 'string'],
        ];
    }

    /**
     * Kênh Twitter của Chatwoot đã ngừng: không có driver tin đến lẫn tin đi trong
     * bản port. Khai rỗng để UI không hiện gì thay vì hiện nút chết.
     */
    public function capabilities(): CapabilitySet
    {
        return CapabilitySet::none();
    }
}
