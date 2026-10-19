<?php

namespace App\Builders\Messages;

use App\Exceptions\MessageValidationException;
use App\Messaging\Structured\PayloadContext;
use App\Messaging\Structured\StructuredTypeRegistry;
use App\Models\AgentBot;
use App\Models\Attachment;
use App\Models\Contact;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use App\Services\Messages\StickerMessageBuilder;
use App\Support\BooleanParam;
use App\Support\EmailAddress;
use App\Support\Messages\OutgoingText;
use Illuminate\Http\UploadedFile;

// Bỏ: template_params (kênh WhatsApp F5).
class MessageBuilder
{
    /**
     * Khoá `content_attributes` chỉ máy chủ được ghi: client gửi lên thì bị bỏ, để
     * không ai giả được payload đi thẳng ra kênh hay dấu chuyển tiếp.
     */
    /**
     * Khoá chỉ server được ghi. `submitted_values` đi qua SubmissionService,
     * `in_reply_to_choice` do chính service đó gắn vào tin trả lời của khách.
     */
    public const SERVER_OWNED_CONTENT_ATTRIBUTES = ['sticker', 'forwarded_from', 'submitted_values', 'in_reply_to_choice'];

    private ?Message $message = null;

    // Hội thoại thật sự nhận tin: dòng riêng của luồng dùng chung chuyển tin gửi đi về hội thoại gốc.
    private readonly Conversation $conversation;

    /**
     * $incomingAllowed: người gửi CHÍNH LÀ khách (widget website). Bản gốc bỏ
     * qua builder cho luồng đó và tạo message trực tiếp; ở đây giữ một đường
     * tạo tin duy nhất nên cửa vào phải tự khai quyền tạo tin `incoming`.
     *
     * $trustedContentAttributes: khoá do chính code máy chủ ghi (vd dấu chuyển
     * tiếp), không bao giờ lấy từ request.
     *
     * @param  array<string, mixed>  $params
     * @param  array<string, mixed>  $trustedContentAttributes
     */
    public function __construct(
        private readonly User|AgentBot|null $user,
        Conversation $conversation,
        private readonly array $params,
        private readonly bool $incomingAllowed = false,
        private readonly array $trustedContentAttributes = [],
    ) {
        $this->conversation = $conversation->messageTargetFor(BooleanParam::from($params['private'] ?? null));
    }

    public function perform(): Message
    {
        $this->message = new Message($this->messageParams());
        $this->message->echoId = isset($this->params['echo_id']) ? (string) $this->params['echo_id'] : null;
        $this->message->sender()->associate($this->sender());

        // Sticker dựng tin trước khi lưu tệp: bị từ chối thì không để lại tệp mồ côi.
        (new StickerMessageBuilder($this->message, $this->conversation->inbox, $this->params))->perform();
        // Sau mọi bước dựng lại content_attributes (sticker) để khoá tin cậy không bị xoá mất.
        $this->applyTrustedContentAttributes();

        // Rails validate cả attachments rồi mới save! — dựng + kiểm trước khi
        // tin tồn tại để tệp hỏng không đẻ ra tin rỗng.
        $this->message->pendingAttachments = [...$this->message->pendingAttachments, ...$this->buildAttachments()];

        $this->processEmails();
        $this->processEmailContent();

        $this->message->save();

        return $this->message;
    }

    private function applyTrustedContentAttributes(): void
    {
        if ($this->trustedContentAttributes === []) {
            return;
        }

        $this->message->content_attributes = [...$this->message->content_attributes ?? [], ...$this->trustedContentAttributes];
    }

    /**
     * process_emails — inbox email mang thêm danh sách người nhận; địa chỉ sai
     * định dạng dừng ngay tại đây thay vì làm hỏng thư lúc gửi.
     */
    private function processEmails(): void
    {
        if (! $this->conversation->inbox->isEmail()) {
            return;
        }

        $contentAttributes = $this->message->content_attributes ?? [];

        foreach (['cc_emails', 'bcc_emails', 'to_emails'] as $key) {
            $emails = $this->splitEmailString($this->params[$key] ?? null);

            foreach ($emails as $email) {
                if (! EmailAddress::isValid($email)) {
                    throw new MessageValidationException('Invalid email address');
                }
            }

            $contentAttributes[$key] = $emails;
        }

        $this->message->content_attributes = $contentAttributes;
    }

