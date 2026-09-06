<?php

namespace App\Services\AutomationRules;

use App\Models\Account;
use App\Models\AutomationRule;
use App\Models\Conversation;
use App\Services\ConversationActions\ActionExecutor;
use App\Support\CurrentExecutedBy;
use Throwable;

// Orchestrator mỏng của rule; hành động thật nằm ở ActionExecutor để D3 Macros
// gọi lại đúng một bộ thực thi.
final class ActionService
{
    public function __construct(
        private readonly AutomationRule $rule,
        private readonly Account $account,
        private readonly Conversation $conversation,
    ) {}

    public function perform(): void
    {
        CurrentExecutedBy::run($this->rule, function (): void {
            foreach ($this->rule->actions ?? [] as $action) {
                try {
                    (new ActionExecutor($this->conversation->fresh()))->execute(
                        (string) ($action['action_name'] ?? ''),
                        $action['action_params'] ?? [],
                        $this->rule->id,
                    );
                } catch (Throwable $exception) {
                    // Rails rescue từng action rồi tiếp tục phần còn lại.
                    report($exception);
                }
            }
        });
    }
}
