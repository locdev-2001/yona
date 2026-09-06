<?php

namespace App\Services\Macros;

use App\Models\Attachment;
use App\Models\Conversation;
use App\Models\Macro;
use App\Models\User;
use App\Services\ConversationActions\ActionExecutor;
use App\Support\CurrentUser;
use Illuminate\Support\Arr;
use Throwable;

// Port từ refs/chatwoot/app/services/macros/execution_service.rb.
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
            default => $this->executor()->execute($actionName, $params),
        };
    }

    /** @param list<mixed> $fileIds */
    private function sendAttachment(array $fileIds): void
    {
        $references = $this->macro->files
            ->filter(fn (Attachment $file) => in_array((int) $file->id, array_map('intval', $fileIds), true))
            ->map(fn (Attachment $file) => $file->signedReference())
            ->values()
            ->all();

        if ($references === []) {
            return;
        }

        $this->executor()->execute('send_attachment', $references);
    }

    /** @param list<mixed> $params */
    private function sendWebhookEvent(array $params): void
    {
        $url = $params[0] ?? null;
        $webhookJob = 'App\Jobs\WebhookJob';

        if (blank($url) || ! class_exists($webhookJob) || ! method_exists($this->conversation, 'webhookData')) {
            return;
        }

        $webhookJob::dispatch((string) $url, [
            ...$this->conversation->webhookData(),
            'event' => 'macro.executed',
        ]);
    }

    private function executor(): ActionExecutor
    {
        return new ActionExecutor($this->conversation->fresh(), $this->user);
    }
}
