<?php

namespace App\Listeners;

use App\Events\DomainEvent;
use App\Events\EventType;
use App\Models\AutomationRule;
use App\Models\AutomationRulePendingExecution;
use App\Models\Conversation;
use App\Models\Message;
use App\Services\AutomationRules\ActionService;
use App\Services\AutomationRules\ConditionsFilterService;
use App\Support\CurrentExecutedBy;
use Illuminate\Database\Eloquent\Collection;

// Port từ refs/chatwoot/app/listeners/automation_rule_listener.rb. Event actor
// là AutomationRule để action tạo ra không tự kích hoạt lại chính nó.
class AutomationRuleListener extends BaseListener
{
    public function handle(DomainEvent $event): void
    {
        if (CurrentExecutedBy::get() instanceof AutomationRule
            || ($event->data['performed_by'] ?? null) instanceof AutomationRule) {
            return;
        }

        match ($event->type) {
            EventType::CONVERSATION_CREATED => $this->processConversationEvent($event, 'conversation_created'),
            EventType::CONVERSATION_UPDATED => $this->processConversationEvent($event, 'conversation_updated'),
            EventType::CONVERSATION_OPENED => $this->processConversationEvent($event, 'conversation_opened'),
            EventType::CONVERSATION_RESOLVED => $this->processConversationEvent($event, 'conversation_resolved'),
            EventType::MESSAGE_CREATED => $this->processMessageEvent($event),
            default => null,
        };
    }

    private function processConversationEvent(DomainEvent $event, string $eventName): void
    {
        /** @var Conversation $conversation */
        $conversation = $event->data['conversation'];
        if (in_array($eventName, ['conversation_created', 'conversation_opened'], true)
            && data_get($conversation->additional_attributes, 'auto_reply')) {
            return;
        }

        $rules = $this->rulesFor($conversation->account_id, $eventName);
        if ($eventName === 'conversation_created') {
            $rules = $rules->concat($this->rulesFor($conversation->account_id, 'conversation_updated')
                ->filter(fn (AutomationRule $rule) => $rule->execution_delay !== null));
        }

        foreach ($rules as $rule) {
            if ((new ConditionsFilterService($rule, $conversation, [
                'changed_attributes' => $event->data['changed_attributes'] ?? [],
            ]))->perform()) {
                $this->execute($rule, $conversation);
            }
        }
    }

    private function processMessageEvent(DomainEvent $event): void
    {
        /** @var Message $message */
        $message = $event->data['message'];
        if ($message->message_type === Message::TYPE_ACTIVITY || $message->isAutoReplyEmail()) {
            return;
        }

        foreach ($this->rulesFor($message->account_id, 'message_created') as $rule) {
            if ((new ConditionsFilterService($rule, $message->conversation, [
                'message' => $message,
                'changed_attributes' => $event->data['changed_attributes'] ?? [],
            ]))->perform()) {
                $this->execute($rule, $message->conversation, $message);
            }
        }
    }

    private function execute(AutomationRule $rule, Conversation $conversation, ?Message $message = null): void
    {
        if ($rule->execution_delay !== null) {
            if (! $conversation->account->featureEnabled('delayed_automations')) {
                return;
            }

            AutomationRulePendingExecution::schedule($rule, $conversation, $message);

            return;
        }

        (new ActionService($rule, $conversation->account, $conversation))->perform();
    }

    /** @return Collection<int, AutomationRule> */
    private function rulesFor(int $accountId, string $eventName)
    {
        return AutomationRule::query()->where('account_id', $accountId)
            ->where('event_name', $eventName)->active()->get();
    }
}
