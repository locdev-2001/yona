<?php

namespace App\Services\Tiktok;

use App\Builders\ContactInboxWithContactBuilder;
use App\Models\Attachment;
use App\Models\Channel\Tiktok;
use App\Models\Message;
use App\Services\Channels\IncomingConversationResolver;
use App\Services\Channels\RemoteAttachmentDownloader;
use Illuminate\Support\Carbon;

class MessageService
{
    /** @param array<string, mixed> $content khối `content` đã giải mã của webhook TikTok. */
    public function __construct(
        private readonly Tiktok $channel,
        private readonly array $content,
        private readonly bool $outgoingEcho = false,
    ) {}

    public function perform(): ?Message
    {
        if ($this->isOutgoing() && $this->findExistingMessage() !== null) {
            return null;
        }

        $inbox = $this->channel->inbox;
        $isIncoming = ! $this->isOutgoing();

        $contactInbox = (new ContactInboxWithContactBuilder(
            inbox: $inbox,
            contactAttributes: [
                'name' => $isIncoming ? $this->content['from'] : $this->content['to'],
                'additional_attributes' => $this->contactAdditionalAttributes($isIncoming),
            ],
            sourceId: (string) $this->content['conversation_id'],
        ))->perform();

        if ($contactInbox === null) {
            return null;
        }

        $conversation = IncomingConversationResolver::resolve($contactInbox, [
            'conversation_id' => $this->content['conversation_id'],
        ]);

        $timestamp = Carbon::createFromTimestampMs((int) $this->content['timestamp']);

        $message = $conversation->messages()->make([
            'content' => $this->messageContent(),
            'account_id' => $inbox->account_id,
            'inbox_id' => $inbox->id,
            'message_type' => $isIncoming ? Message::TYPE_INCOMING : Message::TYPE_OUTGOING,
            'content_attributes' => $this->contentAttributes(),
            'source_id' => (string) $this->content['message_id'],
            'created_at' => $timestamp,
            'updated_at' => $timestamp,
        ]);

        if ($isIncoming && ! $this->outgoingEcho) {
            $message->sender()->associate($contactInbox->contact);
        }

        if (! $isIncoming) {
            $message->status = Message::STATUSES['delivered'];
        }

        // Gốc: `create_message_attachments(message)` rồi mới `message.save!`
        // (tiktok/message_service.rb:49-50).
        $this->attachImage($message);
        $this->attachSharePost($message);

        $message->save();

        return $message;
    }

    private function findExistingMessage(): ?Message
    {
        $message = Message::query()->where('source_id', $this->content['message_id'] ?? '')->first();

        if ($message === null) {
            return null;
        }

        return data_get($message->conversation->additional_attributes, 'conversation_id') === ($this->content['conversation_id'] ?? null)
            ? $message
            : null;
    }

    // Tin do chính doanh nghiệp gửi thì `to_user.id` không phải business của kênh.
    private function isOutgoing(): bool
    {
        return $this->channel->business_id !== (string) data_get($this->content, 'to_user.id');
    }

    /** @return array<string, mixed> */
    private function contactAdditionalAttributes(bool $isIncoming): array
    {
        $username = $isIncoming ? $this->content['from'] : $this->content['to'];
        $userId = $isIncoming ? data_get($this->content, 'from_user.id') : data_get($this->content, 'to_user.id');

        return [
            'username' => $username,
            'social_profiles' => ['tiktok' => $username],
            'social_tiktok_user_id' => $userId,
            'social_tiktok_user_name' => $username,
        ];
    }

    private function messageContent(): ?string
    {
        return $this->content['type'] === 'text' ? data_get($this->content, 'text.body') : null;
    }

    /** @return array<string, mixed> */
    private function contentAttributes(): array
    {
        $attributes = [];
        $referenced = data_get($this->content, 'referenced_message_info.referenced_message_id');

        if (filled($referenced)) {
            $attributes['in_reply_to_external_id'] = $referenced;
        }

        if (! in_array($this->content['type'], ['text', 'image', 'share_post'], true)) {
            $attributes['is_unsupported'] = true;
        }

        if ($this->outgoingEcho) {
            $attributes['external_echo'] = true;
        }

        return $attributes;
    }

    private function attachImage(Message $message): void
    {
        if ($this->content['type'] !== 'image') {
            return;
        }

        $downloadUrl = (new TiktokClient($this->channel))->fileDownloadUrl(
            (string) $this->content['conversation_id'],
            (string) $this->content['message_id'],
            (string) data_get($this->content, 'image.media_id'),
        );

        if (blank($downloadUrl)) {
            return;
        }

        $attributes = RemoteAttachmentDownloader::download($downloadUrl, $message->account_id);

        if ($attributes === null) {
            // URL tải của TikTok cần header `x-user` mang access token của kênh.
            $message->pendingAttachments[] = new Attachment(
                RemoteAttachmentDownloader::fallbackAttributes($message->account_id),
            );

            return;
        }

        $attributes['file_type'] = Attachment::FILE_TYPE_IMAGE;
        $message->pendingAttachments[] = new Attachment($attributes);
    }

    private function attachSharePost(Message $message): void
    {
        if ($this->content['type'] !== 'share_post') {
            return;
        }

        $message->pendingAttachments[] = new Attachment([
            'account_id' => $message->account_id,
            'file_type' => Attachment::FILE_TYPE_EMBED,
            'external_url' => data_get($this->content, 'share_post.embed_url'),
        ]);
    }
}
