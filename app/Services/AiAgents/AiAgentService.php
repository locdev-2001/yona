<?php

namespace App\Services\AiAgents;

use App\Models\Account;
use App\Models\AiAgent;
use App\Models\Conversation;
use App\Models\Inbox;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

// Chỗ duy nhất tạo, sửa, tắt, xoá AI agent và gắn AI agent cho inbox. Tắt hay gỡ AI khỏi
// inbox không lật công tắc của hội thoại: chúng giữ `ai_auto_reply`, chỉ thôi có AI trả
// lời (Inbox::replyingAiAgent rỗng) cho tới khi AI bật lại hoặc inbox gắn AI khác.
final class AiAgentService
{
    private const EDITABLE = ['name', 'persona', 'instructions', 'enabled'];

    /** @throws ValidationException */
    public function create(Account $account, string $name, ?string $persona = null, ?string $instructions = null): AiAgent
    {
        return AiAgent::query()->create([
            'account_id' => $account->id,
            'name' => $this->cleanName($name),
            'persona' => $persona,
            'instructions' => $instructions,
            'enabled' => true,
        ]);
    }

    /**
     * @param  array{name?: string, persona?: ?string, instructions?: ?string, enabled?: bool}  $changes
     *
     * @throws ValidationException
     */
    public function update(AiAgent $aiAgent, array $changes): AiAgent
    {
        $attributes = array_intersect_key($changes, array_flip(self::EDITABLE));

        if (array_key_exists('name', $attributes)) {
            $attributes['name'] = $this->cleanName($attributes['name']);
        }

        $aiAgent->update($attributes);

        return $aiAgent;
    }

    // Inbox đang gắn AI này tự về "chưa có AI" (FK ON DELETE SET NULL).
    public function delete(AiAgent $aiAgent): void
    {
        $aiAgent->removeAvatar();
        $aiAgent->delete();
    }

    /**
     * Gắn (hoặc gỡ khi $aiAgent null) AI agent phụ trách inbox.
     *
     * @throws ValidationException
     */
    public function assignInbox(Inbox $inbox, ?AiAgent $aiAgent): void
    {
        if ($aiAgent !== null && $aiAgent->account_id !== $inbox->account_id) {
            throw ValidationException::withMessages(['ai_agent_id' => __('errors.ai_agents.other_account')]);
        }

        $inbox->forceFill(['ai_agent_id' => $aiAgent?->id])->save();
        $inbox->unsetRelation('aiAgent')->unsetRelation('replyingAiAgent');
    }

    /**
     * Đặt đúng tập kênh AI agent phụ trách: inbox trong danh sách chuyển sang AI này (thay AI
     * cũ của kênh), inbox đang gắn AI này mà không còn trong danh sách thì về "chưa có AI".
     *
     * @param  list<int>  $inboxIds
     *
     * @throws ValidationException
     */
    public function syncInboxes(AiAgent $aiAgent, array $inboxIds): void
    {
        $inboxIds = array_values(array_unique(array_map('intval', $inboxIds)));
        $selected = Inbox::query()->where('account_id', $aiAgent->account_id)->whereKey($inboxIds)->get();

        if ($selected->count() !== count($inboxIds)) {
            throw ValidationException::withMessages(['inbox_ids' => __('errors.ai_agents.unknown_inbox')]);
        }

        DB::transaction(function () use ($aiAgent, $selected, $inboxIds) {
            $released = Inbox::query()->where('ai_agent_id', $aiAgent->id)->whereKeyNot($inboxIds)->get();

            foreach ($released as $inbox) {
                $this->assignInbox($inbox, null);
            }

            foreach ($selected as $inbox) {
                if ($inbox->ai_agent_id !== $aiAgent->id) {
                    $this->assignInbox($inbox, $aiAgent);
                }
            }
        });
    }

    /**
     * Số hội thoại đang bật trả lời tự động theo từng inbox của account.
     *
     * @return array<int, int> inbox_id => số hội thoại
     */
    public function autoReplyCountsByInbox(Account $account): array
    {
        return Conversation::query()
            ->where('account_id', $account->id)
            ->where('ai_auto_reply', true)
            ->groupBy('inbox_id')
            ->selectRaw('inbox_id, count(*) as total')
            ->pluck('total', 'inbox_id')
            ->map(fn ($total) => (int) $total)
            ->all();
    }

    private function cleanName(string $name): string
    {
        $name = trim($name);

        if ($name === '' || mb_strlen($name) > 255) {
            throw ValidationException::withMessages(['name' => __('errors.ai_agents.invalid_name')]);
        }

        return $name;
    }
}
