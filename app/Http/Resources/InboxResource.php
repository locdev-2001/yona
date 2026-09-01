<?php

namespace App\Http\Resources;

use App\Models\Inbox;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

// Port từ api/v1/models/_inbox.json.jbuilder.
// Partial gốc emit nhiều key kênh khác qua `try` (null khi kênh không có) —
// giữ nguyên các key đó để FE dùng chung một shape như Chatwoot.
// working_hours: [] tới khi port Business Hours; help_center: bỏ tới khi có portals (nhóm D).
class InboxResource extends JsonResource
{
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
            'working_hours' => [],
            'timezone' => $inbox->timezone,
            'callback_webhook_url' => null,
            'allow_messages_after_resolved' => $inbox->allow_messages_after_resolved,
            'lock_to_single_conversation' => $inbox->lock_to_single_conversation,
            'sender_name_type' => $inbox->sender_name_type === Inbox::SENDER_NAME_TYPE_PROFESSIONAL
                ? 'professional'
                : 'friendly',
            'business_name' => $inbox->business_name,
            // Key kênh WebWidget/Twilio — jbuilder emit qua `try`, null với kênh khác.
            'allowed_domains' => null,
            'widget_color' => null,
            'website_url' => null,
            'hmac_mandatory' => $inbox->channel->hmac_mandatory ?? null,
            'welcome_title' => null,
            'welcome_tagline' => null,
            'web_widget_script' => null,
            'website_token' => null,
            'selected_feature_flags' => null,
            'reply_time' => null,
            'messaging_service_sid' => null,
            'phone_number' => null,
            ...$this->apiChannelAttributes($inbox),
            'provider' => null,
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
