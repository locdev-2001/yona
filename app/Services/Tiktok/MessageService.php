<?php

namespace App\Services\Tiktok;

use App\Messaging\Inbound\AttachmentKind;
use App\Messaging\Inbound\InboundAttachment;
use App\Messaging\Inbound\InboundDirection;
use App\Messaging\Inbound\InboundMessage;
use App\Messaging\Inbound\InboundMessageWriter;
use App\Messaging\Inbound\InboundSender;
use App\Messaging\Inbound\ReplyReference;
use App\Models\Channel\Tiktok;
use App\Models\Message;
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
        $isIncoming = ! $this->isOutgoing();
        $username = $isIncoming ? $this->content['from'] : $this->content['to'];
        $userId = $isIncoming ? data_get($this->content, 'from_user.id') : data_get($this->content, 'to_user.id');

        $sender = new InboundSender(
            sourceId: (string) $this->content['conversation_id'],
            name: $username,
            additionalAttributes: [
                'username' => $username,
                'social_profiles' => ['tiktok' => $username],
                'social_tiktok_user_id' => $userId,
                'social_tiktok_user_name' => $username,
            ],
        );

        return app(InboundMessageWriter::class)->write($this->channel->inbox, $sender, $this->inboundMessage($isIncoming));
    }

    // Tin do chính doanh nghiệp gửi thì `to_user.id` không phải business của kênh.
    private function isOutgoing(): bool
    {
        return $this->channel->business_id !== (string) data_get($this->content, 'to_user.id');
    }

    private function inboundMessage(bool $isIncoming): InboundMessage
    {
        $type = $this->content['type'];
        $referenced = data_get($this->content, 'referenced_message_info.referenced_message_id');

        return new InboundMessage(
            sourceId: (string) $this->content['message_id'],
            direction: $isIncoming ? InboundDirection::Incoming : InboundDirection::Echo,
            text: $type === 'text' ? data_get($this->content, 'text.body') : null,
            sentAt: Carbon::createFromTimestampMs((int) $this->content['timestamp']),
            attachments: $this->attachments($type),
            replyTo: filled($referenced) ? new ReplyReference((string) $referenced) : null,
            attributes: array_filter([
                'is_unsupported' => in_array($type, ['text', 'image', 'share_post'], true) ? null : true,
            ]),
            conversationAttributes: ['conversation_id' => $this->content['conversation_id']],
        );
    }

    /** @return list<InboundAttachment> */
    private function attachments(string $type): array
    {
        if ($type === 'share_post') {
            return [InboundAttachment::external((string) data_get($this->content, 'share_post.embed_url'), AttachmentKind::Embed)];
        }

        if ($type !== 'image') {
            return [];
        }

        $downloadUrl = (new TiktokClient($this->channel))->fileDownloadUrl(
            (string) $this->content['conversation_id'],
            (string) $this->content['message_id'],
            (string) data_get($this->content, 'image.media_id'),
        );

        // URL tải của TikTok cần header `x-user` mang access token của kênh — không đưa ra ngoài.
        return blank($downloadUrl) ? [] : [InboundAttachment::download((string) $downloadUrl, AttachmentKind::Image, urlIsPublic: false)];
    }
}
