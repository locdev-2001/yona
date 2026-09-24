<?php

namespace App\Services\Integrations\Slack;

use App\Models\Integrations\Hook;
use App\Models\Message;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

// Khi khách trả lời một tin nhắn tương tác (select/form/CSAT/email) đã gửi ra
// Slack, cập nhật LẠI đúng tin đó với câu trả lời đã chọn.
class UpdateSlackMessageService
{
    public const SUPPORTED_CONTENT_TYPES = ['input_select', 'form', 'input_csat', 'input_email'];

    public function __construct(
        private readonly Message $message,
        private readonly Hook $hook,
    ) {}

    public function perform(): void
    {
        if (! $this->isUpdateable()) {
            return;
        }

        try {
            (new SlackClient($this->hook->access_token))->chatUpdate([
                'channel' => $this->hook->reference_id,
                'ts' => $this->slackMessageTs(),
                'text' => $this->updatedMessageContent(),
            ]);
        } catch (SlackApiException $e) {
            if ($e->isMessageNotFound()) {
                Log::error("[Slack] chat_update failed (account={$this->message->account_id}, hook={$this->hook->id}): {$e->getMessage()}");

                return;
            }

            if (! $e->requiresReauthorization()) {
                throw $e;
            }

            Log::error("[Slack] chat_update failed (account={$this->message->account_id}, hook={$this->hook->id}): {$e->getMessage()}");
            $this->hook->promptReauthorization();
            $this->hook->disable();
        }
    }

    private function isUpdateable(): bool
    {
        return filled($this->hook->reference_id)
            && filled($this->slackMessageTs())
            && in_array($this->message->contentTypeName(), self::SUPPORTED_CONTENT_TYPES, true)
            && (filled($this->message->content_attributes['submitted_values'] ?? null)
                || filled($this->message->content_attributes['submitted_email'] ?? null));
    }

    private function slackMessageTs(): ?string
    {
        $sourceId = (string) ($this->message->external_source_ids['slack'] ?? '');

        return Str::startsWith($sourceId, 'cw-origin-') ? Str::after($sourceId, 'cw-origin-') : null;
    }

    private function updatedMessageContent(): string
    {
        $question = $this->sanitize($this->messageText());
        $response = $this->formattedResponse();

        return blank($response) ? $question : implode("\n\n", array_filter([$question, $response], fn ($v) => $v !== null));
    }

    private function formattedResponse(): ?string
    {
        return match ($this->message->contentTypeName()) {
            'input_select' => $this->formatInputSelectResponse(),
            'form' => $this->formatFormResponse(),
            'input_csat' => $this->formatCsatResponse(),
            'input_email' => $this->formatEmailResponse(),
            default => null,
        };
    }

    private function formatInputSelectResponse(): ?string
    {
        $item = ($this->message->content_attributes['submitted_values'] ?? [])[0] ?? null;

        if (blank($item)) {
            return null;
        }

        $value = $this->sanitize($item['title'] ?? $item['value'] ?? null);

        return blank($value) ? null : "*Response:* {$value}";
    }

    private function formatEmailResponse(): ?string
    {
        $email = $this->sanitize($this->message->content_attributes['submitted_email'] ?? null);

        return blank($email) ? null : "*Email:* {$email}";
    }

    private function formatFormResponse(): ?string
    {
        $submittedValues = $this->message->content_attributes['submitted_values'] ?? [];

        if (blank($submittedValues)) {
            return null;
        }

        $itemsByName = collect($this->message->content_attributes['items'] ?? [])
            ->keyBy(fn (array $item) => $item['name'] ?? null);

        $lines = collect($submittedValues)
            ->map(fn (array $submittedValue) => $this->formatFormLine($submittedValue, $itemsByName))
            ->filter()
            ->values();

        return $lines->isEmpty() ? null : "*Responses:*\n".$lines->implode("\n");
    }

    private function formatFormLine(array $submittedValue, Collection $itemsByName): ?string
    {
        $name = $submittedValue['name'] ?? null;
        $value = $this->sanitize($submittedValue['value'] ?? null);

        if (blank($value)) {
            return null;
        }

        $label = $this->sanitize($itemsByName->get($name)['label'] ?? $name);

        return blank($label) ? null : "• {$label}: {$value}";
    }

    private function formatCsatResponse(): ?string
    {
        $submittedValues = $this->message->content_attributes['submitted_values'] ?? [];
        $csatResponse = $this->flexValue($submittedValues, ['csat_survey_response', 'csatSurveyResponse']);

        if (blank($csatResponse)) {
            return null;
        }

        $rating = $this->flexValue($csatResponse, ['rating']);
        $feedback = $this->flexValue($csatResponse, ['feedback_message', 'feedbackMessage']);

        $lines = array_filter([
            filled($rating) ? "• Rating: {$rating}" : null,
            filled($feedback) ? '• Feedback: '.$this->sanitize($feedback) : null,
        ]);

        return $lines === [] ? null : "*CSAT:*\n".implode("\n", $lines);
    }

    /** @param list<string> $keys */
    private function flexValue(mixed $hash, array $keys): mixed
    {
        if (blank($hash)) {
            return null;
        }

        foreach ($keys as $key) {
            $value = $hash[$key] ?? null;

            if (filled($value)) {
                return $value;
            }
        }

        return null;
    }

    private function messageText(): ?string
    {
        $content = $this->message->processed_message_content ?? $this->message->content;

        return SlackFormatting::stripMentionLinks($content);
    }

    private function sanitize(mixed $text): string
    {
        return trim(strip_tags((string) $text));
    }
}
