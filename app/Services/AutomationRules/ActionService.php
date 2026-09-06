<?php

namespace App\Services\AutomationRules;

use App\Models\Account;
use App\Models\AutomationRule;
use App\Models\Conversation;
use App\Models\Team;
use App\Notifications\TeamAutomationNotification;
use App\Services\ConversationActions\ActionExecutor;
use App\Support\CurrentExecutedBy;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Notification;
use Throwable;

// Orchestrator mỏng của rule; hành động chung nằm ở ActionExecutor để D3 Macros
// gọi lại đúng một bộ thực thi. Chỉ hành động RIÊNG của automation ở lại đây —
// đúng chỗ bản gốc đặt nó (AutomationRules::ActionService), giống cách
// Macros\ExecutionService giữ hai hành động riêng của macro.
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
                    $this->run(
                        (string) ($action['action_name'] ?? ''),
                        $action['action_params'] ?? [],
                    );
                } catch (Throwable $exception) {
                    // Rails rescue từng action rồi tiếp tục phần còn lại.
                    report($exception);
                }
            }
        });
    }

    private function run(string $actionName, mixed $params): void
    {
        match ($actionName) {
            'send_email_to_team' => $this->sendEmailToTeam(Arr::wrap($params)),
            default => (new ActionExecutor($this->conversation->fresh()))->execute(
                $actionName,
                $params,
                $this->rule->id,
            ),
        };
    }

    /**
     * Bản gốc: mỗi team nhận một thư gửi tới toàn bộ email thành viên.
     * Giới hạn email theo ngày của bản gốc chỉ chạy trên bản cloud nên không port.
     *
     * @param  list<mixed>  $params
     */
    private function sendEmailToTeam(array $params): void
    {
        $payload = $params[0] ?? null;

        if (! is_array($payload) || ! TeamAutomationNotification::deliverable()) {
            return;
        }

        $message = (string) ($payload['message'] ?? '');

        $teams = Team::query()
            ->where('account_id', $this->account->id)
            ->whereKey($this->teamIds($payload['team_ids'] ?? []))
            ->with('members')
            ->get();

        foreach ($teams as $team) {
            $emails = $team->members->pluck('email')->filter()->values()->all();

            if ($emails === []) {
                continue;
            }

            Notification::route('mail', $emails)
                ->notify(new TeamAutomationNotification($this->conversation, $message));
        }
    }

    /**
     * Builder của bản gốc gửi lên id thuần, nhưng bản ghi cũ chưa sửa lại còn
     * giữ nguyên `{id, name}` của dropdown — nhận cả hai để rule không im lặng
     * không gửi gì.
     *
     * @return list<int>
     */
    private function teamIds(mixed $values): array
    {
        return array_values(array_filter(array_map(
            fn (mixed $value) => (int) (is_array($value) ? ($value['id'] ?? 0) : $value),
            Arr::wrap($values),
        )));
    }
}