    /**
     * process_email_content — thân thư HTML/text của tin đi, dựng sẵn lúc tạo tin
     * để mọi đường đọc (gửi thư, transcript, webhook) dùng chung một bản.
     */
    private function processEmailContent(): void
    {
        if (! $this->conversation->inbox->isEmail() || $this->message->private || blank($this->message->content)) {
            return;
        }

        $contentAttributes = $this->message->content_attributes ?? [];
        $email = $contentAttributes['email'] ?? [];
        $normalizedContent = str_replace("\r\n", "\n", (string) $this->message->content);

        $html = filled($this->params['email_html_content'] ?? null)
            ? (string) $this->params['email_html_content']
            : (string) OutgoingText::render($normalizedContent, $this->conversation->inbox->capabilities()->textFormat());

        $email['html_content'] = [...($email['html_content'] ?? []), 'full' => $html, 'reply' => $html];
        $email['text_content'] = [
            ...($email['text_content'] ?? []),
            'full' => $normalizedContent,
            'reply' => $normalizedContent,
        ];

        $contentAttributes['email'] = $email;
        $this->message->content_attributes = $contentAttributes;
    }

    /** @return list<string> */
    private function splitEmailString(mixed $emailString): array
    {
        if (blank($emailString)) {
            return [];
        }

        if (is_array($emailString)) {
            return array_values(array_filter(array_map('trim', $emailString)));
        }

        return array_values(array_filter(explode(',', (string) preg_replace('/\s+/', '', (string) $emailString))));
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
                $this->validateChannelAttachmentSize($attachment);
            }
        } catch (MessageValidationException $exception) {
            $this->discardStoredFiles($attachments);

            throw $exception;
        }

        return $attachments;
    }

    // Kênh khai trần tệp riêng (vd Zalo) thì chặn ngay lúc đính kèm, không để tin
    // đi tới bridge rồi mới hỏng mà người gửi không biết.
    private function validateChannelAttachmentSize(Attachment $attachment): void
    {
        $limit = $this->conversation->inbox->capabilities()->maxAttachmentBytes();

        if ($limit === null || (int) $attachment->byte_size <= $limit) {
            return;
        }

        $megabytes = intdiv($limit, 1024 * 1024);
        $name = $attachment->filename ?: 'tệp';

        throw new MessageValidationException("Tệp \"{$name}\" vượt quá {$megabytes} MB, kênh này không gửi được. Hãy nén hoặc chia nhỏ tệp rồi gửi lại.");
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
        $isVoiceMessage = filter_var($this->params[Attachment::META_VOICE_MESSAGE] ?? false, FILTER_VALIDATE_BOOLEAN);

        if (! $isVoiceMessage || $attachment->file_type !== Attachment::FILE_TYPE_AUDIO) {
            return;
        }

        $attachment->meta = [...($attachment->meta ?? []), Attachment::META_VOICE_MESSAGE => true];
    }

    /** @param list<Attachment> $attachments */
    private function discardStoredFiles(array $attachments): void
    {
        foreach ($attachments as $attachment) {
            $attachment->discardStoredFile();
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

        $registry = app(StructuredTypeRegistry::class);
        $contentType = $this->params['content_type'] ?? null;
        $contentAttributes = $registry->prepare(
            $contentType,
            $attributes['content'],
            $this->contentAttributes(),
            new PayloadContext($this->conversation, $attributes['message_type'], $this->user),
        );

        // Tin có cấu trúc do khách gửi (yêu cầu đặt hàng…) mang luôn bản chữ thuần,
        // để tìm kiếm, automation, thông báo và kênh chữ đọc được như tin thường.
        $structured = $registry->for($contentType);

        if ($structured !== null && $attributes['message_type'] === Message::TYPE_INCOMING && blank($attributes['content'])) {
            $attributes['content'] = $structured->plainText(null, $contentAttributes);
        }

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
     * Chuỗi JSON → array; array giữ nguyên; kiểu khác → rỗng (y bản gốc). Khoá do
     * máy chủ sở hữu bị bỏ khỏi input.
     *
     * @return array<string, mixed>
     */
    private function contentAttributes(): array
    {
        $contentAttributes = $this->params['content_attributes'] ?? [];

        if (is_string($contentAttributes)) {
            $contentAttributes = json_decode($contentAttributes, true);
        }

        if (! is_array($contentAttributes)) {
            return [];
        }

        return array_diff_key($contentAttributes, array_flip(self::SERVER_OWNED_CONTENT_ATTRIBUTES));
    }
}
