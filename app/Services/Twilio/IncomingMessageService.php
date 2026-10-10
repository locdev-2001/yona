<?php

namespace App\Services\Twilio;

use App\Messaging\Inbound\InboundAttachment;
use App\Messaging\Inbound\InboundMessage;
use App\Messaging\Inbound\InboundMessageWriter;
use App\Messaging\Inbound\InboundSender;
use App\Models\Channel\TwilioSms;
use App\Models\Message;

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

        $sourceId = (string) ($this->params['From'] ?? '');
        $phoneNumber = $this->phoneNumber($channel);

        $sender = new InboundSender(
            sourceId: $sourceId,
            name: $this->params['ProfileName'] ?? $phoneNumber ?? $sourceId,
            phoneNumber: $phoneNumber,
            additionalAttributes: $this->additionalAttributes($channel),
        );

        // Tên có thể tới ở tin sau, kể cả khi tin đó là webhook Twilio gửi lại (bị chống trùng).
        $this->updateContactNameIfNeeded($channel, $sourceId);

        return app(InboundMessageWriter::class)->write($channel->inbox, $sender, new InboundMessage(
            sourceId: isset($this->params['SmsSid']) ? (string) $this->params['SmsSid'] : null,
            text: str_replace("\0", '', (string) ($this->params['Body'] ?? '')),
            attachments: [...$this->mediaAttachments($channel), ...$this->locationAttachment()],
            conversationAttributes: $this->additionalAttributes($channel),
        ));
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
    private function updateContactNameIfNeeded(TwilioSms $channel, string $sourceId): void
    {
        $profileName = $this->params['ProfileName'] ?? null;
        $phoneNumber = $this->phoneNumber($channel);

        if (blank($profileName) || blank($phoneNumber)) {
            return;
        }

        $contact = $channel->inbox->contactInboxes()->where('source_id', $sourceId)->first()?->contact;

        if ($contact === null || $contact->name !== $phoneNumber) {
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

    /**
     * URL media của Twilio cần basic auth của kênh nên không đưa ra trình duyệt.
     *
     * @return list<InboundAttachment>
     */
    private function mediaAttachments(TwilioSms $channel): array
    {
        $specs = [];

        for ($index = 0, $count = (int) ($this->params['NumMedia'] ?? 0); $index < $count; $index++) {
            $mediaUrl = $this->params["MediaUrl{$index}"] ?? null;

            if (filled($mediaUrl)) {
                $specs[] = InboundAttachment::download((string) $mediaUrl, basicAuth: [$channel->account_sid, $channel->auth_token]);
            }
        }

        return $specs;
    }

    /** @return list<InboundAttachment> */
    private function locationAttachment(): array
    {
        if (($this->params['MessageType'] ?? null) !== 'location'
            || blank($this->params['Latitude'] ?? null) || blank($this->params['Longitude'] ?? null)) {
            return [];
        }

        return [InboundAttachment::location((float) $this->params['Latitude'], (float) $this->params['Longitude'])];
    }
}
