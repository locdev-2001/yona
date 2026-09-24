<?php

namespace App\Mail\Concerns;

use App\Models\Conversation;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Header References theo RFC 5322: References của thư đang trả lời + chính In-Reply-To
 * ở cuối, gập dòng bằng CRLF + khoảng trắng.
 */
trait BuildsReferencesHeader
{
    /** @return list<string> */
    protected function buildReferencesHeader(Conversation $conversation, ?string $inReplyToMessageId): array
    {
        try {
            $references = $this->referencesFromRepliedMessage($conversation, $inReplyToMessageId);
            $references[] = $inReplyToMessageId;

            return array_values(array_unique(array_filter($references)));
        } catch (Throwable $exception) {
            Log::error("Error building references header for #{$conversation->id}: ".$exception->getMessage());

            return [];
        }
    }

    /** @return list<string> */
    private function referencesFromRepliedMessage(Conversation $conversation, ?string $inReplyToMessageId): array
    {
        if (blank($inReplyToMessageId)) {
            return [];
        }

        $normalizedId = str_replace(['<', '>'], '', (string) $inReplyToMessageId);

        $repliedMessage = $conversation->messages()
            ->whereNotNull('source_id')
            ->whereIn('source_id', [$normalizedId, "<{$normalizedId}>", $inReplyToMessageId])
            ->first();

        $references = data_get($repliedMessage?->content_attributes, 'email.references');

        return collect((array) $references)
            ->map(fn (string $reference) => str_starts_with($reference, '<') ? $reference : "<{$reference}>")
            ->values()
            ->all();
    }
}
