<?php

namespace Tests\Support;

use App\Models\Account;
use App\Models\Channel\WebWidget;
use App\Models\Contact;
use App\Models\ContactInbox;
use App\Models\Inbox;
use App\Support\WidgetTokenService;

// Dựng bối cảnh "một khách đang mở widget": kênh Website + inbox + hồ sơ khách
// + token phiên. Mọi test widget bắt đầu từ đây thay vì lặp lại 5 factory.
final class WidgetSession
{
    public function __construct(
        public readonly Account $account,
        public readonly WebWidget $channel,
        public readonly Inbox $inbox,
        public readonly Contact $contact,
        public readonly ContactInbox $contactInbox,
    ) {}

    /** @param array<string, mixed> $channelAttributes */
    public static function make(array $channelAttributes = [], array $contactAttributes = []): self
    {
        $account = Account::factory()->create();
        $channel = WebWidget::factory()->create(['account_id' => $account->id, ...$channelAttributes]);
        $inbox = Inbox::factory()->create([
            'account_id' => $account->id,
            'channel_type' => 'Channel::WebWidget',
            'channel_id' => $channel->id,
        ]);
        $contact = Contact::factory()->create(['account_id' => $account->id, ...$contactAttributes]);
        $contactInbox = ContactInbox::factory()->create([
            'contact_id' => $contact->id,
            'inbox_id' => $inbox->id,
        ]);

        return new self($account, $channel->refresh(), $inbox, $contact, $contactInbox);
    }

    public function token(?ContactInbox $contactInbox = null): string
    {
        return WidgetTokenService::generate([
            'source_id' => ($contactInbox ?? $this->contactInbox)->source_id,
            'inbox_id' => $this->inbox->id,
        ]);
    }

    /** @return array<string, string> */
    public function headers(?ContactInbox $contactInbox = null): array
    {
        return ['X-Auth-Token' => $this->token($contactInbox)];
    }

    public function url(string $path, array $query = []): string
    {
        return '/api/v1/widget/'.ltrim($path, '/').'?'.http_build_query([
            'website_token' => $this->channel->website_token,
            ...$query,
        ]);
    }
}
