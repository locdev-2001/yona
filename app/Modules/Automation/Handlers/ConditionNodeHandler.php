<?php

namespace App\Modules\Automation\Handlers;

use App\Models\WorkflowRun;
use App\Modules\Automation\Contracts\NodeHandler;
use App\Modules\Automation\NodeHandlerResult;
use Illuminate\Database\Eloquent\Model;

/**
 * Điều kiện (flow) — AND nhiều dòng field+operator+value, field tùy subject_type.
 * Matcher nội bộ, không gọi service ngoài (docs/crm-automation-workflow.md:55).
 * 2 output: branch=true (mọi điều kiện đúng) / branch=false.
 */
class ConditionNodeHandler implements NodeHandler
{
    public function type(): string
    {
        return 'condition';
    }

    public function handle(WorkflowRun $run, array $node): NodeHandlerResult
    {
        $subject = $run->subject();

        if ($subject === null) {
            // Fail closed: subject deleted since enroll — never take the
            // "true" action branch when the condition can't be verified.
            return NodeHandlerResult::skipped('subject not found', branch: false);
        }

        foreach ($node['config']['conditions'] ?? [] as $condition) {
            [$isMatch, $reason] = $this->matches($subject, $condition);

            if (! $isMatch) {
                return NodeHandlerResult::success(message: $reason, branch: false);
            }
        }

        return NodeHandlerResult::success(branch: true);
    }

    /**
     * @param  array{field?: string, operator?: string, value?: mixed}  $condition
     * @return array{0: bool, 1: string} [matched, human-readable reason for the log]
     */
    private function matches(Model $subject, array $condition): array
    {
        $field = $condition['field'] ?? '';
        $operator = $condition['operator'] ?? 'equals';
        $value = data_get($subject, $field);
        $expected = $condition['value'] ?? null;

        $matched = match ($operator) {
            // Loose compare handles cross-type field values, but a null field
            // (unset attribute) must never satisfy "equals" against a falsy
            // expected value (0/""/false) — PHP's `null == 0` is true.
            'equals' => $value !== null && $value == $expected, // @phpstan-ignore-line
            'not_equals' => $value === null || $value != $expected, // @phpstan-ignore-line
            'contains' => is_string($value) && str_contains($value, (string) $expected),
            'greater_than' => is_numeric($value) && is_numeric($expected) && $value > $expected,
            'less_than' => is_numeric($value) && is_numeric($expected) && $value < $expected,
            default => false,
        };

        if ($matched) {
            return [true, ''];
        }

        $knownOperator = in_array($operator, ['equals', 'not_equals', 'contains', 'greater_than', 'less_than'], strict: true);
        $reason = $knownOperator
            ? "condition failed: {$field} {$operator} ".json_encode($expected)
            : "condition failed: unknown operator \"{$operator}\" on field {$field} (config error, treated as false)";

        return [false, $reason];
    }
}
