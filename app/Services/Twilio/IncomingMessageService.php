<?php

namespace App\Services\Twilio;

use App\Builders\ContactInboxWithContactBuilder;
use App\Models\Attachment;
use App\Models\Channel\TwilioSms;
use App\Models\Contact;
use App\Models\Message;
use App\Services\Channels\IncomingConversationResolver;
use App\Services\Channels\RemoteAttachmentDownloader;

// Port từ refs/chatwoot/app/services/twilio/incoming_message_service.rb.
class IncomingMessageService
{
    /** @param array<string, mixed> $params form-encoded của Twilio. */
    public function __construct(private readonly array $params) {}

    public function perform(): ?Message
    {
        $channel = $this->findChannel();

        if ($channel === null) {
            return null;
        }

        $inbox = $channel->inbox;
        $sourceId = (string) ($this->params['From'] ?? '');

        $contactInbox = (new ContactInboxWithContactBuilder(
            inbox: $inbox,
            contactAttributes: [
                'name' => $this->params['ProfileName'] ?? $this->phoneNumber($channel) ?? $sourceId,
                'phone_number' => $this->phoneNumber($channel),
                'additional_attributes' => $this->additionalAttributes($channel),
            ],
            sourceId: $sourceId,
        ))->perform();

        if ($contactInbox === null) {
            return null;
        }

        $this->updateContactNameIfNeeded($contactInbox->contact, $channel);

        $conversation = IncomingConversationResolver::resolve($contactInbox, $this->additionalAttributes($channel));

        $message = $conversation->messages()->make([
            'content' => str_replace("\0", '', (string) ($this->params['Body'] ?? '')),
            'account_id' => $inbox->account_id,
            'inbox_id' => $inbox->id,
            'message_type' => Message::TYPE_INCOMING,
            'source_id' => $this->params['SmsSid'] ?? null,
        ]);
        $message->sender()->associate($contactInbox->contact);
        $message->save();

        $this->attachFiles($message, $channel);
        $this->attachLocation($message);

        return $message;
    }

    private function findChannel(): ?TwilioSms
    {
        if (filled($this->params['MessagingServiceSid'] ?? null)) {
            $channel = TwilioSms::query()->where('messaging_service_sid', $this->params['MessagingServiceSid'])->first();

            if ($channel !== null) {
                return $channel;
            }
        }

        if (filled($this->params['AccountSid'] ?? null) && filled($this->params['To'] ?? null)) {
            return TwilioSms::query()
                ->where('account_sid', $this->params['AccountSid'])
                ->where('phone_number', $this->params['To'])
                ->first();
        }

        return null;
    }

    /**
     * Hồ sơ tạo từ tin đầu tiên thường chỉ có số làm tên; khi Twilio gửi kèm
     * `ProfileName` ở tin sau thì thay tên số bằng tên thật, và CHỈ khi tên hiện
     * tại đúng là số — tên do người dùng sửa tay không bị đè.
     * (update_contact_name_if_needed của bản gốc; nhánh so với số đã định dạng
     * quốc tế không port vì chưa có thư viện định dạng số.)
     */
    private function updateContactNameIfNeeded(Contact $contact, TwilioSms $channel): void
    {
        $profileName = $this->params['ProfileName'] ?? null;

        if (blank($profileName) || $contact->name === $profileName) {
            return;
        }

        $phoneNumber = $this->phoneNumber($channel);

        if (blank($phoneNumber) || $contact->name !== $phoneNumber) {
            return;
        }

        $contact->update(['name' => $profileName]);
    }

    // Twilio WhatsApp gửi số dạng `whatsapp:+E164`.
    private function phoneNumber(TwilioSms $channel): ?string
    {
        $from = (string) ($this->params['From'] ?? '');

        if ($channel->isSms()) {
            return $from ?: null;
        }

        $stripped = str_replace('whatsapp:', '', $from);

        return str_starts_with($stripped, '+') ? $stripped : null;
    }

    /** @return array<string, mixed> */
    private function additionalAttributes(TwilioSms $channel): array
    {
        if (! $channel->isSms()) {
            return [];
        }

        return [
            'from_zip_code' => $this->params['FromZip'] ?? null,
            'from_country' => $this->params['FromCountry'] ?? null,
            'from_state' => $this->params['FromState'] ?? null,
        ];
    }

    private function attachFiles(Message $message, TwilioSms $channel): void
    {
        $numMedia = (int) ($this->params['NumMedia'] ?? 0);

        for ($index = 0; $index < $numMedia; $index++) {
            $mediaUrl = $this->params["MediaUrl{$index}"] ?? null;

            if (blank($mediaUrl)) {
                continue;
            }

            $attributes = RemoteAttachmentDownloader::download(
                url: $mediaUrl,
                accountId: $message->account_id,
                basicAuth: [$channel->account_sid, $channel->auth_token],
            );

            if ($attributes !== null) {
                $message->attachments()->create($attributes);
            }
        }
    }

    private function attachLocation(Message $message): void
    {
        if (($this->params['MessageType'] ?? null) !== 'location') {
            return;
        }

        if (blank($this->params['Latitude'] ?? null) || blank($this->params['Longitude'] ?? null)) {
            return;
        }

        $message->attachments()->create([
            'account_id' => $message->account_id,
            'file_type' => Attachment::FILE_TYPE_LOCATION,
            'coordinates_lat' => (float) $this->params['Latitude'],
            'coordinates_long' => (float) $this->params['Longitude'],
        ]);
    }
}
