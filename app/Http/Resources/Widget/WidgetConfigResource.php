<?php

namespace App\Http\Resources\Widget;

use App\Models\Channel\WebWidget;
use App\Models\Contact;
use App\Models\ContactInbox;
use DateTimeZone;
use Throwable;

// Port từ api/v1/widget/configs/create.json.jbuilder — gói cấu hình widget tải
// một lần khi khởi động: thiết lập kênh + hồ sơ khách + token phiên.
final class WidgetConfigResource
{
    /** @return array<string, mixed> */
    public static function make(WebWidget $channel, ContactInbox $contactInbox, Contact $contact, string $authToken): array
    {
        $inbox = $channel->inbox;
        $account = $inbox->account;

        return [
            'website_channel_config' => [
                'allow_messages_after_resolved' => $inbox->allow_messages_after_resolved,
                'api_host' => config('app.url'),
                'auth_token' => $authToken,
                'avatar_url' => $inbox->avatarUrl(),
                'csat_survey_enabled' => $inbox->csat_survey_enabled,
                'disable_branding' => $account->featureEnabled('disable_branding'),
                'enabled_features' => $channel->selected_feature_flags,
                'enabled_languages' => config('yona.available_locales'),
                'locale' => $account->locale,
                'out_of_office_message' => $inbox->out_of_office_message,
                // portal chờ nhóm D (help center) — jbuilder gốc trả null khi chưa gắn.
                'portal' => null,
                'pre_chat_form_enabled' => $channel->pre_chat_form_enabled,
                'pre_chat_form_options' => $channel->pre_chat_form_options,
                'reply_time' => $channel->reply_time,
                'timezone' => $inbox->timezone,
                'utc_off_set' => self::utcOffset($inbox->timezone),
                'website_name' => $inbox->name,
                'website_token' => $channel->website_token,
                'welcome_tagline' => $channel->welcome_tagline,
                'welcome_title' => $channel->welcome_title,
                'widget_color' => $channel->widget_color,
                // working_hours chờ Business Hours, giống InboxResource.
                'working_hours' => [],
                'working_hours_enabled' => $inbox->working_hours_enabled,
            ],
            'contact' => [
                'email' => $contact->email,
                'id' => $contact->id,
                'identifier' => $contact->identifier,
                'name' => $contact->name,
                'phone_number' => $contact->phone_number,
                'pubsub_token' => $contactInbox->pubsub_token,
            ],
            // GlobalConfig.get(...) — cấu hình mức cài đặt, ở Yona nằm trong config/.
            'global_config' => [
                'LOGO_THUMBNAIL' => config('yona.branding.logo_thumbnail'),
                'BRAND_NAME' => config('yona.branding.brand_name'),
                'WIDGET_BRAND_URL' => config('yona.branding.widget_brand_url'),
                'MAXIMUM_FILE_UPLOAD_SIZE' => config('limits.maximum_file_upload_size'),
                'INSTALLATION_NAME' => config('yona.branding.installation_name'),
            ],
        ];
    }

    private static function utcOffset(?string $timezone): string
    {
        try {
            $zone = new DateTimeZone($timezone ?: 'UTC');
        } catch (Throwable) {
            $zone = new DateTimeZone('UTC');
        }

        return now()->setTimezone($zone)->format('P');
    }
}
