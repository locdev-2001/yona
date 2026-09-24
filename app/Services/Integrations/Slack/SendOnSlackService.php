<?php

namespace App\Services\Integrations\Slack;

use App\Models\Contact;
use App\Models\Integrations\Hook;
use App\Models\Message;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

// Đẩy một tin nhắn ra kênh Slack đã kết nối, và xử lý unfurl link riêng
// (message: null khi chỉ dùng để unfurl, xem SlackLinkUnfurlService).
class SendOnSlackService
{
    private ?array $slackMessage = null;

    public function __construct(
        private readonly ?Message $message,
        private readonly Hook $hook,
    ) {}

    public function perform(): void
    {
        // valid_channel_for_slack?: bản gốc chặn kênh Twitter/X — kênh đó chưa
        // port ở đây (nợ), nên coi mọi kênh đều hợp lệ.
        if (filled($this->message->external_source_ids['slack'] ?? null)) {
            return;
        }

        if ($this->invalidMessage()) {
            return;
        }

        $this->performReply();
    }

    // Integrations::Slack::SendOnSlackService#link_unfurl — dùng riêng khi trả
    // preview cho SlackLinkUnfurlService (message truyền vào là null).
    public function linkUnfurl(array $event): void
    {
        try {
            $this->slackClient()->chatUnfurl($event);
        } catch (SlackApiException $e) {
            if ($e->isMissingScope()) {
                Log::warning("Slack: Missing scope error: {$e->getMessage()}");

                return;
            }

            throw $e;
        }
    }

    private function invalidMessage(): bool
    {
        $conversation = $this->message->conversation;

        return ($this->message->isOutgoing() || $this->message->message_type === Message::TYPE_TEMPLATE)
            && blank($conversation->identifier);
    }

    private function performReply(): void
    {
        $this->sendMessage();

        if ($this->slackMessage === null) {
            return;
        }

        $this->updateReferenceId();
        $this->updateExternalSourceIdSlack();
    }

    private function sendMessage(): void
    {
        try {
            if (filled($this->messageContent())) {
                $this->postMessage();
            }

            if ($this->message->attachments->isNotEmpty()) {
                $this->uploadFiles();
            }
        } catch (SlackApiException $e) {
            if (! $e->requiresReauthorization()) {
                throw $e;
            }

            Log::error($e->getMessage());
            $this->hook->promptReauthorization();
            $this->hook->disable();
        }
    }

    private function postMessage(): void
    {
        $conversation = $this->message->conversation;

        $this->slackMessage = $this->slackClient()->chatPostMessage([
            'channel' => $this->hook->reference_id,
            'text' => $this->messageContent(),
            'username' => $this->senderName(),
            'thread_ts' => $conversation->identifier,
            'icon_url' => $this->avatarUrl(),
            'unfurl_links' => filled($conversation->identifier) ? 'true' : 'false',
        ]);
    }

    private function uploadFiles(): void
    {
        $files = $this->buildFilesArray();

        if ($files === []) {
            return;
        }

        try {
            $result = $this->slackClient()->filesUploadV2(
                $files,
                $this->hook->reference_id,
                $this->message->conversation->identifier,
                'Attached File!',
            );
            Log::info('slack_upload_result: '.json_encode($result));
        } catch (SlackApiException $e) {
            Log::error("Failed to upload files: {$e->getMessage()}");
        }
    }

    /** @return list<array{filename: string, content: string, title: string}> */
    private function buildFilesArray(): array
    {
        return $this->message->attachments
            ->filter(fn ($attachment) => $attachment->withAttachedFile())
            ->map(function ($attachment) {
                $content = Storage::disk($attachment->disk)->get($attachment->path);

                return $content === null ? null : [
                    'filename' => $attachment->filename,
                    'content' => $content,
                    'title' => $attachment->filename,
                ];
            })
            ->filter()
            ->values()
            ->all();
    }

    private function messageContent(): ?string
    {
        $conversation = $this->message->conversation;
        $privateIndicator = $this->message->private ? 'private: ' : '';
        $sanitizedContent = trim(strip_tags($this->formatMessageContent() ?? ''));

        if (filled($conversation->identifier)) {
            return "{$privateIndicator}{$sanitizedContent}";
        }

        return "{$this->formattedInboxName()}{$this->formattedConversationLink()}{$this->emailSubjectLine()}\n{$sanitizedContent}";
    }

    private function formatMessageContent(): ?string
    {
        $text = $this->messageText();

        return $this->message->message_type === Message::TYPE_ACTIVITY ? "_{$text}_" : $text;
    }

    private function messageText(): ?string
    {
        $content = $this->message->processed_message_content ?? $this->message->content;

        return SlackFormatting::stripMentionLinks($content);
    }

    private function formattedInboxName(): string
    {
        $inbox = $this->message->inbox;

        return "\n*Inbox:* {$inbox->name} ({$inbox->inboxType()})\n";
    }

    private function formattedConversationLink(): string
    {
        return "{$this->linkToConversation()} to view the conversation.\n";
    }

    private function linkToConversation(): string
    {
        $conversation = $this->message->conversation;
        $frontendUrl = rtrim((string) config('app.url'), '/');

        return "<{$frontendUrl}/app/accounts/{$conversation->account_id}/conversations/{$conversation->display_id}|Click here>";
    }

    private function emailSubjectLine(): string
    {
        if (! $this->message->inbox->isEmail()) {
            return '';
        }

        $subject = data_get($this->message->content_attributes, 'email.subject');

        return filled($subject) ? "*Subject:* {$subject}\n\n" : '';
    }

    // avatar_url của bản gốc đi qua route `/slack_uploads?blob_key=..` (chưa port,
    // nợ) — dùng thẳng URL tệp avatar đã lưu, tương đương về mặt chức năng.
    private function avatarUrl(): ?string
    {
        $sender = $this->message->sender;

        if ($sender === null || ! method_exists($sender, 'avatarUrl')) {
            return null;
        }

        $url = $sender->avatarUrl();

        return blank($url) ? null : $url;
    }

    private function senderName(): string
    {
        $sender = $this->message->sender;
        $type = $this->senderType($sender);

        return filled($sender?->name) ? "{$sender->name} ({$type})" : $type;
    }

    private function senderType(mixed $sender): string
    {
        return match (true) {
            $sender instanceof Contact => 'Contact',
            $sender instanceof User => 'Agent',
            $this->message->message_type === Message::TYPE_ACTIVITY && $sender === null => 'System',
            default => 'Bot',
        };
    }

    private function updateReferenceId(): void
    {
        if (! $this->shouldUpdateReferenceId()) {
            return;
        }

        $this->message->conversation->update(['identifier' => $this->slackMessage['ts']]);
    }

    private function updateExternalSourceIdSlack(): void
    {
        $messageEcho = $this->slackMessage['message'] ?? null;

        if ($messageEcho === null) {
            return;
        }

        $this->message->update([
            'external_source_ids' => [
                ...($this->message->external_source_ids ?? []),
                'slack' => 'cw-origin-'.$messageEcho['ts'],
            ],
        ]);
    }

    // Cùng thread nếu Slack vẫn còn nhận biết message gốc (thread_ts trả về);
    // ngược lại coi như đã đổi kênh — mở luồng mới bằng ts vừa gửi.
    private function shouldUpdateReferenceId(): bool
    {
        $conversation = $this->message->conversation;
        $messageEcho = $this->slackMessage['message'] ?? null;

        return blank($conversation->identifier) || blank($messageEcho['thread_ts'] ?? null);
    }

    private function slackClient(): SlackClient
    {
        return new SlackClient($this->hook->access_token);
    }
}
