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
use Database\Factories\Channel\LineFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

// Gem line-bot-sdk được thay
// bằng App\Services\Line\LineClient (Http facade).
class Line extends Model implements DeclaresCapabilities, DeclaresConnection, DeclaresPlatform
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

    public function platform(): ChannelPlatform
    {
        return ChannelPlatform::of('line', 'LINE');
    }

    public static function channelRules(): array
    {
        return [
            // Không bắt buộc: lúc lưu, LineCredentialsVerifier lấy ID kênh từ chính token.
            'line_channel_id' => ['sometimes', 'nullable', 'string', 'max:255'],
            'line_channel_secret' => ['required', 'string', 'max:255'],
            'line_channel_token' => ['required', 'string'],
        ];
    }

    // Hộp thư LINE mang tên bot (ChannelSetupService) khi người dùng không tự đặt.
    public static function namesInboxItself(): bool
    {
        return true;
    }

    /** Khách dán Channel secret + access token; ID kênh lấy từ LINE khi kiểm token. */
    public static function connection(): ChannelConnection
    {
        return ChannelConnection::of('line', ConnectionMethod::Token)
            ->ordered(50)
            ->withGuideUrl('https://developers.line.biz/console/');
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
            Capability::OutboundQuickReply,
            Capability::OutboundButtons,
            Capability::OutboundCard,
            Capability::ProfileName,
            Capability::ProfileAvatar,
            Capability::IdentityStableId,
            Capability::ThreadingContinuous,
            Capability::ConversationOutboundResume,
            Capability::SessionToken,
        )->withTextFormat(TextFormat::Plain);
    }
}
