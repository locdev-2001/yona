<?php

namespace App\Services\ConversationActions;

use App\Builders\Messages\MessageBuilder;
use App\Models\Conversation;
use App\Models\User;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;

// Lõi hành động conversation dùng chung cho Automation rules và D3 Macros.
// Không nhận Request, không biết event nào đã gọi nó và không gửi webhook/email
// chưa có driver trong rewrite.
final class ActionExecutor
{
    public function __construct(private readonly Conversation $conversation) {}

    public function execute(string $actionName, mixed $params, ?int $automationRuleId = null): void
    {
        $values = $this->values($params);

        match ($actionName) {
            'assign_agent' => $this->assignAgent($values),
            'assign_team' => $this->assignTeam($values),
            'remove_assigned_agent' => $this->update(['assignee_id' => null]),
            'remove_assigned_team' => $this->update(['team_id' => null]),
            'add_label' => $this->conversation->addLabels($values),
            'remove_label' => $this->conversation->removeLabels($values),
            'send_message' => $this->sendMessage($values[0] ?? null, false, $automationRuleId),
            'add_private_note' => $this->sendMessage($values[0] ?? null, true, $automationRuleId),
            'mute_conversation' => $this->conversation->mute(),
            'snooze_conversation' => $this->update(['status' => Conversation::STATUS_SNOOZED]),
            'open_conversation' => $this->update(['status' => Conversation::STATUS_OPEN]),
            'pending_conversation' => $this->update(['status' => Conversation::STATUS_PENDING]),
            'resolve_conversation' => $this->update(['status' => Conversation::STATUS_RESOLVED]),
            'change_priority' => $this->update([
                'priority' => Conversation::priorityFromName((string) ($values[0] ?? 'nil')),
            ]),
            default => throw new UnsupportedActionException("Action `{$actionName}` is not supported"),
        };
    }

    /** @param list<mixed> $values */
    private function assignAgent(array $values): void
    {
        $requested = (string) ($values[0] ?? '');
        if ($requested === 'nil' || $requested === '') {
            $this->update(['assignee_id' => null]);

            return;
        }

        if ($requested === 'last_responding_agent') {
            $agentId = $this->conversation->messages()
                ->outgoing()
                ->where('sender_type', 'User')
                ->where('private', false)
                ->reorder('id', 'desc')
                ->value('sender_id');
        } else {
            $agentId = (int) $requested;
        }

        if (! $agentId) {
            return;
        }

        $agent = $this->conversation->inbox->assignableAgents()->firstWhere('id', $agentId);
        if (! $agent instanceof User || ! $agent->isConfirmed()) {
            return;
        }

        DB::transaction(function () use ($agent): void {
            $conversation = Conversation::query()->whereKey($this->conversation->id)->lockForUpdate()->firstOrFail();
            $conversation->update(['assignee_id' => $agent->id]);
        });
    }

    /** @param list<mixed> $values */
    private function assignTeam(array $values): void
    {
        $teamId = $values[0] ?? null;
        if ($teamId === null || in_array((string) $teamId, ['0', 'nil', ''], true)) {
            $this->update(['team_id' => null]);

            return;
        }

        if (! $this->conversation->account->teams()->whereKey((int) $teamId)->exists()) {
            return;
        }

        DB::transaction(function () use ($teamId): void {
            $conversation = Conversation::query()->whereKey($this->conversation->id)->lockForUpdate()->firstOrFail();
            $conversation->update(['team_id' => (int) $teamId]);
        });
    }

    private function sendMessage(mixed $content, bool $private, ?int $automationRuleId): void
    {
        if ($content === null || $content === '' || data_get($this->conversation->additional_attributes, 'type') === 'tweet') {
            return;
        }

        (new MessageBuilder(null, $this->conversation->fresh(), [
            'content' => (string) $content,
            'private' => $private,
            'content_attributes' => $automationRuleId === null ? [] : [
                'automation_rule_id' => $automationRuleId,
            ],
        ]))->perform();
    }

    /** @param array<string, mixed> $attributes */
    private function update(array $attributes): void
    {
        $this->conversation->fresh()->update($attributes);
    }

    /** @return list<mixed> */
    private function values(mixed $params): array
    {
        if ($params === null || $params === '') {
            return [];
        }

        if (! is_array($params)) {
            return [$params];
        }

        return array_values(Arr::wrap($params));
    }
}
