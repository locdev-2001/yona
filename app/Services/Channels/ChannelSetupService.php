<?php

namespace App\Services\Channels;

use App\Models\Channel\Email;
use App\Models\Channel\FacebookPage;
use App\Models\Channel\Instagram;
use App\Models\Channel\Line;
use App\Models\Channel\Sms;
use App\Models\Channel\Telegram;
use App\Models\Channel\TwilioSms;
use App\Models\Channel\Whatsapp;
use App\Models\Inbox;
use App\Services\Facebook\FacebookGraphClient;
use App\Services\Line\LineClient;
use App\Services\Meta\GraphApi;
use App\Services\Telegram\TelegramClient;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Bước đăng ký webhook với nhà cung cấp sau khi một inbox kênh ngoài được tạo.
 *
 * Bản gốc rải các bước này vào callback của từng model kênh
 * (`after_create :subscribe`, `before_save :setup_telegram_webhook`,
 * `Twilio::WebhookSetupService`, `Whatsapp::WebhookSetupService`). Ở đây lõi
 * model không nói chuyện HTTP (docs/code-standards.md §0), nên toàn bộ gom vào
 * một bảng tra duy nhất: thêm kênh = thêm một dòng, InboxesController không đổi.
 *
 * Lỗi của nhà cung cấp KHÔNG chặn việc tạo inbox — chỉ ghi log, đúng như bản
 * gốc rescue rồi trả true.
 */
class ChannelSetupService
{
    /** @var array<class-string, string> kênh → phương thức đăng ký webhook. */
    private const SETUP_STEPS = [
        Telegram::class => 'setUpTelegram',
        TwilioSms::class => 'setUpTwilio',
        Whatsapp::class => 'setUpWhatsapp',
        FacebookPage::class => 'subscribeFacebookPage',
        Instagram::class => 'subscribeInstagram',
        Line::class => 'nameLineInbox',
        Email::class => 'nameEmailInbox',
    ];

    /**
     * Inbox#callback_webhook_url — URL người dùng khai báo bên nhà cung cấp.
     * Cùng bảng này dùng cho cả việc đăng ký lẫn việc hiển thị trong UI.
     */
    public static function callbackUrlFor(Inbox $inbox): ?string
    {
        $channel = $inbox->channel;
        $baseUrl = rtrim((string) config('app.url'), '/');

        return match (true) {
            $channel instanceof TwilioSms => $baseUrl.'/twilio/callback',
            $channel instanceof Sms => $baseUrl.'/webhooks/sms/'.ltrim((string) $channel->phone_number, '+'),
            $channel instanceof Line => $baseUrl.'/webhooks/line/'.$channel->line_channel_id,
            $channel instanceof Whatsapp => $baseUrl.'/webhooks/whatsapp/'.$channel->phone_number,
            $channel instanceof Telegram => $baseUrl.'/webhooks/telegram/'.$channel->bot_token,
            default => null,
        };
    }

    public function register(Inbox $inbox): void
    {
        $channel = $inbox->channel;

        if ($channel === null) {
            return;
        }

        $step = self::SETUP_STEPS[$channel::class] ?? null;

        if ($step !== null) {
            try {
                $this->{$step}($inbox);
            } catch (Throwable $exception) {
                Log::error('[CHANNEL SETUP] '.$inbox->channel_type.' inbox '.$inbox->id.': '.$exception->getMessage());
            }
        }

        // Kênh tự đặt tên (namesInboxItself) mà nhà cung cấp không trả tên thì dùng tên tự động.
        if (blank($inbox->name)) {
            $inbox->forceFill(['name' => app(InboxNaming::class)->automaticName($inbox)])->save();
        }
    }

    // Channel::Telegram#ensure_valid_bot_token + #setup_telegram_webhook.
    private function setUpTelegram(Inbox $inbox): void
    {
        /** @var Telegram $channel */
        $channel = $inbox->channel;
        $client = new TelegramClient($channel);

        $profile = $client->getMe();

        if ($profile->successful() && filled($profile->json('result.username'))) {
            $botName = (string) $profile->json('result.username');
            $channel->forceFill(['bot_name' => $botName])->save();

            // Api::V1::InboxesHelper#inbox_name — inbox Telegram mang tên bot khi
            // người dùng không tự đặt.
            if (blank($inbox->name)) {
                $inbox->forceFill(['name' => $botName])->save();
            }
        } else {
            Log::error('[CHANNEL SETUP] Telegram getMe thất bại cho inbox '.$inbox->id);

            // Bản gốc chặn hẳn việc tạo kênh khi token sai; ở đây lỗi nhà cung cấp
            // không chặn tạo inbox nên phải có tên dự phòng.
            if (blank($inbox->name)) {
                $inbox->forceFill(['name' => $channel->name()])->save();
            }
        }

        $response = $client->setWebhook((string) self::callbackUrlFor($inbox));

        if (! $response->successful()) {
            Log::error('[CHANNEL SETUP] Telegram setWebhook thất bại cho inbox '.$inbox->id.': '.$response->body());
        }
    }

