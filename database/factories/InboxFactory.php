<?php

namespace Database\Factories;

use App\Models\Account;
use App\Models\Channel\Api;
use App\Models\Channel\Email;
use App\Models\Channel\FacebookPage;
use App\Models\Channel\Instagram;
use App\Models\Channel\Line;
use App\Models\Channel\Sms;
use App\Models\Channel\Telegram;
use App\Models\Channel\Tiktok;
use App\Models\Channel\TwilioSms;
use App\Models\Channel\TwitterProfile;
use App\Models\Channel\WebWidget;
use App\Models\Channel\Whatsapp;
use App\Models\Inbox;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Inbox>
 */
class InboxFactory extends Factory
{
    public function definition(): array
    {
        return [
            'account_id' => Account::factory(),
            'name' => fake()->company(),
        ];
    }

    // Factory :channel_widget của Chatwoot: kênh Website + inbox cùng account.
    public function webWidget(): static
    {
        return $this->state([
            'channel_type' => 'Channel::WebWidget',
            'channel_id' => fn (array $attributes) => WebWidget::factory()
                ->create(['account_id' => $attributes['account_id']])->id,
        ]);
    }

    // Factory :channel_email của Chatwoot: kênh Email + inbox cùng account.
    public function email(): static
    {
        return $this->state([
            'channel_type' => 'Channel::Email',
            'channel_id' => fn (array $attributes) => Email::factory()
                ->create(['account_id' => $attributes['account_id']])->id,
        ]);
    }

    // Kênh ngoài F2-F5: mỗi kênh một state, cùng khuôn với webWidget/email.
    public function telegram(): static
    {
        return $this->state([
            'channel_type' => 'Channel::Telegram',
            'channel_id' => fn (array $attributes) => Telegram::factory()
                ->create(['account_id' => $attributes['account_id']])->id,
        ]);
    }

    public function line(): static
    {
        return $this->state([
            'channel_type' => 'Channel::Line',
            'channel_id' => fn (array $attributes) => Line::factory()
                ->create(['account_id' => $attributes['account_id']])->id,
        ]);
    }

    public function sms(): static
    {
        return $this->state([
            'channel_type' => 'Channel::Sms',
            'channel_id' => fn (array $attributes) => Sms::factory()
                ->create(['account_id' => $attributes['account_id']])->id,
        ]);
    }

    public function twilioSms(): static
    {
        return $this->state([
            'channel_type' => 'Channel::TwilioSms',
            'channel_id' => fn (array $attributes) => TwilioSms::factory()
                ->create(['account_id' => $attributes['account_id']])->id,
        ]);
    }

    public function whatsapp(): static
    {
        return $this->state([
            'channel_type' => 'Channel::Whatsapp',
            'channel_id' => fn (array $attributes) => Whatsapp::factory()
                ->create(['account_id' => $attributes['account_id']])->id,
        ]);
    }

    public function tiktok(): static
    {
        return $this->state([
            'channel_type' => 'Channel::Tiktok',
            'channel_id' => fn (array $attributes) => Tiktok::factory()
                ->create(['account_id' => $attributes['account_id']])->id,
        ]);
    }

    public function facebookPage(): static
    {
        return $this->state([
            'channel_type' => 'Channel::FacebookPage',
            'channel_id' => fn (array $attributes) => FacebookPage::factory()
                ->create(['account_id' => $attributes['account_id']])->id,
        ]);
    }

    public function instagram(): static
    {
        return $this->state([
            'channel_type' => 'Channel::Instagram',
            'channel_id' => fn (array $attributes) => Instagram::factory()
                ->create(['account_id' => $attributes['account_id']])->id,
        ]);
    }

    public function twitterProfile(): static
    {
        return $this->state([
            'channel_type' => 'Channel::TwitterProfile',
            'channel_id' => fn (array $attributes) => TwitterProfile::factory()
                ->create(['account_id' => $attributes['account_id']])->id,
        ]);
    }

    // Factory :inbox của Chatwoot mặc định gắn kênh api cùng account.
    public function configure(): static
    {
        return $this->afterMaking(function (Inbox $inbox) {
            if ($inbox->channel_id === null) {
                $channel = Api::factory()->create(['account_id' => $inbox->account_id]);
                $inbox->channel_id = $channel->id;
                $inbox->channel_type = $channel->getMorphClass();
            }
        });
    }
}
