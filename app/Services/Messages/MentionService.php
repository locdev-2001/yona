<?php

namespace App\Services\Messages;

use App\Builders\NotificationBuilder;
use App\Jobs\Conversations\UserMentionJob;
use App\Models\AccountUser;
use App\Models\Message;
use App\Models\TeamMember;
use App\Models\User;

// Port từ refs/chatwoot/app/services/messages/mention_service.rb.
class MentionService
{
    // Cú pháp mention của bản gốc: markdown link `[@Tên](mention://user/12/Tên)`.
    private const USER_MENTION_PATTERN = '#\(mention://user/(\d+)/(.+?)\)#';

    private const TEAM_MENTION_PATTERN = '#\(mention://team/(\d+)/(.+?)\)#';

    /** @var list<int>|null */
    private ?array $mentionedIds = null;

    public function __construct(private readonly Message $message) {}

    public function perform(): void
    {
        if (! $this->isValidMentionMessage()) {
            return;
        }

        $mentionedUserIds = $this->filterMentionedIdsByInbox();

        if ($mentionedUserIds === []) {
            return;
        }

        UserMentionJob::dispatch(
            $mentionedUserIds,
            $this->message->conversation_id,
            $this->message->account_id,
        );

        $this->addMentionedUsersAsParticipants($mentionedUserIds);
        $this->generateNotificationsForMentions($mentionedUserIds);
    }

    /** @param list<int> $mentionedUserIds */
    private function generateNotificationsForMentions(array $mentionedUserIds): void
    {
        foreach ($mentionedUserIds as $userId) {
            if ($this->isSelfMention($userId)) {
                continue;
            }

            $user = User::query()->find($userId);

            if ($user === null) {
                continue;
            }

            (new NotificationBuilder(
                'conversation_mention',
                $user,
                $this->message->account,
                $this->message->conversation,
                $this->message,
            ))->perform();
        }
    }

    private function isSelfMention(int $userId): bool
    {
        return $this->message->sender_type === 'User' && $this->message->sender_id === $userId;
    }

    private function isValidMentionMessage(): bool
    {
        return $this->message->private
            && filled($this->message->content)
            && $this->mentionedIds() !== [];
    }

    /** @return list<int> */
    private function mentionedIds(): array
    {
        if ($this->mentionedIds !== null) {
            return $this->mentionedIds;
        }

        $content = (string) $this->message->content;

        preg_match_all(self::USER_MENTION_PATTERN, $content, $userMatches);
        preg_match_all(self::TEAM_MENTION_PATTERN, $content, $teamMatches);

        $userIds = array_map('intval', $userMatches[1]);
        $teamMemberIds = $this->expandTeamMentionsToUsers(array_map('intval', $teamMatches[1]));

        return $this->mentionedIds = array_values(array_unique([...$userIds, ...$teamMemberIds]));
    }

    /**
     * @param  list<int>  $teamIds
     * @return list<int>
     */
    private function expandTeamMentionsToUsers(array $teamIds): array
    {
        if ($teamIds === []) {
            return [];
        }

        return TeamMember::query()
            ->whereIn('team_id', $this->message->inbox->account->teams()->whereIn('id', $teamIds)->select('id'))
            ->pluck('user_id')
            ->map(fn ($userId) => (int) $userId)
            ->all();
    }

    // valid_mentionable_user_ids: administrator của account + member của inbox.
    /** @return list<int> */
    private function filterMentionedIdsByInbox(): array
    {
        $inbox = $this->message->inbox;

        $administratorIds = AccountUser::query()
            ->where('account_id', $inbox->account_id)
            ->where('role', AccountUser::ROLE_ADMINISTRATOR)
            ->pluck('user_id');

        $mentionableIds = $administratorIds
            ->merge($inbox->inboxMembers()->pluck('user_id'))
            ->map(fn ($userId) => (int) $userId)
            ->all();

        return array_values(array_intersect($this->mentionedIds(), $mentionableIds));
    }

    /** @param list<int> $mentionedUserIds */
    private function addMentionedUsersAsParticipants(array $mentionedUserIds): void
    {
        foreach ($mentionedUserIds as $userId) {
            $this->message->conversation->addParticipant($userId);
        }
    }
}
