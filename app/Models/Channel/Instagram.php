<?php

namespace App\Models\Channel;

use App\Builders\ContactInboxWithContactBuilder;
use App\Models\Channel\Concerns\Channelable;
use App\Models\Concerns\Reauthorizable;
use App\Models\ContactInbox;
use Database\Factories\Channel\InstagramFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

// Port từ refs/chatwoot/app/models/channel/instagram.rb (Instagram login trực tiếp).
class Instagram extends Model
{
    /** @use HasFactory<InstagramFactory> */
    use Channelable, HasFactory, Reauthorizable;

    public const AUTHORIZATION_ERROR_THRESHOLD = 1;

    protected $table = 'channel_instagram';

    protected $fillable = ['account_id', 'instagram_id', 'access_token', 'expires_at'];

    protected function casts(): array
    {
        return [
            'access_token' => 'encrypted',
            'expires_at' => 'datetime',
        ];
    }

    public function name(): string
    {
        return 'Instagram';
    }

    public static function channelRules(): array
    {
        return [
            'instagram_id' => ['required', 'string', 'max:255'],
            'access_token' => ['required', 'string'],
            'expires_at' => ['required', 'date'],
        ];
    }

    public static function apiVersion(): string
    {
        return (string) config('services.instagram.api_version', 'v22.0');
    }

    public function baseUri(): string
    {
        return 'https://graph.instagram.com/'.self::apiVersion();
    }

    public function createContactInbox(string $sourceId, ?string $name): ?ContactInbox
    {
        return (new ContactInboxWithContactBuilder(
            inbox: $this->inbox,
            contactAttributes: ['name' => $name],
            sourceId: $sourceId,
        ))->perform();
    }
}
