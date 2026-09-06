<?php

namespace App\Http\Resources;

use App\Models\Inbox;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

// Port từ api/v1/models/_inbox.json.jbuilder.
// help_center: bỏ tới khi có portals (nhóm D).
class InboxResource extends JsonResource
{
    // Khối `resource.channel.try(:x)` của partial gốc: kênh nào không có thuộc
    // tính đó thì key vẫn hiện với giá trị null, để FE dùng chung một shape.
    private const SHARED_CHANNEL_KEYS = [
        'allowed_domains',
        'widget_color',
        'website_url',
        'hmac_mandatory',
        'welcome_title',
        'welcome_tagline',
        'web_widget_script',
        'website_token',
        'selected_feature_flags',
        'reply_time',
        'messaging_service_sid',
        'phone_number',
    ];

    public function __construct(Inbox $resource, private readonly bool $administrator)
    {
        parent::__construct($resource);
    }

    /** @param iterable<Inbox> $inboxes */
    public static function collectionFor(iterable $inboxes, bool $administrator): array
    {
        return collect($inboxes)
            ->map(fn (Inbox $inbox) => (new self($inbox, $administrator))->toArray(request()))
            ->values()
            ->all();
    }

    public function toArray(Request $request): array
    {
        /** @var Inbox $inbox */
        $inbox = $this->resource;
        $channel = $inbox->channel;

        return [
            'id' => $inbox->id,
            'avatar_url' => $inbox->avatarUrl(),
            'channel_id' => $inbox->channel_id,
            'name' => $inbox->name,
            'channel_type' => $inbox->channel_type,
            'greeting_enabled' => $inbox->greeting_enabled,
            'greeting_message' => $inbox->greeting_message,
            'working_hours_enabled' => $inbox->working_hours_enabled,
            'enable_email_collect' => $inbox->enable_email_collect,
            'csat_survey_enabled' => $inbox->csat_survey_enabled,
            'csat_config' => $inbox->csat_config ?? [],
            'enable_auto_assignment' => $inbox->enable_auto_assignment,
            'auto_assignment_config' => $inbox->auto_assignment_config ?? [],
            'out_of_office_message' => $inbox->out_of_office_message,
            'working_hours' => $inbox->weeklySchedule(),
            'timezone' => $inbox->timezone,
            'callback_webhook_url' => null,
            'allow_messages_after_resolved' => $inbox->allow_messages_after_resolved,
            'lock_to_single_conversation' => $inbox->lock_to_single_conversation,
            'sender_name_type' => $inbox->sender_name_type === Inbox::SENDER_NAME_TYPE_PROFESSIONAL
                ? 'professional'
                : 'friendly',
            'business_name' => $inbox->business_name,
            ...$this->sharedChannelAttributes($channel),
            ...$this->webWidgetAttributes($inbox),
            ...$this->apiChannelAttributes($inbox),
            'provider' => $channel?->getAttribute('provider'),
        ];
    }

    private function sharedChannelAttributes(?Model $channel): array
    {
        return collect(self::SHARED_CHANNEL_KEYS)
            ->mapWithKeys(fn (string $key) => [$key => $channel?->getAttribute($key)])
            ->all();
    }

    private function webWidgetAttributes(Inbox $inbox): array
    {
        if (! $inbox->isWebWidget()) {
            return [];
        }

        $channel = $inbox->channel;

        return [
            ...($this->administrator ? ['hmac_token' => $channel->hmac_token] : []),
            'pre_chat_form_enabled' => $channel->pre_chat_form_enabled,
            'pre_chat_form_options' => $channel->pre_chat_form_options,
            'continuity_via_email' => $channel->continuity_via_email,
        ];
    }

    private function apiChannelAttributes(Inbox $inbox): array
    {
        if (! $inbox->isApi()) {
            return [];
        }

        $channel = $inbox->channel;

        return [
            ...($this->administrator ? [
                'hmac_token' => $channel->hmac_token,
                'secret' => $channel->secret,
            ] : []),
            'webhook_url' => $channel->webhook_url,
            'inbox_identifier' => $channel->identifier,
            'additional_attributes' => $channel->additional_attributes ?? [],
        ];
    }
}
