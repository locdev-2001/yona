<?php

namespace App\Builders\Messages;

use App\Exceptions\MessageValidationException;
use App\Models\AgentBot;
use App\Models\Attachment;
use App\Models\Contact;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use App\Support\BooleanParam;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

// Port từ refs/chatwoot/app/builders/messages/message_builder.rb.
// Bỏ: xử lý email cc/bcc + html/liquid (F1),
// template_params (kênh WhatsApp F5).
class MessageBuilder
{
    private ?Message $message = null;

    /**
     * $incomingAllowed: người gửi CHÍNH LÀ khách (widget website). Bản gốc bỏ
     * qua builder cho luồng đó và tạo message trực tiếp; ở đây giữ một đường
     * tạo tin duy nhất nên cửa vào phải tự khai quyền tạo tin `incoming`.
     *
     * @param  array<string, mixed>  $params
     */
    public function __construct(
        private readonly User|AgentBot|null $user,
        private readonly Conversation $conversation,
        private readonly array $params,
        private readonly bool $incomingAllowed = false,
    ) {}

    public function perform(): Message
    {
        $this->message = new Message($this->messageParams());
        $this->message->echoId = isset($this->params['echo_id']) ? (string) $this->params['echo_id'] : null;
        $this->message->sender()->associate($this->sender());

        // Rails validate cả attachments rồi mới save! — dựng + kiểm trước khi
        // tin tồn tại để tệp hỏng không đẻ ra tin rỗng.
        $this->message->pendingAttachments = $this->buildAttachments();

        $this->message->save();

        return $this->message;
    }

    /**
     * process_attachments — mỗi phần tử là UploadedFile (multipart) hoặc chuỗi
     * signed_id của endpoint upload trực tiếp.
     *
     * @return list<Attachment>
     */
    private function buildAttachments(): array
    {
        $uploads = $this->params['attachments'] ?? null;

        if (blank($uploads)) {
            return [];
        }

        $attachments = [];

        try {
            foreach (is_array($uploads) ? $uploads : [$uploads] as $upload) {
                Message::guardAttachmentsLimit(count($attachments));
                $attachments[] = $attachment = $this->buildAttachment($upload);
                $attachment->validateFile();
            }
        } catch (MessageValidationException $exception) {
            $this->discardStoredFiles($attachments);

            throw $exception;
        }

        return $attachments;
    }

    private function buildAttachment(mixed $upload): Attachment
    {
        $attributes = $upload instanceof UploadedFile
            ? Attachment::storeUpload($upload, $this->conversation->account_id)
            : Attachment::resolveSignedUpload((string) $upload, $this->conversation->account_id);

        $attachment = new Attachment($attributes);
        $attachment->setRelation('attachable', $this->message);
        $this->tagVoiceMessage($attachment);

        return $attachment;
    }

    private function tagVoiceMessage(Attachment $attachment): void
    {
        $isVoiceMessage = filter_var($this->params['is_voice_message'] ?? false, FILTER_VALIDATE_BOOLEAN);

        if (! $isVoiceMessage || $attachment->file_type !== Attachment::FILE_TYPE_AUDIO) {
            return;
        }

        $attachment->meta = [...($attachment->meta ?? []), 'is_voice_message' => true];
    }

    /** @param list<Attachment> $attachments */
    private function discardStoredFiles(array $attachments): void
    {
        foreach ($attachments as $attachment) {
            if ($attachment->path) {
                Storage::disk($attachment->disk)->delete($attachment->path);
            }
        }
    }

    /** @return array<string, mixed> */
    private function messageParams(): array
    {
        $attributes = [
            'account_id' => $this->conversation->account_id,
            'inbox_id' => $this->conversation->inbox_id,
            'message_type' => $this->messageType(),
            'content' => $this->params['content'] ?? null,
            'private' => BooleanParam::from($this->params['private'] ?? null),
            'content_type' => Message::contentTypeFromName($this->params['content_type'] ?? null),
            'source_id' => $this->params['source_id'] ?? null,
        ];

        $contentAttributes = $this->contentAttributes();

        if ($contentAttributes !== []) {
            $attributes['content_attributes'] = $contentAttributes;
        }

        // campaign_id: tin do campaign nhả ra không phải "human response".
        if (filled($this->params['campaign_id'] ?? null)) {
            $attributes['additional_attributes'] = ['campaign_id' => $this->params['campaign_id']];
        }

        // conversation.messages.build — gán quan hệ trước khi save.
        $attributes['conversation_id'] = $this->conversation->id;

        return $attributes;
    }

    private function messageType(): int
    {
        $requested = $this->params['message_type'] ?? 'outgoing';

        if (! $this->incomingAllowed && $this->conversation->inbox->channel_type !== 'Channel::Api' && $requested === 'incoming') {
            throw new MessageValidationException('Incoming messages are only allowed in Api inboxes');
        }

        $messageType = Message::typeFromName($requested);

        if ($messageType === null) {
            throw new MessageValidationException("'{$requested}' is not a valid message_type");
        }

        return $messageType;
    }

    private function sender(): User|Contact|AgentBot|null
    {
        return $this->messageType() === Message::TYPE_OUTGOING
            ? $this->user
            : $this->conversation->contact;
    }

    /**
     * Chuỗi JSON → array; array giữ nguyên; kiểu khác → rỗng (y bản gốc).
     *
     * @return array<string, mixed>
     */
    private function contentAttributes(): array
    {
        $contentAttributes = $this->params['content_attributes'] ?? [];

        if (is_string($contentAttributes)) {
            $decoded = json_decode($contentAttributes, true);

            return is_array($decoded) ? $decoded : [];
        }

        return is_array($contentAttributes) ? $contentAttributes : [];
    }
}
