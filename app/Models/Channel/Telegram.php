<?php

namespace App\Models\Channel;

use App\Models\Channel\Concerns\Channelable;
use App\Models\Message;
use Database\Factories\Channel\TelegramFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

// Port từ refs/chatwoot/app/models/channel/telegram.rb. Phần gọi Bot API nằm ở
// App\Services\Telegram\TelegramClient (lõi model không nói chuyện HTTP).
class Telegram extends Model
{
    /** @use HasFactory<TelegramFactory> */
    use Channelable, HasFactory;

    protected $table = 'channel_telegram';

    /** @var list<string> */
    public const EDITABLE_ATTRS = ['bot_token'];

    protected $fillable = ['account_id', 'bot_name', 'bot_token'];

    public function name(): string
    {
        return 'Telegram';
    }

    public static function channelRules(): array
    {
        return ['bot_token' => ['required', 'string', 'max:255']];
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
}
