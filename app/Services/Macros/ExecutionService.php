<?php

namespace App\Services\Macros;

use App\Builders\Messages\MessageBuilder;
use App\Jobs\WebhookJob;
use App\Models\Attachment;
use App\Models\Conversation;
use App\Models\Macro;
use App\Models\User;
use App\Services\ConversationActions\ActionExecutor;
use App\Support\CurrentUser;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Log;
use Throwable;

// Lớp mỏng: hành động chung đi thẳng ActionExecutor với actor = người bấm nút;
// chỉ hai hành động mang đặc thù macro (tệp của chính macro, webhook) ở lại đây.
final class ExecutionService
{
    public function __construct(
        private readonly Macro $macro,
        private readonly Conversation $conversation,
        private readonly User $user,
    ) {}

    // Current.user của bản gốc: mọi activity sinh ra trong lúc chạy macro mang
    // tên người bấm nút, kể cả khi chạy trong job nền (không có auth sẵn).
    public function perform(): void
    {
        CurrentUser::runAs($this->user, fn () => $this->runActions());
    }

    private function runActions(): void
    {
        foreach ($this->macro->actions ?? [] as $action) {
            if (! is_array($action)) {
                continue;
            }

            try {
                $this->run((string) ($action['action_name'] ?? ''), $action['action_params'] ?? []);
            } catch (Throwable $exception) {
                // Rails bắt lỗi từng action rồi chạy tiếp phần còn lại.
                report($exception);
            }
        }
    }

    private function run(string $actionName, mixed $params): void
    {
        match ($actionName) {
            'send_attachment' => $this->sendAttachment(Arr::wrap($params)),
            'send_webhook_event' => $this->sendWebhookEvent(Arr::wrap($params)),
            'send_canned_card' => $this->sendCannedCard(Arr::wrap($params)),
            default => $this->executor()->execute($actionName, $params),
        };
    }

    /**
     * Tin gửi đi mang bản sao tệp: thu hồi/xoá tin dọn tệp theo `path`, dùng
     * chung đường dẫn thì mất luôn tệp của macro cho các lần chạy sau.
     *
     * @param  list<mixed>  $fileIds
     */
    private function sendAttachment(array $fileIds): void
    {
        $selectedIds = array_map('intval', $fileIds);
        $copies = $this->macro->files
            ->filter(fn (Attachment $file) => in_array((int) $file->id, $selectedIds, true))
            ->map(fn (Attachment $file) => $this->copyForSending($file))
            ->filter()
            ->values()
            ->all();

        if ($copies === []) {
            return;
        }

        try {
            $this->executor()->execute('send_attachment', array_map(Attachment::signUpload(...), $copies));
        } finally {
            Attachment::discardUnattachedCopies($copies);
        }
    }

    /** @return array<string, mixed>|null */
    private function copyForSending(Attachment $file): ?array
    {
        $copy = $file->copyStoredFile();

        if ($copy === null) {
            Log::warning('macro.attachment.missing_file', [
                'macro_id' => $this->macro->id,
                'attachment_id' => $file->id,
            ]);
        }

        return $copy;
    }

    /**
     * Gửi lại đúng thẻ đã lưu trong một câu trả lời mẫu — máy chủ tự chuẩn
     * hoá lại content_attributes (thẻ chuyển khoản tự tra số tài khoản thật)
     * y hệt lúc nhân viên bấm Gửi trong hộp thư, đường tạo tin không có gì riêng
     * cho macro nên không cần chạm vào ActionExecutor.
     *
     * @param  list<mixed>  $params
     */
    private function sendCannedCard(array $params): void
    {
        $cannedResponseId = (int) ($params[0] ?? 0);
        if (! $cannedResponseId || $this->conversationIsTweet()) {
            return;
        }

        $cannedResponse = $this->macro->account->cannedResponses()
            ->whereKey($cannedResponseId)
            ->whereNotNull('content_type')
            ->first();

        if ($cannedResponse === null) {
            return;
        }

        (new MessageBuilder($this->user, $this->conversation->fresh(), [
            'content' => $cannedResponse->content,
            'content_type' => $cannedResponse->content_type,
            'content_attributes' => $cannedResponse->content_attributes,
            'private' => false,
        ]))->perform();
    }

    private function conversationIsTweet(): bool
    {
        return data_get($this->conversation->additional_attributes, 'type') === 'tweet';
    }

    /** @param list<mixed> $params */
    private function sendWebhookEvent(array $params): void
    {
        $url = $params[0] ?? null;

        if (blank($url)) {
            return;
        }

        WebhookJob::dispatch((string) $url, [
            ...$this->conversation->webhookData(),
            'event' => 'macro.executed',
        ]);
    }

    private function executor(): ActionExecutor
    {
        return new ActionExecutor($this->conversation->fresh(), $this->user);
    }
}
