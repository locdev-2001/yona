<?php

namespace App\Mailboxes\Concerns;

use App\Builders\ContactInboxWithContactBuilder;
use App\Models\Attachment;
use App\Models\Message;
use ZBateson\MailMimeParser\Message\IMessagePart;

/**
 * Port từ refs/chatwoot/app/mailboxes/mailbox_helper.rb (+ inline attachment helper):
 * biến một thư đã parse thành message + contact + tệp đính kèm của hội thoại.
 * Lớp dùng trait phải có $conversation, $inbox, $processedMail và $message.
 */
trait MailboxHelper
{
    use MailboxSanitizer;

    private ?string $htmlContentBuffer = null;

    private ?string $textContentBuffer = null;

    protected function createMessage(): void
    {
        $sourceId = (string) $this->sanitize($this->processedMail->messageId());

        if ($this->conversation->messages()->where('source_id', $sourceId)->exists()) {
            return;
        }

        $this->message = $message = new Message($this->sanitizedMessageAttributes($sourceId));
        $message->conversation_id = $this->conversation->id;
        $message->sender()->associate($this->conversation->contact);
        $message->save();
    }

    protected function addAttachmentsToMessage(): void
    {
        if ($this->message === null) {
            return;
        }

        $this->loadEmailContent();

        $parts = array_slice($this->processedMail->attachmentParts(), -Message::NUMBER_OF_PERMITTED_ATTACHMENTS);
        $grouped = $this->groupAttachments($parts);

        if ($grouped['inline'] !== []) {
            $this->processInlineAttachments($grouped['inline']);
        }

        if ($grouped['regular'] !== []) {
            $this->processRegularAttachments($grouped['regular']);
        }

        $this->message->save();
    }

    /**
     * @param  list<IMessagePart>  $parts
     * @return array{inline: list<IMessagePart>, regular: list<IMessagePart>}
     */
    private function groupAttachments(array $parts): array
    {
        $inline = array_values(array_filter($parts, fn (IMessagePart $part) => $this->isInlineAttachment($part)));
        $regular = array_values(array_filter($parts, fn (IMessagePart $part) => ! in_array($part, $inline, true)));

        return ['inline' => $inline, 'regular' => $regular];
    }

    /** @param list<IMessagePart> $parts */
    private function processRegularAttachments(array $parts): void
    {
        foreach ($parts as $part) {
            $this->message->attachments()->create($this->storeAttachmentPart($part));
        }
    }

    /** @param list<IMessagePart> $parts */
    private function processInlineAttachments(array $parts): void
    {
        foreach ($parts as $part) {
            $this->embedInlineImageSource($part);
        }

        $contentAttributes = $this->message->content_attributes;
        $contentAttributes['email']['html_content']['full'] = $this->htmlContentBuffer;
        $contentAttributes['email']['text_content']['full'] = $this->textContentBuffer;
        $this->message->content_attributes = $contentAttributes;
    }

    private function embedInlineImageSource(IMessagePart $part): void
    {
        $attachment = $this->message->attachments()->create($this->storeAttachmentPart($part));
        $imageUrl = $attachment->fileUrl();

        if (filled($this->htmlContentBuffer)) {
            foreach ($this->cidPatternsFor((string) $part->getContentId()) as $pattern) {
                $this->htmlContentBuffer = (string) preg_replace($pattern, $imageUrl, (string) $this->htmlContentBuffer);
            }

            return;
        }

        $this->embedPlainTextInlineImage($part, $imageUrl);
    }

    private function embedPlainTextInlineImage(IMessagePart $part, string $imageUrl): void
    {
        $filename = (string) $part->getFilename();
        $imgTag = '<img src="'.$imageUrl.'" alt="'.$filename.'">';
        $tagToReplace = '[image: '.$filename.']';

        $this->textContentBuffer = str_contains((string) $this->textContentBuffer, $tagToReplace)
            ? str_replace($tagToReplace, $imgTag, (string) $this->textContentBuffer)
            : $this->textContentBuffer."\n\n".$imgTag;
    }

    private function loadEmailContent(): void
    {
        $serialized = $this->processedMail->serializedData();
        $this->htmlContentBuffer = $serialized['html_content']['full'] ?? null;
        $this->textContentBuffer = $serialized['text_content']['reply'] ?? null;
    }

    /**
     * Ảnh chỉ được coi là inline khi thân HTML thật sự trỏ tới cid của nó;
     * ảnh gắn cờ inline mà không ai tham chiếu thì thành tệp đính kèm thường.
     */
    private function isInlineAttachment(IMessagePart $part): bool
    {
        if (blank($this->mailContent()) || ! str_starts_with((string) $part->getContentType(), 'image/')) {
            return false;
        }

        if (blank($this->htmlContentBuffer)) {
            return $part->getContentDisposition() === 'inline';
        }

        $contentId = $part->getContentId();

        return filled($contentId) && $this->bodyReferencesCid((string) $contentId);
    }

    private function bodyReferencesCid(string $contentId): bool
    {
        foreach ($this->cidPatternsFor($contentId) as $pattern) {
            if (preg_match($pattern, (string) $this->htmlContentBuffer) === 1) {
                return true;
            }
        }

        return false;
    }

    /**
     * RFC 2392 cho phép cid trong URL ở dạng đã url-encode; scheme không phân
     * biệt hoa thường còn chính Content-ID thì có.
     *
     * @return list<string>
     */
    private function cidPatternsFor(string $contentId): array
    {
        $encoded = rawurlencode($contentId);
        $lowercaseEncoded = (string) preg_replace_callback(
            '/%[0-9A-F]{2}/',
            fn (array $matches) => strtolower($matches[0]),
            $encoded
        );

        return collect([$contentId, $encoded, $lowercaseEncoded])
            ->unique()
            ->map(fn (string $value) => '/(?i:cid):'.preg_quote($value, '/').'/')
            ->values()
            ->all();
    }

    /** @return array<string, mixed> */
    private function storeAttachmentPart(IMessagePart $part): array
    {
        $filename = (string) $part->getFilename();

        if (blank($filename)) {
            $filename = 'attachment_'.bin2hex(random_bytes(4));
        }

        return Attachment::storeContents(
            contents: (string) $part->getContent(),
            filename: $filename,
            contentType: $part->getContentType(),
            accountId: $this->conversation->account_id,
        );
    }

    protected function createContact(): void
    {
        $senderEmail = (string) $this->sanitize($this->processedMail->originalSender());
        $messageId = (string) $this->sanitize($this->processedMail->messageId());

        $this->contactInbox = (new ContactInboxWithContactBuilder(
            inbox: $this->inbox,
            contactAttributes: [
                'name' => $this->sanitize($this->identifyContactName()),
                'email' => $senderEmail,
                'additional_attributes' => ['source_id' => 'email:'.$messageId],
            ],
            sourceId: $senderEmail,
        ))->perform();

        $this->contact = $this->contactInbox->contact;
    }

    protected function mailContent(): ?string
    {
        $text = $this->processedMail->textContent();

        if ($text !== []) {
            return $text['reply'];
        }

        $html = $this->processedMail->htmlContent();

        return $html === [] ? null : $html['reply'];
    }

    protected function identifyContactName(): ?string
    {
        return $this->processedMail->senderName()
            ?? explode('@', $this->processedMail->from()[0] ?? '')[0];
    }
}
