<?php

namespace App\Services\Integrations\Slack;

use App\Jobs\Integrations\SlackUnfurlJob;
use App\Models\Attachment;
use App\Models\Conversation;
use App\Models\Integrations\Hook;
use App\Models\Message;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

// Dựng tin từ sự kiện Slack; phần helper gộp chung một chỗ vì chỉ dùng ở đây.
class IncomingMessageBuilder
{
    private const SUPPORTED_EVENT_TYPES = ['event_callback', 'url_verification'];

    private const SUPPORTED_EVENTS = ['message', 'link_shared'];

    private const SUPPORTED_MESSAGE_TYPES = ['rich_text'];

    private ?Hook $integrationHook = null;

    private bool $integrationHookResolved = false;

    private ?Conversation $conversation = null;

    private bool $conversationResolved = false;

    /** @param array<string, mixed> $params */
    public function __construct(private readonly array $params) {}

    /** @return array<string, mixed>|null */
    public function perform(): ?array
    {
        if (! $this->validEvent()) {
            return null;
        }

        if ($this->hookVerification()) {
            return $this->verifyHook();
        }

        if ($this->processMessagePayload()) {
            return $this->handleMessagePayload();
        }

        if ($this->linkShared()) {
            SlackUnfurlJob::dispatch($this->params);
        }

        return null;
    }

    private function validEvent(): bool
    {
        return $this->supportedEventType() && $this->supportedEvent() && $this->shouldProcessEvent();
    }

    private function supportedEventType(): bool
    {
        return in_array($this->params['type'] ?? null, self::SUPPORTED_EVENT_TYPES, true);
    }

    // Bỏ mọi subtype của event `message` (tin chỉnh sửa, xóa, reaction, bot…) —
    // chỉ giữ tin người dùng Slack gõ trực tiếp (event/message#subtypes).
    private function shouldProcessEvent(): bool
    {
        if (($this->params['type'] ?? null) !== 'event_callback') {
            return true;
        }

        return filled(data_get($this->params, 'event.user')) && $this->validEventSubtype();
    }

    private function validEventSubtype(): bool
    {
        $subtype = data_get($this->params, 'event.subtype');

        return blank($subtype) || $subtype === 'file_share';
    }

    private function supportedEvent(): bool
    {
        return $this->hookVerification() || in_array(data_get($this->params, 'event.type'), self::SUPPORTED_EVENTS, true);
    }

    private function supportedMessage(): bool
    {
        $message = $this->messageBlock();

        if ($message !== null) {
            return in_array($message['type'] ?? null, self::SUPPORTED_MESSAGE_TYPES, true) && ! $this->attachedFileMessage();
        }

        return filled(data_get($this->params, 'event.files')) && ! $this->attachedFileMessage();
    }

    private function hookVerification(): bool
    {
        return ($this->params['type'] ?? null) === 'url_verification';
    }

    private function threadTimestampAvailable(): bool
    {
        return filled(data_get($this->params, 'event.thread_ts'));
    }

    private function processMessagePayload(): bool
    {
        return $this->threadTimestampAvailable() && $this->supportedMessage() && $this->integrationHook() !== null;
    }

    private function linkShared(): bool
    {
        return data_get($this->params, 'event.type') === 'link_shared';
    }

    private function messageBlock(): ?array
    {
        return data_get($this->params, 'event.blocks.0');
    }

    /** @return array{challenge: mixed} */
    private function verifyHook(): array
    {
        return ['challenge' => $this->params['challenge'] ?? null];
    }

    // "Attached File!" là chú thích tự sinh khi hệ thống gửi tệp ra Slack — bỏ
    // qua để tin đó không quay vòng thành một tin nhắn mới trong hội thoại.
    private function attachedFileMessage(): bool
    {
        return data_get($this->params, 'event.text') === 'Attached File!';
    }

    private function integrationHook(): ?Hook
    {
        if (! $this->integrationHookResolved) {
            $this->integrationHook = Hook::query()->where('reference_id', data_get($this->params, 'event.channel'))->first();
            $this->integrationHookResolved = true;
        }

        return $this->integrationHook;
    }

    /** @return array{status: string}|null */
    private function handleMessagePayload(): ?array
    {
        if ($this->conversation() === null) {
            return null;
        }

        try {
            if (! $this->messageExists()) {
                $this->createMessage();
            }

            return ['status' => 'success'];
        } catch (SlackApiException $e) {
            if ($e->isMissingScope()) {
                Log::error("Slack: Missing scope error: {$e->getMessage()}");
                $this->integrationHook()->promptReauthorization();
                $this->integrationHook()->disable();

                return null;
            }

            throw $e;
        }
    }

