<?php

namespace App\Http\Resources;

use App\Http\Resources\Concerns\SerializesAttributeMaps;
use App\Models\Channel\FacebookPage;
use App\Models\Channel\Instagram;
use App\Models\Channel\Telegram;
use App\Models\Channel\Tiktok;
use App\Models\Channel\TwilioSms;
use App\Models\Channel\TwitterProfile;
use App\Models\Channel\Whatsapp;
use App\Models\Inbox;
use App\Services\Channels\ChannelSetupService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

// Port từ api/v1/models/_inbox.json.jbuilder.
// help_center: bỏ tới khi có portals (nhóm D).
class InboxResource extends JsonResource
{
    use SerializesAttributeMaps;

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
            'callback_webhook_url' => ChannelSetupService::callbackUrlFor($inbox),
            'allow_messages_after_resolved' => $inbox->allow_messages_after_resolved,
            'lock_to_single_conversation' => $inbox->lock_to_single_conversation,
            'sender_name_type' => $inbox->sender_name_type === Inbox::SENDER_NAME_TYPE_PROFESSIONAL
                ? 'professional'
                : 'friendly',
            'business_name' => $inbox->business_name,
            ...$this->sharedChannelAttributes($channel),
            ...$this->webWidgetAttributes($inbox),
            ...$this->apiChannelAttributes($inbox),
            ...$this->emailChannelAttributes($inbox),
            ...$this->zaloChannelAttributes($inbox),
            'provider' => $channel?->getAttribute('provider'),
            ...$this->externalChannelAttributes($channel),
        ];
    }

    /**
     * Khối "Channel specific settings" của jbuilder cho các kênh ngoài (F2–F5).
     * Mỗi kênh khai đúng phần của nó, không kênh nào biết kênh khác.
     */
    private function externalChannelAttributes(?Model $channel): array
    {
        return match (true) {
            $channel instanceof TwitterProfile => ['tweets_enabled' => $channel->tweets_enabled],
            $channel instanceof FacebookPage => [
                'page_id' => $channel->page_id,
                'reauthorization_required' => $channel->reauthorizationRequired(),
            ],
            $channel instanceof Instagram => [
                'instagram_id' => $channel->instagram_id,
                'reauthorization_required' => $channel->reauthorizationRequired(),
            ],
            $channel instanceof Tiktok => ['reauthorization_required' => $channel->reauthorizationRequired()],
            $channel instanceof Telegram => ['bot_name' => $channel->bot_name],
            $channel instanceof TwilioSms => [
                'medium' => $channel->isSms() ? 'sms' : 'whatsapp',
                'content_templates' => $channel->content_templates ?? [],
                ...($this->administrator ? [
                    'auth_token' => $channel->auth_token,
                    'account_sid' => $channel->account_sid,
                    'api_key_sid' => $channel->api_key_sid,
                ] : []),
            ],
            $channel instanceof Whatsapp => [
                'message_templates' => is_array($channel->message_templates) ? $channel->message_templates : [],
                ...($this->administrator ? ['provider_config' => $channel->provider_config ?? []] : []),
                'reauthorization_required' => ($channel->provider_config['source'] ?? null) === 'embedded_signup'
                    && $channel->reauthorizationRequired(),
            ],
            default => [],
        };
    }

    private function sharedChannelAttributes(?Model $channel): array
    {
        return collect(self::SHARED_CHANNEL_KEYS)
            ->mapWithKeys(fn (string $key) => [$key => $channel?->getAttribute($key)])
            ->all();
    }

    // Kênh Zalo cá nhân (G1): FE cần trạng thái phiên để dựng biểu ngữ mất phiên.
    private function zaloChannelAttributes(Inbox $inbox): array
    {
        if (! $inbox->isZalo()) {
            return [];
        }

        $channel = $inbox->channel;

        return [
            'zalo_uid' => $channel->zalo_uid,
            'zalo_display_name' => $channel->display_name,
            'zalo_phone' => $channel->phone,
            'zalo_state' => $channel->state,
            'zalo_session_lost_reason' => $channel->session_lost_reason,
            'zalo_last_connected_at' => $channel->last_connected_at?->toIso8601String(),
        ];
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

    // Khối `if resource.email?` của jbuilder: cột IMAP/SMTP chỉ hiện với admin.
    private function emailChannelAttributes(Inbox $inbox): array
    {
        if (! $inbox->isEmail()) {
            return [];
        }

        $channel = $inbox->channel;
        $forwardingEnabled = filled(config('mail.inbound_email_domain'));

        return [
            'email' => $channel->email,
            'forwarding_enabled' => $forwardingEnabled,
            ...($forwardingEnabled ? ['forward_to_email' => $channel->forward_to_email] : []),
            ...($this->administrator ? [
                'imap_login' => $channel->imap_login,
                'imap_password' => $channel->imap_password,
                'imap_address' => $channel->imap_address,
                'imap_port' => $channel->imap_port,
                'imap_enabled' => $channel->imap_enabled,
                'imap_enable_ssl' => $channel->imap_enable_ssl,
                'imap_authentication' => $channel->imap_authentication,
                'smtp_login' => $channel->smtp_login,
                'smtp_password' => $channel->smtp_password,
                'smtp_address' => $channel->smtp_address,
                'smtp_port' => $channel->smtp_port,
                'smtp_enabled' => $channel->smtp_enabled,
                'smtp_domain' => $channel->smtp_domain,
                'smtp_enable_ssl_tls' => $channel->smtp_enable_ssl_tls,
                'smtp_enable_starttls_auto' => $channel->smtp_enable_starttls_auto,
                'smtp_openssl_verify_mode' => $channel->smtp_openssl_verify_mode,
                'smtp_authentication' => $channel->smtp_authentication,
            ] : []),
            ...($this->administrator && ($channel->isMicrosoft() || $channel->isGoogle() || $channel->isLegacyGoogle())
                ? ['reauthorization_required' => blank($channel->provider_config) || $channel->reauthorizationRequired()]
                : []),
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
            'additional_attributes' => self::attributeMap($channel->additional_attributes),
        ];
    }

    // Inbox::EventDataPresenter#webhook_data — payload sự kiện inbox_created/updated.
    public static function eventWebhookData(Inbox $inbox): array
    {
        return [
            'allow_messages_after_resolved' => $inbox->allow_messages_after_resolved,
            'lock_to_single_conversation' => $inbox->lock_to_single_conversation,
            'auto_assignment_config' => $inbox->auto_assignment_config ?? [],
            'enable_auto_assignment' => $inbox->enable_auto_assignment,
            'enable_email_collect' => $inbox->enable_email_collect,
            'greeting_enabled' => $inbox->greeting_enabled,
            'greeting_message' => $inbox->greeting_message,
            'csat_survey_enabled' => $inbox->csat_survey_enabled,
            'business_name' => $inbox->business_name,
            'sender_name_type' => $inbox->sender_name_type === Inbox::SENDER_NAME_TYPE_PROFESSIONAL
                ? 'professional'
                : 'friendly',
            'timezone' => $inbox->timezone,
            'out_of_office_message' => $inbox->out_of_office_message,
            'working_hours_enabled' => $inbox->working_hours_enabled,
            'working_hours' => $inbox->weeklySchedule(),
            'created_at' => $inbox->created_at?->toISOString(),
            'updated_at' => $inbox->updated_at?->toISOString(),
            'channel' => $inbox->channel?->toArray(),
            'account' => $inbox->account->webhookData(),
        ];
    }
}
