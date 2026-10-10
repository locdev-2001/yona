<?php

namespace App\Builders\Messages\Facebook;

use App\Builders\ContactInboxWithContactBuilder;
use App\Builders\Messages\Messenger\BaseMessageBuilder;
use App\Messaging\Stickers\StickerMessage;
use App\Models\Attachment;
use App\Models\Inbox;
use App\Models\Message;
use App\Services\Channels\IncomingConversationResolver;
use App\Services\Channels\RemoteAttachmentDownloader;
use App\Services\Facebook\FacebookGraphClient;
use App\Services\Facebook\MessageParser;
use Illuminate\Support\Facades\DB;

/**
 * Tạo tin đến, và tin đi khi agent trả lời thẳng từ trang Facebook (echo).
 */
class MessageBuilder extends BaseMessageBuilder
{
    private string $senderId;

    public function __construct(
        private readonly MessageParser $response,
        private readonly Inbox $inbox,
        private readonly bool $outgoingEcho = false,
    ) {
        $this->senderId = (string) ($outgoingEcho ? $response->recipientId() : $response->senderId());
    }

    public function perform(): ?Message
    {
        if ($this->inbox->channel->reauthorizationRequired()) {
            return null;
        }

        return DB::transaction(function () {
            $contactInbox = (new ContactInboxWithContactBuilder(
                inbox: $this->inbox,
                contactAttributes: $this->contactParams(),
                sourceId: $this->senderId,
            ))->perform();

            if ($contactInbox === null) {
                return null;
            }

            $conversation = IncomingConversationResolver::resolve($contactInbox);

            $contentAttributes = ['in_reply_to_external_id' => $this->response->inReplyToExternalId()];

            if ($this->outgoingEcho) {
                $contentAttributes['external_echo'] = true;
            }

            $message = $conversation->messages()->make([
                'account_id' => $conversation->account_id,
                'inbox_id' => $conversation->inbox_id,
                'message_type' => $this->outgoingEcho ? Message::TYPE_OUTGOING : Message::TYPE_INCOMING,
                'status' => $this->outgoingEcho ? Message::STATUSES['delivered'] : Message::STATUSES['sent'],
                'content' => $this->response->content(),
                'source_id' => $this->response->identifier(),
                'content_attributes' => $contentAttributes,
            ]);

            if (! $this->outgoingEcho) {
                $message->sender()->associate($contactInbox->contact);
            }

            $sticker = $this->response->sticker();

            if ($sticker !== null) {
                StickerMessage::apply($message, $sticker, $this->downloadedStickerImage($message));
                $message->save();

                return $message;
            }

            $message->save();

            foreach ($this->response->attachments() as $attachment) {
                $this->processAttachment($message, $attachment);
            }

            return $message;
        });
    }

    private function downloadedStickerImage(Message $message): ?Attachment
    {
        $url = $this->response->stickerImageUrl();

        if (blank($url)) {
            return null;
        }

        $attributes = RemoteAttachmentDownloader::download((string) $url, $message->account_id);

        return $attributes === null ? null : new Attachment([...$attributes, 'file_type' => Attachment::FILE_TYPE_IMAGE]);
    }

    // Bài chia sẻ của Facebook trỏ tới trang web, không phải tệp tải được.
    protected function normalizeFileType(string $type): string
    {
        return in_array($type, ['share', 'post'], true) ? 'fallback' : parent::normalizeFileType($type);
    }

    /** @return array<string, mixed> */
    private function contactParams(): array
    {
        $profile = (new FacebookGraphClient($this->inbox->channel))->userProfile($this->senderId);

        return [
            'name' => $this->displayName($profile),
            'account_id' => $this->inbox->account_id,
            'avatar_url' => $profile['profile_pic'] ?? null,
        ];
    }

    /**
     * `name` là tên hiển thị theo đúng thứ tự chủ tài khoản đặt ("Nguyễn Phước Lộc");
     * ghép first/last kiểu Tây sẽ đảo họ tên và rơi mất tên đệm.
     *
     * @param  array<string, mixed>  $profile
     */
    private function displayName(array $profile): string
    {
        $name = trim((string) ($profile['name'] ?? ''));

        return $name !== '' ? $name : trim(($profile['first_name'] ?? 'John').' '.($profile['last_name'] ?? 'Doe'));
    }
}