    private function conversation(): ?Conversation
    {
        if (! $this->conversationResolved) {
            $this->conversation = Conversation::query()->where('identifier', data_get($this->params, 'event.thread_ts'))->first();
            $this->conversationResolved = true;
        }

        return $this->conversation;
    }

    private function messageExists(): bool
    {
        $ts = data_get($this->params, 'event.ts');

        return $this->conversation()->messages()->where('external_source_ids->slack', $ts)->exists();
    }

    private function createMessage(): void
    {
        [$resolvedSender, $senderName, $senderAvatarUrl] = $this->resolveSlackSender();

        $additionalAttributes = [
            ...($senderName !== null ? ['sender_name' => $senderName] : []),
            ...($senderAvatarUrl !== null ? ['sender_avatar_url' => $senderAvatarUrl] : []),
        ];

        $conversation = $this->conversation();

        $message = $conversation->messages()->make([
            'message_type' => Message::TYPE_OUTGOING,
            'account_id' => $conversation->account_id,
            'inbox_id' => $conversation->inbox_id,
            'content' => $this->formattedMessageContent(),
            'external_source_ids' => ['slack' => data_get($this->params, 'event.ts')],
            'private' => $this->privateNote(),
            'additional_attributes' => $additionalAttributes,
        ]);

        if ($resolvedSender !== null) {
            $message->sender()->associate($resolvedSender);
        }

        if (filled(data_get($this->params, 'event.files'))) {
            $this->processAttachments($message, data_get($this->params, 'event.files'));
        }

        $message->save();
    }

    /** @return array{0: mixed, 1: ?string, 2: ?string} */
    private function resolveSlackSender(): array
    {
        $slackUserId = data_get($this->params, 'event.user');

        if (blank($slackUserId)) {
            return [null, null, null];
        }

        try {
            $slackUser = $this->slackClient()->usersInfo($slackUserId)['user'] ?? [];
            $email = data_get($slackUser, 'profile.email');
            $matchingAgent = blank($email)
                ? null
                : $this->conversation()->account->users()->where('email', mb_strtolower($email))->first();

            if ($matchingAgent !== null) {
                return [$matchingAgent, null, null];
            }

            $senderName = data_get($slackUser, 'profile.display_name');
            $senderName = filled($senderName) ? $senderName : data_get($slackUser, 'real_name');
            $senderName = filled($senderName) ? $senderName : data_get($slackUser, 'name');

            $senderAvatarUrl = data_get($slackUser, 'profile.image_192');

            return [null, $senderName, filled($senderAvatarUrl) ? $senderAvatarUrl : null];
        } catch (SlackApiException $e) {
            if ($e->isMissingScope()) {
                throw $e;
            }

            return [null, null, null];
        } catch (\Throwable) {
            return [null, null, null];
        }
    }

    private function formattedMessageContent(): ?string
    {
        $text = SlackFormatting::unescape((string) (data_get($this->params, 'event.text') ?? ''));

        return EmojiFormatter::format($text);
    }

    private function privateNote(): bool
    {
        $text = mb_strtolower(trim((string) data_get($this->params, 'event.text')));

        return Str::startsWith($text, ['note:', 'private:']);
    }

    /** @param list<array<string, mixed>> $files */
    private function processAttachments(Message $message, array $files): void
    {
        foreach ($files as $file) {
            $content = Http::withHeaders(['Authorization' => "Bearer {$this->integrationHook()->access_token}"])
                ->get($file['url_private'])
                ->body();

            $attachment = new Attachment(Attachment::storeContents(
                $content,
                $file['name'] ?? basename((string) $file['url_private']),
                $file['mimetype'] ?? null,
                $message->account_id,
            ));

            $fileType = $this->fileType($file);

            if ($fileType !== null) {
                $attachment->file_type = $fileType;
            }

            $message->pendingAttachments[] = $attachment;
        }
    }

    // Integrations::Slack::SlackMessageHelper#file_type.
    private function fileType(array $attachment): ?int
    {
        if (($attachment['mimetype'] ?? null) === 'text/plain') {
            return null;
        }

        return match ($attachment['filetype'] ?? null) {
            'png', 'jpeg', 'gif', 'bmp', 'tiff', 'jpg' => Attachment::FILE_TYPE_IMAGE,
            'mp4', 'avi', 'mov', 'wmv', 'flv', 'webm' => Attachment::FILE_TYPE_VIDEO,
            default => Attachment::FILE_TYPE_FILE,
        };
    }

    private function slackClient(): SlackClient
    {
        return new SlackClient($this->integrationHook()?->access_token);
    }
}
