<?php

namespace App\Models\Concerns;

use App\Exceptions\MessageValidationException;
use App\Models\Channel\Yona;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use App\Models\YonaGroupMember;
use App\Services\Groups\GroupPermissions;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * Luồng dùng chung: tin của nhóm lưu một bản trong hội thoại gốc; mỗi thành viên có
 * một dòng hội thoại riêng (`thread_conversation_id` trỏ về gốc) để nhãn, ghim, đã đọc
 * là của riêng họ. Tin hiện trong dòng riêng = tin của chính dòng đó (ghi chú riêng,
 * hoạt động) + tin của hội thoại gốc tới lúc người đó rời nhóm.
 *
 * @mixin Conversation
 */
trait SharesThread
{
    /** @return BelongsTo<Conversation, $this> */
    public function threadConversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class, 'thread_conversation_id');
    }

    /** @return HasMany<Conversation, $this> */
    public function threadViews(): HasMany
    {
        return $this->hasMany(Conversation::class, 'thread_conversation_id');
    }

    /** @return HasOne<YonaGroupMember, $this> */
    public function threadMembership(): HasOne
    {
        return $this->hasOne(YonaGroupMember::class, 'conversation_id');
    }

    /**
     * Dòng nhóm của một account kèm mốc rời: phạm vi tin chung account đó tìm được, ngoài
     * tin của chính nó (xem `App\Search\ThreadWindow`).
     *
     * @param  Builder<Conversation>  $query
     * @param  list<int>|null  $inboxIds  null = mọi hộp thư
     * @return Builder<Conversation>
     */
    public function scopeThreadViewsOf(Builder $query, int $accountId, ?array $inboxIds = null): Builder
    {
        return $query
            ->where('conversations.account_id', $accountId)
            ->whereNotNull('conversations.thread_conversation_id')
            ->when($inboxIds !== null, fn (Builder $views) => $views->whereIn('conversations.inbox_id', $inboxIds))
            ->with('threadMembership');
    }

    public function isThreadView(): bool
    {
        return $this->thread_conversation_id !== null;
    }

    public function hasLeftThread(): bool
    {
        return $this->isThreadView() && $this->threadMembership?->left_at !== null;
    }

    // Tin của dòng mình thì xoá được như mọi hội thoại; tin chung của nhóm theo quyền trong nhóm.
    public function mayRemoveMessage(User $user, Message $message): bool
    {
        if ($message->conversation_id === $this->id) {
            return true;
        }

        $group = $this->threadMembership?->group;

        return $group !== null && app(GroupPermissions::class)->mayRemoveMessage($group, $user, $message);
    }

    public function threadViewerId(): ?int
    {
        return $this->isThreadView() ? $this->threadMembership?->user_id : null;
    }

    /**
     * Tin người xem thấy trong hội thoại này, chỉ để đọc. Hai nhánh UNION ALL, mỗi nhánh
     * khớp index `(conversation_id, platform_sent_at, id)` nên lấy trang tin vẫn rẻ như
     * đọc một hội thoại.
     *
     * @return Builder<Message>
     */
    public function visibleMessages(): Builder
    {
        if (! $this->isThreadView()) {
            return $this->messages()->getQuery()->where('messages.account_id', $this->account_id);
        }

        $thread = $this->threadConversation;
        $leftAt = $this->threadMembership?->left_at;

        $own = Message::query()->where('conversation_id', $this->id)->where('account_id', $this->account_id);
        $shared = Message::query()
            ->where('conversation_id', $thread->id)
            ->where('account_id', $thread->account_id)
            ->when($leftAt !== null, fn (Builder $query) => $query->where('created_at', '<=', $leftAt));

        return Message::query()
            ->fromSub($own->unionAll($shared), 'messages')
            ->orderBy('platform_sent_at')
            ->orderBy('id');
    }

    /**
     * Hội thoại nhận tin người dùng vừa soạn: ghi chú riêng ở lại dòng của mình, tin gửi
     * đi vào hội thoại gốc. Người đã rời nhóm không gửi được nữa.
     */
    public function messageTargetFor(bool $private): Conversation
    {
        if (! $this->isThreadView() || $private) {
            return $this;
        }

        if ($this->threadMembership?->left_at !== null) {
            throw new MessageValidationException(__('groups.ERRORS.NOT_A_MEMBER'));
        }

        return $this->threadConversation;
    }

    /**
     * Tin của hội thoại gốc hiện ra như tin của dòng này, theo góc nhìn người xem. Tin người
     * khác gửi mang `content_attributes.sender` như tin nhóm của mọi kênh, nên bong bóng,
     * trích dẫn, cảm xúc và dòng xem trước hiện đúng tên người gửi.
     */
    public function presentMessage(Message $message): Message
    {
        if (! $this->isThreadView() || $message->conversation_id === $this->id) {
            return $message;
        }

        $viewerId = $this->threadViewerId();
        $sender = $message->sender;
        $groupSender = $sender instanceof User && $sender->id !== $viewerId
            ? [
                'external_id' => Yona::contactSourceIdFor($sender->id),
                'name' => $sender->availableName(),
                'avatar' => $sender->avatarUrl() ?: '',
                // Cùng avatar hình khối với người này ở mọi màn khác (seed theo user).
                'avatar_seed' => 'user:'.$sender->id,
            ]
            : null;

        return $message->seenFrom($this, $viewerId, $groupSender);
    }
}
