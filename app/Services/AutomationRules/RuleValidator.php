<?php

namespace App\Services\AutomationRules;

use App\Models\Account;
use App\Models\AutomationRule;

// Tách luật validate khỏi controller để cả API và về sau Macro/command dùng
// cùng hợp đồng. Chỉ nhận mảng thuần, không biết HTTP.
final class RuleValidator
{
    /** @param array<string, mixed> $attributes @return array<string, string> */
    public function errors(array $attributes, Account $account, bool $create = true): array
    {
        $errors = [];

        foreach (['name', 'description', 'event_name'] as $key) {
            if ($create && blank($attributes[$key] ?? null)) {
                $errors[$key] = ucfirst(str_replace('_', ' ', $key)).' is required';
            }
        }

        $eventName = (string) ($attributes['event_name'] ?? '');
        if ($eventName !== '' && ! in_array($eventName, AutomationRule::EVENTS, true)) {
            $errors['event_name'] = 'Event is not supported';
        }

        $conditions = $attributes['conditions'] ?? null;
        if ($create && ! is_array($conditions)) {
            $errors['conditions'] = 'At least one condition is required';
        } elseif (is_array($conditions)) {
            if ($conditions === []) {
                $errors['conditions'] = 'At least one condition is required';
            }
            $this->validateConditions($conditions, $eventName, $errors);
        }

        $actions = $attributes['actions'] ?? null;
        if ($create && ! is_array($actions)) {
            $errors['actions'] = 'At least one action is required';
        } elseif (is_array($actions)) {
            if ($actions === []) {
                $errors['actions'] = 'At least one action is required';
            }
            $this->validateActions($actions, $errors);
        }

        $delay = $attributes['execution_delay'] ?? null;
        if ($delay !== null && $delay !== '') {
            if (! $account->featureEnabled('delayed_automations')) {
                $errors['execution_delay'] = 'Delayed automations are not enabled for this account.';
            } elseif (filter_var($delay, FILTER_VALIDATE_INT) === false
                || (int) $delay < AutomationRule::EXECUTION_DELAY_MINUTES
                || (int) $delay > AutomationRule::EXECUTION_DELAY_MAX_MINUTES) {
                $errors['execution_delay'] = 'The wait must be between 10 minutes and 30 days';
            }

            if (is_array($conditions) && $this->hasAttributeChangedCondition($conditions)) {
                $errors['execution_delay'] = 'Delayed rules cannot use attribute_changed conditions.';
            }

            if ($eventName !== 'message_created' && is_array($conditions)
                && array_diff($this->conditionKeys($conditions), AutomationRule::DELAYED_CONVERSATION_ATTRIBUTES) !== []) {
                $errors['execution_delay'] = 'Delayed conversation rules only support status and inbox conditions.';
            }
        }

        return $errors;
    }

    /** @param array<string, mixed> $attributes @return array<string, mixed> */
    public function normalized(array $attributes, Account $account, bool $create = true): array
    {
        $errors = $this->errors($attributes, $account, $create);

        if ($errors !== []) {
            return ['__errors' => $errors];
        }

        $result = collect($attributes)
            ->only(['name', 'description', 'event_name', 'conditions', 'actions', 'active', 'execution_delay'])
            ->all();

        if (array_key_exists('active', $result)) {
            $result['active'] = filter_var($result['active'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? false;
        }

        if (array_key_exists('execution_delay', $result) && ($result['execution_delay'] === '' || $result['execution_delay'] === null)) {
            $result['execution_delay'] = null;
        } elseif (array_key_exists('execution_delay', $result)) {
            $result['execution_delay'] = (int) $result['execution_delay'];
        }

        if (isset($result['conditions']) && is_array($result['conditions'])) {
            $result['conditions'] = array_values(array_map(function (array $condition, int $index) use (&$result): array {
                $condition['values'] = $this->values($condition['values'] ?? []);
                $condition['query_operator'] = $index === count($result['conditions']) - 1
                    ? null
                    : strtoupper((string) ($condition['query_operator'] ?? 'AND'));

                return $condition;
            }, $result['conditions'], array_keys($result['conditions'])));
        }

        if (isset($result['actions']) && is_array($result['actions'])) {
            $result['actions'] = array_values(array_map(function (array $action): array {
                $action['action_params'] = $this->values($action['action_params'] ?? []);

                return $action;
            }, $result['actions']));
        }

        return $result;
    }

    /** @param list<array<string, mixed>> $conditions @param array<string, string> $errors */
    private function validateConditions(array $conditions, string $eventName, array &$errors): void
    {
        $allowedAttributes = AutomationRule::conditionAttributesFor($eventName);

        foreach ($conditions as $index => $condition) {
            if (! is_array($condition)) {
                $errors["condition_{$index}"] = 'Condition is not valid';

                continue;
            }
            $key = (string) ($condition['attribute_key'] ?? '');
            $operator = (string) ($condition['filter_operator'] ?? '');

            if ($key === '' || ! in_array($key, $allowedAttributes, true)) {
                $errors["condition_{$index}"] = 'Attribute key is not supported';

                continue;
            }

            if (! in_array($operator, AutomationRule::CONDITION_OPERATORS[$key] ?? [], true)) {
                $errors["condition_{$index}"] = 'Filter operator is not supported';
            }

            if (! in_array($operator, ['is_present', 'is_not_present'], true)
                && $this->values($condition['values'] ?? []) === []) {
                $errors["condition_{$index}"] = 'Value is required';
            }

            if ($index < count($conditions) - 1
                && ! in_array(strtoupper((string) ($condition['query_operator'] ?? '')), ['AND', 'OR'], true)) {
                $errors["condition_{$index}"] = 'Query operator must be either "AND" or "OR"';
            }
        }
    }

    /** @param list<array<string, mixed>> $actions @param array<string, string> $errors */
    private function validateActions(array $actions, array &$errors): void
    {
        foreach ($actions as $index => $action) {
            if (! is_array($action)) {
                $errors["action_{$index}"] = 'Action is not valid';

                continue;
            }
            $name = (string) ($action['action_name'] ?? '');
            if (! in_array($name, AutomationRule::SUPPORTED_ACTIONS, true)) {
                $errors["action_{$index}"] = 'Action is not supported in this rewrite slice';

                continue;
            }

            if (! in_array($name, AutomationRule::NO_PARAMETER_ACTIONS, true)
                && $this->values($action['action_params'] ?? []) === []) {
                $errors["action_{$index}"] = 'Action parameters are required';
            }
        }
    }

    /** @param list<array<string, mixed>> $conditions @return list<string> */
    private function conditionKeys(array $conditions): array
    {
        return array_values(array_filter(array_map(
            fn (mixed $condition) => is_array($condition) ? ($condition['attribute_key'] ?? null) : null,
            $conditions,
        )));
    }

    /** @param list<array<string, mixed>> $conditions */
    private function hasAttributeChangedCondition(array $conditions): bool
    {
        return collect($conditions)->contains(fn (mixed $condition) => is_array($condition)
            && ($condition['filter_operator'] ?? null) === 'attribute_changed');
    }

    /** @return list<mixed> */
    private function values(mixed $values): array
    {
        if ($values === null || $values === '') {
            return [];
        }

        if (! is_array($values)) {
            return [$values];
        }

        return array_values(array_map(
            fn (mixed $value) => is_array($value) && array_key_exists('id', $value) ? $value['id'] : $value,
            $values,
        ));
    }
}
