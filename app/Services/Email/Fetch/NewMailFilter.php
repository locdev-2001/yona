<?php

namespace App\Services\Email\Fetch;

use App\Models\Channel\Email;
use App\Services\Email\MailPresenter;
use App\Services\Imap\DeletedMessageTracker;

/**
 * Tách thư vừa kéo về thành thư cần nhập và thư bỏ qua hẳn (hộp thư đã có, đã bị xoá,
 * hoặc thư báo do chính hệ thống gửi). Thư thiếu Message-ID không thuộc nhóm nào.
 */
final class NewMailFilter
{
    public function __construct(private readonly Email $channel) {}

    /**
     * @template TKey of array-key
     *
     * @param  array<TKey, MailPresenter>  $mails
     * @return array{fresh: array<TKey, MailPresenter>, skipped: list<TKey>}
     */
    public function split(array $mails): array
    {
        $messageIds = array_filter(array_map(fn (MailPresenter $mail) => $mail->messageId(), $mails));
        $knownIds = $this->channel->inbox->messages()->whereIn('source_id', $messageIds)->pluck('source_id')->flip();
        $deletedIds = array_fill_keys((new DeletedMessageTracker($this->channel->inbox))->deletedIds(array_values($messageIds)), true);
        $fresh = [];
        $skipped = [];

        foreach ($mails as $key => $mail) {
            $messageId = $mail->messageId();

            if (blank($messageId)) {
                continue;
            }

            if ($mail->isNotificationEmailFromSelf() || $knownIds->has($messageId) || isset($deletedIds[$messageId])) {
                $skipped[] = $key;

                continue;
            }

            $fresh[$key] = $mail;
        }

        return ['fresh' => $fresh, 'skipped' => $skipped];
    }
}
