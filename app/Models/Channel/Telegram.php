<?php

namespace App\Models\Channel;

use App\Channels\Capability;
use App\Channels\CapabilitySet;
use App\Channels\ChannelPlatform;
use App\Channels\DeclaresCapabilities;
use App\Channels\DeclaresPlatform;
use App\Channels\TextFormat;
use App\Models\Channel\Concerns\Channelable;
use App\Models\Message;
use Database\Factories\Channel\TelegramFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

// Port từ refs/chatwoot/app/models/channel/telegram.rb. Phần gọi Bot API nằm ở
// App\Services\Telegram\TelegramClient (lõi model không nói chuyện HTTP).
class Telegram extends Model implements DeclaresCapabilities, DeclaresPlatform
{
    /** @use HasFactory<TelegramFactory> */
    use Channelable, HasFactory;

    protected $table = 'channel_telegram';

    /** @var list<string> */
    public const EDITABLE_ATTRS = ['bot_token'];

    protected $fillable = ['account_id', 'bot_name', 'bot_token'];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['bot_token' => 'encrypted'];
    }

    // Cột băm là thứ duy nhất tra được bot_token (bản mã có IV ngẫu nhiên);
    // giữ đồng bộ ngay trong model để không nơi nào phải nhớ tự ghi.
    protected static function booted(): void
    {
        static::saving(function (self $channel) {
            if ($channel->isDirty('bot_token')) {
                $channel->bot_token_hash = self::hashBotToken((string) $channel->bot_token);
            }
        });
    }

    public static function hashBotToken(string $botToken): string
    {
        return hash('sha256', $botToken);
    }

    public static function findByBotToken(string $botToken): ?self
    {
        return self::query()->where('bot_token_hash', self::hashBotToken($botToken))->first();
    }

    public function name(): string
    {
        return 'Telegram';
    }

    public function platform(): ChannelPlatform
    {
        return ChannelPlatform::of('telegram', 'Telegram');
    }

    public static function channelRules(): array
    {
        return ['bot_token' => ['required', 'string', 'max:255']];
    }

    // Api::V1::InboxesHelper#inbox_name: inbox Telegram lấy tên từ username của bot.
    public static function namesInboxItself(): bool
    {
        return true;
    }

    public function apiUrl(): string
    {
        return 'https://api.telegram.org/bot'.$this->bot_token;
    }

    public function fileUrl(string $filePath): string
    {
        return 'https://api.telegram.org/file/bot'.$this->bot_token.'/'.$filePath;
    }

    // Channel::Telegram#chat_id / #business_connection_id — hai khóa nằm trong
    // additional_attributes của hội thoại, gửi tin ra cần cả hai.
    public function chatId(Message $message): mixed
    {
        return $message->conversation->additional_attributes['chat_id'] ?? null;
    }

    public function businessConnectionId(Message $message): mixed
    {
        return $message->conversation->additional_attributes['business_connection_id'] ?? null;
    }

    /**
     * Bot API: ảnh/sticker/vị trí/danh thiếp vào lõi, gửi đi qua sendMediaGroup nên
     * mọi đính kèm của một tin đều đi. Nhóm bị bỏ qua ở IncomingMessageService nên
     * KHÔNG khai group_threads.
     */
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
            Capability::InboundLocation,
            Capability::InboundContactCard,
            Capability::InboundCaption,
            Capability::InboundForward,
            Capability::OutboundText,
            Capability::OutboundImage,
            Capability::OutboundVideo,
            Capability::OutboundAudio,
            Capability::OutboundFile,
            Capability::OutboundReplyTo,
            Capability::ProfileName,
            Capability::ProfileAvatar,
            Capability::IdentityStableId,
            Capability::ThreadingContinuous,
            Capability::SessionToken,
        )->withTextFormat(TextFormat::TelegramHtml);
    }
}
