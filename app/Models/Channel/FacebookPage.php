<?php

namespace App\Models\Channel;

use App\Builders\ContactInboxWithContactBuilder;
use App\Models\Channel\Concerns\Channelable;
use App\Models\Concerns\Reauthorizable;
use App\Models\ContactInbox;
use Database\Factories\Channel\FacebookPageFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

// Port từ refs/chatwoot/app/models/channel/facebook_page.rb. Subscribe/unsubscribe
// (gem facebook-messenger) nằm ở App\Services\Facebook\PageSubscriptionService.
class FacebookPage extends Model
{
    /** @use HasFactory<FacebookPageFactory> */
    use Channelable, HasFactory, Reauthorizable;

    public const AUTHORIZATION_ERROR_THRESHOLD = 10;

    protected $table = 'channel_facebook_pages';

    protected $fillable = [
        'account_id', 'page_id', 'user_access_token', 'page_access_token', 'instagram_id',
    ];

    protected function casts(): array
    {
        return [
            'user_access_token' => 'encrypted',
            'page_access_token' => 'encrypted',
        ];
    }

    public function name(): string
    {
        return 'Facebook';
    }

    public static function channelRules(): array
    {
        return [
            'page_id' => ['required', 'string', 'max:255'],
            'page_access_token' => ['required', 'string'],
            'user_access_token' => ['required', 'string'],
        ];
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
