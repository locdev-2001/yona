<?php

namespace App\Models\Channel;

use App\Models\Channel\Concerns\Channelable;
use Database\Factories\Channel\LineFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

// Port từ refs/chatwoot/app/models/channel/line.rb. Gem line-bot-sdk được thay
// bằng App\Services\Line\LineClient (Http facade).
class Line extends Model
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
}
