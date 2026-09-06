<?php

namespace App\Models\Channel;

use App\Channels\Capability;
use App\Channels\CapabilitySet;
use App\Channels\DeclaresCapabilities;
use App\Models\Channel\Concerns\Channelable;
use Database\Factories\Channel\LineFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

// Port từ refs/chatwoot/app/models/channel/line.rb. Gem line-bot-sdk được thay
// bằng App\Services\Line\LineClient (Http facade).
class Line extends Model implements DeclaresCapabilities
{
    /** @use HasFactory<LineFactory> */
    use Channelable, HasFactory;

    protected $table = 'channel_line';

    /** @var list<string> */
    public const EDITABLE_ATTRS = ['line_channel_id', 'line_channel_secret', 'line_channel_token'];

    protected $fillable = ['account_id', ...self::EDITABLE_ATTRS];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'line_channel_secret' => 'encrypted',
            'line_channel_token' => 'encrypted',
        ];
    }

    public function name(): string
    {
        return 'LINE';
    }

    public static function channelRules(): array
    {
        return [
            'line_channel_id' => ['required', 'string', 'max:255'],
            'line_channel_secret' => ['required', 'string', 'max:255'],
            'line_channel_token' => ['required', 'string'],
        ];
    }

    /** LINE Messaging API: chưa xử lý vị trí và biên nhận đã xem (nợ có tên). */
    public function capabilities(): CapabilitySet
    {
        return CapabilitySet::of(
            Capability::InboundText,
            Capability::InboundImage,
            Capability::InboundGif,
            Capability::InboundVideo,
            Capability::InboundAudio,
            Capability::InboundFile,
            Capability::InboundSticker,
            Capability::InboundCaption,
            Capability::OutboundText,
            Capability::OutboundImage,
            Capability::OutboundVideo,
            Capability::OutboundAudio,
            Capability::OutboundFile,
            Capability::ProfileName,
            Capability::ProfileAvatar,
            Capability::IdentityStableId,
            Capability::ThreadingContinuous,
            Capability::SessionToken,
        );
    }
}
