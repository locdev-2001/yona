<?php

namespace App\Agent\Context;

use App\Agent\ValueObjects\CoreMessage;
use App\Agent\ValueObjects\MessageOrigin;
use App\Agent\ValueObjects\MessageRole;
use App\Agent\ValueObjects\PromptMessage;
use App\Agent\ValueObjects\TextBlock;

// Lịch sử hội thoại dựng thẳng từ tin của lõi mỗi lượt, không có bản chép riêng. Tin của
// AI agent là `assistant`; mọi tin khác là `user` kèm nhãn ai nói (khách, nhân viên, chủ
// shop trên ứng dụng kênh, tin tự động, sự kiện) nên phần người tư vấn lúc công tắc tắt
// vẫn hiện đúng vai khi bật lại. Ghi chú riêng không bao giờ vào prompt.
final class History
{
    // Ước lượng thô số token từ số ký tự; chỉ dùng cho trần cứng, không tính tiền.
    private const CHARACTERS_PER_TOKEN = 3;

    // Prompt phải mở bằng `user`; lịch sử mở bằng tin của AI (chào trước) thì thêm mốc này.
    private const HISTORY_START = '[event] Conversation history starts here.';

    private const LABELS = [
        MessageOrigin::Customer->value => '[customer]',
        MessageOrigin::ChannelEcho->value => '[shop owner via the channel app]',
        MessageOrigin::Automation->value => '[automated message]',
        MessageOrigin::System->value => '[event]',
    ];

    /**
     * Cắt tin cũ nhất theo khúc khi vượt trần (khúc lớn giữ tiền tố ổn định cho cache lâu
     * hơn cắt từng tin), mở bằng `user`, gộp tin liền nhau cùng vai.
     *
     * @param  list<CoreMessage>  $messages  theo thứ tự hội thoại
     * @return list<PromptMessage>
     */
    public function render(array $messages, int $maxTokens, int $dropChunk): array
    {
        $entries = [];

        foreach ($messages as $message) {
            $entry = $this->entry($message);

            if ($entry !== null) {
                $entries[] = $entry;
            }
        }

        // Tin mới nhất (tin khách vừa đánh thức lượt) không bao giờ bị cắt.
        while (count($entries) > 1 && $this->estimatedTokens($entries) > $maxTokens) {
            $entries = array_slice($entries, max(1, min($dropChunk, count($entries) - 1)));
        }

        if ($entries !== [] && $entries[0][0] !== MessageRole::User) {
            array_unshift($entries, [MessageRole::User, self::HISTORY_START]);
        }

        return $this->merge($entries);
    }

    /**
     * Tin mới tới giữa lượt (khách, tin tự động), đưa vào tin `user` kế tiếp của lượt.
     *
     * @param  list<CoreMessage>  $messages
     * @return list<TextBlock>
     */
    public function steeredBlocks(array $messages): array
    {
        $blocks = [];

        foreach ($messages as $message) {
            $entry = $this->entry($message);

            if ($entry !== null && $entry[0] === MessageRole::User) {
                $blocks[] = new TextBlock($entry[1]);
            }
        }

        return $blocks;
    }

    /** @return array{0: MessageRole, 1: string}|null */
    private function entry(CoreMessage $message): ?array
    {
        if ($message->private) {
            return null;
        }

        $body = $this->body($message);

        if ($body === '') {
            return null;
        }

        if ($message->origin === MessageOrigin::AiAgent) {
            return [MessageRole::Assistant, $body];
        }

        $label = $message->origin === MessageOrigin::Staff
            ? '[staff: '.($message->senderName ?? 'unknown').']'
            : self::LABELS[$message->origin->value];

        return [MessageRole::User, $label.' '.$body];
    }

    private function body(CoreMessage $message): string
    {
        $parts = [];

        if ($message->text !== null && trim($message->text) !== '') {
            $parts[] = trim($message->text);
        }

        if ($message->attachmentTypes !== []) {
            $parts[] = '[sent: '.implode(', ', $message->attachmentTypes).']';
        }

        return implode(' ', $parts);
    }

    /** @param list<array{0: MessageRole, 1: string}> $entries */
    private function estimatedTokens(array $entries): int
    {
        return (int) ceil(array_sum(array_map(fn (array $entry) => mb_strlen($entry[1]), $entries)) / self::CHARACTERS_PER_TOKEN);
    }

    /**
     * @param  list<array{0: MessageRole, 1: string}>  $entries
     * @return list<PromptMessage>
     */
    private function merge(array $entries): array
    {
        $messages = [];
        $role = null;
        $blocks = [];

        foreach ($entries as [$entryRole, $text]) {
            if ($role !== null && $entryRole !== $role) {
                $messages[] = new PromptMessage($role, $blocks);
                $blocks = [];
            }

            $role = $entryRole;
            $blocks[] = new TextBlock($text);
        }

        if ($role !== null) {
            $messages[] = new PromptMessage($role, $blocks);
        }

        return $messages;
    }
}
