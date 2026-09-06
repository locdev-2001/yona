<?php

namespace App\Http\Controllers\WebApi;

use App\Http\Controllers\Controller;
use App\Http\Resources\AutomationRuleResource;
use App\Models\Account;
use App\Models\AutomationRule;
use App\Services\AutomationRules\RuleValidator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

// Port từ Api::V1::Accounts::AutomationRulesController. D1 chỉ expose các
// action đã có driver trong rewrite; webhook/email/transcript/file/SLA thuộc D4/F1.
class AutomationRulesController extends Controller
{
    public function __construct(private readonly RuleValidator $validator) {}

    public function index(Request $request, Account $account): JsonResponse
    {
        $this->authorizeAdministrator($request);

        return response()->json([
            'payload' => AutomationRuleResource::collectionFor($account->automationRules()->get()),
        ]);
    }

    public function show(Request $request, Account $account, int $automationRuleId): JsonResponse
    {
        $this->authorizeAdministrator($request);

        return response()->json([
            'payload' => $this->resource($this->findRule($account, $automationRuleId)),
        ]);
    }

    public function store(Request $request, Account $account): JsonResponse
    {
        $this->authorizeAdministrator($request);
        $attributes = $this->inputAttributes($request);
        $normalized = $this->validatedAttributes($attributes, $account, true);
        $rule = $account->automationRules()->create($normalized);

        return response()->json($this->resource($rule));
    }

    public function update(Request $request, Account $account, int $automationRuleId): JsonResponse
    {
        $this->authorizeAdministrator($request);
        $rule = $this->findRule($account, $automationRuleId);
        $attributes = $this->inputAttributes($request);
        $candidate = [...$rule->only([
            'name', 'description', 'event_name', 'conditions', 'actions', 'active', 'execution_delay',
        ]), ...$attributes];
        // A paused account may still edit the name/description of an existing
        // delayed rule; only a payload that carries execution_delay is gated.
        $candidateForValidation = $candidate;
        if (! array_key_exists('execution_delay', $attributes)) {
            $candidateForValidation['execution_delay'] = null;
        }
        $normalized = $this->validatedAttributes($candidateForValidation, $account, true);
        if (! array_key_exists('execution_delay', $attributes)) {
            unset($normalized['execution_delay']);
        }
        $rule->update($normalized);

        return response()->json(['payload' => $this->resource($rule->refresh())]);
    }

    public function destroy(Request $request, Account $account, int $automationRuleId): Response
    {
        $this->authorizeAdministrator($request);
        $this->findRule($account, $automationRuleId)->delete();

        return response()->noContent(200);
    }

    public function clone(Request $request, Account $account, int $automationRuleId): JsonResponse
    {
        $this->authorizeAdministrator($request);
        $rule = $this->findRule($account, $automationRuleId);

        if ($rule->execution_delay !== null && ! $account->featureEnabled('delayed_automations')) {
            return response()->json([
                'error' => 'Delayed automations are not enabled for this account.',
            ], 422);
        }

        $clone = $rule->replicate();
        $clone->save();

        return response()->json(['payload' => $this->resource($clone)]);
    }

    /** @return array<string, mixed> */
    private function inputAttributes(Request $request): array
    {
        $wrapped = $request->input('automation_rule');
        $attributes = is_array($wrapped) ? $wrapped : $request->all();

        return collect($attributes)
            ->only(['name', 'description', 'event_name', 'conditions', 'actions', 'active', 'execution_delay'])
            ->all();
    }

    /** @return array<string, mixed> */
    private function validatedAttributes(array $attributes, Account $account, bool $create): array
    {
        $normalized = $this->validator->normalized($attributes, $account, $create);
        $errors = $normalized['__errors'] ?? [];

        if ($errors !== []) {
            abort(response()->json([
                'message' => collect($errors)->values()->implode(', '),
                'attributes' => array_keys($errors),
            ], 422));
        }

        unset($normalized['__errors']);

        return $normalized;
    }

    private function findRule(Account $account, int $id): AutomationRule
    {
        return $account->automationRules()->whereKey($id)->firstOrFail();
    }

    /** @return array<string, mixed> */
    private function resource(AutomationRule $rule): array
    {
        return (new AutomationRuleResource($rule))->toArray(request());
    }
}