    // Twilio::WebhookSetupService — messaging service được ưu tiên hơn số điện thoại.
    private function setUpTwilio(Inbox $inbox): void
    {
        /** @var TwilioSms $channel */
        $channel = $inbox->channel;
        $callbackUrl = (string) self::callbackUrlFor($inbox);
        $request = Http::withBasicAuth(
            filled($channel->api_key_sid) ? $channel->api_key_sid : $channel->account_sid,
            (string) $channel->auth_token,
        )->asForm();

        if (filled($channel->messaging_service_sid)) {
            $request->post('https://messaging.twilio.com/v1/Services/'.$channel->messaging_service_sid, [
                'InboundMethod' => 'POST',
                'InboundRequestUrl' => $callbackUrl,
                'UseInboundWebhookOnNumber' => 'false',
            ]);

            return;
        }

        $numbers = $request->get(
            'https://api.twilio.com/2010-04-01/Accounts/'.$channel->account_sid.'/IncomingPhoneNumbers.json',
            ['PhoneNumber' => $channel->phone_number],
        )->json('incoming_phone_numbers', []);

        if ($numbers === []) {
            Log::warning('TWILIO_PHONE_NUMBER_NOT_FOUND: '.$channel->phone_number);

            return;
        }

        $request->post(
            'https://api.twilio.com/2010-04-01/Accounts/'.$channel->account_sid.'/IncomingPhoneNumbers/'.$numbers[0]['sid'].'.json',
            ['SmsMethod' => 'POST', 'SmsUrl' => $callbackUrl],
        );
    }

    // Whatsapp::WebhookSetupService#setup_webhook — chỉ kênh Cloud khai báo tay
    // (embedded signup tự đăng ký ở luồng riêng, chưa port).
    private function setUpWhatsapp(Inbox $inbox): void
    {
        /** @var Whatsapp $channel */
        $channel = $inbox->channel;
        $config = $channel->provider_config ?? [];

        if ($channel->provider !== 'whatsapp_cloud' || ($config['source'] ?? null) === 'embedded_signup') {
            return;
        }

        $businessAccountId = $config['business_account_id'] ?? null;
        $phoneNumberId = $config['phone_number_id'] ?? null;

        if (blank($businessAccountId) || blank($phoneNumberId) || blank($config['api_key'] ?? null)) {
            Log::error('[CHANNEL SETUP] WhatsApp thiếu business_account_id/phone_number_id/api_key ở inbox '.$inbox->id);

            return;
        }

        $request = Http::withToken($config['api_key'])->asJson();
        $baseUri = GraphApi::baseUri((string) config('services.whatsapp_cloud.base_url'));

        // Meta bắt buộc đăng ký app với WABA trước khi ghi đè callback theo số.
        $request->post($baseUri.'/'.$businessAccountId.'/subscribed_apps', [
            'subscribed_fields' => ['messages', 'smb_message_echoes'],
        ]);

        $request->post($baseUri.'/'.$phoneNumberId, [
            'webhook_configuration' => [
                'override_callback_uri' => self::callbackUrlFor($inbox),
                'verify_token' => $config['webhook_verify_token'] ?? null,
            ],
        ]);
    }

    private function subscribeFacebookPage(Inbox $inbox): void
    {
        /** @var FacebookPage $channel */
        $channel = $inbox->channel;

        (new FacebookGraphClient($channel))->subscribe();
    }

    // Channel::Instagram#subscribe.
    // Hộp thư LINE mang tên hiển thị của bot khi người dùng không tự đặt.
    private function nameLineInbox(Inbox $inbox): void
    {
        if (filled($inbox->name)) {
            return;
        }

        /** @var Line $channel */
        $channel = $inbox->channel;
        $displayName = (new LineClient($channel))->botInfo()->json('displayName');

        if (filled($displayName)) {
            $inbox->forceFill(['name' => (string) $displayName])->save();
        }
    }

    private function nameEmailInbox(Inbox $inbox): void
    {
        if (blank($inbox->name)) {
            $inbox->forceFill(['name' => (string) $inbox->channel->email])->save();
        }
    }

    private function subscribeInstagram(Inbox $inbox): void
    {
        /** @var Instagram $channel */
        $channel = $inbox->channel;

        Http::post($channel->baseUri().'/'.$channel->instagram_id.'/subscribed_apps', [
            'subscribed_fields' => 'messages,message_reactions,messaging_seen',
            'access_token' => $channel->access_token,
        ]);
    }
}
